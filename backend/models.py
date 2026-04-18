from __future__ import annotations

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


def utcnow() -> datetime:
    # Store naive UTC datetimes — SQLite has no native timezone type.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, nullable=False, index=True)
    procedure_date = Column(DateTime, nullable=False)
    status = Column(String, default="active")       # active | escalated
    escalation_flag = Column(Boolean, default=False)
    escalation_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    reminders = relationship("Reminder", back_populates="workflow", order_by="Reminder.send_at")
    responses = relationship("PatientResponse", back_populates="workflow", order_by="PatientResponse.created_at")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    reminder_type = Column(String, nullable=False)  # three_day | one_day
    send_at = Column(DateTime, nullable=False)
    status = Column(String, default="pending")      # pending | sent | failed
    attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)

    workflow = relationship("Workflow", back_populates="reminders")

    # DB-level idempotency: one reminder per type per workflow.
    __table_args__ = (
        UniqueConstraint("workflow_id", "reminder_type", name="uq_workflow_reminder_type"),
    )


class PatientResponse(Base):
    __tablename__ = "patient_responses"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    response_text = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    workflow = relationship("Workflow", back_populates="responses")
