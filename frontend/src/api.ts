const BASE = "http://localhost:8000";

export interface Reminder {
  id: number;
  reminder_type: string;
  send_at: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  last_attempt_at: string | null;
}

export interface PatientResponse {
  id: number;
  workflow_id: number;
  response_text: string;
  created_at: string;
}

export interface WorkflowSummary {
  id: number;
  patient_id: string;
  procedure_date: string;
  status: string;
  escalation_flag: boolean;
  created_at: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  escalation_reason: string | null;
  reminders: Reminder[];
  responses: PatientResponse[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  createWorkflow: (patient_id: string, procedure_date: string) =>
    request<WorkflowDetail>("/workflows", {
      method: "POST",
      body: JSON.stringify({ patient_id, procedure_date }),
    }),

  listWorkflows: () => request<WorkflowSummary[]>("/workflows"),

  getWorkflow: (id: number) => request<WorkflowDetail>(`/workflows/${id}`),

  sendReminder: (reminder_id: number) =>
    request<Reminder>(`/reminders/${reminder_id}/send`, { method: "POST" }),

  submitResponse: (patient_id: string, response_text: string) =>
    request<PatientResponse>("/responses", {
      method: "POST",
      body: JSON.stringify({ patient_id, response_text }),
    }),
};
