"""POST /triage — mock symptom-to-department triage.

Deterministic keyword-based mock. No real model call (see Phase 5 CONTEXT
D-57 / V2-04 deferred). Suggests a department + urgency from a small
keyword map, boosting to Pediatrics for children.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

Urgency = Literal["low", "medium", "high", "emergency"]


class TriageRequest(BaseModel):
    symptoms: str = Field(min_length=1)
    patient_age: int = Field(ge=0, le=120)
    patient_gender: str


class TriageResponse(BaseModel):
    suggested_department: str
    urgency: Urgency
    reasoning: str


# Ordered keyword -> (department, urgency) map. First match wins (checked
# in this order so emergency-grade keywords are evaluated first).
_KEYWORD_RULES: list[tuple[list[str], str, Urgency]] = [
    (["chest pain", "breathless", "chest tightness"], "Cardiology", "emergency"),
    (["fracture", "joint", "bone", "sprain"], "Orthopedics", "medium"),
    (["headache", "dizzy", "dizziness", "migraine"], "Neurology", "medium"),
    (["fever", "cough", "cold", "sore throat"], "General Medicine", "low"),
]


@router.post("/triage", response_model=TriageResponse)
def triage(payload: TriageRequest) -> TriageResponse:
    symptoms_lower = payload.symptoms.lower()

    department = "General Medicine"
    urgency: Urgency = "low"
    matched_keywords: list[str] = []

    for keywords, dept, level in _KEYWORD_RULES:
        hits = [kw for kw in keywords if kw in symptoms_lower]
        if hits:
            department = dept
            urgency = level
            matched_keywords = hits
            break

    if payload.patient_age < 12:
        department = "Pediatrics"
        if not matched_keywords:
            matched_keywords = ["pediatric age"]

    if matched_keywords:
        reasoning = (
            f"Matched keyword(s): {', '.join(matched_keywords)} -> {department} "
            f"({urgency} urgency)."
        )
    else:
        reasoning = (
            "No specific keywords matched in reported symptoms; defaulting to "
            f"{department} for general evaluation."
        )

    return TriageResponse(
        suggested_department=department,
        urgency=urgency,
        reasoning=reasoning,
    )
