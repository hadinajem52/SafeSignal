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
from providers import get_provider, BaseProvider
from providers.gemini import GeminiProvider

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

# Global model instances — only populated when ML_PROVIDER=local
embedding_model: Optional[EmbeddingModel] = None
classifier_model: Optional[CategoryClassifier] = None
toxicity_model: Optional[ToxicityDetector] = None
risk_scorer: Optional[RiskScorer] = None

# Active provider — set during lifespan startup
active_provider: Optional[BaseProvider] = None

# Local (GPU/CPU-bound) inference semaphore
inference_semaphore = asyncio.Semaphore(max(1, config.INFERENCE_MAX_CONCURRENCY))
# Gemini (I/O-bound) semaphore — higher cap is safe for network calls
api_semaphore = asyncio.Semaphore(config.GEMINI_MAX_CONCURRENCY)


def _get_semaphore() -> asyncio.Semaphore:
    """Return the appropriate concurrency guard for the active provider."""
    return api_semaphore if config.ML_PROVIDER == "gemini" else inference_semaphore


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
    """Initialise the active provider on startup."""
    global embedding_model, classifier_model, toxicity_model, risk_scorer, active_provider

    logger.info(f"Starting ML service — provider: {config.ML_PROVIDER}")
    logger.info(f"Cache backend: {cache.stats.get('backend', 'unknown')}")

    if config.ML_PROVIDER == "local":
        # Load HuggingFace models only when running the local provider.
        try:
            embedding_model = EmbeddingModel(config.EMBEDDING_MODEL)
            classifier_model = CategoryClassifier(config.CLASSIFIER_MODEL)
            toxicity_model = ToxicityDetector()
            risk_scorer = RiskScorer()
            logger.info("✅ All local models loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load local models: {e}")
            raise

    try:
        active_provider = get_provider(
            classifier=classifier_model,
            embedding_model=embedding_model,
            toxicity_model=toxicity_model,
            risk_scorer=risk_scorer,
        )
        logger.info(f"✅ Provider initialised: {config.ML_PROVIDER}")
    except Exception as e:
        logger.error(f"❌ Failed to initialise provider: {e}")
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


class DedupCompareRequest(BaseModel):
    base_text: str = Field(..., min_length=1, max_length=10000)
    candidate_text: str = Field(..., min_length=1, max_length=10000)


class DedupCompareResponse(BaseModel):
    is_duplicate: bool
    confidence: float
    reasoning: str
    provider_supported: bool = True


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
    # LLM-only fields — populated when ML_PROVIDER=gemini, always None for local
    summary: Optional[str] = None
    entities: Optional[dict] = None
    spam_flag: Optional[bool] = None
    dispatch_suggestion: Optional[str] = None


# ============== Endpoints ==============


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    provider_ready = (
        await active_provider.is_ready() if active_provider is not None else False
    )
    # Keep classifier_runtime for backwards-compat with anything that reads it.
    classifier_runtime = (
        classifier_model.optimization_status
        if classifier_model is not None
        else None
    )
    return {
        "status": "healthy" if provider_ready else "degraded",
        "provider": config.ML_PROVIDER,
        "provider_ready": provider_ready,
        "device": config.DEVICE,
        "service_version": config.SERVICE_VERSION,
        # Kept for backwards compatibility — mirrors provider_ready when using Gemini
        "models_loaded": {
            "embedding": provider_ready,
            "classifier": provider_ready,
            "toxicity": provider_ready,
            "risk": provider_ready,
        },
        "optimizations": {
            "classifier": classifier_runtime,
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
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    started_at = time.perf_counter()
    async with _get_semaphore():
        embedding = await active_provider.embed(request.text)
    log_inference_event("/embed", "embedding", started_at)
    return EmbeddingResponse(
        embedding=embedding,
        dimensions=len(embedding),
    )


@app.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(request: SimilarityRequest):
    """Find similar texts from candidates."""
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    started_at = time.perf_counter()
    async with _get_semaphore():
        similarities = await active_provider.batch_similarity(
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


@app.post("/dedup/compare", response_model=DedupCompareResponse)
async def dedup_compare(request: DedupCompareRequest):
    """
    Stage-2 contextual duplicate detection.

    Reads both incident reports in full and asks the LLM to determine whether
    they describe the same real-world event.  Returns a structured verdict with
    a confidence score and a short reasoning trace.

    Only meaningful when ML_PROVIDER=gemini.  Returns provider_supported=False
    (is_duplicate=False, confidence=0) for the local provider so callers can
    detect the no-op and skip stage-2 gracefully.
    """
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    started_at = time.perf_counter()
    async with _get_semaphore():
        result = await active_provider.pairwise_compare(
            request.base_text, request.candidate_text
        )

    log_inference_event("/dedup/compare", "pairwise", started_at)

    if result is None:
        # Local provider: no LLM available
        return DedupCompareResponse(
            is_duplicate=False,
            confidence=0.0,
            reasoning="Pairwise LLM comparison not available for local provider.",
            provider_supported=False,
        )

    return DedupCompareResponse(**result)


@app.post("/classify", response_model=ClassificationResponse)
async def classify_text(request: ClassifyRequest):
    """Classify text into incident category."""
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    categories = request.categories or config.INCIDENT_CATEGORIES
    cats_key = ",".join(sorted(categories))
    pv = config.PROMPT_VERSION_CLASSIFY

    # Cache check — prompt version baked into key so stale results survive a prompt change
    cached = cache.get("classify", request.text, cats=cats_key, pv=pv)
    if cached:
        return cached

    started_at = time.perf_counter()

    # Shadow mode: run both providers, log comparison, always return local result.
    # Enable with: ML_PROVIDER=local + SHADOW_MODE_ENABLED=true
    if (
        config.SHADOW_MODE_ENABLED
        and "classify" in config.SHADOW_ENDPOINTS
        and config.ML_PROVIDER == "local"
        and config.GEMINI_API_KEY
    ):
        try:
            shadow_prov = GeminiProvider()
            local_result, shadow_result = await asyncio.gather(
                active_provider.classify(request.text, categories),
                shadow_prov.classify(request.text, categories),
                return_exceptions=True,
            )
            if isinstance(shadow_result, Exception):
                logger.warning(f"Shadow classify failed: {shadow_result}")
            elif not isinstance(local_result, Exception):
                logger.info(
                    "shadow_compare endpoint=classify "
                    "local_cat=%s local_conf=%.3f "
                    "gemini_cat=%s gemini_conf=%.3f "
                    "agreement=%s",
                    local_result["predicted_category"], local_result["confidence"],
                    shadow_result["predicted_category"], shadow_result["confidence"],
                    local_result["predicted_category"] == shadow_result["predicted_category"],
                )
            result = local_result if not isinstance(local_result, Exception) else None
        except Exception as e:
            logger.warning(f"Shadow mode error: {e}")
            result = await active_provider.classify(request.text, categories)
    else:
        async with _get_semaphore():
            result = await active_provider.classify(request.text, categories)

    if not result:
        raise HTTPException(status_code=400, detail="Could not classify text")

    response = ClassificationResponse(
        predicted_category=result["predicted_category"],
        confidence=result["confidence"],
        all_scores=result["all_scores"],
        inference_metadata=build_model_metadata("classifier"),
    )
    cache.set("classify", request.text, response, cats=cats_key, pv=pv)
    log_inference_event("/classify", "classifier", started_at)
    return response


@app.post("/toxicity", response_model=ToxicityResponse)
async def detect_toxicity(request: TextInput):
    """Detect toxicity in text."""
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    pv = config.PROMPT_VERSION_TOXICITY
    cached = cache.get("toxicity", request.text, pv=pv)
    if cached:
        return cached

    started_at = time.perf_counter()
    async with _get_semaphore():
        result = await active_provider.detect_toxicity(request.text)

    response = ToxicityResponse(
        is_toxic=result["is_toxic"],
        toxicity_score=result["toxicity_score"],
        is_severe=result["is_severe"],
        details=result["details"],
        inference_metadata=build_model_metadata("toxicity"),
    )
    cache.set("toxicity", request.text, response, pv=pv)
    log_inference_event("/toxicity", "toxicity", started_at)
    return response


@app.post("/risk", response_model=RiskResponse)
async def compute_risk(request: RiskRequest):
    """Compute risk score for incident."""
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    started_at = time.perf_counter()
    async with _get_semaphore():
        result = await active_provider.compute_risk(
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
    - Gemini provider: single API call returning all fields including LLM-only ones.
    - Local provider: serial model inference; LLM-only fields return null.
    """
    if active_provider is None:
        raise HTTPException(status_code=503, detail="ML provider not initialised")

    started_at = time.perf_counter()
    response = FullAnalysisResponse()
    pv = config.PROMPT_VERSION_ANALYZE

    # ── Gemini single-call path ───────────────────────────────────────────────
    if config.ML_PROVIDER == "gemini":
        try:
            async with _get_semaphore():
                result = await active_provider.full_analyze(
                    text=request.text,
                    category=request.category,
                    severity=request.severity,
                    duplicate_count=request.duplicate_count,
                    categories=config.INCIDENT_CATEGORIES,
                )

            if result.get("classification"):
                response.classification = ClassificationResponse(
                    **result["classification"],
                    inference_metadata=build_model_metadata("classifier"),
                )
            if result.get("toxicity"):
                response.toxicity = ToxicityResponse(
                    **result["toxicity"],
                    inference_metadata=build_model_metadata("toxicity"),
                )
            if result.get("risk"):
                response.risk = RiskResponse(
                    **result["risk"],
                    inference_metadata=build_model_metadata("risk"),
                )
            response.summary = result.get("summary")
            response.entities = result.get("entities")
            response.spam_flag = result.get("spam_flag")
            response.dispatch_suggestion = result.get("dispatch_suggestion")

        except Exception as e:
            logger.error(f"/analyze Gemini call failed: {e}")
            # Return what we have rather than a 500; classification/toxicity/risk stay None.

        # Similarity still requires a separate embedding call (always true for any provider)
        if request.candidate_texts:
            try:
                async with _get_semaphore():
                    similarities = await active_provider.batch_similarity(
                        request.text, request.candidate_texts
                    )
                sim_results = [
                    {
                        "index": idx,
                        "score": round(score, 4),
                        "is_duplicate": score >= config.SIMILARITY_THRESHOLD,
                    }
                    for idx, score in enumerate(similarities)
                ]
                response.similarity = SimilarityResponse(
                    similarities=sorted(sim_results, key=lambda x: x["score"], reverse=True),
                    threshold=config.SIMILARITY_THRESHOLD,
                )
            except Exception as e:
                logger.warning(f"/analyze similarity failed: {e}")

        log_inference_event("/analyze", "gemini", started_at)
        return response

    # ── Local serial inference path ───────────────────────────────────────────
    async with _get_semaphore():
        result = await active_provider.full_analyze(
            text=request.text,
            category=request.category,
            severity=request.severity,
            duplicate_count=request.duplicate_count,
            categories=config.INCIDENT_CATEGORIES,
        )

    if result.get("classification"):
        response.classification = ClassificationResponse(
            **result["classification"],
            inference_metadata=build_model_metadata("classifier"),
        )
    if result.get("toxicity"):
        response.toxicity = ToxicityResponse(
            **result["toxicity"],
            inference_metadata=build_model_metadata("toxicity"),
        )
    if result.get("risk"):
        response.risk = RiskResponse(
            **result["risk"],
            inference_metadata=build_model_metadata("risk"),
        )
    # LLM-only fields are None for local provider

    # Similarity
    if request.candidate_texts:
        try:
            async with _get_semaphore():
                similarities = await active_provider.batch_similarity(
                    request.text, request.candidate_texts
                )
            sim_results = [
                {
                    "index": idx,
                    "score": round(score, 4),
                    "is_duplicate": score >= config.SIMILARITY_THRESHOLD,
                }
                for idx, score in enumerate(similarities)
            ]
            response.similarity = SimilarityResponse(
                similarities=sorted(sim_results, key=lambda x: x["score"], reverse=True),
                threshold=config.SIMILARITY_THRESHOLD,
            )
        except Exception as e:
            logger.warning(f"/analyze similarity failed: {e}")

    log_inference_event("/analyze", "local", started_at)
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
