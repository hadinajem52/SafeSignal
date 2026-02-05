"""
Zero-shot text classification for incident categorization.
Uses DistilBERT-MNLI (~260MB) for fast inference. Swap to
facebook/bart-large-mnli (~1.6GB) via CLASSIFIER_MODEL env var for higher accuracy.
"""

from transformers import pipeline
import torch
from typing import List, Dict, Optional
import logging

import config

logger = logging.getLogger(__name__)


class CategoryClassifier:
    _instance = None
    _classifier = None

    def __new__(cls, model_name: str = "typeform/distilbert-base-uncased-mnli"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "typeform/distilbert-base-uncased-mnli"):
        if self._classifier is None:
            dev = config.CLASSIFIER_DEVICE
            logger.info(f"Loading classifier model: {model_name} on {dev}")
            device = 0 if dev == "cuda" else -1
            kwargs = {}
            if dev == "cuda":
                kwargs["torch_dtype"] = torch.float16
            self._classifier = pipeline(
                "zero-shot-classification",
                model=model_name,
                device=device,
                **kwargs,
            )
            logger.info(f"Classifier model loaded successfully on {dev}")

    def predict(
        self,
        text: str,
        categories: List[str],
        multi_label: bool = False,
    ) -> Dict[str, float]:
        """
        Predict category probabilities for text.
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
