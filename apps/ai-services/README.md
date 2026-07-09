# apps/ai-services — AI microservices

FastAPI, containerized. One service per capability, Dockerfile in each subfolder
from day one (AWS migration = non-event).

Build order (**Phase 10**, one at a time):

1. `triage/`   — symptom triage (LLM on booking)
2. `interactions/` — drug interaction check (on prescription create)
3. `scribe/`   — AI scribe (Whisper + LLM structuring notes)

Not initialized yet. Each service:

```
ai-services/<name>/
  Dockerfile
  pyproject.toml
  app/main.py
```
