# SafeSignal ML Microservice

Machine learning microservice for incident analysis, providing:
- **Text Classification**: Zero-shot incident categorization using BART-large-MNLI
- **Semantic Similarity**: Embedding-based duplicate detection using sentence-transformers
- **Toxicity Detection**: Content safety using Detoxify (toxic-bert)
- **Risk Scoring**: Multi-signal risk assessment

## Quick Start

### Prerequisites
- Python 3.10+
- 8GB+ RAM (for loading models)

### Installation

```bash
cd ml-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env
```

### Running

```bash
# Development
python main.py

# Production
uvicorn main:app --host 0.0.0.0 --port 5001
```

Service runs at http://localhost:5001

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/embed` | POST | Get text embedding |
| `/similarity` | POST | Compare texts for duplicates |
| `/classify` | POST | Categorize incident |
| `/toxicity` | POST | Detect toxic content |
| `/risk` | POST | Compute risk score |
| `/analyze` | POST | Full analysis (all features) |

## Example Usage

### Full Analysis
```bash
curl -X POST http://localhost:5001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "There is a fire in the building at Main St",
    "severity": "high"
  }'
```

Response:
```json
{
  "classification": {
    "predicted_category": "fire",
    "confidence": 0.87
  },
  "toxicity": {
    "is_toxic": false,
    "toxicity_score": 0.02
  },
  "risk": {
    "risk_score": 0.72,
    "is_high_risk": true,
    "is_critical": false
  }
}
```

## Docker

```bash
# Build
docker build -t safesignal-ml .

# Run
docker run -p 5001:5001 safesignal-ml
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_SERVICE_PORT` | 5001 | Server port |
| `EMBEDDING_MODEL` | sentence-transformers/all-MiniLM-L12-v2 | Embedding model |
| `CROSS_ENCODER_MODEL` | cross-encoder/ms-marco-MiniLM-L-6-v2 | Re-ranker for borderline duplicate candidates |
| `CROSS_ENCODER_DEVICE` | cpu | Device for cross-encoder (`cpu` recommended for stability) |
| `CLASSIFIER_MODEL` | facebook/bart-large-mnli | Classification model |
| `FAST_CLASSIFIER_MODEL` | typeform/distilbert-base-uncased-mnli | Fast cascade classifier |
| `CASCADE_CONFIDENCE_THRESHOLD` | 0.72 | Fast-model confidence gate |
| `CASCADE_MARGIN_THRESHOLD` | 0.08 | Fast-model top1/top2 margin gate |
| `RERANK_LOW` | 0.10 | Lower bound for cross-encoder re-ranking zone |
| `RERANK_HIGH` | 0.80 | Upper bound for cross-encoder re-ranking zone |
| `CROSS_ENCODER_BLEND` | 0.85 | Cross-encoder weighting in blended similarity score |
| `CLASSIFICATION_CONFIDENCE_THRESHOLD` | 0.14 | Minimum confidence for non-`other` output |
| `CLASSIFICATION_MARGIN_THRESHOLD` | 0.02 | Minimum top1/top2 separation |
| `SIMILARITY_THRESHOLD` | 0.60 | Duplicate threshold |
| `TOXICITY_THRESHOLD` | 0.5 | Toxicity threshold |

## Integration with Node.js Backend

The backend calls this service via `mlClient.js`. If unavailable, it falls back to heuristics.

Set in backend `.env`:
```
ML_SERVICE_URL=http://localhost:5001
ML_TIMEOUT_MS=10000
```
