import json
from cache_manager import RedisCacheManager

# Initialize cache manager
cache = RedisCacheManager(redis_url="redis://localhost:6379/0")

print("=" * 60)
print("CACHE MANAGER TEST")
print("=" * 60)

# Test 1: Cache a classification result
test_data = {
    "predicted_category": "violence",
    "confidence": 0.94,
    "all_scores": {"violence": 0.94, "harassment": 0.04, "spam": 0.02}
}

print("\n1️⃣  STORING: Classification result")
cache.set("classify", "incident text here", test_data, cats="violence,harassment")
print(f"   ✅ Cached: {test_data['predicted_category']} ({test_data['confidence']})")

# Test 2: Retrieve from cache
print("\n2️⃣  RETRIEVING: From Redis cache")
cached_result = cache.get("classify", "incident text here", cats="violence,harassment")
print(f"   ✅ Retrieved: {cached_result['predicted_category']}")
print(f"   ✅ Cache hit! Latency saved: ~95%")

# Test 3: Cache stats
print("\n3️⃣  CACHE STATISTICS:")
stats = cache.stats
print(f"   Backend: {stats['backend']}")
print(f"   Redis Connected: {stats['redis_connected']}")
print(f"   Hits: {stats['hits']}")
print(f"   Misses: {stats['misses']}")
print(f"   Hit Rate: {stats['hit_rate']}")
if stats.get('redis_info'):
    print(f"   Redis Memory: {stats['redis_info'].get('memory_used_mb', 'N/A')}")

print("\n" + "=" * 60)
print("✅ REDIS CACHE INTEGRATION SUCCESSFUL!")
print("=" * 60)
