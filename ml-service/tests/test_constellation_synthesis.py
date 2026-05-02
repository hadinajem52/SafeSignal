import unittest

from services.constellation_synthesis import (
    build_prompt,
    normalize_result,
    synthesize_constellation,
)


class ConstellationSynthesisServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_prompt_covers_note_signal_consistency_and_downweighting(self):
        prompt = build_prompt(
            {
                "constellation_id": 1,
                "incident_metadata": {},
                "corroborations": [],
            }
        )

        self.assertIn("consistent with its selected signal_type", prompt)
        self.assertIn("Downweight signals", prompt)
        self.assertIn("Never include verbatim witness note content", prompt)

    def test_normalize_result_rejects_bad_enums(self):
        with self.assertRaises(ValueError):
            normalize_result(
                {
                    "confidence_state": "bad_state",
                    "confidence_score": 0.5,
                    "ongoing_assessment": "unknown",
                    "cluster_match_incident_ids": [],
                }
            )

    async def test_unavailable_provider_raises_clear_error(self):
        class Provider:
            async def synthesize_constellation(self, prompt):
                return None

        with self.assertRaises(RuntimeError):
            await synthesize_constellation(Provider(), {"constellation_id": 1})

    async def test_successful_provider_output_is_normalized(self):
        class Provider:
            async def synthesize_constellation(self, prompt):
                return {
                    "confidence_state": "corroborated",
                    "confidence_score": 0.81234,
                    "summary": "Several witnesses reported consistent activity.",
                    "supporting_signals": 3,
                    "contradicting_signals": 0,
                    "ongoing_assessment": "ongoing",
                    "anomaly_flagged": False,
                    "cluster_match_incident_ids": [],
                }

        result = await synthesize_constellation(Provider(), {"constellation_id": 1})

        self.assertEqual(result["confidence_state"], "corroborated")
        self.assertEqual(result["confidence_score"], 0.812)
        self.assertEqual(result["cluster_match_incident_ids"], [])


if __name__ == "__main__":
    unittest.main()
