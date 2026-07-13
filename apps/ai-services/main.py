"""Light Healthcare AI services — FastAPI app entrypoint.

Typed mock endpoints for symptom triage, drug-interaction checking, and
ambient-scribe note structuring (AI-01..03), plus health check + CORS
allow-list (AI-04). See .planning/phases/05-ai-services/05-CONTEXT.md for
the D-56..D-60 decisions this implements.
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services import drug_interaction, scribe, symptom_triage

load_dotenv()

logger = logging.getLogger("ai-services")


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title="Light Healthcare AI Services")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "ai-services"}

    app.include_router(symptom_triage.router, prefix="/api")
    app.include_router(drug_interaction.router, prefix="/api")
    app.include_router(scribe.router, prefix="/api")

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    return app


app = create_app()
