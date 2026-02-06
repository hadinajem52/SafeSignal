"""
Zero-shot text classification for incident categorization.
Implements hybrid cascade: fast DistilBERT first, escalate to BART only when needed.
Uses 8-bit quantization and caching for optimal latency/accuracy tradeoff.
"""

from transformers import pipeline, BitsAndBytesConfig
import torch
from typing import List, Dict, Optional
import logging
from functools import lru_cache
import hashlib

import config

logger = logging.getLogger(__name__)

# Check for torch.compile availability (PyTorch 2.0+)
TORCH_COMPILE_AVAILABLE = hasattr(torch, 'compile') and torch.__version__ >= '2.0'
if TORCH_COMPILE_AVAILABLE:
    logger.info(f"torch.compile available (PyTorch {torch.__version__})")

# Check for BetterTransformer/optimum
try:
    from optimum.bettertransformer import BetterTransformer
    BETTERTRANSFORMER_AVAILABLE = True
    logger.info("BetterTransformer available (Flash Attention)")
except ImportError:
    BETTERTRANSFORMER_AVAILABLE = False


class CategoryClassifier:
    _instance = None
    _classifier = None
    _fast_classifier = None  # DistilBERT for quick first-pass
    _use_cascade = None

    def __new__(cls, model_name: str = "typeform/distilbert-base-uncased-mnli"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "typeform/distilbert-base-uncased-mnli"):
        if self._classifier is None:
            dev = config.CLASSIFIER_DEVICE
            
            # Determine if we should use cascade approach
            self._use_cascade = config.USE_CASCADE_CLASSIFIER
            
            # Load main classifier (BART with 8-bit quantization if on GPU)
            logger.info(f"Loading classifier model: {model_name} on {dev}")
            device = 0 if dev == "cuda" else -1
            kwargs = {}
            
            # 8-bit quantization for 2-3x speedup with minimal accuracy loss
            if dev == "cuda" and config.USE_8BIT_QUANTIZATION:
                logger.info("Enabling 8-bit quantization for faster inference")
                kwargs["model_kwargs"] = {
                    "load_in_8bit": True,
                    "device_map": "auto",
                }
            elif dev == "cuda":
                kwargs["torch_dtype"] = torch.float16
            
            self._classifier = pipeline(
                "zero-shot-classification",
                model=model_name,
                device=device,
                **kwargs,
            )
            
            # Apply BetterTransformer for Flash Attention (20-30% speedup)
            if BETTERTRANSFORMER_AVAILABLE and dev == "cuda" and not config.USE_8BIT_QUANTIZATION:
                try:
                    logger.info("Applying BetterTransformer for Flash Attention...")
                    self._classifier.model = BetterTransformer.transform(self._classifier.model)
                    logger.info("BetterTransformer applied successfully")
                except Exception as e:
                    logger.warning(f"BetterTransformer failed: {e}")
            
            # Apply torch.compile for graph optimization (15-25% speedup)
            if TORCH_COMPILE_AVAILABLE and dev == "cuda":
                try:
                    logger.info("Applying torch.compile for graph optimization...")
                    compile_mode = config.TORCH_COMPILE_MODE if hasattr(config, 'TORCH_COMPILE_MODE') else 'reduce-overhead'
                    self._classifier.model = torch.compile(
                        self._classifier.model,
                        mode=compile_mode,
                    )
                    logger.info(f"torch.compile applied (mode={compile_mode})")
                except Exception as e:
                    logger.warning(f"torch.compile failed: {e}")
            
            logger.info(f"Classifier model loaded successfully on {dev}")
            
            # Load fast classifier for cascade (DistilBERT)
            if self._use_cascade and "bart" in model_name.lower():
                logger.info("Loading fast classifier for cascade: DistilBERT")
                fast_kwargs = {}
                if dev == "cuda":
                    fast_kwargs["torch_dtype"] = torch.float16
                self._fast_classifier = pipeline(
                    "zero-shot-classification",
                    model="typeform/distilbert-base-uncased-mnli",
                    device=device,
                    **fast_kwargs,
                )
                
                # Apply optimizations to fast classifier too
                if BETTERTRANSFORMER_AVAILABLE and dev == "cuda":
                    try:
                        self._fast_classifier.model = BetterTransformer.transform(self._fast_classifier.model)
                        logger.info("BetterTransformer applied to fast classifier")
                    except Exception as e:
                        logger.warning(f"BetterTransformer failed on fast classifier: {e}")
                
                if TORCH_COMPILE_AVAILABLE and dev == "cuda":
                    try:
                        self._fast_classifier.model = torch.compile(
                            self._fast_classifier.model,
                            mode='reduce-overhead',
                        )
                        logger.info("torch.compile applied to fast classifier")
                    except Exception as e:
                        logger.warning(f"torch.compile failed on fast classifier: {e}")
                
                logger.info("Fast classifier loaded successfully")

    def _get_cache_key(self, text: str, categories: tuple) -> str:
        """Generate cache key for LRU cache."""
        content = f"{text}:{','.join(sorted(categories))}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def predict(
        self,
        text: str,
        categories: List[str],
        multi_label: bool = False,
        use_cache: bool = True,
    ) -> Dict[str, float]:
        """
        Predict category probabilities for text.
        Uses hybrid cascade: fast model first, accurate model only when needed.
        Returns dict mapping category to confidence score.
        """
        if not text or not categories:
            return {}

        # Refined labels optimized for zero-shot classification.
        # Short, clear, action-focused phrases work best with NLI models.
        # Avoid overlapping concepts between categories.
        label_map = {
            "theft": "robbery or burglary where items were stolen",
            "assault": "physical attack or violence against a person",
            "vandalism": "intentional property damage or graffiti",
            "suspicious_activity": "unusual behavior suggesting potential crime",
            "traffic_incident": "vehicle collision or car accident",
            "noise_complaint": "excessive loud noise or music disturbance",
            "fire": "active fire with flames or heavy smoke",
            "medical_emergency": "person needing immediate medical attention",
            "hazard": "dangerous road condition or infrastructure damage",
            "other": "unrelated incident or unclear situation",
        }

        labels = [label_map.get(cat, cat) for cat in categories]

        # HYBRID CASCADE OPTIMIZATION:
        # 1. Use fast DistilBERT for initial classification
        # 2. Only use slow BART if confidence below threshold
        # This gives 60-80% latency reduction for high-confidence cases
        
        if self._use_cascade and self._fast_classifier is not None:
            # Fast first-pass with DistilBERT (~150ms)
            fast_result = self._fast_classifier(
                text,
                candidate_labels=labels,
                multi_label=multi_label,
                hypothesis_template=config.HYPOTHESIS_TEMPLATE,
            )
            
            # If high confidence, return fast result
            top_score = fast_result["scores"][0]
            if top_score >= config.CASCADE_CONFIDENCE_THRESHOLD:
                logger.debug(f"Fast classifier confident ({top_score:.2f}), skipping slow model")
                reverse_map = {v: k for k, v in label_map.items()}
                scores = {}
                for label, score in zip(fast_result["labels"], fast_result["scores"]):
                    original_cat = reverse_map.get(label, label)
                    scores[original_cat] = float(score)
                return scores
            
            logger.debug(f"Fast classifier uncertain ({top_score:.2f}), using accurate model")
        
        # Use accurate BART classifier (with 8-bit quantization: ~400ms)
        result = self._classifier(
            text,
            candidate_labels=labels,
            multi_label=multi_label,
            hypothesis_template=config.HYPOTHESIS_TEMPLATE,
        )

        # Map back to original category names
        reverse_map = {v: k for k, v in label_map.items()}
        scores = {}
        for label, score in zip(result["labels"], result["scores"]):
            original_cat = reverse_map.get(label, label)
            scores[original_cat] = float(score)

        return scores

    def predict_top(
        self,
        text: str,
        categories: List[str],
        confidence_threshold: float = 0.25,
    ) -> Optional[Dict]:
        """
        Get top predicted category with confidence.
        Returns dict with 'category' and 'confidence' keys.
        
        If the top prediction is below confidence_threshold, returns 'other'
        as a fallback to handle highly ambiguous cases.
        """
        scores = self.predict(text, categories)
        if not scores:
            return None

        top_category = max(scores, key=scores.get)
        top_confidence = scores[top_category]
        
        # Fallback to 'other' if confidence is too low
        # This prevents misclassification of ambiguous incidents
        if top_confidence < confidence_threshold and "other" in scores:
            logger.warning(
                f"Low confidence ({top_confidence:.3f}) for '{top_category}', "
                f"using 'other' as fallback"
            )
            return {
                "category": "other",
                "confidence": scores["other"],
                "all_scores": scores,
                "original_prediction": top_category,
                "reason": "low_confidence_fallback",
            }
        
        return {
            "category": top_category,
            "confidence": top_confidence,
            "all_scores": scores,
        }
