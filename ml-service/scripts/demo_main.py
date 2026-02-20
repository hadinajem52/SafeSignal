"""
Minimal FastAPI Service - Redis Cache Demo
Tests Redis caching without ML model dependencies
"""
import os
import sys

# Allow running from scripts/ subdirectory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import time
from cache_manager import RedisCacheManager

# Initialize cache
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
cache = RedisCacheManager(redis_url=redis_url)

app = FastAPI(
    title="SafeSignal ML Service - Cache Demo",
    description="Minimal service to demonstrate Redis caching",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInput(BaseModel):
    text: str


@app.get("/health")
async def health():
    """Health check with cache stats."""
    return {
        "status": "healthy",
        "service": "Redis Cache Demo",
        "cache": cache.stats,
    }


@app.get("/cache/stats")
async def cache_stats():
    """Get detailed cache statistics."""
    return {
        "stats": cache.stats,
        "description": "Redis cache is working and storing inference results",
    }


@app.post("/classify")
async def classify(request: TextInput):
    """Simulate classification with caching."""
    
    # Check cache first
    cached = cache.get("classify", request.text)
    if cached:
        return {"result": cached, "source": "Redis Cache ✅", "latency_ms": 18}
    
    # Simulate inference (normally would run ML model)
    time.sleep(0.1)  # Simulate 100ms inference
    result = {
        "predicted_category": "violence" if "attack" in request.text.lower() else "other",
        "confidence": 0.92,
    }
    
    # Cache the result
    cache.set("classify", request.text, result)
    
    return {"result": result, "source": "Fresh Inference", "latency_ms": 100}


@app.post("/toxicity")
async def detect_toxicity(request: TextInput):
    """Simulate toxicity detection with caching."""
    
    # Check cache
    cached = cache.get("toxicity", request.text)
    if cached:
        return {"result": cached, "source": "Redis Cache ✅", "latency_ms": 18}
    
    # Simulate inference
    time.sleep(0.05)
    result = {
        "is_toxic": any(word in request.text.lower() for word in ["kill", "hate"]),
        "toxicity_score": 0.75,
    }
    
    # Cache it
    cache.set("toxicity", request.text, result)
    
    return {"result": result, "source": "Fresh Inference", "latency_ms": 50}


@app.post("/cache/invalidate/{model}")
async def invalidate(model: str):
    """Invalidate cache for a model."""
    count = cache.invalidate_on_model_update(model)
    return {
        "model": model,
        "invalidated_count": count,
        "message": f"Cache for {model} has been cleared",
    }


@app.post("/cache/clear")
async def clear():
    """Clear entire cache."""
    prefixes = ["classify", "toxicity", "risk", "embedding", "similarity"]
    total = sum(cache.clear_prefix(p) for p in prefixes)
    return {"cleared_entries": total, "message": "Cache completely cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
