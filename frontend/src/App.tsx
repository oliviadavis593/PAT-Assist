import { useState } from "react";
import { StaffPage } from "./StaffPage";
import { PatientPage } from "./PatientPage";
import "./index.css";

type Tab = "staff" | "patient";

export default function App() {
  const [tab, setTab] = useState<Tab>("staff");

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">🏥</div>
          <h1>Patient Reminder System</h1>
        </div>
        <nav className="app-nav">
          <button
            className={tab === "staff" ? "active" : ""}
            onClick={() => setTab("staff")}
          >
            Staff View
          </button>
          <button
            className={tab === "patient" ? "active" : ""}
            onClick={() => setTab("patient")}
          >
            Patient View
          </button>
        </nav>
      </header>
      <div className="app-body">
        {tab === "staff" ? <StaffPage /> : <PatientPage />}
      </div>
    </>
  );
}
