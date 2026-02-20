"""Quick latency benchmark for ML service endpoints."""
import requests
import time
import random
import string

BASE = "http://127.0.0.1:5001"

def bench(name, method, url, payload=None, repeat=2):
    results = []
    for i in range(repeat):
        # Mutate text slightly on second call to bypass cache
        p = payload
        if i > 0 and p and 'text' in p:
            p = {**p, 'text': p['text'] + f" [run{i}]"}
        t = time.time()
        if method == "GET":
            r = requests.get(url)
        else:
            r = requests.post(url, json=p)
        elapsed = time.time() - t
        results.append(elapsed)
        data = r.json()
        tag = "2nd" if i > 0 else "1st"
        print(f"  [{tag}] {elapsed*1000:.0f}ms")
    return results, data

print("=" * 50)
print("ML Service Latency Benchmark")
print("=" * 50)

# Warmup call to eliminate CUDA JIT overhead
print("\n0. Warmup...")
requests.post(f"{BASE}/classify", json={"text": "warmup", "categories": ["test"]})
requests.post(f"{BASE}/toxicity", json={"text": "warmup"})
print("   Done")

# 1. Health
print("\n1. GET /health")
_, health = bench("health", "GET", f"{BASE}/health")
print(f"   Models: {health.get('models_loaded')}")
print(f"   Device: {health.get('device')}")

# 2. Classify
print("\n2. POST /classify")
classify_data = {
    "text": "Someone broke into my car and stole my laptop from the back seat",
    "categories": ["theft", "assault", "vandalism", "suspicious_activity", "traffic", "other"]
}
times, result = bench("classify", "POST", f"{BASE}/classify", classify_data)
print(f"   Result: {result.get('predicted_category')} ({result.get('confidence', 0):.2f})")

# 3. Toxicity
print("\n3. POST /toxicity")
tox_data = {"text": "This is a normal report about a missing bicycle near the park"}
times, result = bench("toxicity", "POST", f"{BASE}/toxicity", tox_data)
print(f"   Toxic: {result.get('is_toxic')}, Score: {result.get('toxicity_score', 0):.3f}")

# 4. Analyze (full pipeline)
print("\n4. POST /analyze")
analyze_data = {
    "text": "There was a break-in at the store on Main Street, someone smashed the window and took electronics"
}
times, result = bench("analyze", "POST", f"{BASE}/analyze", analyze_data)
clf = result.get('classification') or {}
print(f"   Category: {clf.get('predicted_category')} ({clf.get('confidence', 0):.2f})")
print(f"   Toxic: {(result.get('toxicity') or {}).get('is_toxic')}")
risk = result.get('risk') or {}
print(f"   Risk: {risk.get('risk_score')} (high={risk.get('is_high_risk')})")

# 5. Cache stats
print("\n5. Cache Stats")
r = requests.get(f"{BASE}/health")
cache = r.json().get("cache", {})
print(f"   Hits: {cache.get('hits')}, Misses: {cache.get('misses')}, Rate: {cache.get('hit_rate')}")

print("\n" + "=" * 50)
print("Done!")
