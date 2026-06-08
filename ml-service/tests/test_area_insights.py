import importlib.util
import sys
import types
import unittest

from fastapi import HTTPException
from pydantic import ValidationError

# ── Stub heavy/optional deps so `import main` works without google-genai/torch ──
try:
    has_google = importlib.util.find_spec("google") is not None
    has_genai = importlib.util.find_spec("google.genai") is not None
    if not has_google or not has_genai:
        raise ImportError
except Exception:
    google_module = sys.modules.get("google") or types.ModuleType("google")
    if not hasattr(google_module, "__path__"):
        google_module.__path__ = []
    genai_module = types.ModuleType("google.genai")
    genai_module.Client = object
    genai_module.types = types.SimpleNamespace()
    google_module.genai = genai_module
    sys.modules["google"] = google_module
    sys.modules["google.genai"] = genai_module

for module_name, class_names in {
    "models.embeddings": ("EmbeddingModel",),
    "models.classifier": ("CategoryClassifier",),
    "models.toxicity": ("ToxicityDetector",),
    "models.risk": ("RiskScorer",),
}.items():
    module = types.ModuleType(module_name)
    for class_name in class_names:
        setattr(module, class_name, object)
    sys.modules.setdefault(module_name, module)

cache_module = types.ModuleType("cache_manager")


class DummyCache:
    stats = {"backend": "test"}

    def __init__(self, *args, **kwargs):
        pass

    def get(self, *args, **kwargs):
        return None

    def set(self, *args, **kwargs):
        return None

    def clear_prefix(self, *args, **kwargs):
        return 0

    def invalidate_on_model_update(self, *args, **kwargs):
        return 0

    def reconnect(self):
        return False


cache_module.RedisCacheManager = DummyCache
cache_module.InMemoryLRUCache = DummyCache
sys.modules.setdefault("cache_manager", cache_module)

import main
from providers.gemini import GeminiProvider, _extract_area_insight


def _payload(**overrides):
    base = dict(radius_km=1, window_days=7, total=3)
    base.update(overrides)
    return main.AreaInsightsRequest(**base)


class AreaInsightExtractTests(unittest.TestCase):
    def test_accepts_valid_payload(self):
        text = (
            '{"headline":"Evening thefts nearby",'
            '"summary":"2 thefts reported within 1 km this week.",'
            '"tip":"Keep bags zipped on evening walks.",'
            '"level":"caution"}'
        )
        self.assertEqual(
            _extract_area_insight(text),
            {
                "headline": "Evening thefts nearby",
                "summary": "2 thefts reported within 1 km this week.",
                "tip": "Keep bags zipped on evening walks.",
                "level": "caution",
            },
        )

    def test_rejects_invalid_level(self):
        with self.assertRaises(ValueError):
            _extract_area_insight('{"headline":"h","summary":"s","tip":"t","level":"panic"}')

    def test_rejects_missing_keys(self):
        with self.assertRaises(ValueError):
            _extract_area_insight('{"headline":"only headline"}')

    def test_caps_field_length(self):
        long_summary = "x" * 1000
        result = _extract_area_insight(
            '{"headline":"h","summary":"' + long_summary + '","tip":"t","level":"calm"}'
        )
        self.assertLessEqual(len(result["summary"]), 320)


class AreaInsightsEndpointTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.previous_provider = main.active_provider

    def tearDown(self):
        main.active_provider = self.previous_provider

    async def test_unsupported_for_non_gemini_provider(self):
        main.active_provider = object()
        response = await main.generate_area_insights(_payload())
        self.assertFalse(response.supported)
        self.assertIsNone(response.insight)

    async def test_returns_insight_for_gemini(self):
        provider = GeminiProvider.__new__(GeminiProvider)
        expected = {
            "headline": "Evening thefts nearby",
            "summary": "2 thefts within 1 km in 7 days.",
            "tip": "Keep valuables out of sight after dark.",
            "level": "caution",
        }

        async def fake(self, payload):
            return expected

        provider.generate_area_insights = types.MethodType(fake, provider)
        main.active_provider = provider

        response = await main.generate_area_insights(_payload())
        self.assertTrue(response.supported)
        self.assertEqual(response.insight.headline, expected["headline"])
        self.assertEqual(response.insight.level, "caution")

    async def test_raises_when_generation_fails(self):
        provider = GeminiProvider.__new__(GeminiProvider)

        async def fake(self, payload):
            return None

        provider.generate_area_insights = types.MethodType(fake, provider)
        main.active_provider = provider

        with self.assertRaises(HTTPException) as ctx:
            await main.generate_area_insights(_payload())
        self.assertEqual(ctx.exception.status_code, 503)

    def test_request_rejects_bad_trend(self):
        with self.assertRaises(ValidationError):
            main.AreaInsightsRequest(radius_km=1, window_days=7, total=0, trend="exploding")


if __name__ == "__main__":
    unittest.main()
