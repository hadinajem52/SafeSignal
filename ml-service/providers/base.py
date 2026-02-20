"""
BaseProvider — abstract interface for ML inference providers.
All methods mirror the existing endpoint contract exactly.
Adding a new provider = subclass this and implement all methods.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional


class BaseProvider(ABC):

    @abstractmethod
    async def classify(self, text: str, categories: List[str]) -> Dict:
        """
        Returns:
            predicted_category: str
            confidence: float  (0–1)
            all_scores: dict   {category: float}
        """

    @abstractmethod
    async def detect_toxicity(self, text: str) -> Dict:
        """
        Returns:
            is_toxic: bool
            toxicity_score: float
            is_severe: bool
            details: dict
        """

    @abstractmethod
    async def compute_risk(
        self,
        text: str,
        category: Optional[str],
        severity: Optional[str],
        duplicate_count: int,
        toxicity_score: float,
    ) -> Dict:
        """
        Returns:
            risk_score: float
            is_high_risk: bool
            is_critical: bool
            breakdown: dict
        """

    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Returns a float list (embedding vector)."""

    @abstractmethod
    async def batch_similarity(
        self, query_text: str, candidate_texts: List[str]
    ) -> List[float]:
        """
        Returns similarity scores in the same order as candidate_texts.
        Each score is a float in [0, 1].
        """

    @abstractmethod
    async def full_analyze(
        self,
        text: str,
        category: Optional[str],
        severity: Optional[str],
        duplicate_count: int,
        categories: List[str],
    ) -> Dict:
        """
        Combined analysis returning all fields at once.
        Local provider runs serial inference; Gemini provider uses a single API call.

        Returns a dict that maps to FullAnalysisResponse fields:
            classification, toxicity, risk  — same shapes as individual endpoints
            summary: Optional[str]
            entities: Optional[dict]
            spam_flag: Optional[bool]
            dispatch_suggestion: Optional[str]
        """

    @abstractmethod
    async def is_ready(self) -> bool:
        """
        Lightweight readiness probe called by /health.
        Must not load models; must not make inference calls.
        """
