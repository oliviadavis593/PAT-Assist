from __future__ import annotations

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from models import Workflow, Reminder, PatientResponse, utcnow
from schemas import CreateWorkflow, CreateResponse

ESCALATION_KEYWORD = "did not fast"


class ReminderAlreadySentError(Exception):
    pass


def _to_naive_utc(dt: datetime) -> datetime:
    """Normalize a datetime to a naive UTC value for SQLite storage."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


# ── Workflow ──────────────────────────────────────────────────────────────────

def create_workflow(db: Session, payload: CreateWorkflow) -> Workflow:
    procedure_date = _to_naive_utc(payload.procedure_date)

    workflow = Workflow(patient_id=payload.patient_id, procedure_date=procedure_date)
    db.add(workflow)
    db.flush()  # get workflow.id before commit

    reminders = [
        Reminder(
            workflow_id=workflow.id,
            reminder_type="three_day",
            send_at=procedure_date - timedelta(days=3),
        ),
        Reminder(
            workflow_id=workflow.id,
            reminder_type="one_day",
            send_at=procedure_date - timedelta(days=1),
        ),
    ]
    db.add_all(reminders)
    db.commit()
    db.refresh(workflow)
    return workflow


def list_workflows(db: Session) -> list[Workflow]:
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()


def get_workflow(db: Session, workflow_id: int) -> Workflow | None:
    return db.query(Workflow).filter(Workflow.id == workflow_id).first()


# ── Reminders ─────────────────────────────────────────────────────────────────

def send_reminder(db: Session, reminder_id: int) -> Reminder | None:
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        return None

    # Service-level guard: second layer after the DB unique constraint.
    if reminder.status == "sent":
        raise ReminderAlreadySentError(f"Reminder {reminder_id} has already been sent.")

    reminder.attempts += 1
    reminder.last_attempt_at = utcnow()

    # Deterministic simulation: attempt 1 → fail, attempt 2+ → sent.
    # This makes demos and tests predictable without randomness.
    if reminder.attempts == 1:
        reminder.status = "failed"
    else:
        reminder.status = "sent"

    db.commit()
    db.refresh(reminder)
    return reminder


# ── Responses & Escalation ────────────────────────────────────────────────────

def submit_response(db: Session, payload: CreateResponse) -> PatientResponse | None:
    # Find the most recent workflow for this patient (supports multiple procedures).
    workflow = (
        db.query(Workflow)
        .filter(Workflow.patient_id == payload.patient_id)
        .order_by(Workflow.created_at.desc())
        .first()
    )
    if not workflow:
        return None

    response = PatientResponse(
        workflow_id=workflow.id,
        response_text=payload.response_text,
    )
    db.add(response)

    if ESCALATION_KEYWORD in payload.response_text.lower():
        workflow.escalation_flag = True
        workflow.status = "escalated"
        workflow.escalation_reason = (
            f"Patient indicated they did not follow pre-procedure fasting instructions. "
            f"Original message: \"{payload.response_text}\""
        )

    db.commit()
    db.refresh(response)
    return response
