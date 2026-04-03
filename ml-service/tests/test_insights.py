import types
import unittest
import sys

from fastapi import HTTPException
from pydantic import ValidationError

if "google.genai" not in sys.modules:
    google_module = sys.modules.setdefault("google", types.ModuleType("google"))
    genai_module = types.ModuleType("google.genai")
    genai_module.Client = object
    genai_module.types = types.SimpleNamespace()
    google_module.genai = genai_module
    sys.modules["google.genai"] = genai_module

import main
from providers.gemini import (
    GeminiProvider,
    _extract_insight_sections,
    _get_finish_reason_name,
)


class GeminiResponseHelpersTests(unittest.TestCase):
    def test_get_finish_reason_name_returns_enum_name(self):
        response = types.SimpleNamespace(
            candidates=[
                types.SimpleNamespace(finish_reason=types.SimpleNamespace(name="STOP"))
            ]
        )

        self.assertEqual(_get_finish_reason_name(response), "STOP")

    def test_get_finish_reason_name_handles_missing_candidates(self):
        response = types.SimpleNamespace(candidates=[])
        self.assertIsNone(_get_finish_reason_name(response))

    def test_extract_insight_sections_accepts_json_payload(self):
        text = (
            '{"priority":"SLA compliance fell to 74%.",'
            '"trend":"Incident volume rose 12% week over week.",'
            '"pattern":"Theft reports clustered in Downtown.",'
            '"funnel_health":"Closures are lagging behind new reports."}'
        )

        self.assertEqual(
            _extract_insight_sections(text),
            {
                "priority": "SLA compliance fell to 74%.",
                "trend": "Incident volume rose 12% week over week.",
                "pattern": "Theft reports clustered in Downtown.",
                "funnel_health": "Closures are lagging behind new reports.",
            },
        )

    def test_extract_insight_sections_rejects_missing_keys(self):
        with self.assertRaises(ValueError):
            _extract_insight_sections('{"priority":"Only one field"}')


class InsightsEndpointTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.previous_provider = main.active_provider

    def tearDown(self):
        main.active_provider = self.previous_provider

    async def test_returns_unsupported_for_non_gemini_provider(self):
        main.active_provider = object()

        response = await main.generate_insights(
            main.InsightsRequest(period="30d", total_incidents=10, kpis={})
        )

        self.assertFalse(response.supported)
        self.assertIsNone(response.sections)

    async def test_raises_when_gemini_generation_fails(self):
        provider = GeminiProvider.__new__(GeminiProvider)

        async def fake_generate_insights(self, stats):
            return None

        provider.generate_insights = types.MethodType(fake_generate_insights, provider)
        main.active_provider = provider

        with self.assertRaises(HTTPException) as context:
            await main.generate_insights(
                main.InsightsRequest(period="30d", total_incidents=10, kpis={})
            )

        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, "Failed to generate insights")

    async def test_returns_sections_for_gemini(self):
        provider = GeminiProvider.__new__(GeminiProvider)
        expected_sections = {
            "priority": "SLA compliance dropped to 74%, which is the most urgent operational issue.",
            "trend": "Incident volume increased in the second half of the selected period.",
            "pattern": "Theft remained the dominant category and concentrated around Downtown.",
            "funnel_health": "Resolution flow is lagging because actioned incidents are not closing fast enough.",
        }

        async def fake_generate_insights(self, stats):
            return expected_sections

        provider.generate_insights = types.MethodType(fake_generate_insights, provider)
        main.active_provider = provider

        response = await main.generate_insights(
            main.InsightsRequest(period="30d", total_incidents=10, kpis={})
        )

        self.assertTrue(response.supported)
        self.assertEqual(response.sections.priority, expected_sections["priority"])
        self.assertEqual(response.sections.trend, expected_sections["trend"])
        self.assertEqual(response.sections.pattern, expected_sections["pattern"])
        self.assertEqual(
            response.sections.funnel_health,
            expected_sections["funnel_health"],
        )

    async def test_raises_when_provider_returns_invalid_sections_shape(self):
        provider = GeminiProvider.__new__(GeminiProvider)

        async def fake_generate_insights(self, stats):
            return "plain text instead of a sections object"

        provider.generate_insights = types.MethodType(fake_generate_insights, provider)
        main.active_provider = provider

        with self.assertRaises(HTTPException) as context:
            await main.generate_insights(
                main.InsightsRequest(period="30d", total_incidents=10, kpis={})
            )

        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, "Failed to generate insights")

    def test_insightsrequest_rejects_bad_period(self):
        with self.assertRaises(ValidationError):
            main.InsightsRequest(period="60d", total_incidents=10, kpis={})


if __name__ == "__main__":
    unittest.main()
