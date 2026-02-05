"""
Text embedding model using sentence-transformers.
Provides semantic similarity for duplicate detection.
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Tuple
import logging

import config

logger = logging.getLogger(__name__)


class EmbeddingModel:
    _instance = None
    _model = None

    def __new__(cls, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        if self._model is None:
            logger.info(f"Loading embedding model: {model_name}")
            self._model = SentenceTransformer(model_name, device=config.DEVICE)
            logger.info(f"Embedding model loaded successfully on {config.DEVICE}")

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts into embeddings."""
        return self._model.encode(texts, convert_to_numpy=True)

    def encode_single(self, text: str) -> np.ndarray:
        """Encode a single text into an embedding."""
        return self._model.encode([text], convert_to_numpy=True)[0]

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
        Returns list of similarity scores in same order as candidates.
        """
        if not candidate_texts:
            return []

        query_embedding = self.encode_single(query_text)
        candidate_embeddings = self.encode(candidate_texts)

        similarities = cosine_similarity([query_embedding], candidate_embeddings)[0]
        return [float(s) for s in similarities]
