# SafeSignal ML VPS Migration Guide (A to Z)

This guide moves your `ml-service` from local machine to a VPS, upgrades models, and connects your current backend to the new VPS endpoint.

## 0. Scope and Current Integration

Your current project uses:
- ML service: `ml-service` (FastAPI, default port `5001`)
- Backend client: `backend/src/utils/mlClient.js`
- Backend env vars for ML:
  - `ML_SERVICE_URL` (default: `http://localhost:5001`)
  - `ML_TIMEOUT_MS` (default: `5000`)

Your ML service exposes:
- `GET /health`
- `POST /embed`
- `POST /similarity`
- `POST /classify`
- `POST /toxicity`
- `POST /risk`
- `POST /analyze`

## 1. Target Architecture

Recommended production layout:
1. VPS runs `ml-service` on internal port `5001`.
2. `nginx` reverse proxy exposes `https://ml.your-domain.com`.
3. Backend calls ML via `ML_SERVICE_URL=https://ml.your-domain.com`.
4. Model files and Hugging Face cache are stored on VPS disk.
5. Service runs under `systemd` for auto-restart and boot startup.

## 2. Pre-Migration Checklist

1. Confirm VPS specs (CPU/RAM/GPU/VRAM/disk).
2. Confirm OS (guide assumes Ubuntu 22.04/24.04).
3. Buy/assign domain (or subdomain) for ML endpoint.
4. Add DNS `A` record:
   - `ml.your-domain.com -> VPS_PUBLIC_IP`
5. Open firewall ports:
   - `22` (SSH)
   - `80` (HTTP, for cert issuance)
   - `443` (HTTPS)
6. Keep old local ML service available for rollback.

## 3. Pick Model Upgrade Strategy

You can absolutely download models directly on VPS (recommended).

Use one of these profiles:

### Profile A (Balanced, usually best first)
- `CLASSIFIER_MODEL=facebook/bart-large-mnli`
- `FAST_CLASSIFIER_MODEL=typeform/distilbert-base-uncased-mnli`
- `EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L12-v2`
- `CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2`
- `TOXICITY_MODEL=original`

### Profile B (Faster, lower cost)
- Keep fast classifier only / disable heavy model cascade as needed.
- Smaller embedding model if latency is priority.

### Profile C (Higher accuracy, stronger GPU required)
- Larger NLI and embedding models.
- Validate VRAM and latency before production cutover.

Start with Profile A, benchmark, then tune.

## 4. VPS Base Setup

SSH to VPS:

```bash
ssh ubuntu@<VPS_PUBLIC_IP>
```

Install base packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget unzip build-essential software-properties-common \
  python3 python3-venv python3-pip nginx certbot python3-certbot-nginx
```

Create dedicated app user:

```bash
sudo adduser --disabled-password --gecos "" safesignal
sudo usermod -aG sudo safesignal
sudo mkdir -p /opt/safesignal
sudo chown -R safesignal:safesignal /opt/safesignal
```

(Optional GPU) Install NVIDIA driver/CUDA matching your VPS GPU vendor docs.

## 5. Deploy ML Service Code

```bash
sudo -u safesignal -H bash -lc '
cd /opt/safesignal
git clone <YOUR_REPO_URL> app
cd app/ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
'
```

## 6. Configure ML Service Environment

Create VPS env file:

```bash
sudo -u safesignal -H bash -lc '
cat > /opt/safesignal/app/ml-service/.env << "EOF"
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=5001

# Model selection
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L12-v2
CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
CLASSIFIER_MODEL=facebook/bart-large-mnli
FAST_CLASSIFIER_MODEL=typeform/distilbert-base-uncased-mnli
TOXICITY_MODEL=original

# Performance
ML_USE_GPU=true
USE_8BIT_QUANTIZATION=true
USE_CASCADE_CLASSIFIER=true
CASCADE_CONFIDENCE_THRESHOLD=0.60
ML_NUM_THREADS=4
USE_BETTERTRANSFORMER=true
TORCH_COMPILE_MODE=reduce-overhead

# Thresholds
SIMILARITY_THRESHOLD=0.60
TOXICITY_THRESHOLD=0.50
RERANK_LOW=0.20
RERANK_HIGH=0.80
EOF
'
```

Adjust:
- `ML_USE_GPU=false` if VPS has no GPU.
- `ML_NUM_THREADS` to your CPU core budget.

## 7. Download/Warm Models on VPS (Not Local Machine)

Run once to pre-download into VPS cache:

```bash
sudo -u safesignal -H bash -lc '
source /opt/safesignal/app/ml-service/.venv/bin/activate
cd /opt/safesignal/app/ml-service
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer(\"sentence-transformers/all-MiniLM-L12-v2\")"
python -c "from transformers import pipeline; pipeline(\"zero-shot-classification\", model=\"facebook/bart-large-mnli\")"
python -c "from transformers import pipeline; pipeline(\"zero-shot-classification\", model=\"typeform/distilbert-base-uncased-mnli\")"
python -c "from sentence_transformers import CrossEncoder; CrossEncoder(\"cross-encoder/ms-marco-MiniLM-L-6-v2\")"
python -c "from detoxify import Detoxify; Detoxify(\"original\")"
'
```

Notes:
- First download can be large and slow.
- Keep enough free disk (models + cache + logs).

## 8. Run ML Service as systemd

Create service file:

```bash
sudo tee /etc/systemd/system/safesignal-ml.service > /dev/null << 'EOF'
[Unit]
Description=SafeSignal ML Service
After=network.target

[Service]
User=safesignal
Group=safesignal
WorkingDirectory=/opt/safesignal/app/ml-service
EnvironmentFile=/opt/safesignal/app/ml-service/.env
ExecStart=/opt/safesignal/app/ml-service/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 5001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable safesignal-ml
sudo systemctl start safesignal-ml
sudo systemctl status safesignal-ml --no-pager
```

Check health locally:

```bash
curl http://127.0.0.1:5001/health
```

## 9. Put Nginx + HTTPS in Front

Nginx config:

```bash
sudo tee /etc/nginx/sites-available/safesignal-ml > /dev/null << 'EOF'
server {
    listen 80;
    server_name ml.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/safesignal-ml /etc/nginx/sites-enabled/safesignal-ml
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS certificate:

```bash
sudo certbot --nginx -d ml.your-domain.com --redirect -m you@your-domain.com --agree-tos -n
```

Verify:

```bash
curl https://ml.your-domain.com/health
```

## 10. Secure Service Access (Recommended)

Add a simple API key check in ML service or enforce at reverse proxy.

If using nginx key gate (quick option):
1. Add shared secret header check.
2. Backend sends that header on every ML request.

Also add:
- Request size limits.
- Rate limiting.
- Fail2ban/UFW as needed.

## 11. Connect Backend to VPS ML Endpoint

In backend environment (`backend/.env` in deployed backend):

```env
ML_SERVICE_URL=https://ml.your-domain.com
ML_TIMEOUT_MS=10000
```

`ML_TIMEOUT_MS=10000` is safer for heavier models than `5000`.

Restart backend service after env update.

## 12. Verify End-to-End from Backend

Run checks:

1. ML health:
```bash
curl https://ml.your-domain.com/health
```

2. Analyze endpoint:
```bash
curl -X POST https://ml.your-domain.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"There is a fire in the building and people are trapped","severity":"high"}'
```

3. Backend logs:
- Confirm no `ML service unavailable` warnings.
- Confirm incidents are using ML results.

## 13. Benchmark Before Cutover

Use your included benchmark scripts:

```bash
sudo -u safesignal -H bash -lc '
source /opt/safesignal/app/ml-service/.venv/bin/activate
cd /opt/safesignal/app/ml-service
python benchmark.py
python test_accuracy.py
python test_accuracy_extended.py
'
```

Track:
- P50/P95 latency
- Error rate
- GPU/CPU/RAM usage
- Output quality on real incidents

## 14. Cutover Plan (Low Risk)

1. Keep old local service running.
2. Switch backend `ML_SERVICE_URL` to VPS endpoint.
3. Observe for 24-48h.
4. If stable, retire local ML service.

## 15. Rollback Plan

If VPS ML has issues:
1. Set backend `ML_SERVICE_URL` back to old local endpoint.
2. Restart backend.
3. Investigate VPS logs:

```bash
sudo journalctl -u safesignal-ml -n 200 --no-pager
```

Rollback target should always be ready before upgrades.

## 16. Ongoing Operations

### Update code

```bash
sudo -u safesignal -H bash -lc '
cd /opt/safesignal/app
git pull
source ml-service/.venv/bin/activate
cd ml-service
pip install -r requirements.txt
'
sudo systemctl restart safesignal-ml
```

### Rotate models safely

1. Change model env values.
2. Pre-download new models.
3. Restart service.
4. Run smoke tests.
5. Keep previous model values documented for quick rollback.

### Monitor
- `sudo systemctl status safesignal-ml`
- `sudo journalctl -u safesignal-ml -f`
- `htop`, `nvidia-smi`
- Nginx access/error logs.

## 17. Common Failure Patterns

1. `503 model not loaded`
- Model download incomplete or out-of-memory during init.

2. Timeouts from backend
- Increase `ML_TIMEOUT_MS` and/or reduce model size.

3. Slow first requests
- Warm model cache and keep service running.

4. GPU present but not used
- Verify drivers/CUDA/torch CUDA build and `ML_USE_GPU=true`.

5. HTTPS works but backend cannot connect
- Check DNS, outbound firewall, TLS chain, and env variable value.

## 18. Minimal Cutover Checklist

1. VPS ML `/health` over HTTPS returns healthy.
2. `/analyze` returns valid JSON.
3. Backend `ML_SERVICE_URL` points to VPS.
4. Backend logs show successful ML calls.
5. Rollback URL documented and tested.

## 19. Direct Answer to Your Main Questions

1. Can you download new models on VPS instead of current machine?
- Yes. That is the recommended method.

2. How do you connect VPS ML service to your existing project?
- Set backend `ML_SERVICE_URL` to VPS domain (prefer HTTPS), restart backend, and verify via incident flow + logs.

---

If you want, next step is I can create a second file with your exact production values filled in (domain, repo URL, service user, and preferred model set) so you can run commands with almost zero edits.
