import json
import importlib.util
import sys
import types
import unittest

from fastapi import HTTPException

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

models = {
    "models.embeddings": ("EmbeddingModel",),
    "models.classifier": ("CategoryClassifier",),
    "models.toxicity": ("ToxicityDetector",),
    "models.risk": ("RiskScorer",),
}
for module_name, class_names in models.items():
    module = types.ModuleType(module_name)
    for class_name in class_names:
        setattr(module, class_name, object)
    sys.modules[module_name] = module

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
sys.modules["cache_manager"] = cache_module

import main
from providers.gemini import GeminiProvider


class MediaAnalysisEndpointTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.previous_provider = main.active_provider

    def tearDown(self):
        main.active_provider = self.previous_provider

    async def test_no_media_returns_insufficient_media_judgment(self):
        main.active_provider = object()

        response = await main.analyze_report_media(
            metadata='{"report":{"title":"Smoke","description":"Smoke in alley"}}',
            files=[],
        )

        self.assertTrue(response.supported)
        self.assertEqual(response.status, "completed")
        self.assertEqual(response.judgment["overallVerdict"], "insufficient_media")

    async def test_local_provider_returns_unsupported_when_files_are_present(self):
        main.active_provider = object()

        response = await main.analyze_report_media(
            metadata='{"report":{"title":"Smoke","description":"Smoke in alley"}}',
            files=[object()],
        )

        self.assertFalse(response.supported)
        self.assertEqual(response.status, "unsupported")

    async def test_invalid_metadata_rejected(self):
        main.active_provider = object()

        with self.assertRaises(HTTPException) as context:
            await main.analyze_report_media(metadata="{bad-json", files=[])

        self.assertEqual(context.exception.status_code, 400)


class GeminiMediaJudgmentTests(unittest.IsolatedAsyncioTestCase):
    async def test_valid_gemini_json_is_normalized(self):
        provider = GeminiProvider.__new__(GeminiProvider)
        provider._gen_config = object()

        expected = {
            "overallVerdict": "supports_report",
            "validityRecommendation": "likely_valid",
            "confidence": 0.87,
            "descriptionAlignment": {
                "matchedDetails": ["smoke visible"],
                "missingDetails": [],
                "contradictions": [],
                "reasoning": "The image shows smoke consistent with the report.",
            },
            "duplicateMediaAlignment": {
                "alignment": "not_applicable",
                "confidence": 0,
                "reasoning": "No duplicate media was provided.",
            },
            "evidenceSummary": {
                "photoCount": 1,
                "videoPresent": False,
                "observedScene": "Smoke near a building entrance.",
                "limitations": [],
            },
        }

        def generate_content(**_kwargs):
            return types.SimpleNamespace(text=json.dumps(expected))

        async def build_media_parts(_self, _media_files):
            return ["media"], []

        provider._client = types.SimpleNamespace(
            models=types.SimpleNamespace(generate_content=generate_content),
            files=types.SimpleNamespace(delete=lambda name: None),
        )
        provider._build_media_parts = types.MethodType(build_media_parts, provider)

        result = await provider.analyze_report_media(
            {"report": {"title": "Smoke", "description": "Smoke in alley"}},
            [{"path": "unused", "mime_type": "image/jpeg", "size": 10}],
        )

        self.assertEqual(result["overallVerdict"], "supports_report")
        self.assertEqual(result["confidence"], 0.87)
        self.assertEqual(result["descriptionAlignment"]["matchedDetails"], ["smoke visible"])

    async def test_invalid_gemini_json_raises(self):
        provider = GeminiProvider.__new__(GeminiProvider)
        provider._gen_config = object()

        def generate_content(**_kwargs):
            return types.SimpleNamespace(text="not json")

        async def build_media_parts(_self, _media_files):
            return ["media"], []

        provider._client = types.SimpleNamespace(
            models=types.SimpleNamespace(generate_content=generate_content),
            files=types.SimpleNamespace(delete=lambda name: None),
        )
        provider._build_media_parts = types.MethodType(build_media_parts, provider)

        with self.assertRaises(ValueError):
            await provider.analyze_report_media(
                {"report": {"title": "Smoke", "description": "Smoke in alley"}},
                [{"path": "unused", "mime_type": "image/jpeg", "size": 10}],
            )


if __name__ == "__main__":
    unittest.main()
