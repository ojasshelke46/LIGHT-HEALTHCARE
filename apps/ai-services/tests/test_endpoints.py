"""Endpoint tests for the AI-services mocks (AI-01..04).

Covers: /health, happy-path + 422 validation for each of the three mock
endpoints, and the two content-specific assertions called out in the plan
(chest-pain -> emergency; warfarin+aspirin -> unsafe).
"""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ai-services"}


def test_triage_happy_path() -> None:
    response = client.post(
        "/api/triage",
        json={"symptoms": "fever and cough", "patient_age": 30, "patient_gender": "female"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"suggested_department", "urgency", "reasoning"}
    assert body["urgency"] in {"low", "medium", "high", "emergency"}


def test_triage_chest_pain_is_emergency() -> None:
    response = client.post(
        "/api/triage",
        json={"symptoms": "severe chest pain", "patient_age": 52, "patient_gender": "male"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["urgency"] == "emergency"
    assert body["suggested_department"] == "Cardiology"


def test_triage_invalid_payload_422() -> None:
    response = client.post(
        "/api/triage",
        json={"symptoms": "", "patient_age": 200, "patient_gender": "male"},
    )
    assert response.status_code == 422


def test_drug_check_happy_path() -> None:
    response = client.post(
        "/api/drug-check",
        json={"current_medicines": ["Paracetamol"], "new_medicine": "Ibuprofen"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"safe", "interactions"}
    assert isinstance(body["interactions"], list)


def test_drug_check_warfarin_aspirin_unsafe() -> None:
    response = client.post(
        "/api/drug-check",
        json={"current_medicines": ["Warfarin"], "new_medicine": "Aspirin"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["safe"] is False
    assert len(body["interactions"]) == 1
    assert body["interactions"][0]["severity"] == "severe"


def test_drug_check_invalid_payload_422() -> None:
    response = client.post(
        "/api/drug-check",
        json={"current_medicines": ["Warfarin"], "new_medicine": ""},
    )
    assert response.status_code == 422


def test_scribe_happy_path() -> None:
    response = client.post(
        "/api/scribe",
        json={"audio_url": "https://example.com/recordings/consult-123.wav"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"chief_complaint", "diagnosis", "notes", "structured_soap"}
    assert set(body["structured_soap"].keys()) == {
        "subjective",
        "objective",
        "assessment",
        "plan",
    }
    assert "consult-123.wav" in body["notes"]


def test_scribe_invalid_payload_422() -> None:
    response = client.post("/api/scribe", json={"audio_url": "not-a-url"})
    assert response.status_code == 422
