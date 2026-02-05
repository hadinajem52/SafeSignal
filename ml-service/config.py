import os
import torch
from dotenv import load_dotenv

load_dotenv()

# Server config
HOST = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("ML_SERVICE_PORT", 5001))

# Device configuration
# GPU requires 4GB+ VRAM. Set ML_USE_GPU=true to enable CUDA.
USE_GPU = os.getenv("ML_USE_GPU", "false").lower() == "true"
DEVICE = "cuda" if (USE_GPU and torch.cuda.is_available()) else "cpu"
print(f"[ML Service] Using device: {DEVICE}")
if torch.cuda.is_available():
    vram_gb = torch.cuda.get_device_properties(0).total_mem / 1024**3
    print(f"[ML Service] GPU available: {torch.cuda.get_device_name(0)} ({vram_gb:.1f} GB VRAM)")
    if not USE_GPU:
        print(f"[ML Service] GPU disabled. Set ML_USE_GPU=true to enable (needs 4GB+ VRAM).")

# Model config
# Smaller DistilBERT classifier (~260MB) is 3x faster than BART-large (~1.6GB)
# Set CLASSIFIER_MODEL=facebook/bart-large-mnli for higher accuracy at cost of speed
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
CLASSIFIER_MODEL = os.getenv("CLASSIFIER_MODEL", "typeform/distilbert-base-uncased-mnli")
TOXICITY_MODEL = os.getenv("TOXICITY_MODEL", "original")

# Performance: number of CPU threads for inference
NUM_THREADS = int(os.getenv("ML_NUM_THREADS", os.cpu_count() or 4))
torch.set_num_threads(NUM_THREADS)
print(f"[ML Service] CPU threads for inference: {NUM_THREADS}")

# Thresholds
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.7))
TOXICITY_THRESHOLD = float(os.getenv("TOXICITY_THRESHOLD", 0.5))

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
