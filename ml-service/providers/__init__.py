"""
Provider factory. Import get_provider() in main.py lifespan.
"""
from providers.base import BaseProvider
from providers.local import LocalProvider
from providers.gemini import GeminiProvider

import config


def get_provider(
    classifier=None,
    embedding_model=None,
    toxicity_model=None,
    risk_scorer=None,
) -> BaseProvider:
    """
    Return the active provider based on ML_PROVIDER config.
    For ML_PROVIDER=local, pass the loaded model instances.
    For ML_PROVIDER=gemini, model instances are not used.
    """
    if config.ML_PROVIDER == "gemini":
        if not config.GEMINI_API_KEY:
            raise RuntimeError(
                "ML_PROVIDER=gemini but GEMINI_API_KEY is not set in .env"
            )
        return GeminiProvider()

    return LocalProvider(
        classifier=classifier,
        embedding_model=embedding_model,
        toxicity_model=toxicity_model,
        risk_scorer=risk_scorer,
    )


__all__ = ["BaseProvider", "LocalProvider", "GeminiProvider", "get_provider"]
