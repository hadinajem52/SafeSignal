"""
Zero-shot text classification for incident categorization.
Uses BART-large-MNLI for flexible category prediction.
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
            logger.info(f"Loading classifier model: {model_name}")
            device = 0 if config.DEVICE == "cuda" else -1
            kwargs = {}
            if config.DEVICE == "cuda":
                kwargs["torch_dtype"] = torch.float16
            self._classifier = pipeline(
                "zero-shot-classification",
                model=model_name,
                device=device,
                **kwargs,
            )
            logger.info(f"Classifier model loaded successfully on {config.DEVICE}")

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

        # Create human-readable labels for better zero-shot performance
        label_map = {
            "theft": "theft or robbery or stolen property",
            "assault": "assault or physical attack or violence",
            "vandalism": "vandalism or property damage or graffiti",
            "suspicious_activity": "suspicious activity or suspicious person",
            "traffic_incident": "traffic accident or car crash or vehicle incident",
            "noise_complaint": "noise complaint or loud noise or disturbance",
            "fire": "fire or smoke or flames or burning",
            "medical_emergency": "medical emergency or injury or health crisis",
            "hazard": "hazard or danger or safety risk",
            "other": "other incident or general report",
        }

        labels = [label_map.get(cat, cat) for cat in categories]

        result = self._classifier(
            text,
            candidate_labels=labels,
            multi_label=multi_label,
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
    ) -> Optional[Dict]:
        """
        Get top predicted category with confidence.
        Returns dict with 'category' and 'confidence' keys.
        """
        scores = self.predict(text, categories)
        if not scores:
            return None

        top_category = max(scores, key=scores.get)
        return {
            "category": top_category,
            "confidence": scores[top_category],
            "all_scores": scores,
        }
