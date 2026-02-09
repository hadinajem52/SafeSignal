import logging
import re
from typing import Dict, Optional

import config

logger = logging.getLogger(__name__)

# High-risk keywords with weights.
HIGH_RISK_KEYWORDS = {
    "active shooter": 0.35,
    "hostage": 0.30,
    "bomb": 0.30,
    "explosion": 0.25,
    "gun": 0.20,
    "weapon": 0.18,
    "knife": 0.16,
    "stabbing": 0.20,
    "shooting": 0.22,
    "shot": 0.12,
    "fire": 0.14,
    "burning": 0.16,
    "blaze": 0.16,
    "flames": 0.16,
    "smoke": 0.10,
    "gas leak": 0.18,
    "unconscious": 0.16,
    "not breathing": 0.20,
    "choking": 0.16,
    "seizure": 0.14,
    "heart attack": 0.22,
    "bleeding": 0.12,
    "blood": 0.10,
    "kidnap": 0.24,
}

URGENT_CONTEXT_KEYWORDS = {
    "trapped": 0.18,
    "family": 0.08,
    "children": 0.12,
    "child": 0.12,
    "school": 0.10,
    "crowd": 0.10,
    "multiple people": 0.12,
    "spreading": 0.10,
    "escalating": 0.08,
}

DEESCALATION_PHRASES = (
    "no injuries",
    "minor injuries only",
    "already contained",
    "already under control",
    "fire is out",
    "resolved",
)

# Category base risk scores
CATEGORY_RISK = {
    "fire": 0.72,
    "medical_emergency": 0.70,
    "assault": 0.65,
    "hazard": 0.52,
    "traffic_incident": 0.48,
    "theft": 0.40,
    "suspicious_activity": 0.36,
    "vandalism": 0.30,
    "noise_complaint": 0.22,
    "other": 0.25,
}

# Severity multipliers
SEVERITY_MULTIPLIER = {
    "critical": 1.0,
    "high": 0.8,
    "medium": 0.5,
    "low": 0.3,
}


class RiskScorer:
    def __init__(self):
        self.keywords = getattr(config, "RISK_HIGH_RISK_KEYWORDS", HIGH_RISK_KEYWORDS)
        self.urgent_keywords = getattr(
            config, "RISK_URGENT_CONTEXT_KEYWORDS", URGENT_CONTEXT_KEYWORDS
        )
        self.deescalation_phrases = getattr(
            config, "RISK_DEESCALATION_PHRASES", DEESCALATION_PHRASES
        )
        self.category_risk = getattr(config, "RISK_CATEGORY_BASE_SCORES", CATEGORY_RISK)
        self.severity_mult = getattr(config, "RISK_SEVERITY_MULTIPLIER", SEVERITY_MULTIPLIER)
        self.weights = getattr(
            config,
            "RISK_COMPONENT_WEIGHTS",
            {
                "category": 0.28,
                "severity": 0.26,
                "keyword": 0.28,
                "urgency": 0.10,
                "duplicate": 0.05,
                "toxicity": 0.05,
            },
        )
        self.caps = getattr(
            config,
            "RISK_CAPS",
            {
                "keyword": 0.60,
                "urgency": 0.25,
                "duplicate": 0.18,
                "toxicity": 0.12,
                "deescalation": 0.12,
            },
        )
        self.duplicate_step = getattr(config, "RISK_DUPLICATE_STEP", 0.04)
        self.toxicity_multiplier = getattr(config, "RISK_TOXICITY_MULTIPLIER", 0.25)
        self.synergy_boost_value = getattr(config, "RISK_SYNERGY_BOOST", 0.08)
        self.high_threshold = getattr(config, "RISK_HIGH_THRESHOLD", 0.5)
        self.critical_threshold = getattr(config, "RISK_CRITICAL_THRESHOLD", 0.8)

    @staticmethod
    def _contains_phrase(text: str, phrase: str) -> bool:
        if " " in phrase:
            return phrase in text
        return re.search(rf"\b{re.escape(phrase)}\b", text) is not None

    def _weighted_match_score(self, text: str, weighted_terms: Dict[str, float], cap: float) -> float:
        total = 0.0
        for term, weight in weighted_terms.items():
            if self._contains_phrase(text, term):
                total += weight
        return min(total, cap)

    def _deescalation_penalty(self, text: str) -> float:
        matches = sum(1 for phrase in self.deescalation_phrases if phrase in text)
        return min(self.caps.get("deescalation", 0.12), matches * 0.06)

    def compute_keyword_score(self, text: str) -> float:
        """Compute weighted keyword score from high-risk terms."""
        if not text:
            return 0.0
        return self._weighted_match_score(
            text.lower(),
            self.keywords,
            cap=self.caps.get("keyword", 0.60),
        )

    def compute_risk_score(
        self,
        text: str,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        duplicate_count: int = 0,
        toxicity_score: float = 0.0,
    ) -> Dict:
        """
        Compute overall risk score from multiple signals.
        Returns dict with score and component breakdown.
        """
        text_lower = (text or "").lower()

        # Base score from category
        category_score = self.category_risk.get(category, 0.25) if category else 0.25

        # Severity multiplier
        sev_mult = self.severity_mult.get(severity, 0.5) if severity else 0.5

        # Content analysis
        keyword_score = self.compute_keyword_score(text_lower)
        urgency_score = self._weighted_match_score(
            text_lower,
            self.urgent_keywords,
            cap=self.caps.get("urgency", 0.25),
        )
        deescalation_penalty = self._deescalation_penalty(text_lower)

        # Duplicate burst detection (multiple reports = higher risk)
        duplicate_boost = min(
            self.caps.get("duplicate", 0.18),
            max(0, duplicate_count) * self.duplicate_step,
        )

        # Toxicity contribution (capped)
        toxicity_boost = min(
            self.caps.get("toxicity", 0.12),
            max(0.0, toxicity_score) * self.toxicity_multiplier,
        )

        # Consistency boost: urgent categories with explicit risk language
        synergy_boost = 0.0
        if category in {"fire", "assault", "medical_emergency"}:
            if keyword_score >= 0.12 or urgency_score >= 0.12:
                synergy_boost = self.synergy_boost_value

        # Weighted combination tuned for incident triage.
        raw_score = (
            category_score * self.weights.get("category", 0.28)
            + sev_mult * self.weights.get("severity", 0.26)
            + keyword_score * self.weights.get("keyword", 0.28)
            + urgency_score * self.weights.get("urgency", 0.10)
            + duplicate_boost * self.weights.get("duplicate", 0.05)
            + toxicity_boost * self.weights.get("toxicity", 0.05)
            + synergy_boost
            - deescalation_penalty
        )

        # Normalize to 0-1
        final_score = min(max(raw_score, 0.0), 1.0)

        return {
            "risk_score": round(final_score, 3),
            "breakdown": {
                "category_contribution": round(
                    category_score * self.weights.get("category", 0.28), 3
                ),
                "severity_contribution": round(
                    sev_mult * self.weights.get("severity", 0.26), 3
                ),
                "keyword_contribution": round(
                    keyword_score * self.weights.get("keyword", 0.28), 3
                ),
                "urgency_contribution": round(
                    urgency_score * self.weights.get("urgency", 0.10), 3
                ),
                "duplicate_contribution": round(
                    duplicate_boost * self.weights.get("duplicate", 0.05), 3
                ),
                "toxicity_contribution": round(
                    toxicity_boost * self.weights.get("toxicity", 0.05), 3
                ),
                "synergy_boost": round(synergy_boost, 3),
                "deescalation_penalty": round(deescalation_penalty, 3),
            },
            "is_high_risk": final_score >= self.high_threshold,
            "is_critical": final_score >= self.critical_threshold,
        }
