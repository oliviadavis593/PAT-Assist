import { useState } from "react";
import { api } from "./api";

export function PatientPage() {
  const [patientId, setPatientId] = useState("");
  const [responseText, setResponseText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.submitResponse(patientId, responseText);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setPatientId("");
    setResponseText("");
    setError(null);
  };

  return (
    <div className="patient-page">
      <div className="patient-page-header">
        <div className="patient-page-icon">🏥</div>
        <div className="patient-page-title">Pre-Procedure Check-In</div>
        <div className="patient-page-subtitle">
          Send a message to your care team before your upcoming procedure.
          <br />
          They will review your response promptly.
        </div>
      </div>

      <div className="patient-form-card">
        {submitted ? (
          <div className="patient-success">
            <div className="patient-success-icon">✅</div>
            <div className="patient-success-title">Response Received</div>
            <div className="patient-success-text">
              Your care team has been notified and will follow up if needed.
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={handleReset}>
              Submit Another Response
            </button>
          </div>
        ) : (
          <form className="patient-form-body" onSubmit={handleSubmit}>
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
              <label>Your Message</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={5}
                placeholder="Describe your status before the procedure. For example: I have fasted since midnight and I am feeling well."
                required
              />
            </div>

            {error && <div className="msg msg-error">⚠ {error}</div>}

            <button
              className="btn btn-primary patient-submit-btn"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit Response"}
            </button>

            <p style={{ fontSize: 11, color: "var(--slate-400)", textAlign: "center", marginTop: -6 }}>
              Your response is securely sent to your care team.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
