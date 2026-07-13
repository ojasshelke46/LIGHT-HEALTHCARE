# Phase 5: AI Services - Context

**Gathered:** 2026-07-14 (auto mode, single pass — lean: brief fully specifies this phase)
**Status:** Ready for planning

<domain>
## Phase Boundary

FastAPI service in apps/ai-services with three typed mock endpoints (triage, drug-check, scribe), health check, CORS, production Dockerfile. Requirements AI-01..04. No real model calls (V2-04), no deployment.

</domain>

<decisions>
## Implementation Decisions

- **D-56:** Structure per brief: `main.py` (app factory, CORS allow-list from env with sane dev default, /health), `services/symptom_triage.py`, `services/drug_interaction.py`, `services/scribe.py` — each an APIRouter with Pydantic request/response models, mounted under /api. `requirements.txt`: fastapi, uvicorn[standard], celery, redis, python-dotenv, openai, httpx, pydantic (per brief; celery/redis unused-for-now but brief-mandated). `.env.example` with OPENAI_API_KEY placeholder + CORS_ORIGINS.
- **D-57:** Endpoints exactly per brief contracts: POST /api/triage {symptoms, patient_age, patient_gender} → {suggested_department, urgency: low|medium|high|emergency, reasoning}; POST /api/drug-check {current_medicines: string[], new_medicine} → {safe: bool, interactions: [{drug_pair, severity, description}]}; POST /api/scribe {audio_url} → {chief_complaint, diagnosis, notes, structured_soap {subjective, objective, assessment, plan}}. Mock logic deterministic + minimally clever (e.g. keyword-based department suggestion; known-pair table for interactions) so responses vary with input — not one hardcoded blob. 422 on invalid input (FastAPI default), explicit 400/500 handlers with generic messages.
- **D-58:** Dockerfile: python:3.12-slim, non-root user, pip install from requirements.txt, EXPOSE 8000, CMD uvicorn main:app --host 0.0.0.0 --port 8000. Production posture (no --reload).
- **D-59:** Verification gates: `python -m compileall` or import check + run uvicorn briefly and curl /health + all three endpoints (happy + invalid payload) + docker build IF docker daemon available (skip gracefully if not, note in SUMMARY).
- **D-60:** Types mirrored in packages/shared-types? NO — web/mobile don't call these yet; skip cross-language types until integration (deferred).

### Claude's Discretion
Mock content specifics, pytest inclusion (nice-to-have if quick).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — AI-01..04
- `apps/ai-services/README.md` — placeholder to replace
- Brief (PROJECT.md Constraints) — stack fixed: FastAPI

</canonical_refs>

<code_context>
## Existing Code Insights

apps/ai-services contains only README.md. Python env: system python3 available; use a venv in apps/ai-services/.venv for verification (gitignored).

</code_context>

<specifics>
## Specific Ideas

Brief example shapes are the contract — match field names exactly.

</specifics>

<deferred>
## Deferred Ideas

- Real model calls (V2-04); celery/redis task queue wiring; shared TS types for endpoints.

</deferred>

---

*Phase: 5-AI Services*
*Context gathered: 2026-07-14*
