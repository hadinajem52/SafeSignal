import types
import unittest

from fastapi import HTTPException

import main
from providers.gemini import (
    GeminiProvider,
    _extract_insight_text,
    _get_finish_reason_name,
    _validate_insight_text,
)


class ExtractInsightTextTests(unittest.TestCase):
    def test_extracts_json_after_lead_in(self):
        text = 'Here is the JSON requested:\n{"insight":"SLA compliance fell to 74% while theft reports led with 18 incidents."}'
        self.assertEqual(
            _extract_insight_text(text),
            "SLA compliance fell to 74% while theft reports led with 18 incidents.",
        )

    def test_extracts_plain_text_after_lead_in(self):
        text = (
            "Here is the insight:\n"
            "SLA compliance dropped to 74%, and Downtown accounted for 12 of the 38 reports."
        )
        self.assertEqual(
            _extract_insight_text(text),
            "SLA compliance dropped to 74%, and Downtown accounted for 12 of the 38 reports.",
        )

    def test_extracts_json_string_payload(self):
        text = '"SLA compliance dropped to 74%, and Downtown accounted for 12 of the 38 reports."'
        self.assertEqual(
            _extract_insight_text(text),
            "SLA compliance dropped to 74%, and Downtown accounted for 12 of the 38 reports.",
        )

    def test_rejects_incomplete_plain_text(self):
        with self.assertRaises(ValueError):
            _validate_insight_text("SLA compliance is critically low at")


class GeminiResponseHelpersTests(unittest.TestCase):
    def test_get_finish_reason_name_returns_enum_name(self):
        response = types.SimpleNamespace(
            candidates=[types.SimpleNamespace(finish_reason=types.SimpleNamespace(name="STOP"))]
        )

        self.assertEqual(_get_finish_reason_name(response), "STOP")

    def test_get_finish_reason_name_handles_missing_candidates(self):
        response = types.SimpleNamespace(candidates=[])
        self.assertIsNone(_get_finish_reason_name(response))


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
        self.assertIsNone(response.insight)

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

    async def test_returns_supported_response_for_gemini(self):
        provider = GeminiProvider.__new__(GeminiProvider)

        async def fake_generate_insights(self, stats):
            return "Reports peaked on Tuesday at 14:00, and SLA compliance held at 92%."

        provider.generate_insights = types.MethodType(fake_generate_insights, provider)
        main.active_provider = provider

        response = await main.generate_insights(
            main.InsightsRequest(period="30d", total_incidents=10, kpis={})
        )

        self.assertTrue(response.supported)
        self.assertEqual(
            response.insight,
            "Reports peaked on Tuesday at 14:00, and SLA compliance held at 92%.",
        )


if __name__ == "__main__":
    unittest.main()
