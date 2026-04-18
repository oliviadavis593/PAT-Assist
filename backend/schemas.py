from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class CreateWorkflow(BaseModel):
    patient_id: str
    procedure_date: datetime


class ReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reminder_type: str
    send_at: datetime
    status: str
    attempts: int
    last_attempt_at: Optional[datetime]


class ResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workflow_id: int
    response_text: str
    created_at: datetime


class WorkflowSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: str
    procedure_date: datetime
    status: str
    escalation_flag: bool
    created_at: datetime


class WorkflowDetail(WorkflowSummary):
    escalation_reason: Optional[str]
    reminders: list[ReminderOut]
    responses: list[ResponseOut]


class CreateResponse(BaseModel):
    patient_id: str
    response_text: str
