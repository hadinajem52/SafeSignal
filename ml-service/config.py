import json
import os
import platform

import torch
from dotenv import load_dotenv

load_dotenv()


def _load_json_env(name: str, default):
    raw = os.getenv(name)
    if not raw:
        return default
    try:
        parsed = json.loads(raw)
        return parsed
    except json.JSONDecodeError:
        print(f"[ML Service] WARNING: invalid JSON for {name}; using default")
        return default


def _load_csv_env(name: str, default):
    raw = os.getenv(name)
    if not raw:
        return default
    items = [item.strip() for item in raw.split(",") if item.strip()]
    return items or default


# Server config
HOST = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("ML_SERVICE_PORT", 5001))
SERVICE_VERSION = os.getenv("ML_SERVICE_VERSION", "1.1.0")

# Deployment/release metadata
MODEL_RELEASE = os.getenv("MODEL_RELEASE", "unversioned")
MODEL_EXPERIMENT = os.getenv("MODEL_EXPERIMENT", "baseline")
EXPERIMENT_VARIANT = os.getenv("EXPERIMENT_VARIANT", "A")

# Device configuration - hybrid GPU/CPU strategy
# Classifier + Embeddings (~340MB) -> GPU for speed
# Toxicity (~418MB) -> CPU to save VRAM
# Risk scorer -> CPU (rule-based, no neural net)
GPU_AVAILABLE = torch.cuda.is_available()
USE_GPU = os.getenv("ML_USE_GPU", "true" if GPU_AVAILABLE else "false").lower() == "true"

if GPU_AVAILABLE:
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
    gpu_name = torch.cuda.get_device_name(0)
    print(f"[ML Service] GPU detected: {gpu_name} ({vram_gb:.1f} GB VRAM)")
else:
    vram_gb = 0
    print("[ML Service] No GPU detected, using CPU for all models")

if USE_GPU and GPU_AVAILABLE:
    # Hybrid GPU/CPU strategy for 2GB VRAM (MX350):
    #   BART-large fp16 ~800MB (or ~400MB with 8-bit) - main accurate classifier
    #   DistilBERT fp16 ~260MB - fast cascade first-pass
    #   MiniLM fp16 ~80MB - embeddings
    #   CUDA overhead ~300MB
    #   Total: ~1.4-1.5GB fp16 / ~1.0GB with 8-bit -> fits in 2GB
    #   Toxicity (Detoxify ~418MB) stays on CPU to save VRAM
    CLASSIFIER_DEVICE = "cuda"   # BART-large + DistilBERT - biggest latency win
    EMBEDDING_DEVICE = "cuda"    # MiniLM ~80MB - small, fast on GPU
    TOXICITY_DEVICE = "cpu"      # Detoxify ~418MB - offloaded to save VRAM
    # BART-large 8-bit ~400MB, DistilBERT fp16 ~260MB,
    # MiniLM-L12 ~120MB, cross-encoder ~80MB, CUDA overhead ~300MB
    est_vram = 0.40 + 0.26 + 0.12 + 0.08 + 0.30  # ~1.16GB with 8-bit BART
    print("[ML Service] Hybrid mode: classifier+embeddings->GPU, toxicity->CPU")
    print(f"[ML Service] Estimated VRAM usage: ~{est_vram:.1f}GB / {vram_gb:.1f}GB")
    if est_vram > vram_gb * 0.95:
        print("[ML Service] WARNING: VRAM may be tight, 8-bit quantization recommended")
else:
    CLASSIFIER_DEVICE = "cpu"
    EMBEDDING_DEVICE = "cpu"
    TOXICITY_DEVICE = "cpu"
    print("[ML Service] CPU-only mode")

# Legacy: DEVICE still available for anything that references it
DEVICE = "cuda" if (USE_GPU and GPU_AVAILABLE) else "cpu"

# Model config
# Upgraded to BART-large-MNLI (~1.6GB) for significantly better accuracy.
# BART-large achieves ~20-30% higher accuracy than DistilBERT on complex categorization.
# For speed-critical deployments, use: CLASSIFIER_MODEL=typeform/distilbert-base-uncased-mnli
# Upgraded from all-MiniLM-L6-v2 (6 layers) to L12 (12 layers) for better
# semantic similarity - critical for duplicate detection accuracy.
# Same architecture/speed class, ~20MB more VRAM, significantly better STS scores.
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L12-v2")

# Cross-encoder for re-ranking borderline duplicate candidates.
# Much more accurate than bi-encoder cosine similarity for pairwise comparison.
# Only used on candidates in the "uncertain zone" - adds ~50ms per pair.
CROSS_ENCODER_MODEL = os.getenv("CROSS_ENCODER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
# Keep cross-encoder on CPU by default to avoid GPU memory pressure.
CROSS_ENCODER_DEVICE = os.getenv("CROSS_ENCODER_DEVICE", "cpu")
# Bi-encoder scores in [RERANK_LOW, RERANK_HIGH] are re-scored by cross-encoder
RERANK_LOW = float(os.getenv("RERANK_LOW", 0.10))
RERANK_HIGH = float(os.getenv("RERANK_HIGH", 0.80))
# Blend ratio for cross-encoder re-ranking in uncertain zone.
CROSS_ENCODER_BLEND = float(os.getenv("CROSS_ENCODER_BLEND", 0.85))
CLASSIFIER_MODEL = os.getenv("CLASSIFIER_MODEL", "facebook/bart-large-mnli")
FAST_CLASSIFIER_MODEL = os.getenv(
    "FAST_CLASSIFIER_MODEL",
    "typeform/distilbert-base-uncased-mnli",
)
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "original")

# Explicit model/ruleset versions for observability and regression tracking.
EMBEDDING_MODEL_VERSION = os.getenv("EMBEDDING_MODEL_VERSION", EMBEDDING_MODEL)
CLASSIFIER_MODEL_VERSION = os.getenv("CLASSIFIER_MODEL_VERSION", CLASSIFIER_MODEL)
FAST_CLASSIFIER_MODEL_VERSION = os.getenv("FAST_CLASSIFIER_MODEL_VERSION", FAST_CLASSIFIER_MODEL)
TOXICITY_MODEL_VERSION = os.getenv("TOXICITY_MODEL_VERSION", TOXICITY_MODEL)
RISK_MODEL_VERSION = os.getenv("RISK_MODEL_VERSION", "rule-based-v1")
TOXICITY_RULESET_VERSION = os.getenv("TOXICITY_RULESET_VERSION", "tox-rules-v1")
RISK_RULESET_VERSION = os.getenv("RISK_RULESET_VERSION", "risk-rules-v1")

# Performance: number of CPU threads for inference
NUM_THREADS = int(os.getenv("ML_NUM_THREADS", os.cpu_count() or 4))
torch.set_num_threads(NUM_THREADS)
print(f"[ML Service] CPU threads for inference: {NUM_THREADS}")

# Endpoint-level asynchronous inference concurrency bound.
INFERENCE_MAX_CONCURRENCY = int(
    os.getenv("INFERENCE_MAX_CONCURRENCY", "2" if DEVICE == "cuda" else "4")
)

# Performance optimizations
USE_BETTERTRANSFORMER = os.getenv("USE_BETTERTRANSFORMER", "true").lower() == "true"
TORCH_COMPILE_MODE = os.getenv("TORCH_COMPILE_MODE", "reduce-overhead")  # or 'max-autotune'
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 1))  # For future batch processing

# Enable CUDA optimizations
if DEVICE == "cuda":
    torch.backends.cudnn.benchmark = True  # Auto-tune kernels
    torch.backends.cuda.matmul.allow_tf32 = True  # Use TF32 for faster matmul
    print("[ML Service] CUDA optimizations enabled (cudnn.benchmark, TF32)")

# Thresholds
# Lowered similarity threshold from 0.7 to 0.60 to catch more near-duplicates
# while avoiding false positives (validated against test data)
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.60))
TOXICITY_THRESHOLD = float(os.getenv("TOXICITY_THRESHOLD", 0.5))

# Toxicity backstop rules are configurable for safer tuning without deploys.
TOXICITY_DEHUMANIZING_TERMS = tuple(
    _load_csv_env(
        "TOXICITY_DEHUMANIZING_TERMS",
        [
            "animals",
            "savages",
            "vermin",
            "thugs",
            "scum",
            "filthy",
            "criminals",
        ],
    )
)
TOXICITY_GROUP_REFERENCE_TERMS = tuple(
    _load_csv_env(
        "TOXICITY_GROUP_REFERENCE_TERMS",
        [
            "those",
            "these",
            "that group",
            "people from",
            "all those",
        ],
    )
)
TOXICITY_CONTEXTUAL_MIN_SCORE = float(os.getenv("TOXICITY_CONTEXTUAL_MIN_SCORE", 0.18))
TOXICITY_CONTEXTUAL_THRESHOLD_RATIO = float(
    os.getenv("TOXICITY_CONTEXTUAL_THRESHOLD_RATIO", 0.40)
)
TOXICITY_IDENTITY_ATTACK_THRESHOLD = float(
    os.getenv("TOXICITY_IDENTITY_ATTACK_THRESHOLD", 0.12)
)
TOXICITY_INSULT_THRESHOLD = float(os.getenv("TOXICITY_INSULT_THRESHOLD", 0.35))

# Classification quality controls
# Use conservative abstention and ambiguity checks for safer category output.
CLASSIFICATION_CONFIDENCE_THRESHOLD = float(
    os.getenv("CLASSIFICATION_CONFIDENCE_THRESHOLD", 0.14)
)
CLASSIFICATION_MARGIN_THRESHOLD = float(
    os.getenv("CLASSIFICATION_MARGIN_THRESHOLD", 0.02)
)
USE_DOMAIN_POSTPROCESSING = os.getenv("USE_DOMAIN_POSTPROCESSING", "true").lower() == "true"

# Performance optimizations
# 8-bit quantization: 2-3x speedup with <2% accuracy loss (requires accelerate package)
# NOTE: Disabled on Windows by default due to bitsandbytes compatibility issues with CUDA
# See: https://github.com/TimDettmers/bitsandbytes/issues/...
USE_8BIT_QUANTIZATION = os.getenv("USE_8BIT_QUANTIZATION", "false").lower() == "true"

# Optional ONNX Runtime backend for classifier.
# Useful alternative on Windows when bitsandbytes quantization is not available.
IS_WINDOWS = platform.system().lower().startswith("win")
USE_ONNX_ON_WINDOWS = os.getenv("USE_ONNX_ON_WINDOWS", "true").lower() == "true"
CLASSIFIER_BACKEND = os.getenv("CLASSIFIER_BACKEND", "auto").lower()
if CLASSIFIER_BACKEND == "auto":
    CLASSIFIER_BACKEND_RESOLVED = (
        "onnx"
        if IS_WINDOWS and USE_ONNX_ON_WINDOWS and not USE_8BIT_QUANTIZATION
        else "torch"
    )
else:
    CLASSIFIER_BACKEND_RESOLVED = CLASSIFIER_BACKEND
ONNX_EXECUTION_PROVIDER = os.getenv("ONNX_EXECUTION_PROVIDER", "CPUExecutionProvider")

# Cascade classifier: use fast model first, accurate model only when needed
# Reduces latency by 60-80% for high-confidence predictions
USE_CASCADE_CLASSIFIER = os.getenv("USE_CASCADE_CLASSIFIER", "true").lower() == "true"
# Raised to prioritize accuracy for public-safety incident routing.
CASCADE_CONFIDENCE_THRESHOLD = float(os.getenv("CASCADE_CONFIDENCE_THRESHOLD", 0.72))
# Require a clear top-1 vs top-2 separation before trusting fast model output.
CASCADE_MARGIN_THRESHOLD = float(os.getenv("CASCADE_MARGIN_THRESHOLD", 0.08))

# Zero-shot classification hypothesis template
# Optimized for incident reports - more specific context improves entailment accuracy
HYPOTHESIS_TEMPLATE = os.getenv("HYPOTHESIS_TEMPLATE", "This incident involves {}.")

# Risk rules and weights are configurable to avoid code changes when tuning.
RISK_HIGH_RISK_KEYWORDS = _load_json_env(
    "RISK_HIGH_RISK_KEYWORDS_JSON",
    {
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
    },
)

RISK_URGENT_CONTEXT_KEYWORDS = _load_json_env(
    "RISK_URGENT_CONTEXT_KEYWORDS_JSON",
    {
        "trapped": 0.18,
        "family": 0.08,
        "children": 0.12,
        "child": 0.12,
        "school": 0.10,
        "crowd": 0.10,
        "multiple people": 0.12,
        "spreading": 0.10,
        "escalating": 0.08,
    },
)

RISK_DEESCALATION_PHRASES = tuple(
    _load_json_env(
        "RISK_DEESCALATION_PHRASES_JSON",
        [
            "no injuries",
            "minor injuries only",
            "already contained",
            "already under control",
            "fire is out",
            "resolved",
        ],
    )
)

RISK_CATEGORY_BASE_SCORES = _load_json_env(
    "RISK_CATEGORY_BASE_SCORES_JSON",
    {
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
    },
)

RISK_SEVERITY_MULTIPLIER = _load_json_env(
    "RISK_SEVERITY_MULTIPLIER_JSON",
    {
        "critical": 1.0,
        "high": 0.8,
        "medium": 0.5,
        "low": 0.3,
    },
)

RISK_COMPONENT_WEIGHTS = _load_json_env(
    "RISK_COMPONENT_WEIGHTS_JSON",
    {
        "category": 0.28,
        "severity": 0.26,
        "keyword": 0.28,
        "urgency": 0.10,
        "duplicate": 0.05,
        "toxicity": 0.05,
    },
)

RISK_CAPS = _load_json_env(
    "RISK_CAPS_JSON",
    {
        "keyword": 0.60,
        "urgency": 0.25,
        "duplicate": 0.18,
        "toxicity": 0.12,
        "deescalation": 0.12,
    },
)

RISK_DUPLICATE_STEP = float(os.getenv("RISK_DUPLICATE_STEP", 0.04))
RISK_TOXICITY_MULTIPLIER = float(os.getenv("RISK_TOXICITY_MULTIPLIER", 0.25))
RISK_SYNERGY_BOOST = float(os.getenv("RISK_SYNERGY_BOOST", 0.08))
RISK_HIGH_THRESHOLD = float(os.getenv("RISK_HIGH_THRESHOLD", 0.50))
RISK_CRITICAL_THRESHOLD = float(os.getenv("RISK_CRITICAL_THRESHOLD", 0.80))

# Categories for zero-shot classification
INCIDENT_CATEGORIES = [
    "theft",
    "assault",
    "vandalism",
    "suspicious_activity",
    "traffic_incident",
    "noise_complaint",
    "fire",
    "medical_emergency",
    "hazard",
    "other",
]

MODEL_VERSION_MAP = {
    "embedding": {
        "name": EMBEDDING_MODEL,
        "version": EMBEDDING_MODEL_VERSION,
    },
    "classifier": {
        "name": CLASSIFIER_MODEL,
        "version": CLASSIFIER_MODEL_VERSION,
        "backend": CLASSIFIER_BACKEND_RESOLVED,
    },
    "classifier_fast": {
        "name": FAST_CLASSIFIER_MODEL,
        "version": FAST_CLASSIFIER_MODEL_VERSION,
    },
    "toxicity": {
        "name": TOXICITY_MODEL,
        "version": TOXICITY_MODEL_VERSION,
        "ruleset_version": TOXICITY_RULESET_VERSION,
    },
    "risk": {
        "name": "rule-based",
        "version": RISK_MODEL_VERSION,
        "ruleset_version": RISK_RULESET_VERSION,
    },
}
