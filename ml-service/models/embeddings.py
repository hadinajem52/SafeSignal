"""
Text embedding model using sentence-transformers.
Provides semantic similarity for duplicate detection.
Includes cross-encoder re-ranking for borderline candidates.
"""

from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Tuple, Optional
import logging
import torch

import config

logger = logging.getLogger(__name__)


class EmbeddingModel:
    _instance = None
    _model = None
    _cpu_model = None
    _cross_encoder = None
    _model_name = None

    def __new__(cls, model_name: str = "sentence-transformers/all-MiniLM-L12-v2"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L12-v2"):
        if self._model is None:
            self._model_name = model_name
            dev = config.EMBEDDING_DEVICE
            logger.info(f"Loading embedding model: {model_name} on {dev}")
            self._model = SentenceTransformer(model_name, device=dev)
            logger.info(f"Embedding model loaded successfully on {dev}")

            # Load cross-encoder for re-ranking borderline duplicates
            cross_model = getattr(config, "CROSS_ENCODER_MODEL", None)
            cross_dev = getattr(config, "CROSS_ENCODER_DEVICE", "cpu")
            if cross_model:
                try:
                    logger.info(f"Loading cross-encoder: {cross_model} on {cross_dev}")
                    self._cross_encoder = CrossEncoder(
                        cross_model,
                        device=cross_dev,
                    )
                    logger.info("Cross-encoder loaded successfully")
                except Exception as e:
                    logger.warning(f"Cross-encoder failed to load: {e}")
                    self._cross_encoder = None

    @staticmethod
    def _is_cuda_oom(error: Exception) -> bool:
        msg = str(error).lower()
        return (
            "cuda out of memory" in msg
            or "cublas_status_alloc_failed" in msg
            or ("cuda" in msg and "alloc" in msg)
        )

    def _ensure_cpu_model(self) -> Optional[SentenceTransformer]:
        if self._cpu_model is not None:
            return self._cpu_model
        try:
            logger.warning(
                "Embedding GPU memory pressure detected; loading CPU fallback model."
            )
            self._cpu_model = SentenceTransformer(self._model_name, device="cpu")
            return self._cpu_model
        except Exception as e:
            logger.error(f"Failed to initialize CPU embedding fallback: {e}")
            return None

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts into embeddings."""
        try:
            return self._model.encode(texts, convert_to_numpy=True)
        except RuntimeError as e:
            if not self._is_cuda_oom(e):
                raise
            cpu_model = self._ensure_cpu_model()
            if cpu_model is None:
                raise
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            return cpu_model.encode(texts, convert_to_numpy=True)

    def encode_single(self, text: str) -> np.ndarray:
        """Encode a single text into an embedding."""
        try:
            return self._model.encode([text], convert_to_numpy=True)[0]
        except RuntimeError as e:
            if not self._is_cuda_oom(e):
                raise
            cpu_model = self._ensure_cpu_model()
            if cpu_model is None:
                raise
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            return cpu_model.encode([text], convert_to_numpy=True)[0]

    def compute_similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between two texts."""
        embeddings = self.encode([text1, text2])
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity)

    def find_similar(
        self,
        query_text: str,
        candidate_texts: List[str],
        threshold: float = 0.7,
    ) -> List[Tuple[int, float]]:
        """
        Find texts similar to query above threshold.
        Returns list of (index, similarity_score) tuples.
        """
        if not candidate_texts:
            return []

        query_embedding = self.encode_single(query_text)
        candidate_embeddings = self.encode(candidate_texts)

        similarities = cosine_similarity([query_embedding], candidate_embeddings)[0]

        results = [
            (idx, float(score))
            for idx, score in enumerate(similarities)
            if score >= threshold
        ]

        return sorted(results, key=lambda x: x[1], reverse=True)

    def batch_similarity(
        self,
        query_text: str,
        candidate_texts: List[str],
    ) -> List[float]:
        """
        Compute similarity between query and all candidates.
        Uses bi-encoder for fast initial scoring, then cross-encoder
        re-ranking for borderline cases (scores in the uncertain zone).
        Returns list of similarity scores in same order as candidates.
        """
        if not candidate_texts:
            return []

        query_embedding = self.encode_single(query_text)
        candidate_embeddings = self.encode(candidate_texts)

        bi_scores = cosine_similarity([query_embedding], candidate_embeddings)[0]
        final_scores = [float(s) for s in bi_scores]

        # Cross-encoder re-ranking for borderline candidates
        rerank_low = getattr(config, "RERANK_LOW", 0.45)
        rerank_high = getattr(config, "RERANK_HIGH", 0.75)

        if self._cross_encoder is not None:
            borderline_indices = [
                i for i, s in enumerate(final_scores)
                if rerank_low <= s <= rerank_high
            ]

            if borderline_indices:
                pairs = [(query_text, candidate_texts[i]) for i in borderline_indices]
                try:
                    cross_scores = self._cross_encoder.predict(pairs)
                    # Cross-encoder outputs logits; normalize to [0, 1]
                    cross_scores = self._sigmoid(cross_scores)

                    for idx, bi_idx in enumerate(borderline_indices):
                        ce_score = float(cross_scores[idx])
                        bi_score = final_scores[bi_idx]
                        blend = getattr(config, "CROSS_ENCODER_BLEND", 0.85)
                        blend = max(0.0, min(1.0, blend))
                        # Blend with higher weight on cross-encoder in uncertain zone.
                        blended = blend * ce_score + (1.0 - blend) * bi_score
                        logger.debug(
                            f"Re-ranked candidate {bi_idx}: "
                            f"bi={bi_score:.3f} ce={ce_score:.3f} → {blended:.3f}"
                        )
                        final_scores[bi_idx] = blended
                except Exception as e:
                    logger.warning(f"Cross-encoder re-ranking failed: {e}")

        return final_scores

    @staticmethod
    def _sigmoid(x):
        """Apply sigmoid to convert logits to probabilities."""
        return 1 / (1 + np.exp(-np.asarray(x)))
