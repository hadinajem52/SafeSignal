"""
Toxicity detection using Detoxify (toxic-bert).
Detects multiple types of toxic content.
"""

from detoxify import Detoxify
from typing import Dict
import logging
import re

import config

logger = logging.getLogger(__name__)

DEHUMANIZING_TERMS = (
    "animals",
    "savages",
    "vermin",
    "thugs",
    "scum",
    "filthy",
    "criminals",
)

GROUP_REFERENCE_TERMS = (
    "those",
    "these",
    "that group",
    "people from",
    "all those",
)


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
            dev = config.TOXICITY_DEVICE
            logger.info(f"Loading toxicity model: {model_type} on {dev}")
            self._model = Detoxify(model_type, device=dev)
            logger.info(f"Toxicity model loaded successfully on {dev}")

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

        # Backstop for dehumanizing group-targeting language that may get
        # moderate toxicity scores but is still harmful in moderation workflows.
        lowered = (text or "").lower()
        dehumanizing_hits = sum(
            1
            for term in DEHUMANIZING_TERMS
            if re.search(rf"\b{re.escape(term)}\b", lowered)
        )
        has_group_reference = any(term in lowered for term in GROUP_REFERENCE_TERMS)

        contextual_hate = (
            toxicity_score >= max(0.18, threshold * 0.40)
            and dehumanizing_hits >= 1
            and has_group_reference
        )

        # Secondary signal for insults/identity attacks that are not captured
        # by the global toxicity score alone.
        secondary_toxic = (
            scores.get("identity_attack", 0.0) >= 0.12
            or scores.get("insult", 0.0) >= 0.35
        )

        return {
            "is_toxic": is_toxic or is_severe or contextual_hate or secondary_toxic,
            "toxicity_score": toxicity_score,
            "is_severe": is_severe or contextual_hate,
            "details": scores,
        }

    def batch_analyze(self, texts: list) -> list:
        """Analyze multiple texts at once."""
        return [self.analyze(text) for text in texts]
