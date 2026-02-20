"""
LocalProvider — wraps the existing HuggingFace model instances.
No model logic lives here; this is a thin async delegate.
All blocking inference is offloaded to threads to keep the event loop free.
"""
import asyncio
import logging
from typing import Dict, List, Optional

import config
from providers.base import BaseProvider

logger = logging.getLogger(__name__)


class LocalProvider(BaseProvider):

    def __init__(self, classifier, embedding_model, toxicity_model, risk_scorer):
        self._classifier = classifier
        self._embedding = embedding_model
        self._toxicity = toxicity_model
        self._risk = risk_scorer

    async def _run(self, func, *args, **kwargs):
        """Offload a blocking call to a thread pool."""
        return await asyncio.to_thread(func, *args, **kwargs)

    # ── Core endpoints ────────────────────────────────────────────────────────

    async def classify(self, text: str, categories: List[str]) -> Dict:
        result = await self._run(self._classifier.predict_top, text, categories)
        if not result:
            raise ValueError("Classifier returned no result")
        return {
            "predicted_category": result["category"],
            "confidence": round(result["confidence"], 4),
            "all_scores": {k: round(v, 4) for k, v in result["all_scores"].items()},
        }

    async def detect_toxicity(self, text: str) -> Dict:
        result = await self._run(
            self._toxicity.is_toxic, text, config.TOXICITY_THRESHOLD
        )
        return {
            "is_toxic": result["is_toxic"],
            "toxicity_score": round(result["toxicity_score"], 4),
            "is_severe": result["is_severe"],
            "details": {k: round(v, 4) for k, v in result["details"].items()},
        }

    async def compute_risk(
        self,
        text: str,
        category: Optional[str],
        severity: Optional[str],
        duplicate_count: int,
        toxicity_score: float,
    ) -> Dict:
        result = await self._run(
            self._risk.compute_risk_score,
            text=text,
            category=category,
            severity=severity,
            duplicate_count=duplicate_count,
            toxicity_score=toxicity_score,
        )
        return {
            "risk_score": result["risk_score"],
            "is_high_risk": result["is_high_risk"],
            "is_critical": result["is_critical"],
            "breakdown": result["breakdown"],
        }

    async def embed(self, text: str) -> List[float]:
        result = await self._run(self._embedding.encode_single, text)
        return result.tolist()

    async def batch_similarity(
        self, query_text: str, candidate_texts: List[str]
    ) -> List[float]:
        if not candidate_texts:
            return []
        return await self._run(
            self._embedding.batch_similarity, query_text, candidate_texts
        )

    async def pairwise_compare(
        self, base_text: str, candidate_text: str
    ) -> Optional[Dict]:
        """
        Local provider has no LLM — stage-2 contextual comparison is not available.
        Returning None causes the backend to skip stage-2 gracefully.
        """
        return None

    async def full_analyze(
        self,
        text: str,
        category: Optional[str],
        severity: Optional[str],
        duplicate_count: int,
        categories: List[str],
    ) -> Dict:
        """
        Serial inference across all local models.
        LLM-only fields (summary, entities, spam_flag, dispatch_suggestion)
        are always None for the local provider.
        """
        result: Dict = {
            "classification": None,
            "toxicity": None,
            "risk": None,
            "summary": None,
            "entities": None,
            "spam_flag": None,
            "dispatch_suggestion": None,
        }

        # Classification
        try:
            result["classification"] = await self.classify(text, categories)
        except Exception as e:
            logger.warning(f"LocalProvider.full_analyze classification failed: {e}")

        # Toxicity
        toxicity_score = 0.0
        try:
            tox = await self.detect_toxicity(text)
            result["toxicity"] = tox
            toxicity_score = tox["toxicity_score"]
        except Exception as e:
            logger.warning(f"LocalProvider.full_analyze toxicity failed: {e}")

        # Risk — use the predicted category if available
        try:
            predicted_cat = (
                result["classification"]["predicted_category"]
                if result["classification"]
                else category
            )
            result["risk"] = await self.compute_risk(
                text=text,
                category=predicted_cat or category,
                severity=severity,
                duplicate_count=duplicate_count,
                toxicity_score=toxicity_score,
            )
        except Exception as e:
            logger.warning(f"LocalProvider.full_analyze risk failed: {e}")

        return result

    async def is_ready(self) -> bool:
        return all([
            self._classifier is not None,
            self._embedding is not None,
            self._toxicity is not None,
            self._risk is not None,
        ])
