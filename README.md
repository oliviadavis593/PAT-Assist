# Patient Reminder System

A simple system for managing patient pre-procedure reminders: create workflows, simulate sending reminders, capture patient responses, and flag escalations.

---

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API is available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI is available at `http://localhost:5173`.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/workflows` | Create a workflow + 2 reminders |
| `GET`  | `/workflows` | List all workflows |
| `GET`  | `/workflows/{id}` | Workflow detail with reminders and responses |
| `POST` | `/reminders/{id}/send` | Simulate sending a reminder |
| `POST` | `/responses` | Submit a patient response |

### Example: Create a workflow

```bash
curl -X POST http://localhost:8000/workflows \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "patient_123", "procedure_date": "2026-05-10T09:00:00Z"}'
```

### Example: Submit a patient response (triggers escalation)

```bash
curl -X POST http://localhost:8000/responses \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "patient_123", "response_text": "I did not fast last night."}'
```

---

## Demo Walkthrough

1. Open the Staff View and create a workflow for `patient_123`.
2. Click the workflow row to open the detail panel.
3. Click **Send** on the 3-day reminder → it fails (attempt 1, deterministic).
4. Click **Retry Send** → it succeeds (attempt 2).
5. Switch to **Patient View**, enter `patient_123`, and submit `"I did not fast"`.
6. Return to Staff View → the workflow now shows an escalation banner.

---

## Design Notes

### Data model and workflow state

Three tables: `Workflow`, `Reminder`, `PatientResponse`.

**Workflow** has two states: `active` and `escalated`. State transitions only go forward & a workflow becomes `escalated` when a patient response triggers the keyword check. There is no "completed" state in this scope (easy to add).

**Reminder** has three states: `pending → failed → sent`. Failed reminders can be retried. Sent reminders are terminal. The `attempts` and `last_attempt_at` columns give a full audit trail without a separate attempt log table.

### How duplicate sends are avoided

Two independent layers:

1. **DB constraint**: `UNIQUE(workflow_id, reminder_type)` ensures only one reminder row per type per workflow is ever created. There is no second row to accidentally send.

2. **Service guard**: `send_reminder()` checks `reminder.status == "sent"` before touching the DB. If already sent, it raises `ReminderAlreadySentError` and the route returns HTTP 409. This guard would hold even under concurrent requests in the common case.


### Simulated send behavior

Rather than random failure (which makes tests non-deterministic and demos unpredictable), the simulation is deterministic:

- Attempt 1 → `failed`
- Attempt 2+ → `sent`

This makes it easy to demonstrate retry behavior in a live demo without any setup.

### How failed or missed reminders are handled

Staff can manually trigger a retry from the UI for any reminder not yet `sent`. In a production system, a background scheduler (APScheduler, Celery beat, or a simple cron) would poll for reminders where `send_at <= now AND status != 'sent'` and auto-send them. The data model supports this without changes.

### Escalation

Simple `str.lower()` + `in` keyword check for `"did not fast"`. Sets three fields atomically in one commit: `escalation_flag = True`, `escalation_reason` (a human-readable message), and `status = "escalated"`. No NLP, no regex — easy to extend by adding more keywords to a list.

### How this would scale

| Concern | Current | At Scale |
|---------|---------|----------|
| Database | SQLite (single file) | PostgreSQL with proper timezone support |
| Concurrent sends | Service-level guard | DB-level CAS update or row locking |
| Auto-sending due reminders | Manual only | Background task queue (Celery + Redis) |
| Notification delivery | Simulated | Twilio (SMS), SendGrid (email) |
| Multi-tenant | Not scoped | Auth + org-scoped queries |

### What I'd improve next

1. **Auto-scheduler**: cron job that polls and sends due reminders automatically.
2. **Auth**: JWT-based staff auth; patient access via a one-time link (token in the reminder SMS).
3. **More workflow states**: `completed`, `cancelled`, `no-show`.
4. **Retry with backoff**: instead of deterministic failure, exponential backoff with a configurable max attempts.
5. **Audit log**: separate `ReminderAttempt` table so full send history is preserved even after status changes.
6. **Real notifications**: Twilio for SMS, with delivery receipt webhooks updating reminder status automatically.

---

## Project Structure

```
PAT-Assist/
├── backend/
│   ├── main.py # FastAPI app + 5 route handlers
│   ├── database.py # SQLAlchemy engine + session factory
│   ├── models.py   # ORM: Workflow, Reminder, PatientResponse
│   ├── schemas.py # Pydantic I/O shapes
│   ├── services.py # Business logic (create, send, respond, escalate)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx # Tab nav (Staff / Patient)
        ├── StaffPage.tsx # Workflow creation, list, detail panel
        ├── PatientPage.tsx # Response submission form
        ├── api.ts         # Typed fetch wrappers
        └── index.css      # Minimal styles
```
