import os
import torch
from dotenv import load_dotenv

load_dotenv()

# Server config
HOST = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("ML_SERVICE_PORT", 5001))

# Device configuration — hybrid GPU/CPU strategy
# Classifier + Embeddings (~340MB) → GPU for speed
# Toxicity (~418MB) → CPU to save VRAM
# Risk scorer → CPU (rule-based, no neural net)
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
    # Hybrid: put lightweight models on GPU, heavy ones on CPU
    CLASSIFIER_DEVICE = "cuda"   # DistilBERT ~260MB — biggest latency win
    EMBEDDING_DEVICE = "cuda"    # MiniLM ~80MB — small, fast on GPU
    TOXICITY_DEVICE = "cpu"      # Detoxify ~418MB — already fast, save VRAM
    est_vram = 0.26 + 0.08 + 0.4  # ~740MB with CUDA overhead
    print(f"[ML Service] Hybrid mode: classifier+embeddings→GPU, toxicity→CPU")
    print(f"[ML Service] Estimated VRAM usage: ~{est_vram:.1f}GB / {vram_gb:.1f}GB")
else:
    CLASSIFIER_DEVICE = "cpu"
    EMBEDDING_DEVICE = "cpu"
    TOXICITY_DEVICE = "cpu"
    print(f"[ML Service] CPU-only mode")

# Legacy: DEVICE still available for anything that references it
DEVICE = "cuda" if (USE_GPU and GPU_AVAILABLE) else "cpu"

# Model config
# Upgraded to BART-large-MNLI (~1.6GB) for significantly better accuracy.
# BART-large achieves ~20-30% higher accuracy than DistilBERT on complex categorization.
# For speed-critical deployments, use: CLASSIFIER_MODEL=typeform/distilbert-base-uncased-mnli
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
CLASSIFIER_MODEL = os.getenv("CLASSIFIER_MODEL", "facebook/bart-large-mnli")
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "original")

# Performance: number of CPU threads for inference
NUM_THREADS = int(os.getenv("ML_NUM_THREADS", os.cpu_count() or 4))
torch.set_num_threads(NUM_THREADS)
print(f"[ML Service] CPU threads for inference: {NUM_THREADS}")

# Thresholds
# Lowered similarity threshold from 0.7 to 0.65 to catch more near-duplicates
# while avoiding false positives (validated against test data)
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.65))
TOXICITY_THRESHOLD = float(os.getenv("TOXICITY_THRESHOLD", 0.5))

# Zero-shot classification hypothesis template
# Optimized for incident reports - more specific context improves entailment accuracy
HYPOTHESIS_TEMPLATE = os.getenv("HYPOTHESIS_TEMPLATE", "This incident involves {}.")

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
