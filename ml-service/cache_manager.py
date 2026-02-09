"""
Redis-based caching with fallback to in-memory LRU cache.
Handles cache invalidation on model updates.
"""

import hashlib
import json
import logging
import time
from collections import OrderedDict
from typing import Any, Dict, Optional

import redis
from redis.exceptions import ConnectionError, RedisError

logger = logging.getLogger(__name__)


class BaseCacheManager:
    """Base cache interface."""

    def get(self, prefix: str, text: str, **kwargs) -> Optional[Any]:
        raise NotImplementedError

    def set(self, prefix: str, text: str, value: Any, **kwargs) -> None:
        raise NotImplementedError

    def delete(self, prefix: str, text: str, **kwargs) -> bool:
        raise NotImplementedError

    def clear_prefix(self, prefix: str) -> int:
        """Clear all entries for a given prefix."""
        raise NotImplementedError

    def invalidate_on_model_update(self, model_name: str) -> int:
        """Invalidate cache for a specific model updated."""
        raise NotImplementedError

    @property
    def stats(self) -> Dict[str, Any]:
        raise NotImplementedError


class InMemoryLRUCache(BaseCacheManager):
    """In-memory LRU cache with TTL (fallback)."""

    def __init__(self, max_size: int = 512, ttl_seconds: int = 300):
        self._cache: OrderedDict = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._hits = 0
        self._misses = 0

    def _make_key(self, prefix: str, text: str, **kwargs) -> str:
        raw = f"{prefix}:{text}:{sorted(kwargs.items())}"
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, prefix: str, text: str, **kwargs) -> Optional[Any]:
        key = self._make_key(prefix, text, **kwargs)
        if key in self._cache:
            value, ts = self._cache[key]
            if time.time() - ts < self._ttl:
                self._cache.move_to_end(key)
                self._hits += 1
                return value
            del self._cache[key]
        self._misses += 1
        return None

    def set(self, prefix: str, text: str, value: Any, **kwargs) -> None:
        key = self._make_key(prefix, text, **kwargs)
        self._cache[key] = (value, time.time())
        self._cache.move_to_end(key)
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

    def delete(self, prefix: str, text: str, **kwargs) -> bool:
        key = self._make_key(prefix, text, **kwargs)
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear_prefix(self, prefix: str) -> int:
        """🚨 Note: In-memory cache doesn't track prefixes efficiently."""
        count = 0
        keys_to_delete = [k for k in self._cache if k.startswith(prefix)]
        for key in keys_to_delete:
            del self._cache[key]
            count += 1
        return count

    def invalidate_on_model_update(self, model_name: str) -> int:
        return self.clear_prefix(model_name)

    @property
    def stats(self) -> Dict[str, Any]:
        total = self._hits + self._misses
        rate = (self._hits / total * 100) if total > 0 else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{rate:.1f}%",
            "size": len(self._cache),
            "backend": "in-memory",
        }


class RedisCacheManager(BaseCacheManager):
    """
    Redis-backed cache with:
    - Persistence across service restarts
    - Configurable TTL per prefix
    - Cache invalidation on model updates
    - Automatic fallback to in-memory cache on connection loss
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        ttl_map: Optional[Dict[str, int]] = None,
        fallback_cache: Optional[InMemoryLRUCache] = None,
    ):
        """
        Args:
            redis_url: Redis connection string
            ttl_map: Dict mapping prefix to TTL (e.g., {"classify": 3600, "toxicity": 1800})
            fallback_cache: Optional in-memory cache for failover
        """
        self._redis_url = redis_url
        self._ttl_map = ttl_map or {
            "classify": 3600,     # 1 hour for classification
            "toxicity": 1800,     # 30 minutes for toxicity
            "risk": 1800,         # 30 minutes for risk
            "embedding": 7200,    # 2 hours for embeddings
            "similarity": 600,    # 10 minutes for similarity
        }
        self._fallback = fallback_cache or InMemoryLRUCache(max_size=128, ttl_seconds=300)
        self._redis: Optional[redis.Redis] = None
        self._connected = False
        self._hits = 0
        self._misses = 0

        self._connect()

    def _connect(self) -> bool:
        """Attempt to connect to Redis."""
        try:
            self._redis = redis.from_url(self._redis_url, decode_responses=True)
            self._redis.ping()
            self._connected = True
            logger.info("✅ Redis connected successfully")
            return True
        except ConnectionError as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Using in-memory fallback.")
            self._connected = False
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected Redis error: {e}")
            self._connected = False
            return False

    def _make_key(self, prefix: str, text: str, **kwargs) -> str:
        raw = f"{prefix}:{text}:{sorted(kwargs.items())}"
        return hashlib.md5(raw.encode()).hexdigest()

    def _serialize(self, value: Any) -> str:
        """Serialize value to JSON."""
        try:
            # Handle Pydantic models (v2)
            if hasattr(value, "model_dump"):
                return json.dumps(value.model_dump())
            # Handle Pydantic models (v1)
            if hasattr(value, "dict"):
                return json.dumps(value.dict())
            return json.dumps(value)
        except TypeError:
            logger.warning(f"Could not serialize value: {type(value)}")
            return json.dumps({"error": "serialization_failed"})

    def _deserialize(self, data: str) -> Any:
        """Deserialize JSON to Python object."""
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    def get(self, prefix: str, text: str, **kwargs) -> Optional[Any]:
        """Get value from cache (Redis first, fallback to in-memory)."""
        key = self._make_key(prefix, text, **kwargs)

        if self._connected and self._redis:
            try:
                data = self._redis.get(key)
                if data:
                    self._hits += 1
                    return self._deserialize(data)
            except RedisError as e:
                logger.warning(f"Redis GET failed: {e}. Checking fallback cache.")
                self._connected = False

        # Fallback to in-memory
        value = self._fallback.get(prefix, text, **kwargs)
        if value:
            self._hits += 1
        else:
            self._misses += 1
        return value

    def set(self, prefix: str, text: str, value: Any, **kwargs) -> None:
        """Set value in cache (Redis + in-memory fallback)."""
        key = self._make_key(prefix, text, **kwargs)
        serialized = self._serialize(value)
        ttl = self._ttl_map.get(prefix, 300)

        if self._connected and self._redis:
            try:
                self._redis.setex(key, ttl, serialized)
            except RedisError as e:
                logger.warning(f"Redis SET failed: {e}. Using fallback cache.")
                self._connected = False
                self._fallback.set(prefix, text, value, **kwargs)
        else:
            self._fallback.set(prefix, text, value, **kwargs)

    def delete(self, prefix: str, text: str, **kwargs) -> bool:
        """Delete entry from cache."""
        key = self._make_key(prefix, text, **kwargs)
        deleted = False

        if self._connected and self._redis:
            try:
                deleted = self._redis.delete(key) > 0
            except RedisError as e:
                logger.warning(f"Redis DELETE failed: {e}")
                self._connected = False

        deleted = self._fallback.delete(prefix, text, **kwargs) or deleted
        return deleted

    def clear_prefix(self, prefix: str) -> int:
        """Clear all entries for a prefix (e.g., when model is retrained)."""
        count = 0

        if self._connected and self._redis:
            try:
                pattern = f"{prefix}:*"
                keys = self._redis.keys(pattern)
                if keys:
                    count += self._redis.delete(*keys)
                logger.info(f"Cleared {count} Redis cache entries for prefix: {prefix}")
            except RedisError as e:
                logger.warning(f"Redis CLEAR_PREFIX failed: {e}")
                self._connected = False

        count += self._fallback.clear_prefix(prefix)
        return count

    def invalidate_on_model_update(self, model_name: str) -> int:
        """
        Invalidate cache when a model is updated.
        Maps model names to their cache prefixes.
        """
        model_prefix_map = {
            "classifier": "classify",
            "toxicity": "toxicity",
            "risk": "risk",
            "embedding": "embedding",
        }
        prefix = model_prefix_map.get(model_name)
        if prefix:
            logger.info(f"🔄 Invalidating cache for model: {model_name}")
            return self.clear_prefix(prefix)
        return 0

    def reconnect(self) -> bool:
        """Attempt to reconnect to Redis."""
        return self._connect()

    @property
    def stats(self) -> Dict[str, Any]:
        total = self._hits + self._misses
        rate = (self._hits / total * 100) if total > 0 else 0.0

        redis_info = {}
        if self._connected and self._redis:
            try:
                info = self._redis.info()
                redis_info = {
                    "memory_used_mb": info.get("used_memory_human", "N/A"),
                    "connected_clients": info.get("connected_clients", 0),
                }
            except RedisError:
                pass

        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{rate:.1f}%",
            "backend": "redis" if self._connected else "in-memory (fallback)",
            "redis_connected": self._connected,
            "redis_info": redis_info,
            "fallback_cache": self._fallback.stats,
        }
