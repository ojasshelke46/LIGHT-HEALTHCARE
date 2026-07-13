"""POST /drug-check — mock drug-drug interaction check.

Deterministic known-pairs lookup table (case-insensitive). No real model
call (see Phase 5 CONTEXT D-57 / V2-04 deferred).
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class DrugCheckRequest(BaseModel):
    current_medicines: list[str]
    new_medicine: str = Field(min_length=1)


class Interaction(BaseModel):
    drug_pair: str
    severity: str
    description: str


class DrugCheckResponse(BaseModel):
    safe: bool
    interactions: list[Interaction]


# Case-insensitive known-pairs table. Keys are frozensets of two lowercased
# drug names so pair order doesn't matter.
_KNOWN_PAIRS: dict[frozenset[str], tuple[str, str]] = {
    frozenset({"warfarin", "aspirin"}): (
        "severe",
        "Increased risk of severe bleeding when warfarin is combined with aspirin.",
    ),
    frozenset({"ibuprofen", "aspirin"}): (
        "moderate",
        "Combined NSAID use raises risk of gastrointestinal irritation and ulcers.",
    ),
    frozenset({"metformin", "alcohol"}): (
        "moderate",
        "Alcohol with metformin increases risk of lactic acidosis.",
    ),
    frozenset({"azithromycin", "amlodipine"}): (
        "minor",
        "Possible additive QT-interval prolongation; monitor if used together.",
    ),
}


@router.post("/drug-check", response_model=DrugCheckResponse)
def drug_check(payload: DrugCheckRequest) -> DrugCheckResponse:
    new_lower = payload.new_medicine.strip().lower()
    interactions: list[Interaction] = []

    for current in payload.current_medicines:
        current_lower = current.strip().lower()
        pair_key = frozenset({current_lower, new_lower})
        match = _KNOWN_PAIRS.get(pair_key)
        if match:
            severity, description = match
            interactions.append(
                Interaction(
                    drug_pair=f"{current.strip()} + {payload.new_medicine.strip()}",
                    severity=severity,
                    description=description,
                )
            )

    return DrugCheckResponse(safe=len(interactions) == 0, interactions=interactions)
