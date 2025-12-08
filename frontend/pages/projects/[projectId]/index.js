import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ProjectOverviewPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { getAuthHeaders } = useAuth();

  const [project, setProject] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStartRound, setShowStartRound] = useState(false);
  const [roundForm, setRoundForm] = useState({ expected_clients: 2, min_clients: 1 });

  const loadData = () => {
    if (!projectId) return;
    async function load() {
      try {
        const [projRes, roundRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/projects/${projectId}/rounds/current`, {
            headers: getAuthHeaders(),
          }),
        ]);

        const projData = await projRes.json();
        const roundData = await roundRes.json();

        setProject(projData);
        setCurrentRound(roundData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    load();
  };

  const handleStartRound = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/rounds/start`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(roundForm),
      });
      if (res.ok) {
        setShowStartRound(false);
        loadData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || "Failed to start round"}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, getAuthHeaders]);

  if (loading) {
    return (
      <Layout>
        <p>Loading...</p>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <p style={{ color: "red" }}>Error: {error || "Project not found"}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ marginBottom: "32px" }}>
        <div className="flex-between" style={{ marginBottom: "16px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>{project.name}</h1>
          <span className={`badge ${project.status === "active" ? "badge-success" : project.status === "paused" ? "badge-warning" : "badge-default"}`}>
            {project.status}
          </span>
        </div>
        {project.description && (
          <p className="text-secondary" style={{ fontSize: "1.125rem", marginBottom: "24px" }}>
            {project.description}
          </p>
        )}
      </div>

      <div className="grid grid-2" style={{ marginBottom: "32px" }}>
        <div className="card">
          <h3 style={{ marginBottom: "16px", fontSize: "1.125rem", fontWeight: 600 }}>Project Details</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="flex-between">
              <span className="text-muted">Task Type:</span>
              <span className="text-secondary">{project.task_type.replace("_", " ")}</span>
            </div>
            <div className="flex-between">
              <span className="text-muted">Role:</span>
              <span className={`badge ${project.role === "host" ? "badge-info" : "badge-default"}`}>
                {project.role}
              </span>
            </div>
            <div className="flex-between">
              <span className="text-muted">Invite Code:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--accent)" }}>
                {project.invite_code}
              </span>
            </div>
          </div>
        </div>

        {project.model && (
          <div className="card">
            <h3 style={{ marginBottom: "16px", fontSize: "1.125rem", fontWeight: 600 }}>Model Configuration</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="flex-between">
                <span className="text-muted">Base Model:</span>
                <span className="text-secondary" style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                  {project.model.base_model_id}
                </span>
              </div>
              <div className="flex-between">
                <span className="text-muted">Tuning Strategy:</span>
                <span className="text-secondary">{project.model.tuning_strategy}</span>
              </div>
              <div className="flex-between">
                <span className="text-muted">Precision:</span>
                <span className="text-secondary">{project.model.precision}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {project.role === "host" && !currentRound && (
        <div className="card" style={{ marginBottom: "24px", borderColor: "var(--accent)", background: "rgba(6, 182, 212, 0.05)" }}>
          <div className="flex-between">
            <div>
              <h3 style={{ marginBottom: "8px", fontSize: "1.125rem", fontWeight: 600 }}>Ready to Host</h3>
              <p className="text-secondary" style={{ fontSize: "0.875rem" }}>
                Start a training round to begin collecting client updates
              </p>
            </div>
            <button onClick={() => setShowStartRound(true)} className="btn btn-primary">
              Start Training Round
            </button>
          </div>
        </div>
      )}

      {showStartRound && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginBottom: "24px", fontSize: "1.25rem" }}>Start New Training Round</h3>
          <form onSubmit={handleStartRound}>
            <div className="form-group">
              <label className="form-label">Expected Clients</label>
              <input
                type="number"
                value={roundForm.expected_clients}
                onChange={(e) => setRoundForm({ ...roundForm, expected_clients: parseInt(e.target.value) })}
                className="form-input"
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Clients (to aggregate)</label>
              <input
                type="number"
                value={roundForm.min_clients}
                onChange={(e) => setRoundForm({ ...roundForm, min_clients: parseInt(e.target.value) })}
                className="form-input"
                min="1"
                required
              />
            </div>
            <div className="flex-center gap-sm" style={{ marginTop: "24px" }}>
              <button type="submit" className="btn btn-primary">
                Launch Round
              </button>
              <button type="button" onClick={() => setShowStartRound(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {currentRound && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "1.125rem", fontWeight: 600 }}>Current Round</h3>
          <div className="grid grid-2">
            <div>
              <span className="text-muted" style={{ fontSize: "0.875rem" }}>Round Number</span>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px" }}>#{currentRound.round_number}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: "0.875rem" }}>Status</span>
              <p style={{ marginTop: "4px" }}>
                <span className={`badge ${currentRound.status === "aggregated" ? "badge-success" : currentRound.status === "collecting" ? "badge-info" : "badge-default"}`}>
                  {currentRound.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: "0.875rem" }}>Minimum Clients</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "4px" }}>{currentRound.min_clients}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: "0.875rem" }}>Expected Clients</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "4px" }}>
                {currentRound.expected_clients ?? "?"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ background: "var(--bg-secondary)" }}>
        <nav style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <Link
            href={`/projects/${project.id}`}
            style={{
              color: "var(--accent)",
              fontWeight: 600,
              paddingBottom: "8px",
              borderBottom: "2px solid var(--accent)",
            }}
          >
            Overview
          </Link>
          <Link
            href={`/projects/${project.id}/clients`}
            style={{
              color: "var(--text-secondary)",
              fontWeight: 500,
              paddingBottom: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-secondary)";
            }}
          >
            Clients
          </Link>
          <Link
            href={`/projects/${project.id}/rounds`}
            style={{
              color: "var(--text-secondary)",
              fontWeight: 500,
              paddingBottom: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-secondary)";
            }}
          >
            Rounds
          </Link>
          <Link
            href={`/projects/${project.id}/models`}
            style={{
              color: "var(--text-secondary)",
              fontWeight: 500,
              paddingBottom: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-secondary)";
            }}
          >
            Models
          </Link>
        </nav>
      </div>
    </Layout>
  );
}
