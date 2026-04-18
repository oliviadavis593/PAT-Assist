from __future__ import annotations

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import services
from database import SessionLocal, engine

# Create tables on startup (fine for SQLite; in prod use Alembic migrations).
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Patient Reminder System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Workflows ─────────────────────────────────────────────────────────────────

@app.post("/workflows", response_model=schemas.WorkflowDetail, status_code=201)
def create_workflow(payload: schemas.CreateWorkflow, db: Session = Depends(get_db)):
    return services.create_workflow(db, payload)


@app.get("/workflows", response_model=list[schemas.WorkflowSummary])
def list_workflows(db: Session = Depends(get_db)):
    return services.list_workflows(db)


@app.get("/workflows/{workflow_id}", response_model=schemas.WorkflowDetail)
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = services.get_workflow(db, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


# ── Reminders ─────────────────────────────────────────────────────────────────

@app.post("/reminders/{reminder_id}/send", response_model=schemas.ReminderOut)
def send_reminder(reminder_id: int, db: Session = Depends(get_db)):
    try:
        reminder = services.send_reminder(db, reminder_id)
    except services.ReminderAlreadySentError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


# ── Patient Responses ─────────────────────────────────────────────────────────

@app.post("/responses", response_model=schemas.ResponseOut, status_code=201)
def submit_response(payload: schemas.CreateResponse, db: Session = Depends(get_db)):
    response = services.submit_response(db, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="No workflow found for this patient ID")
    return response
