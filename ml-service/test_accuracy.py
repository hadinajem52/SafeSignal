"""
SafeSignal ML Accuracy Test Suite
Tests classifier, toxicity, and risk models against realistic incident reports.
"""
import requests
import json
import time

BASE = "http://127.0.0.1:5001"

# ══════════════════════════════════════════════════════════
# TEST DATA — realistic user-submitted incident reports
# ══════════════════════════════════════════════════════════

CLASSIFY_TESTS = [
    # ── Theft ──
    {"text": "Someone broke into my car last night and stole my laptop and wallet from the front seat",
     "expected": "theft"},
    {"text": "My bicycle was stolen from the bike rack outside the library",
     "expected": "theft"},
    {"text": "I came home and found my apartment burglarized. TV and jewelry are missing",
     "expected": "theft"},
    {"text": "A man grabbed my purse and ran away near the bus stop on 5th Ave",
     "expected": "theft"},
    {"text": "Shoplifter seen taking items from the convenience store without paying",
     "expected": "theft"},

    # ── Assault ──
    {"text": "A man punched another person outside the bar on Main Street",
     "expected": "assault"},
    {"text": "Two people got into a physical fight near the park entrance",
     "expected": "assault"},
    {"text": "I was attacked by someone while walking home late at night",
     "expected": "assault"},
    {"text": "A woman was pushed to the ground and kicked by an unknown assailant",
     "expected": "assault"},

    # ── Vandalism ──
    {"text": "Someone spray-painted graffiti all over the school building walls",
     "expected": "vandalism"},
    {"text": "Car windows were smashed in the parking lot overnight",
     "expected": "vandalism"},
    {"text": "The park bench was destroyed and trash cans were knocked over",
     "expected": "vandalism"},
    {"text": "Street signs were bent and defaced with stickers on Oak Avenue",
     "expected": "vandalism"},

    # ── Suspicious Activity ──
    {"text": "There's a person looking into car windows in the parking garage for the past hour",
     "expected": "suspicious_activity"},
    {"text": "An unfamiliar van has been parked outside the school watching children",
     "expected": "suspicious_activity"},
    {"text": "Someone is going door to door at 2am trying door handles in our neighborhood",
     "expected": "suspicious_activity"},
    {"text": "A person in a hoodie keeps circling the block and looking at houses",
     "expected": "suspicious_activity"},

    # ── Traffic Incident ──
    {"text": "Two cars collided at the intersection of Broadway and 3rd Street",
     "expected": "traffic_incident"},
    {"text": "A vehicle ran a red light and hit a pedestrian crossing the road",
     "expected": "traffic_incident"},
    {"text": "There's a multi-car pileup on the highway causing major delays",
     "expected": "traffic_incident"},
    {"text": "A drunk driver crashed into a light pole near the shopping center",
     "expected": "traffic_incident"},

    # ── Noise Complaint ──
    {"text": "My neighbor is playing extremely loud music at 3am every night",
     "expected": "noise_complaint"},
    {"text": "Construction work is happening at midnight violating noise ordinances",
     "expected": "noise_complaint"},
    {"text": "There's a party next door that's been blasting bass for hours",
     "expected": "noise_complaint"},

    # ── Fire ──
    {"text": "I see smoke coming from the abandoned building on 4th Street",
     "expected": "fire"},
    {"text": "A dumpster is on fire behind the restaurant",
     "expected": "fire"},
    {"text": "There are flames visible from the upstairs window of the house next door",
     "expected": "fire"},

    # ── Medical Emergency ──
    {"text": "A man collapsed on the sidewalk and is not breathing",
     "expected": "medical_emergency"},
    {"text": "Someone is having a seizure at the coffee shop on Market Street",
     "expected": "medical_emergency"},
    {"text": "An elderly woman fell down the stairs and can't get up, she seems injured",
     "expected": "medical_emergency"},

    # ── Hazard ──
    {"text": "There's a large pothole in the middle of the road that cars keep hitting",
     "expected": "hazard"},
    {"text": "A power line is down across the sidewalk after the storm",
     "expected": "hazard"},
    {"text": "Broken glass is scattered all over the playground where kids play",
     "expected": "hazard"},

    # ── Edge Cases (ambiguous / tricky) ──
    {"text": "Someone threw a brick through my store window and took the cash register",
     "expected": "theft"},  # theft + vandalism overlap
    {"text": "A car hit a fire hydrant and water is flooding the street",
     "expected": "traffic_incident"},  # traffic + hazard overlap
    {"text": "Kids are setting off fireworks in the park at midnight",
     "expected": "noise_complaint"},  # noise + fire overlap
]


TOXICITY_TESTS = [
    # ── Clean reports (should NOT be flagged) ──
    {"text": "I saw someone break into a car in the parking lot", "expected_toxic": False},
    {"text": "There was a hit and run accident at the intersection", "expected_toxic": False},
    {"text": "My neighbor's dog has been barking all night", "expected_toxic": False},
    {"text": "I found a wallet on the street and want to return it", "expected_toxic": False},
    {"text": "The streetlight on Oak Ave has been out for a week", "expected_toxic": False},
    {"text": "There's broken glass on the bike path near the lake", "expected_toxic": False},
    {"text": "Someone was yelling aggressively outside my window", "expected_toxic": False},
    {"text": "A person collapsed and needs medical attention", "expected_toxic": False},

    # ── Toxic content (should be flagged) ──
    {"text": "I hope that bastard gets what he deserves, someone should teach him a lesson with their fists",
     "expected_toxic": True},
    {"text": "These stupid idiots keep vandalizing our street, they're all worthless trash",
     "expected_toxic": True},
    {"text": "I'll kill anyone who touches my property again, I swear to god",
     "expected_toxic": True},
    {"text": "All those people from that neighborhood are criminals and thugs",
     "expected_toxic": True},
]


SIMILARITY_TESTS = [
    # ── Duplicate pairs (should be similar) ──
    {
        "query": "Car window smashed in the Walmart parking lot on Main St last night",
        "candidate": "Someone broke the window of a car at the Walmart on Main Street",
        "expected_duplicate": True,
    },
    {
        "query": "Loud party at 123 Oak Avenue keeping everyone awake",
        "candidate": "Noise complaint at 123 Oak Ave, music blasting after midnight",
        "expected_duplicate": True,
    },
    {
        "query": "Two guys fighting outside the 7-Eleven on Broadway",
        "candidate": "Physical altercation reported in front of the 7-Eleven, Broadway Ave",
        "expected_duplicate": True,
    },
    {
        "query": "Someone stole packages from our porch on Elm Street",
        "candidate": "Package theft reported at a home on Elm St, boxes taken from doorstep",
        "expected_duplicate": True,
    },
    {
        "query": "Power line down on 5th Ave after the storm",
        "candidate": "Downed electrical wire blocking 5th Avenue, looks dangerous",
        "expected_duplicate": True,
    },
    {
        "query": "Graffiti spray-painted on the library wall overnight",
        "candidate": "Vandalism at the public library, someone tagged the exterior wall",
        "expected_duplicate": True,
    },
    # ── Different incidents (should NOT be similar) ──
    {
        "query": "Car window smashed in the Walmart parking lot",
        "candidate": "A man collapsed at the coffee shop on 5th avenue",
        "expected_duplicate": False,
    },
    {
        "query": "Graffiti on the school building",
        "candidate": "Two cars collided at the highway onramp",
        "expected_duplicate": False,
    },
    {
        "query": "Loud music from apartment 4B at 2am",
        "candidate": "Pothole on the freeway causing flat tires",
        "expected_duplicate": False,
    },
    {
        "query": "Someone broke into my garage and stole tools",
        "candidate": "Fire hydrant is leaking water onto the sidewalk",
        "expected_duplicate": False,
    },
]


RISK_TESTS = [
    # ── High risk ──
    {"text": "A man with a knife is threatening people at the bus stop",
     "category": "assault", "severity": "critical",
     "expected_high": True},
    {"text": "Building on fire and people are trapped on the second floor",
     "category": "fire", "severity": "critical",
     "expected_high": True},
    # ── Low risk ──
    {"text": "Graffiti on the park wall",
     "category": "vandalism", "severity": "low",
     "expected_high": False},
    {"text": "Loud music from neighbor",
     "category": "noise_complaint", "severity": "low",
     "expected_high": False},
]


# ══════════════════════════════════════════════════════════
# TEST RUNNER
# ══════════════════════════════════════════════════════════

def run_classify_tests():
    print("\n" + "=" * 60)
    print("  CLASSIFICATION ACCURACY")
    print("=" * 60)

    correct = 0
    total = len(CLASSIFY_TESTS)
    failures = []

    for i, test in enumerate(CLASSIFY_TESTS):
        r = requests.post(f"{BASE}/classify", json={
            "text": test["text"],
        })
        result = r.json()
        predicted = result.get("predicted_category", "???")
        confidence = result.get("confidence", 0)
        is_correct = predicted == test["expected"]

        if is_correct:
            correct += 1
            status = "PASS"
        else:
            status = "FAIL"
            failures.append({
                "text": test["text"][:70] + "...",
                "expected": test["expected"],
                "predicted": predicted,
                "confidence": confidence,
                "all_scores": result.get("all_scores", {}),
            })

        print(f"  [{status}] {test['expected']:>22} | {predicted:>22} ({confidence:.2f}) | {test['text'][:55]}...")

    accuracy = correct / total * 100
    print(f"\n  Result: {correct}/{total} correct ({accuracy:.1f}%)")

    if failures:
        print(f"\n  Misclassified ({len(failures)}):")
        for f in failures:
            # Show top 3 scores for debugging
            top3 = sorted(f["all_scores"].items(), key=lambda x: x[1], reverse=True)[:3]
            scores_str = ", ".join(f"{k}={v:.2f}" for k, v in top3)
            print(f"    Expected: {f['expected']} | Got: {f['predicted']} ({f['confidence']:.2f})")
            print(f"      Top 3: {scores_str}")
            print(f"      Text: {f['text']}")

    return accuracy


def run_toxicity_tests():
    print("\n" + "=" * 60)
    print("  TOXICITY DETECTION ACCURACY")
    print("=" * 60)

    correct = 0
    total = len(TOXICITY_TESTS)
    failures = []

    for test in TOXICITY_TESTS:
        r = requests.post(f"{BASE}/toxicity", json={"text": test["text"]})
        result = r.json()
        detected = result.get("is_toxic", False)
        score = result.get("toxicity_score", 0)
        is_correct = detected == test["expected_toxic"]

        if is_correct:
            correct += 1
            status = "PASS"
        else:
            status = "FAIL"
            failures.append({
                "text": test["text"][:70],
                "expected": test["expected_toxic"],
                "detected": detected,
                "score": score,
                "details": result.get("details", {}),
            })

        label = "TOXIC" if test["expected_toxic"] else "CLEAN"
        print(f"  [{status}] {label:>5} | score={score:.3f} | flagged={detected} | {test['text'][:60]}...")

    accuracy = correct / total * 100
    print(f"\n  Result: {correct}/{total} correct ({accuracy:.1f}%)")

    if failures:
        print(f"\n  Failures ({len(failures)}):")
        for f in failures:
            expected_label = "should be TOXIC" if f["expected"] else "should be CLEAN"
            print(f"    {expected_label} (score={f['score']:.3f}): {f['text']}...")
            top = sorted(f["details"].items(), key=lambda x: x[1], reverse=True)[:3]
            print(f"      Top scores: {', '.join(f'{k}={v:.3f}' for k, v in top)}")

    return accuracy


def run_similarity_tests():
    print("\n" + "=" * 60)
    print("  DUPLICATE DETECTION ACCURACY")
    print("=" * 60)

    correct = 0
    total = len(SIMILARITY_TESTS)

    for test in SIMILARITY_TESTS:
        r = requests.post(f"{BASE}/similarity", json={
            "query_text": test["query"],
            "candidate_texts": [test["candidate"]],
            "threshold": 0.60,
        })
        result = r.json()
        score = result["similarities"][0]["score"]
        is_dup = result["similarities"][0]["is_duplicate"]
        is_correct = is_dup == test["expected_duplicate"]

        if is_correct:
            correct += 1
            status = "PASS"
        else:
            status = "FAIL"

        label = "DUP" if test["expected_duplicate"] else "DIFF"
        print(f"  [{status}] {label:>4} | sim={score:.3f} | dup={is_dup}")
        print(f"         Q: {test['query'][:60]}...")
        print(f"         C: {test['candidate'][:60]}...")

    accuracy = correct / total * 100
    print(f"\n  Result: {correct}/{total} correct ({accuracy:.1f}%)")
    return accuracy


def run_risk_tests():
    print("\n" + "=" * 60)
    print("  RISK SCORING ACCURACY")
    print("=" * 60)

    correct = 0
    total = len(RISK_TESTS)

    for test in RISK_TESTS:
        r = requests.post(f"{BASE}/risk", json={
            "text": test["text"],
            "category": test["category"],
            "severity": test["severity"],
        })
        result = r.json()
        risk = result.get("risk_score", 0)
        is_high = result.get("is_high_risk", False)
        is_correct = is_high == test["expected_high"]

        if is_correct:
            correct += 1
            status = "PASS"
        else:
            status = "FAIL"

        label = "HIGH" if test["expected_high"] else "LOW"
        print(f"  [{status}] {label:>4} | risk={risk:.2f} | high={is_high} | {test['text'][:55]}...")

    accuracy = correct / total * 100
    print(f"\n  Result: {correct}/{total} correct ({accuracy:.1f}%)")
    return accuracy


def run_full_pipeline_test():
    """Test /analyze endpoint with a realistic report."""
    print("\n" + "=" * 60)
    print("  FULL PIPELINE TEST (/analyze)")
    print("=" * 60)

    test_reports = [
        {
            "text": "Someone smashed my car window and stole my backpack from the back seat. "
                    "This happened around 10pm in the Target parking lot on Elm Street.",
            "expected_category": "theft",
        },
        {
            "text": "Two men were fighting outside the convenience store. One had a knife. "
                    "Bystanders were trying to break them up but it was getting violent.",
            "expected_category": "assault",
        },
        {
            "text": "I smell gas near the construction site on 4th avenue. "
                    "There might be a broken gas line. Please send someone to check.",
            "expected_category": "hazard",
        },
    ]

    for report in test_reports:
        t = time.time()
        r = requests.post(f"{BASE}/analyze", json={"text": report["text"]})
        elapsed = time.time() - t
        result = r.json()

        clf = result.get("classification", {})
        tox = result.get("toxicity", {})
        risk = result.get("risk", {})

        cat = clf.get("predicted_category", "???")
        conf = clf.get("confidence", 0)
        match = "PASS" if cat == report["expected_category"] else "FAIL"

        print(f"\n  [{match}] \"{report['text'][:70]}...\"")
        print(f"    Category:  {cat} ({conf:.2f}) — expected: {report['expected_category']}")
        print(f"    Toxic:     {tox.get('is_toxic', '?')} (score={tox.get('toxicity_score', 0):.3f})")
        print(f"    Risk:      {risk.get('risk_score', 0):.2f} (high={risk.get('is_high_risk', '?')})")
        print(f"    Latency:   {elapsed*1000:.0f}ms")


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("SafeSignal ML Accuracy Test Suite")
    print("=" * 60)

    # Warmup
    requests.post(f"{BASE}/classify", json={"text": "warmup", "categories": ["test"]})
    requests.post(f"{BASE}/toxicity", json={"text": "warmup"})

    t_start = time.time()

    acc_classify = run_classify_tests()
    acc_toxicity = run_toxicity_tests()
    acc_similarity = run_similarity_tests()
    acc_risk = run_risk_tests()
    run_full_pipeline_test()

    elapsed = time.time() - t_start

    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"  Classification:     {acc_classify:.1f}%")
    print(f"  Toxicity Detection: {acc_toxicity:.1f}%")
    print(f"  Duplicate Detection:{acc_similarity:.1f}%")
    print(f"  Risk Scoring:       {acc_risk:.1f}%")
    print(f"  Total time:         {elapsed:.1f}s")
    print("=" * 60)
