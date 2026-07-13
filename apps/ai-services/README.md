# apps/ai-services — AI microservices

FastAPI service hosting Light Healthcare's AI endpoints. Currently ships
**typed mock implementations** (no real model calls yet — see V2-04 in
REQUIREMENTS.md) for symptom triage, drug-interaction checking, and
ambient-scribe note structuring, plus a health check and production
Dockerfile.

## Run locally (dev)

```bash
cd apps/ai-services
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env   # optional — defaults work for mock endpoints
uvicorn main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/health`

## Run tests

```bash
source .venv/bin/activate
pytest -q
```

## Run with Docker

```bash
cd apps/ai-services
docker build -t light-ai-services .
docker run --rm -p 8000:8000 --env-file .env light-ai-services
```

The container runs as a non-root user (`app`) on `python:3.12-slim`, with
no `--reload` (production posture).

## Endpoints

All endpoints below are mounted under `/api` and return deterministic
mock responses — see the `<threat_model>` in
`.planning/phases/05-ai-services/05-01-PLAN.md` for what's mitigated vs.
deferred to v2.

### `GET /health`

Response: `{"status": "ok", "service": "ai-services"}`

### `POST /api/triage`

Request:

```json
{
  "symptoms": "chest pain and breathlessness",
  "patient_age": 45,
  "patient_gender": "male"
}
```

Response:

```json
{
  "suggested_department": "Cardiology",
  "urgency": "low | medium | high | emergency",
  "reasoning": "Matched keyword(s): chest pain -> Cardiology (emergency urgency)."
}
```

### `POST /api/drug-check`

Request:

```json
{
  "current_medicines": ["Warfarin"],
  "new_medicine": "Aspirin"
}
```

Response:

```json
{
  "safe": false,
  "interactions": [
    {
      "drug_pair": "Warfarin + Aspirin",
      "severity": "severe",
      "description": "Increased risk of severe bleeding when warfarin is combined with aspirin."
    }
  ]
}
```

### `POST /api/scribe`

Request:

```json
{ "audio_url": "https://example.com/recordings/consult-123.wav" }
```

`audio_url` is validated (must be a well-formed HTTP(S) URL) but **not
fetched** in mock mode.

Response:

```json
{
  "chief_complaint": "Chief complaint captured from audio recording 'consult-123.wav'.",
  "diagnosis": "Pending clinician confirmation (mock transcription).",
  "notes": "Auto-generated draft note from consult audio 'consult-123.wav'. Review and edit before saving to patient record.",
  "structured_soap": {
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "..."
  }
}
```

## Roadmap (out of scope for this plan)

- Real model calls (triage LLM, Whisper transcription for scribe) — V2-04
- celery + redis task queue wiring for long-running scribe jobs
- Shared TypeScript types for these endpoints once web/mobile call them
