"""
SafeSignal ML Microservice
FastAPI service providing ML capabilities for incident analysis.
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import config
from cache_manager import RedisCacheManager, InMemoryLRUCache
from models.embeddings import EmbeddingModel
from models.classifier import CategoryClassifier
from models.toxicity import ToxicityDetector
from models.risk import RiskScorer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ============== Cache Manager ==============

# Initialize cache manager (Redis with in-memory fallback)
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ttl_config = {
    "classify": int(os.getenv("CACHE_TTL_CLASSIFY", 3600)),      # 1 hour
    "toxicity": int(os.getenv("CACHE_TTL_TOXICITY", 1800)),      # 30 min
    "risk": int(os.getenv("CACHE_TTL_RISK", 1800)),              # 30 min
    "embedding": int(os.getenv("CACHE_TTL_EMBEDDING", 7200)),    # 2 hours
    "similarity": int(os.getenv("CACHE_TTL_SIMILARITY", 600)),   # 10 min
}

# Fallback in-memory cache for Redis outages
fallback_cache = InMemoryLRUCache(max_size=128, ttl_seconds=300)

# Initialize Redis cache manager
cache = RedisCacheManager(
    redis_url=redis_url,
    ttl_map=ttl_config,
    fallback_cache=fallback_cache,
)

# Global model instances (lazy loaded)
embedding_model: Optional[EmbeddingModel] = None
classifier_model: Optional[CategoryClassifier] = None
toxicity_model: Optional[ToxicityDetector] = None
risk_scorer: Optional[RiskScorer] = None
inference_semaphore = asyncio.Semaphore(max(1, config.INFERENCE_MAX_CONCURRENCY))


async def run_inference(func, *args, **kwargs):
    """
    Execute blocking model inference without blocking the event loop.
    Concurrency is bounded to protect process stability under load.
    """
    async with inference_semaphore:
        return await asyncio.to_thread(func, *args, **kwargs)


def build_model_metadata(component: str) -> Dict[str, object]:
    metadata: Dict[str, object] = {
        "service_version": config.SERVICE_VERSION,
        "release": config.MODEL_RELEASE,
        "experiment": config.MODEL_EXPERIMENT,
        "variant": config.EXPERIMENT_VARIANT,
        "component": component,
        "model": config.MODEL_VERSION_MAP.get(component),
    }

    if component == "classifier" and classifier_model is not None:
        metadata["runtime"] = classifier_model.optimization_status
    return metadata


def log_inference_event(endpoint: str, component: str, started_at: float):
    duration_ms = (time.perf_counter() - started_at) * 1000.0
    logger.info(
        "inference endpoint=%s component=%s duration_ms=%.1f release=%s experiment=%s variant=%s",
        endpoint,
        component,
        duration_ms,
        config.MODEL_RELEASE,
        config.MODEL_EXPERIMENT,
        config.EXPERIMENT_VARIANT,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup."""
    global embedding_model, classifier_model, toxicity_model, risk_scorer

    logger.info("Loading ML models...")
    logger.info(f"Cache backend: {cache.stats.get('backend', 'unknown')}")

    try:
        embedding_model = EmbeddingModel(config.EMBEDDING_MODEL)
        classifier_model = CategoryClassifier(config.CLASSIFIER_MODEL)
        toxicity_model = ToxicityDetector()
        risk_scorer = RiskScorer()
        logger.info("✅ All models loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        raise

    yield

    logger.info("Shutting down ML service")
    logger.info(f"Cache stats: {cache.stats}")


app = FastAPI(
    title="SafeSignal ML Service",
    description="Machine Learning microservice for incident analysis",
    version=config.SERVICE_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Request/Response Models ==============


class TextInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class SimilarityRequest(BaseModel):
    query_text: str = Field(..., min_length=1)
    candidate_texts: List[str] = Field(..., min_items=1)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=1)
    categories: Optional[List[str]] = None


class RiskRequest(BaseModel):
    text: str = Field(..., min_length=1)
    category: Optional[str] = None
    severity: Optional[str] = None
    duplicate_count: int = Field(default=0, ge=0)
    toxicity_score: float = Field(default=0.0, ge=0.0, le=1.0)


class FullAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1)
    category: Optional[str] = None
    severity: Optional[str] = None
    candidate_texts: Optional[List[str]] = None
    duplicate_count: int = Field(default=0, ge=0)


class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimensions: int


class SimilarityResponse(BaseModel):
    similarities: List[dict]
    threshold: float


class ClassificationResponse(BaseModel):
    predicted_category: str
    confidence: float
    all_scores: dict
    inference_metadata: Optional[dict] = None


class ToxicityResponse(BaseModel):
    is_toxic: bool
    toxicity_score: float
    is_severe: bool
    details: dict
    inference_metadata: Optional[dict] = None


class RiskResponse(BaseModel):
    risk_score: float
    is_high_risk: bool
    is_critical: bool
    breakdown: dict
    inference_metadata: Optional[dict] = None


class FullAnalysisResponse(BaseModel):
    classification: Optional[ClassificationResponse] = None
    toxicity: Optional[ToxicityResponse] = None
    risk: Optional[RiskResponse] = None
    similarity: Optional[SimilarityResponse] = None


# ============== Endpoints ==============


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    classifier_optimizations = (
        classifier_model.optimization_status
        if classifier_model is not None
        else None
    )
    return {
        "status": "healthy",
        "device": config.DEVICE,
        "service_version": config.SERVICE_VERSION,
        "models_loaded": {
            "embedding": embedding_model is not None,
            "classifier": classifier_model is not None,
            "toxicity": toxicity_model is not None,
            "risk": risk_scorer is not None,
        },
        "optimizations": {
            "classifier": classifier_optimizations,
        },
        "model_versions": config.MODEL_VERSION_MAP,
        "release": {
            "model_release": config.MODEL_RELEASE,
            "experiment": config.MODEL_EXPERIMENT,
            "variant": config.EXPERIMENT_VARIANT,
        },
        "inference_limits": {
            "max_concurrency": config.INFERENCE_MAX_CONCURRENCY,
        },
        "cache": cache.stats,
    }


@app.get("/models/versions")
async def model_versions():
    """Expose model/ruleset versions for observability and audits."""
    classifier_runtime = (
        classifier_model.optimization_status if classifier_model is not None else None
    )
    return {
        "service_version": config.SERVICE_VERSION,
        "release": config.MODEL_RELEASE,
        "experiment": config.MODEL_EXPERIMENT,
        "variant": config.EXPERIMENT_VARIANT,
        "models": config.MODEL_VERSION_MAP,
        "classifier_runtime": classifier_runtime,
    }


@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics and backend info."""
    return {
        "stats": cache.stats,
        "ttl_config": {
            "classify": ttl_config["classify"],
            "toxicity": ttl_config["toxicity"],
            "risk": ttl_config["risk"],
            "embedding": ttl_config["embedding"],
            "similarity": ttl_config["similarity"],
        },
    }


@app.post("/cache/invalidate/{model_name}")
async def invalidate_cache(model_name: str):
    """
    Invalidate cache for a specific model when it's been retrained.
    
    Models: classifier, toxicity, risk, embedding
    """
    valid_models = {"classifier", "toxicity", "risk", "embedding"}
    if model_name not in valid_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model: {model_name}. Valid options: {valid_models}",
        )

    count = cache.invalidate_on_model_update(model_name)
    return {
        "model": model_name,
        "invalidated_count": count,
        "message": f"Cache invalidated for {model_name}",
    }


@app.post("/cache/clear")
async def clear_all_cache():
    """Clear entire cache (use with caution)."""
    prefixes = ["classify", "toxicity", "risk", "embedding", "similarity"]
    total_cleared = 0
    for prefix in prefixes:
        total_cleared += cache.clear_prefix(prefix)

    logger.warning(f"⚠️ Cache completely cleared: {total_cleared} entries removed")
    return {
        "message": "Entire cache cleared",
        "entries_removed": total_cleared,
    }


@app.post("/cache/reconnect")
async def reconnect_redis():
    """Attempt to reconnect to Redis (for debugging)."""
    success = cache.reconnect()
    return {
        "success": success,
        "backend": "redis" if success else "in-memory (fallback)",
        "stats": cache.stats,
    }


@app.post("/embed", response_model=EmbeddingResponse)
async def get_embedding(request: TextInput):
    """Get text embedding vector."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    started_at = time.perf_counter()
    embedding = await run_inference(embedding_model.encode_single, request.text)
    log_inference_event("/embed", "embedding", started_at)
    return EmbeddingResponse(
        embedding=embedding.tolist(),
        dimensions=len(embedding),
    )


@app.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(request: SimilarityRequest):
    """Find similar texts from candidates."""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    started_at = time.perf_counter()
    similarities = await run_inference(
        embedding_model.batch_similarity,
        request.query_text,
        request.candidate_texts,
    )

    results = [
        {
            "index": idx,
            "text": request.candidate_texts[idx][:100] + "..."
            if len(request.candidate_texts[idx]) > 100
            else request.candidate_texts[idx],
            "score": round(score, 4),
            "is_duplicate": score >= request.threshold,
        }
        for idx, score in enumerate(similarities)
    ]

    log_inference_event("/similarity", "embedding", started_at)
    return SimilarityResponse(
        similarities=sorted(results, key=lambda x: x["score"], reverse=True),
        threshold=request.threshold,
    )


@app.post("/classify", response_model=ClassificationResponse)
async def classify_text(request: ClassifyRequest):
    """Classify text into incident category."""
    if classifier_model is None:
        raise HTTPException(status_code=503, detail="Classifier model not loaded")

    categories = request.categories or config.INCIDENT_CATEGORIES
    cats_key = ",".join(sorted(categories))

    # Check cache
    cached = cache.get("classify", request.text, cats=cats_key)
    if cached:
        return cached

    started_at = time.perf_counter()
    result = await run_inference(classifier_model.predict_top, request.text, categories)
    if not result:
        raise HTTPException(status_code=400, detail="Could not classify text")

    model_metadata = build_model_metadata("classifier")
    response = ClassificationResponse(
        predicted_category=result["category"],
        confidence=round(result["confidence"], 4),
        all_scores={k: round(v, 4) for k, v in result["all_scores"].items()},
        inference_metadata=model_metadata,
    )
    cache.set("classify", request.text, response, cats=cats_key)
    log_inference_event("/classify", "classifier", started_at)
    return response


@app.post("/toxicity", response_model=ToxicityResponse)
async def detect_toxicity(request: TextInput):
    """Detect toxicity in text."""
    if toxicity_model is None:
        raise HTTPException(status_code=503, detail="Toxicity model not loaded")

    # Check cache
    cached = cache.get("toxicity", request.text)
    if cached:
        return cached

    started_at = time.perf_counter()
    result = await run_inference(
        toxicity_model.is_toxic,
        request.text,
        config.TOXICITY_THRESHOLD,
    )

    response = ToxicityResponse(
        is_toxic=result["is_toxic"],
        toxicity_score=round(result["toxicity_score"], 4),
        is_severe=result["is_severe"],
        details={k: round(v, 4) for k, v in result["details"].items()},
        inference_metadata=build_model_metadata("toxicity"),
    )
    cache.set("toxicity", request.text, response)
    log_inference_event("/toxicity", "toxicity", started_at)
    return response


@app.post("/risk", response_model=RiskResponse)
async def compute_risk(request: RiskRequest):
    """Compute risk score for incident."""
    if risk_scorer is None:
        raise HTTPException(status_code=503, detail="Risk scorer not loaded")

    started_at = time.perf_counter()
    result = await run_inference(
        risk_scorer.compute_risk_score,
        text=request.text,
        category=request.category,
        severity=request.severity,
        duplicate_count=request.duplicate_count,
        toxicity_score=request.toxicity_score,
    )

    log_inference_event("/risk", "risk", started_at)
    return RiskResponse(
        risk_score=result["risk_score"],
        is_high_risk=result["is_high_risk"],
        is_critical=result["is_critical"],
        breakdown=result["breakdown"],
        inference_metadata=build_model_metadata("risk"),
    )


@app.post("/analyze", response_model=FullAnalysisResponse)
async def full_analysis(request: FullAnalysisRequest):
    """
    Perform full ML analysis on incident text.
    Combines classification, toxicity, risk, and similarity in one call.
    """
    response = FullAnalysisResponse()

    # Classification
    if classifier_model:
        try:
            started_at = time.perf_counter()
            result = await run_inference(
                classifier_model.predict_top,
                request.text,
                config.INCIDENT_CATEGORIES,
            )
            if result:
                response.classification = ClassificationResponse(
                    predicted_category=result["category"],
                    confidence=round(result["confidence"], 4),
                    all_scores={k: round(v, 4) for k, v in result["all_scores"].items()},
                    inference_metadata=build_model_metadata("classifier"),
                )
                log_inference_event("/analyze", "classifier", started_at)
        except Exception as e:
            logger.warning(f"Classification failed: {e}")

    # Toxicity
    toxicity_score = 0.0
    if toxicity_model:
        try:
            started_at = time.perf_counter()
            result = await run_inference(
                toxicity_model.is_toxic,
                request.text,
                config.TOXICITY_THRESHOLD,
            )
            toxicity_score = result["toxicity_score"]
            response.toxicity = ToxicityResponse(
                is_toxic=result["is_toxic"],
                toxicity_score=round(result["toxicity_score"], 4),
                is_severe=result["is_severe"],
                details={k: round(v, 4) for k, v in result["details"].items()},
                inference_metadata=build_model_metadata("toxicity"),
            )
            log_inference_event("/analyze", "toxicity", started_at)
        except Exception as e:
            logger.warning(f"Toxicity detection failed: {e}")

    # Risk scoring
    if risk_scorer:
        try:
            predicted_cat = (
                response.classification.predicted_category
                if response.classification
                else request.category
            )
            started_at = time.perf_counter()
            result = await run_inference(
                risk_scorer.compute_risk_score,
                text=request.text,
                category=predicted_cat or request.category,
                severity=request.severity,
                duplicate_count=request.duplicate_count,
                toxicity_score=toxicity_score,
            )
            response.risk = RiskResponse(
                risk_score=result["risk_score"],
                is_high_risk=result["is_high_risk"],
                is_critical=result["is_critical"],
                breakdown=result["breakdown"],
                inference_metadata=build_model_metadata("risk"),
            )
            log_inference_event("/analyze", "risk", started_at)
        except Exception as e:
            logger.warning(f"Risk scoring failed: {e}")

    # Similarity (if candidates provided)
    if embedding_model and request.candidate_texts:
        try:
            started_at = time.perf_counter()
            similarities = await run_inference(
                embedding_model.batch_similarity,
                request.text,
                request.candidate_texts,
            )
            results = [
                {
                    "index": idx,
                    "score": round(score, 4),
                    "is_duplicate": score >= config.SIMILARITY_THRESHOLD,
                }
                for idx, score in enumerate(similarities)
            ]
            response.similarity = SimilarityResponse(
                similarities=sorted(results, key=lambda x: x["score"], reverse=True),
                threshold=config.SIMILARITY_THRESHOLD,
            )
            log_inference_event("/analyze", "embedding", started_at)
        except Exception as e:
            logger.warning(f"Similarity computation failed: {e}")

    return response


if __name__ == "__main__":
    import uvicorn

    reload = os.getenv("ML_RELOAD", "false").lower() == "true"
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=reload,
    )
