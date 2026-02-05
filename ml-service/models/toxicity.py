"""
Toxicity detection using Detoxify (toxic-bert).
Detects multiple types of toxic content.
"""

from detoxify import Detoxify
from typing import Dict
import logging

import config

logger = logging.getLogger(__name__)


class ToxicityDetector:
    _instance = None
    _model = None

    def __new__(cls, model_type: str = "original"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_type: str = "original"):
        """
        Initialize toxicity detector.
        model_type options: 'original', 'unbiased', 'multilingual'
        """
        if self._model is None:
            logger.info(f"Loading toxicity model: {model_type}")
            self._model = Detoxify(model_type, device=config.DEVICE)
            logger.info(f"Toxicity model loaded successfully on {config.DEVICE}")

    def analyze(self, text: str) -> Dict[str, float]:
        """
        Analyze text for various types of toxicity.
        Returns dict with scores for each toxicity type.
        """
        if not text:
            return {
                "toxicity": 0.0,
                "severe_toxicity": 0.0,
                "obscene": 0.0,
                "threat": 0.0,
                "insult": 0.0,
                "identity_attack": 0.0,
            }

        results = self._model.predict(text)
        return {k: float(v) for k, v in results.items()}

    def is_toxic(self, text: str, threshold: float = 0.5) -> Dict:
        """
        Check if text exceeds toxicity threshold.
        Returns dict with 'is_toxic', 'toxicity_score', and 'details'.
        """
        scores = self.analyze(text)

        # Primary toxicity score
        toxicity_score = scores.get("toxicity", 0.0)

        # Check if any category exceeds threshold
        is_toxic = toxicity_score >= threshold

        # Also flag if severe categories are present (lower threshold)
        severe_threshold = threshold * 0.6
        is_severe = (
            scores.get("severe_toxicity", 0.0) >= severe_threshold
            or scores.get("threat", 0.0) >= severe_threshold
        )

        return {
            "is_toxic": is_toxic or is_severe,
            "toxicity_score": toxicity_score,
            "is_severe": is_severe,
            "details": scores,
        }

    def batch_analyze(self, texts: list) -> list:
        """Analyze multiple texts at once."""
        return [self.analyze(text) for text in texts]
