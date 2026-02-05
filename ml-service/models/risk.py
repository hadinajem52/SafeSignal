"""
Risk scoring model combining multiple signals.
"""

from typing import Dict, List, Optional
import re
import logging

logger = logging.getLogger(__name__)

# High-risk keywords with weights
HIGH_RISK_KEYWORDS = {
    "gun": 0.15,
    "weapon": 0.15,
    "shooting": 0.2,
    "shot": 0.1,
    "fire": 0.12,
    "flames": 0.12,
    "explosion": 0.2,
    "bomb": 0.25,
    "knife": 0.1,
    "stabbing": 0.15,
    "blood": 0.1,
    "bleeding": 0.1,
    "unconscious": 0.12,
    "not breathing": 0.15,
    "heart attack": 0.15,
    "dying": 0.12,
    "dead": 0.15,
    "hostage": 0.25,
    "kidnap": 0.2,
    "armed": 0.15,
    "active shooter": 0.3,
}

# Category base risk scores
CATEGORY_RISK = {
    "fire": 0.7,
    "medical_emergency": 0.65,
    "assault": 0.6,
    "hazard": 0.5,
    "traffic_incident": 0.45,
    "theft": 0.4,
    "suspicious_activity": 0.35,
    "vandalism": 0.3,
    "noise_complaint": 0.2,
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
        self.keywords = HIGH_RISK_KEYWORDS
        self.category_risk = CATEGORY_RISK
        self.severity_mult = SEVERITY_MULTIPLIER

    def compute_keyword_score(self, text: str) -> float:
        """Compute risk score from keyword presence."""
        if not text:
            return 0.0

        text_lower = text.lower()
        total_score = 0.0

        for keyword, weight in self.keywords.items():
            if re.search(rf"\b{re.escape(keyword)}\b", text_lower):
                total_score += weight

        return min(total_score, 0.5)  # Cap keyword contribution

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
        Returns dict with score and breakdown.
        """
        # Base score from category
        category_score = self.category_risk.get(category, 0.25) if category else 0.25

        # Severity multiplier
        sev_mult = self.severity_mult.get(severity, 0.5) if severity else 0.5

        # Keyword analysis
        keyword_score = self.compute_keyword_score(text)

        # Duplicate burst detection (multiple reports = higher risk)
        duplicate_boost = min(0.2, duplicate_count * 0.05)

        # Toxicity contribution (capped)
        toxicity_boost = min(0.1, toxicity_score * 0.2)

        # Weighted combination
        raw_score = (
            category_score * 0.3
            + sev_mult * 0.25
            + keyword_score * 0.25
            + duplicate_boost * 0.1
            + toxicity_boost * 0.1
        )

        # Normalize to 0-1
        final_score = min(max(raw_score, 0.0), 1.0)

        return {
            "risk_score": round(final_score, 3),
            "breakdown": {
                "category_contribution": round(category_score * 0.3, 3),
                "severity_contribution": round(sev_mult * 0.25, 3),
                "keyword_contribution": round(keyword_score * 0.25, 3),
                "duplicate_contribution": round(duplicate_boost * 0.1, 3),
                "toxicity_contribution": round(toxicity_boost * 0.1, 3),
            },
            "is_high_risk": final_score >= 0.5,
            "is_critical": final_score >= 0.8,
        }
