"""
Lightweight PII redactor.
Strips obvious identifiers from incident text before sending to external APIs.
Not a guarantee of complete PII removal — good hygiene for an academic project.
"""
import re
from typing import List, Tuple

# (compiled pattern, replacement token)
_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r'\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b', re.I), '[EMAIL]'),
    (re.compile(r'\b(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b'), '[PHONE]'),
    (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '[SSN]'),
    (re.compile(r'\b\d{16,19}\b'), '[CARD]'),
]


def redact(text: str) -> str:
    """Return text with obvious PII replaced by placeholder tokens."""
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text
