"""POST /scribe — mock ambient-scribe consult-note structuring.

Request validates audio_url as HttpUrl but does NOT fetch it (T-05-05,
accepted for v1 mock — see Phase 5 CONTEXT D-57 / V2-04 deferred). Returns
a deterministic canned SOAP note that references the audio filename from
the URL path so the response is not a static blob.
"""

from urllib.parse import urlparse

from fastapi import APIRouter
from pydantic import BaseModel, HttpUrl

router = APIRouter()


class ScribeRequest(BaseModel):
    audio_url: HttpUrl


class SOAP(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


class ScribeResponse(BaseModel):
    chief_complaint: str
    diagnosis: str
    notes: str
    structured_soap: SOAP


def _filename_from_url(url: HttpUrl) -> str:
    path = urlparse(str(url)).path
    name = path.rsplit("/", 1)[-1] if path else ""
    return name or "recording"


@router.post("/scribe", response_model=ScribeResponse)
def scribe(payload: ScribeRequest) -> ScribeResponse:
    filename = _filename_from_url(payload.audio_url)

    soap = SOAP(
        subjective="Patient reports symptoms consistent with the recorded consult audio "
        f"({filename}); no additional history captured in mock mode.",
        objective="Vitals and examination findings not extracted in mock mode; "
        "placeholder pending real transcription pipeline.",
        assessment="Provisional assessment pending clinician review of the "
        "AI-generated summary.",
        plan="Recommend clinician confirms diagnosis, orders relevant "
        "investigations, and reviews prescriptions before finalizing notes.",
    )

    return ScribeResponse(
        chief_complaint=f"Chief complaint captured from audio recording '{filename}'.",
        diagnosis="Pending clinician confirmation (mock transcription).",
        notes=f"Auto-generated draft note from consult audio '{filename}'. "
        "Review and edit before saving to patient record.",
        structured_soap=soap,
    )
