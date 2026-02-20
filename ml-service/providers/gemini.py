"""
GeminiProvider — Google Generative AI inference backend.
Handles classification, toxicity, risk, embeddings, and LLM-only features.
Every API call has: a timeout, exponential backoff retries, and strict JSON validation.
"""
import asyncio
import json
import logging
import re
from typing import Dict, List, Optional

import numpy as np

from google import genai
from google.genai import types

import config
from providers.base import BaseProvider
from utils.pii_redactor import redact

logger = logging.getLogger(__name__)


# ── JSON extraction ───────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """
    Parse JSON from a model response, tolerating markdown code fences.
    Raises ValueError if no valid JSON found — never returns a partial result.
    """
    # 1. Direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # 2. Strip markdown fences and retry
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not extract valid JSON from response: {text[:300]!r}")


def _require_keys(data: dict, keys: List[str], context: str) -> None:
    """Raise ValueError listing every missing required key."""
    missing = [k for k in keys if k not in data]
    if missing:
        raise ValueError(f"Gemini {context} response missing keys: {missing}")


# ── Cosine similarity ─────────────────────────────────────────────────────────

def _cosine_similarity_batch(query_vec: List[float], candidate_vecs: List[List[float]]) -> List[float]:
    """Return cosine similarity between query and each candidate."""
    q = np.array(query_vec, dtype=np.float32)
    q_norm = np.linalg.norm(q)
    if q_norm == 0:
        return [0.0] * len(candidate_vecs)
    q = q / q_norm
    scores = []
    for vec in candidate_vecs:
        c = np.array(vec, dtype=np.float32)
        c_norm = np.linalg.norm(c)
        if c_norm == 0:
            scores.append(0.0)
        else:
            scores.append(float(np.dot(q, c / c_norm)))
    return scores


# ── System prompts ────────────────────────────────────────────────────────────

_CLASSIFY_SYSTEM = """\
You are an incident classification system for a public safety platform.
Given a user-submitted incident report, classify it into exactly one of the provided categories.

Respond with ONLY a JSON object in this exact format — no extra text:
{
  "predicted_category": "<category>",
  "confidence": <float 0-1>,
  "all_scores": {"<category>": <float>, ...}
}

Rules:
- predicted_category MUST be one of the provided categories, spelled exactly
- confidence is your confidence in the top prediction (0–1)
- all_scores must include every provided category with a float score; values should sum to ~1.0
"""

_TOXICITY_SYSTEM = """\
You are a content moderation classifier for public safety incident reports.
Analyze the text for toxicity in the context of a citizen safety report.

Respond with ONLY a JSON object in this exact format — no extra text:
{
  "is_toxic": <true|false>,
  "toxicity_score": <float 0-1>,
  "is_severe": <true|false>,
  "details": {
    "toxicity": <float 0-1>,
    "severe_toxicity": <float 0-1>,
    "insult": <float 0-1>,
    "threat": <float 0-1>,
    "identity_attack": <float 0-1>
  }
}

is_severe is true when toxicity_score >= 0.75.
"""

_RISK_SYSTEM = """\
You are a public safety risk scoring system.
Given an incident report and optional context, assign a risk score from 0 to 1.

Respond with ONLY a JSON object in this exact format — no extra text:
{
  "risk_score": <float 0-1>,
  "is_high_risk": <true|false>,
  "is_critical": <true|false>,
  "breakdown": {
    "category_score": <float 0-1>,
    "severity_score": <float 0-1>,
    "keyword_score": <float 0-1>,
    "urgency_score": <float 0-1>
  }
}

is_high_risk is true when risk_score >= 0.50.
is_critical is true when risk_score >= 0.80.
"""

_ANALYZE_SYSTEM = """\
You are a combined incident analysis system for a public safety platform.
Perform full analysis of the incident report and return a single structured JSON result.

Respond with ONLY a JSON object in this exact format — no extra text:
{
  "classification": {
    "predicted_category": "<category>",
    "confidence": <float 0-1>,
    "all_scores": {"<category>": <float>}
  },
  "toxicity": {
    "is_toxic": <bool>,
    "toxicity_score": <float 0-1>,
    "is_severe": <bool>,
    "details": {
      "toxicity": <float>,
      "severe_toxicity": <float>,
      "insult": <float>,
      "threat": <float>,
      "identity_attack": <float>
    }
  },
  "risk": {
    "risk_score": <float 0-1>,
    "is_high_risk": <bool>,
    "is_critical": <bool>,
    "breakdown": {
      "category_score": <float>,
      "severity_score": <float>,
      "keyword_score": <float>,
      "urgency_score": <float>
    }
  },
  "summary": "<one concise sentence describing the incident>",
  "spam_flag": <bool>,
  "dispatch_suggestion": "<brief dispatch recommendation, or null if not applicable>",
  "entities": {
    "weapon_type": "<string or null>",
    "vehicle_description": "<string or null>",
    "suspect_description": "<string or null>"
  }
}

is_high_risk is true when risk_score >= 0.50. is_critical is true when risk_score >= 0.80.
spam_flag is true if the report appears fake, a test submission, or coordinated noise.
"""


# ── Provider ──────────────────────────────────────────────────────────────────

class GeminiProvider(BaseProvider):

    def __init__(self):
        if not config.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Cannot use ML_PROVIDER=gemini."
            )
        self._client = genai.Client(api_key=config.GEMINI_API_KEY)
        self._gen_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,  # deterministic output
        )
        logger.info(f"GeminiProvider initialized — model: {config.GEMINI_CHAT_MODEL}")

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _call(self, prompt: str) -> dict:
        """
        Call Gemini with timeout and exponential backoff.
        Raises RuntimeError after all retries are exhausted.
        """
        last_error: Exception = RuntimeError("Unknown error")
        for attempt in range(config.GEMINI_MAX_RETRIES + 1):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._client.models.generate_content,
                        model=config.GEMINI_CHAT_MODEL,
                        contents=prompt,
                        config=self._gen_config,
                    ),
                    timeout=config.GEMINI_TIMEOUT_SECONDS,
                )
                return _extract_json(response.text)
            except asyncio.TimeoutError as e:
                last_error = e
                logger.warning(
                    "Gemini call timed out (attempt %d/%d)",
                    attempt + 1,
                    config.GEMINI_MAX_RETRIES + 1,
                )
            except (ValueError, Exception) as e:
                last_error = e
                logger.warning(
                    "Gemini call failed (attempt %d/%d): %s",
                    attempt + 1,
                    config.GEMINI_MAX_RETRIES + 1,
                    e,
                )
            if attempt < config.GEMINI_MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)  # 1 s → 2 s backoff

        raise RuntimeError(
            f"Gemini failed after {config.GEMINI_MAX_RETRIES + 1} attempts: {last_error}"
        )

    def _build_prompt(self, system: str, user: str) -> str:
        return f"{system}\n\n---\n\nIncident report:\n{user}"

    # ── BaseProvider implementation ───────────────────────────────────────────

    async def classify(self, text: str, categories: List[str]) -> Dict:
        safe = redact(text)
        prompt = self._build_prompt(
            _CLASSIFY_SYSTEM,
            f"Categories: {', '.join(categories)}\n\nText: {safe}",
        )
        result = await self._call(prompt)
        _require_keys(result, ["predicted_category", "confidence", "all_scores"], "classify")
        if result["predicted_category"] not in categories:
            raise ValueError(
                f"Gemini returned unknown category: {result['predicted_category']!r}. "
                f"Valid: {categories}"
            )
        return {
            "predicted_category": result["predicted_category"],
            "confidence": round(float(result["confidence"]), 4),
            "all_scores": {
                k: round(float(v), 4) for k, v in result["all_scores"].items()
            },
        }

    async def detect_toxicity(self, text: str) -> Dict:
        safe = redact(text)
        result = await self._call(self._build_prompt(_TOXICITY_SYSTEM, safe))
        _require_keys(result, ["is_toxic", "toxicity_score", "is_severe", "details"], "toxicity")
        return {
            "is_toxic": bool(result["is_toxic"]),
            "toxicity_score": round(float(result["toxicity_score"]), 4),
            "is_severe": bool(result["is_severe"]),
            "details": {k: round(float(v), 4) for k, v in result["details"].items()},
        }

    async def compute_risk(
        self,
        text: str,
        category: Optional[str],
        severity: Optional[str],
        duplicate_count: int,
        toxicity_score: float,
    ) -> Dict:
        safe = redact(text)
        context = (
            f"Category: {category or 'unknown'}\n"
            f"Severity: {severity or 'unknown'}\n"
            f"Duplicate report count: {duplicate_count}\n"
            f"Prior toxicity score: {toxicity_score:.2f}\n\n"
            f"Incident text: {safe}"
        )
        result = await self._call(self._build_prompt(_RISK_SYSTEM, context))
        _require_keys(result, ["risk_score", "is_high_risk", "is_critical", "breakdown"], "risk")
        return {
            "risk_score": round(float(result["risk_score"]), 4),
            "is_high_risk": bool(result["is_high_risk"]),
            "is_critical": bool(result["is_critical"]),
            "breakdown": {k: round(float(v), 4) for k, v in result["breakdown"].items()},
        }

    async def embed(self, text: str) -> List[float]:
        safe = redact(text)
        result = await asyncio.wait_for(
            asyncio.to_thread(
                self._client.models.embed_content,
                model=config.GEMINI_EMBEDDING_MODEL,
                contents=safe,
            ),
            timeout=config.GEMINI_TIMEOUT_SECONDS,
        )
        return list(result.embeddings[0].values)

    async def batch_similarity(
        self, query_text: str, candidate_texts: List[str]
    ) -> List[float]:
        if not candidate_texts:
            return []
        safe_query = redact(query_text)
        safe_candidates = [redact(t) for t in candidate_texts]

        # Embed query and all candidates in two parallel API calls.
        query_result, cand_result = await asyncio.gather(
            asyncio.wait_for(
                asyncio.to_thread(
                    self._client.models.embed_content,
                    model=config.GEMINI_EMBEDDING_MODEL,
                    contents=safe_query,
                ),
                timeout=config.GEMINI_TIMEOUT_SECONDS,
            ),
            asyncio.wait_for(
                asyncio.to_thread(
                    self._client.models.embed_content,
                    model=config.GEMINI_EMBEDDING_MODEL,
                    contents=safe_candidates,
                ),
                timeout=config.GEMINI_TIMEOUT_SECONDS,
            ),
        )

        query_vec = list(query_result.embeddings[0].values)
        # New SDK returns one embedding per item in contents list
        cand_vecs = [list(e.values) for e in cand_result.embeddings]

        return _cosine_similarity_batch(query_vec, cand_vecs)

    async def full_analyze(
        self,
        text: str,
        category: Optional[str],
        severity: Optional[str],
        duplicate_count: int,
        categories: List[str],
    ) -> Dict:
        """
        Single Gemini API call that returns all analysis fields at once.
        This is the primary advantage of the Gemini provider over local.
        """
        safe = redact(text)
        context = (
            f"Available categories: {', '.join(categories)}\n"
            f"Severity hint (if known): {severity or 'unknown'}\n"
            f"Duplicate report count: {duplicate_count}\n\n"
            f"Incident report: {safe}"
        )
        result = await self._call(self._build_prompt(_ANALYZE_SYSTEM, context))

        # Validate and normalise each sub-section defensively.
        classification = None
        if "classification" in result and result["classification"]:
            c = result["classification"]
            _require_keys(c, ["predicted_category", "confidence", "all_scores"], "analyze.classification")
            if c["predicted_category"] not in categories:
                logger.warning(
                    "Gemini returned unknown classify category in analyze: %s",
                    c["predicted_category"],
                )
                c["predicted_category"] = categories[0]
            classification = {
                "predicted_category": c["predicted_category"],
                "confidence": round(float(c["confidence"]), 4),
                "all_scores": {k: round(float(v), 4) for k, v in c["all_scores"].items()},
            }

        toxicity = None
        if "toxicity" in result and result["toxicity"]:
            t = result["toxicity"]
            _require_keys(t, ["is_toxic", "toxicity_score", "is_severe", "details"], "analyze.toxicity")
            toxicity = {
                "is_toxic": bool(t["is_toxic"]),
                "toxicity_score": round(float(t["toxicity_score"]), 4),
                "is_severe": bool(t["is_severe"]),
                "details": {k: round(float(v), 4) for k, v in t["details"].items()},
            }

        risk = None
        if "risk" in result and result["risk"]:
            r = result["risk"]
            _require_keys(r, ["risk_score", "is_high_risk", "is_critical", "breakdown"], "analyze.risk")
            risk = {
                "risk_score": round(float(r["risk_score"]), 4),
                "is_high_risk": bool(r["is_high_risk"]),
                "is_critical": bool(r["is_critical"]),
                "breakdown": {k: round(float(v), 4) for k, v in r["breakdown"].items()},
            }

        return {
            "classification": classification,
            "toxicity": toxicity,
            "risk": risk,
            "summary": result.get("summary"),
            "spam_flag": result.get("spam_flag"),
            "dispatch_suggestion": result.get("dispatch_suggestion"),
            "entities": result.get("entities"),
        }

    async def is_ready(self) -> bool:
        """
        Probe: attempt to list models from the API.
        Returns True if the API key is valid and the network is reachable.
        """
        try:
            await asyncio.wait_for(
                # list() is a pager; pull one item to confirm connectivity.
                asyncio.to_thread(lambda: next(iter(self._client.models.list()), None)),
                timeout=3.0,
            )
            return True
        except Exception as e:
            logger.warning(f"GeminiProvider.is_ready probe failed: {e}")
            return False
