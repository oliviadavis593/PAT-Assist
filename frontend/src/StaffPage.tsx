import { useState, useEffect, useCallback } from "react";
import { api, WorkflowSummary, WorkflowDetail } from "./api";

function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function ReminderCard({
  reminder,
  onSend,
}: {
  reminder: WorkflowDetail["reminders"][number];
  onSend: (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const label = reminder.reminder_type === "three_day" ? "3-Day" : "1-Day";
  const subLabel =
    reminder.reminder_type === "three_day"
      ? "3 days before procedure"
      : "1 day before procedure";

  const handleSend = async () => {
    setBusy(true);
    await onSend(reminder.id);
    setBusy(false);
  };

  return (
    <div className="reminder-card">
      <div className="reminder-left">
        <div>
          <div className="reminder-type-label">{label}</div>
          <div className="reminder-type-sub">{subLabel}</div>
        </div>
        <Badge status={reminder.status} />
        <div className="reminder-meta">
          {reminder.attempts} attempt{reminder.attempts !== 1 ? "s" : ""}
          {reminder.last_attempt_at && (
            <> &middot; last {new Date(reminder.last_attempt_at).toLocaleString()}</>
          )}
        </div>
      </div>
      {reminder.status !== "sent" && (
        <button className="btn btn-secondary btn-sm" onClick={handleSend} disabled={busy}>
          {busy ? "Sending…" : reminder.status === "failed" ? "Retry" : "Send"}
        </button>
      )}
    </div>
  );
}

export function StaffPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selected, setSelected] = useState<WorkflowDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [procedureDate, setProcedureDate] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setWorkflows(await api.listWorkflows());
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setSelected(await api.getWorkflow(id));
  }, []);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const wf = await api.createWorkflow(patientId, new Date(procedureDate).toISOString());
      setPatientId("");
      setProcedureDate("");
      setShowCreate(false);
      await loadWorkflows();
      setSelectedId(wf.id);
      setSelected(wf);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workflow");
    }
  };

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    setSendError(null);
    await loadDetail(id);
  };

  const handleSend = async (reminderId: number) => {
    setSendError(null);
    try {
      await api.sendReminder(reminderId);
      if (selectedId != null) await loadDetail(selectedId);
      await loadWorkflows();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    }
  };

  return (
    <div>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span className="page-title">Workflows</span>
        <button
          className={`btn ${showCreate ? "btn-secondary" : "btn-primary"}`}
          onClick={() => { setShowCreate((v) => !v); setCreateError(null); }}
        >
          {showCreate ? "Cancel" : "+ New Workflow"}
        </button>
      </div>

      {/* ── Create form ── */}
      {showCreate && (
        <div className="card create-form-card">
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 13 }}>Create Workflow</span>
          </div>
          <div className="create-form-body">
            <div className="create-form-fields">
              <div className="field">
                <label>Patient ID</label>
                <input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. patient_123"
                  required
                />
              </div>
              <div className="field">
                <label>Procedure Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={procedureDate}
                  onChange={(e) => setProcedureDate(e.target.value)}
                  required
                />
              </div>
            </div>
            {createError && <div className="msg msg-error">⚠ {createError}</div>}
            <div className="create-form-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                type="button"
                disabled={!patientId || !procedureDate}
                onClick={(e) => handleCreate(e as unknown as React.FormEvent)}
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="staff-layout">
        {/* Left: workflow list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--slate-700)" }}>
              All Workflows
            </span>
            <span style={{ fontSize: 12, color: "var(--slate-400)" }}>
              {workflows.length} total
            </span>
          </div>

          {workflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">No workflows yet</div>
            </div>
          ) : (
            <div className="workflow-list">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className={`workflow-row ${selectedId === wf.id ? "selected" : ""}`}
                  onClick={() => handleSelect(wf.id)}
                >
                  <div className="workflow-row-top">
                    <span className="workflow-patient">{wf.patient_id}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {wf.escalation_flag && <span className="escalation-dot" title="Escalated" />}
                      <Badge status={wf.status} />
                    </div>
                  </div>
                  <div className="workflow-date">
                    Procedure: {new Date(wf.procedure_date).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="card">
          {!selected ? (
            <div className="empty-placeholder">
              <div className="empty-placeholder-icon">👆</div>
              <div className="empty-placeholder-text">Select a workflow</div>
              <div className="empty-placeholder-sub">
                Click any row on the left to view details
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="detail-header">
                <div className="detail-patient-name">{selected.patient_id}</div>
                <div className="detail-meta">
                  <div className="detail-meta-item">
                    <span className="label">Procedure</span>
                    <span className="value">
                      {new Date(selected.procedure_date).toLocaleString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="label">Status</span>
                    <span className="value"><Badge status={selected.status} /></span>
                  </div>
                  <div className="detail-meta-item">
                    <span className="label">Workflow ID</span>
                    <span className="value">#{selected.id}</span>
                  </div>
                </div>
              </div>

              {/* Escalation banner */}
              {selected.escalation_flag && (
                <div className="escalation-banner">
                  <span className="escalation-banner-icon">⚠️</span>
                  <div>
                    <div className="escalation-banner-title">Escalation Required</div>
                    <div className="escalation-banner-reason">{selected.escalation_reason}</div>
                  </div>
                </div>
              )}

              {/* Confirmation banner */}
              {selected.status === "completed" && (
                <div className="confirmation-banner">
                  <span className="confirmation-banner-icon">✓</span>
                  <div>
                    <div className="confirmation-banner-title">Patient Confirmed</div>
                    <div className="confirmation-banner-reason">
                      Patient confirmed fasting compliance. No action required.
                    </div>
                  </div>
                </div>
              )}

              {/* Reminders */}
              <div className="detail-section">
                <div className="detail-section-title">Reminders</div>
                {sendError && <div className="msg msg-error" style={{ marginBottom: 10 }}>⚠ {sendError}</div>}
                {selected.reminders.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onSend={handleSend} />
                ))}
              </div>

              {/* Patient Responses */}
              <div className="detail-section">
                <div className="detail-section-title">Patient Responses</div>
                {selected.responses.length === 0 ? (
                  <div style={{ color: "var(--slate-400)", fontSize: 13, padding: "8px 0" }}>
                    No responses submitted yet.
                  </div>
                ) : (
                  selected.responses.map((r) => (
                    <div className="response-card" key={r.id}>
                      <div className="response-text">{r.response_text}</div>
                      <div className="response-time">
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
