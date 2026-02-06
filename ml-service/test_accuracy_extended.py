"""
Extended accuracy test suite for SafeSignal ML service.

This file uses a different dataset than test_accuracy.py to stress:
- broader phrasing variation
- harder edge cases
- per-class performance visibility
"""

import os
import time
from collections import defaultdict
from statistics import mean

import requests

BASE = os.getenv("ML_TEST_BASE_URL", "http://127.0.0.1:5001")
TIMEOUT = int(os.getenv("ML_TEST_TIMEOUT", "60"))


CLASSIFY_TESTS_EXT = [
    # theft
    {"text": "Courier package was taken from my porch ten minutes after delivery.", "expected": "theft"},
    {"text": "My phone was snatched out of my hand at the subway entrance.", "expected": "theft"},
    {"text": "Storage unit lock was cut and power tools were stolen.", "expected": "theft"},
    {"text": "Someone used a slim jim and stole my car from the curb.", "expected": "theft"},
    # assault
    {"text": "A bouncer was punched repeatedly outside the nightclub.", "expected": "assault"},
    {"text": "Two men are shoving and hitting each other near the bus terminal.", "expected": "assault"},
    {"text": "Person threatened me with a bottle and then struck my shoulder.", "expected": "assault"},
    {"text": "Teen was kicked to the ground during a fight in the alley.", "expected": "assault"},
    # vandalism
    {"text": "Bus stop glass was shattered overnight and tagged with spray paint.", "expected": "vandalism"},
    {"text": "Someone keyed both sides of my car in the apartment lot.", "expected": "vandalism"},
    {"text": "Playground slide was deliberately burned and damaged.", "expected": "vandalism"},
    {"text": "Mailboxes in our building were smashed open and bent.", "expected": "vandalism"},
    # suspicious_activity
    {"text": "Unknown person keeps taking photos of house entrances late at night.", "expected": "suspicious_activity"},
    {"text": "A car with no plates has been circling the same block for an hour.", "expected": "suspicious_activity"},
    {"text": "Someone in gloves is trying apartment buzzers one by one.", "expected": "suspicious_activity"},
    {"text": "Man is peeking through the fence into the daycare yard.", "expected": "suspicious_activity"},
    # traffic_incident
    {"text": "SUV rear-ended a motorcycle at the red light on Pine and 8th.", "expected": "traffic_incident"},
    {"text": "Truck rolled over on the freeway off-ramp and blocked two lanes.", "expected": "traffic_incident"},
    {"text": "Driver hit a cyclist and fled eastbound on River Road.", "expected": "traffic_incident"},
    {"text": "Three-car crash at the roundabout with airbag deployment.", "expected": "traffic_incident"},
    # noise_complaint
    {"text": "Leaf blowers started before dawn and have been running nonstop.", "expected": "noise_complaint"},
    {"text": "Neighbors are singing karaoke with speakers at 2 AM.", "expected": "noise_complaint"},
    {"text": "Illegal street racing is revving engines loudly every night.", "expected": "noise_complaint"},
    {"text": "Dogs are barking continuously from the backyard next door.", "expected": "noise_complaint"},
    # fire
    {"text": "Grease fire visible in the restaurant kitchen with heavy smoke.", "expected": "fire"},
    {"text": "Electrical panel in the hallway is sparking and smoking.", "expected": "fire"},
    {"text": "Brush fire spreading behind the baseball field.", "expected": "fire"},
    {"text": "Apartment balcony is burning and flames are reaching the roof.", "expected": "fire"},
    # medical_emergency
    {"text": "Runner collapsed and is unresponsive near the park fountain.", "expected": "medical_emergency"},
    {"text": "Child is choking at the food court and cannot breathe.", "expected": "medical_emergency"},
    {"text": "Elderly man has chest pain and severe shortness of breath.", "expected": "medical_emergency"},
    {"text": "Woman fainted in the train station and hit her head.", "expected": "medical_emergency"},
    # hazard
    {"text": "Open manhole with no barricade in the middle of the sidewalk.", "expected": "hazard"},
    {"text": "Traffic light is hanging loose and may fall into the intersection.", "expected": "hazard"},
    {"text": "Large oil spill across two lanes causing cars to skid.", "expected": "hazard"},
    {"text": "Broken tree limb is dangling above the school walkway.", "expected": "hazard"},
]


TOXICITY_TESTS_EXT = [
    {"text": "Please send help, there is smoke on the second floor hallway.", "expected_toxic": False},
    {"text": "Can someone check a suspicious van parked near the playground?", "expected_toxic": False},
    {"text": "I am frustrated but just reporting loud music after midnight.", "expected_toxic": False},
    {"text": "That filthy scumbag should be beaten until he learns.", "expected_toxic": True},
    {"text": "I will burn their place down if they do this again.", "expected_toxic": True},
    {"text": "Those animals from that block are all criminals.", "expected_toxic": True},
]


SIMILARITY_TESTS_EXT = [
    {
        "query": "Driver hit a cyclist and left the scene on River Road.",
        "candidate": "Hit-and-run involving a bicycle rider happened on River Rd.",
        "expected_duplicate": True,
    },
    {
        "query": "Neighbors blasting karaoke at 2 AM.",
        "candidate": "Loud party with amplified singing after midnight next door.",
        "expected_duplicate": True,
    },
    {
        "query": "Brush fire spreading behind the baseball field.",
        "candidate": "Unknown person trying apartment buzzers one by one.",
        "expected_duplicate": False,
    },
    {
        "query": "Open manhole in the sidewalk with no warning signs.",
        "candidate": "My phone was snatched near the subway entrance.",
        "expected_duplicate": False,
    },
]


RISK_TESTS_EXT = [
    {
        "text": "Apartment balcony is burning and family is trapped inside.",
        "category": "fire",
        "severity": "critical",
        "expected_high": True,
    },
    {
        "text": "Person with a knife is threatening pedestrians at the station.",
        "category": "assault",
        "severity": "critical",
        "expected_high": True,
    },
    {
        "text": "Dogs are barking loudly in the backyard.",
        "category": "noise_complaint",
        "severity": "low",
        "expected_high": False,
    },
    {
        "text": "Graffiti on the retaining wall by the park.",
        "category": "vandalism",
        "severity": "low",
        "expected_high": False,
    },
]


def percentile(sorted_values, p):
    if not sorted_values:
        return 0.0
    idx = int(round((len(sorted_values) - 1) * p))
    return sorted_values[idx]


def post_json(path, payload):
    return requests.post(f"{BASE}{path}", json=payload, timeout=TIMEOUT)


def run_classification():
    print("\n" + "=" * 68)
    print("EXTENDED CLASSIFICATION ACCURACY")
    print("=" * 68)

    correct = 0
    total = len(CLASSIFY_TESTS_EXT)
    latencies_ms = []
    per_class_total = defaultdict(int)
    per_class_correct = defaultdict(int)
    errors = []

    for t in CLASSIFY_TESTS_EXT:
        per_class_total[t["expected"]] += 1
        start = time.perf_counter()
        r = post_json("/classify", {"text": t["text"]})
        elapsed = (time.perf_counter() - start) * 1000
        latencies_ms.append(elapsed)

        data = r.json()
        pred = data.get("predicted_category", "unknown")
        conf = data.get("confidence", 0.0)
        ok = pred == t["expected"]

        if ok:
            correct += 1
            per_class_correct[t["expected"]] += 1
            status = "PASS"
        else:
            status = "FAIL"
            errors.append((t["expected"], pred, conf, t["text"][:90]))

        print(
            f"[{status}] expected={t['expected']:<20} predicted={pred:<20} "
            f"conf={conf:.2f} latency={elapsed:.0f}ms"
        )

    accuracy = correct / total * 100
    sorted_latency = sorted(latencies_ms)
    print(f"\nClassification result: {correct}/{total} ({accuracy:.1f}%)")
    print(
        "Classification latency: "
        f"avg={mean(latencies_ms):.1f}ms "
        f"p50={percentile(sorted_latency, 0.50):.1f}ms "
        f"p95={percentile(sorted_latency, 0.95):.1f}ms"
    )

    print("\nPer-class accuracy:")
    for cls in sorted(per_class_total.keys()):
        c_ok = per_class_correct[cls]
        c_total = per_class_total[cls]
        c_acc = c_ok / c_total * 100
        print(f"  {cls:<20} {c_ok}/{c_total} ({c_acc:.1f}%)")

    if errors:
        print("\nTop errors:")
        for exp, pred, conf, txt in errors[:12]:
            print(f"  expected={exp} predicted={pred} conf={conf:.2f} text={txt}...")

    return accuracy, mean(latencies_ms), percentile(sorted_latency, 0.95)


def run_toxicity():
    print("\n" + "=" * 68)
    print("EXTENDED TOXICITY ACCURACY")
    print("=" * 68)
    correct = 0
    total = len(TOXICITY_TESTS_EXT)

    for t in TOXICITY_TESTS_EXT:
        r = post_json("/toxicity", {"text": t["text"]})
        data = r.json()
        pred = data.get("is_toxic", False)
        score = data.get("toxicity_score", 0.0)
        ok = pred == t["expected_toxic"]
        correct += int(ok)
        status = "PASS" if ok else "FAIL"
        expected_label = "TOXIC" if t["expected_toxic"] else "CLEAN"
        print(f"[{status}] expected={expected_label:<5} predicted={pred!s:<5} score={score:.3f}")

    acc = correct / total * 100
    print(f"\nToxicity result: {correct}/{total} ({acc:.1f}%)")
    return acc


def run_similarity(threshold=0.65):
    print("\n" + "=" * 68)
    print("EXTENDED DUPLICATE DETECTION ACCURACY")
    print("=" * 68)
    correct = 0
    total = len(SIMILARITY_TESTS_EXT)

    for t in SIMILARITY_TESTS_EXT:
        r = post_json(
            "/similarity",
            {
                "query_text": t["query"],
                "candidate_texts": [t["candidate"]],
                "threshold": threshold,
            },
        )
        data = r.json()
        score = data["similarities"][0]["score"]
        pred = data["similarities"][0]["is_duplicate"]
        ok = pred == t["expected_duplicate"]
        correct += int(ok)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] score={score:.3f} predicted_dup={pred}")

    acc = correct / total * 100
    print(f"\nDuplicate result: {correct}/{total} ({acc:.1f}%) with threshold={threshold}")
    return acc


def run_risk():
    print("\n" + "=" * 68)
    print("EXTENDED RISK ACCURACY")
    print("=" * 68)
    correct = 0
    total = len(RISK_TESTS_EXT)

    for t in RISK_TESTS_EXT:
        r = post_json(
            "/risk",
            {
                "text": t["text"],
                "category": t["category"],
                "severity": t["severity"],
            },
        )
        data = r.json()
        pred = data.get("is_high_risk", False)
        score = data.get("risk_score", 0.0)
        ok = pred == t["expected_high"]
        correct += int(ok)
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] predicted_high={pred} risk_score={score:.2f}")

    acc = correct / total * 100
    print(f"\nRisk result: {correct}/{total} ({acc:.1f}%)")
    return acc


def run_analyze_smoke():
    print("\n" + "=" * 68)
    print("ANALYZE ENDPOINT SMOKE CHECK")
    print("=" * 68)
    samples = [
        "Apartment balcony fire with visible flames and trapped occupants.",
        "Unknown person repeatedly checking car door handles on Pine Street.",
        "Child fainted in school cafeteria and is unresponsive.",
    ]
    for text in samples:
        start = time.perf_counter()
        r = post_json("/analyze", {"text": text})
        ms = (time.perf_counter() - start) * 1000
        data = r.json()
        category = (data.get("classification") or {}).get("predicted_category")
        conf = (data.get("classification") or {}).get("confidence", 0.0)
        print(f"category={category} confidence={conf:.2f} latency={ms:.0f}ms")


def main():
    print("=" * 68)
    print("SAFESIGNAL EXTENDED ACCURACY SUITE")
    print("=" * 68)
    print(f"Target: {BASE}")

    # Basic health check first.
    health = requests.get(f"{BASE}/health", timeout=TIMEOUT)
    if health.status_code != 200:
        raise SystemExit(f"Health check failed: {health.status_code}")
    print("Health check: OK")
    print(f"Device: {health.json().get('device')}")

    # Warmup to reduce one-time load effects on measured latencies.
    post_json("/classify", {"text": "warmup", "categories": ["other"]})
    post_json("/toxicity", {"text": "warmup"})

    t0 = time.perf_counter()
    cls_acc, cls_avg_ms, cls_p95_ms = run_classification()
    tox_acc = run_toxicity()
    sim_acc = run_similarity(threshold=0.65)
    risk_acc = run_risk()
    run_analyze_smoke()
    elapsed = time.perf_counter() - t0

    print("\n" + "=" * 68)
    print("SUMMARY")
    print("=" * 68)
    print(f"Classification accuracy : {cls_acc:.1f}%")
    print(f"Toxicity accuracy       : {tox_acc:.1f}%")
    print(f"Duplicate accuracy      : {sim_acc:.1f}%")
    print(f"Risk accuracy           : {risk_acc:.1f}%")
    print(f"Classification avg/p95  : {cls_avg_ms:.1f}ms / {cls_p95_ms:.1f}ms")
    print(f"Total run time          : {elapsed:.1f}s")
    print("=" * 68)


if __name__ == "__main__":
    main()

