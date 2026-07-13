---
phase: 05-ai-services
plan: 01
subsystem: api
tags: [fastapi, pydantic, docker, python, ai-mocks]

# Dependency graph
requires:
  - phase: none
    provides: apps/ai-services was a placeholder-only directory before this plan
provides:
  - FastAPI service (apps/ai-services) with /health, CORS allow-list, and three typed mock AI endpoints (/api/triage, /api/drug-check, /api/scribe)
  - Production Dockerfile (python:3.12-slim, non-root)
  - pytest suite (9 tests) covering happy-path + 422 validation for all endpoints
affects: [ai-services, future web/mobile AI integration, V2-04 real-model-call work]

# Tech tracking
tech-stack:
  added: [fastapi, "uvicorn[standard]", celery, redis, python-dotenv, openai, httpx, pydantic, pytest]
  patterns: ["FastAPI app-factory (create_app()) + module-level app for uvicorn", "APIRouter-per-capability under services/, mounted at /api prefix", "Pydantic v2 models with Literal/HttpUrl/Field constraints for input validation", "Global exception handler returning generic 500 (no traceback leakage)"]

key-files:
  created:
    - apps/ai-services/main.py
    - apps/ai-services/services/symptom_triage.py
    - apps/ai-services/services/drug_interaction.py
    - apps/ai-services/services/scribe.py
    - apps/ai-services/Dockerfile
    - apps/ai-services/requirements.txt
    - apps/ai-services/requirements-dev.txt
    - apps/ai-services/.env.example
    - apps/ai-services/tests/test_endpoints.py
  modified:
    - apps/ai-services/README.md

key-decisions:
  - "Kept mock logic deterministic and keyword/table-driven (not one static blob) per D-57 -- triage uses an ordered keyword->department/urgency map with a pediatric-age boost; drug-check uses a frozenset-keyed known-pairs table; scribe echoes the audio filename into every field."
  - "requirements-dev.txt (pytest) added even though not listed in the plan's files_modified frontmatter -- explicitly required by Task 2's action text, so treated as in-scope rather than a deviation."
  - "Docker build skipped -- no Docker daemon available in this environment; Dockerfile authored to spec (python:3.12-slim, non-root 'app' user, no --reload) and reviewed by hand, but not build-verified. Documented below."

patterns-established:
  - "Pattern: AI-services mock endpoints validate all input via Pydantic (types/enums/ge-le/HttpUrl) and let FastAPI's default 422 handle violations -- no manual validation code needed."
  - "Pattern: CORS origins always read from CORS_ORIGINS env var (comma-separated), default localhost:3000 only -- never hardcode wildcard."

requirements-completed: [AI-01, AI-02, AI-03, AI-04]

# Metrics
duration: ~15min
completed: 2026-07-14
---

# Phase 5 Plan 01: FastAPI AI Services (Typed Mocks + Production Dockerfile) Summary

**FastAPI service in apps/ai-services with three deterministic typed-mock AI endpoints (triage, drug-check, scribe) matching the brief's exact contracts, CORS-gated health check, and a non-root python:3.12-slim production Dockerfile.**

## Performance

- **Duration:** Assumption: ~15 min. Git commit timestamps (`5e87c8f` 04:18:03 IST, `3062801` 04:19:21 IST) show only ~1m18s between task commits, which understates actual work (venv creation, two `pip install` runs, `pytest`, live uvicorn smoke test across all endpoints); sandbox clock does not reliably track wall time in this environment, so ~15 min is an estimate from work performed, not derived from timestamps.
- **Tasks:** 2 completed
- **Files modified:** 10 (9 created, 1 modified)

## Accomplishments

- `apps/ai-services` now a working FastAPI app: `/health`, CORS allow-list from `CORS_ORIGINS` env (no wildcard), global exception handler returning generic 500 (no traceback leakage)
- Three typed mock endpoints matching the brief's exact field names: `POST /api/triage` (keyword-based department + urgency), `POST /api/drug-check` (known-pairs interaction table), `POST /api/scribe` (canned SOAP note referencing the audio filename)
- Production Dockerfile: `python:3.12-slim`, non-root `app` user, no `--reload`
- 9-test pytest suite (health, happy-path + 422 per endpoint, chest-pain->emergency, warfarin+aspirin->unsafe) — all green
- Live uvicorn smoke test on port 8100 confirmed all endpoints match documented shapes

## Task Commits

Each task was committed atomically:

1. **Task 1: FastAPI app + three mock routers** - `5e87c8f` (feat)
2. **Task 2: Dockerfile + env example + README + smoke tests** - `3062801` (feat)

**Plan metadata:** (this commit, follows)

## Files Created/Modified

- `apps/ai-services/main.py` - `create_app()` factory + module-level `app`; CORS, `/health`, router mounts, global 500 handler
- `apps/ai-services/services/__init__.py` - empty package marker
- `apps/ai-services/services/symptom_triage.py` - `POST /triage`: keyword-map mock triage
- `apps/ai-services/services/drug_interaction.py` - `POST /drug-check`: known-pairs interaction mock
- `apps/ai-services/services/scribe.py` - `POST /scribe`: canned SOAP-note mock (audio_url validated, not fetched)
- `apps/ai-services/requirements.txt` - fastapi, uvicorn[standard], celery, redis, python-dotenv, openai, httpx, pydantic
- `apps/ai-services/requirements-dev.txt` - pytest
- `apps/ai-services/Dockerfile` - python:3.12-slim, non-root, production CMD
- `apps/ai-services/.env.example` - OPENAI_API_KEY + CORS_ORIGINS placeholders
- `apps/ai-services/README.md` - replaced placeholder with run instructions + endpoint table
- `apps/ai-services/tests/test_endpoints.py` - 9 pytest cases

## Decisions Made

- Ordered-keyword-list triage logic (chest pain/breathless checked before fever/cough etc.) so the more urgent condition wins when symptoms text contains multiple matches; pediatric age (<12) always overrides department to Pediatrics regardless of keyword match.
- Drug-interaction lookup keyed by `frozenset({drug_a, drug_b})` (case-insensitive, order-independent) against a 4-pair table exactly matching the plan's examples (warfarin+aspirin severe, ibuprofen+aspirin moderate, metformin+alcohol moderate, azithromycin+amlodipine minor).
- Scribe mock never fetches `audio_url` (T-05-05 accepted-for-v1) — only parses the URL path client-side via `urllib.parse` to extract a filename for response text, no network call.

## Deviations from Plan

None — plan executed exactly as written. `requirements-dev.txt` was created per Task 2's explicit action text ("Add pytest to a requirements-dev.txt") even though it wasn't enumerated in the plan frontmatter's `files_modified` list; not treated as a deviation since it was directly instructed.

## Issues Encountered

- **Docker daemon unavailable in this environment** (`docker info` fails). Per plan/environment-notes instruction, the `docker build` verification step was skipped gracefully. The Dockerfile was authored exactly to D-58's spec (`python:3.12-slim`, non-root `app` user via `useradd`, `pip install --no-cache-dir -r requirements.txt`, `EXPOSE 8000`, `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`) and manually reviewed, but **not build-verified**. Recommend a follow-up `docker build -t light-ai-services apps/ai-services` the next time a Docker daemon is available, before this service is deployed.
- `starlette.testclient` emitted a `StarletteDeprecationWarning` about the `httpx` test-client bridge during `pytest` (`install httpx2 instead`) — third-party library warning, unrelated to any code in this plan, no source line to fix; left as-is (out of scope per deviation-rules scope boundary).

## User Setup Required

None - no external service configuration required. (`OPENAI_API_KEY` placeholder in `.env.example` is unused by any code path in this plan — all three endpoints are deterministic mocks with no real model calls.)

## Next Phase Readiness

- AI-01..04 all satisfied and verified live (pytest 9/9 green; uvicorn smoke-tested on :8100 for all three endpoints, happy-path and 422 each; CORS allow-list confirmed non-wildcard).
- `apps/ai-services` is now a real, runnable, typed FastAPI service — ready for web/mobile integration whenever a future phase decides to call these endpoints (D-60 deferred shared TS types until that integration happens).
- Docker image not yet build-verified (see Issues Encountered) — no blocker for this phase's completion criteria (plan explicitly allows a documented skip), but flagged for whoever handles first deployment/CI setup.
- Phase 5 (ai-services) is single-plan; this SUMMARY closes the phase pending STATE.md/ROADMAP.md/REQUIREMENTS.md updates below.

---
*Phase: 05-ai-services*
*Completed: 2026-07-14*

## Self-Check: PASSED

All 11 claimed files verified present on disk (main.py, services/__init__.py, services/symptom_triage.py, services/drug_interaction.py, services/scribe.py, requirements.txt, requirements-dev.txt, Dockerfile, .env.example, README.md, tests/test_endpoints.py). Both commit hashes (5e87c8f, 3062801) verified present in `git log --oneline --all`.
