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
# Triton backend requires CUDA Capability >= 7.0 (Turing+)
_has_compile = hasattr(torch, 'compile') and torch.__version__ >= '2.0'
_cuda_cap_ok = False
if _has_compile and torch.cuda.is_available():
    major, _ = torch.cuda.get_device_capability(0)
    _cuda_cap_ok = major >= 7
    if not _cuda_cap_ok:
        logger.info(
            f"torch.compile disabled: GPU SM {major}.x < 7.0 "
            f"(Triton requires Turing+)"
        )
TORCH_COMPILE_AVAILABLE = _has_compile and _cuda_cap_ok
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
    _main_model_name = None
    _fast_model_name = None
    _quantization_requested = False
    _quantization_applied = False
    _cascade_requested = False
    _cascade_applied = False

    def __new__(cls, model_name: str = "typeform/distilbert-base-uncased-mnli"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "typeform/distilbert-base-uncased-mnli"):
        if self._classifier is None:
            dev = config.CLASSIFIER_DEVICE

            self._main_model_name = model_name
            self._fast_model_name = getattr(
                config,
                "FAST_CLASSIFIER_MODEL",
                "typeform/distilbert-base-uncased-mnli",
            )

            # Determine if we should use cascade approach
            self._cascade_requested = config.USE_CASCADE_CLASSIFIER
            self._use_cascade = self._cascade_requested

            # Ensure hybrid mode uses distinct fast/accurate models
            if self._use_cascade and self._main_model_name == self._fast_model_name:
                logger.warning(
                    "Hybrid cascade requested but main and fast classifier models are identical "
                    f"({self._main_model_name}); disabling cascade."
                )
                self._use_cascade = False

            # Load main classifier (BART with 8-bit quantization if on GPU)
            logger.info(f"Loading classifier model: {self._main_model_name} on {dev}")
            device = 0 if dev == "cuda" else -1
            kwargs = {}

            # 8-bit quantization for 2-3x speedup with minimal accuracy loss
            self._quantization_requested = dev == "cuda" and config.USE_8BIT_QUANTIZATION
            if self._quantization_requested:
                logger.info("Enabling 8-bit quantization for faster inference")
                try:
                    quant_config = BitsAndBytesConfig(load_in_8bit=True)
                    kwargs["model_kwargs"] = {
                        "quantization_config": quant_config,
                        "device_map": "auto",
                    }
                except Exception as e:
                    logger.warning(
                        f"BitsAndBytesConfig init failed ({e}), falling back to load_in_8bit flag"
                    )
                    kwargs["model_kwargs"] = {
                        "load_in_8bit": True,
                        "device_map": "auto",
                    }
            elif dev == "cuda":
                kwargs["torch_dtype"] = torch.float16

            try:
                self._classifier = pipeline(
                    "zero-shot-classification",
                    model=self._main_model_name,
                    device=device,
                    **kwargs,
                )
            except Exception as e:
                # Fallback path when quantized loading fails (common on unsupported setups)
                if self._quantization_requested:
                    logger.warning(
                        f"8-bit quantization failed ({e}). Falling back to non-quantized model load."
                    )
                    fallback_kwargs = {"torch_dtype": torch.float16} if dev == "cuda" else {}
                    self._classifier = pipeline(
                        "zero-shot-classification",
                        model=self._main_model_name,
                        device=device,
                        **fallback_kwargs,
                    )
                else:
                    raise

            self._quantization_applied = self._is_8bit_loaded(self._classifier)
            if self._quantization_requested:
                if self._quantization_applied:
                    logger.info("8-bit quantization status: APPLIED")
                else:
                    logger.warning("8-bit quantization status: REQUESTED but NOT APPLIED")
            else:
                reason = "GPU not active" if dev != "cuda" else "disabled by config"
                logger.info(f"8-bit quantization status: DISABLED ({reason})")
            
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
            
            # Load fast classifier for hybrid cascade
            if self._use_cascade:
                logger.info(f"Loading fast classifier for cascade: {self._fast_model_name}")
                fast_kwargs = {}
                if dev == "cuda":
                    fast_kwargs["torch_dtype"] = torch.float16
                self._fast_classifier = pipeline(
                    "zero-shot-classification",
                    model=self._fast_model_name,
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

            self._cascade_applied = self._fast_classifier is not None
            if self._cascade_requested:
                if self._cascade_applied:
                    logger.info("Hybrid cascade status: APPLIED")
                else:
                    logger.warning("Hybrid cascade status: REQUESTED but NOT APPLIED")
            else:
                logger.info("Hybrid cascade status: DISABLED by config")

    def _is_8bit_loaded(self, classifier_pipeline) -> bool:
        """Best-effort detection of successful 8-bit model loading."""
        if classifier_pipeline is None or getattr(classifier_pipeline, "model", None) is None:
            return False
        model = classifier_pipeline.model
        if getattr(model, "is_loaded_in_8bit", False):
            return True
        if getattr(model, "quantization_method", None) is not None:
            return True
        return False

    @property
    def optimization_status(self) -> Dict[str, object]:
        """Return runtime optimization state for health/observability."""
        return {
            "main_model": self._main_model_name,
            "fast_model": self._fast_model_name if self._cascade_applied else None,
            "device": config.CLASSIFIER_DEVICE,
            "quantization_requested": self._quantization_requested,
            "quantization_applied": self._quantization_applied,
            "cascade_requested": self._cascade_requested,
            "cascade_applied": self._cascade_applied,
        }

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
        # IMPORTANT: "assault" must cover armed violence (shooting, stabbing,
        #   terrorism) so the model doesn't confuse "shooting" with "fire".
        label_map = {
            "theft": "stealing, robbery, burglary, shoplifting, or snatching someone's belongings",
            "assault": "physical attack, shooting, stabbing, armed violence, terrorism, or threatening a person with a weapon",
            "vandalism": "deliberate damage to parked vehicles, buildings, public property, or graffiti",
            "suspicious_activity": "unusual behavior like lurking, watching, or casing a location",
            "traffic_incident": "vehicle collision, car crash, or hit-and-run on the road",
            "noise_complaint": "excessive loud noise, music, construction disturbance, or fireworks",
            "fire": "building on fire, visible flames, thick smoke, or something actively burning",
            "medical_emergency": "person having a seizure, collapse, unconscious, or needing urgent medical help",
            "hazard": "dangerous condition like broken glass, debris, pothole, or downed power line",
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
        confidence_threshold: float = 0.15,
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
