import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import ProjectWizard from "../../components/ProjectWizard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ProjectsPage() {
  const { getAuthHeaders } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [getAuthHeaders]);

  const loadProjects = () => {
    fetch(`${API_BASE_URL}/api/projects`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleWizardSuccess = (project) => {
    setShowWizard(false);
    loadProjects();
    // Optionally redirect to the new project
    // window.location.href = `/projects/${project.id}`;
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError("Please enter an invite code");
      return;
    }

    setJoinError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/join`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: joinCode.toUpperCase().trim() }),
      });
      if (res.ok) {
        const project = await res.json();
        setShowJoinForm(false);
        setJoinCode("");
        loadProjects();
        // Optionally redirect to the project
        // window.location.href = `/projects/${project.id}`;
      } else {
        const data = await res.json();
        setJoinError(data.detail || "Invalid invite code. Please check and try again.");
      }
    } catch (err) {
      setJoinError(`Error: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { class: "badge-success", text: "Active" },
      paused: { class: "badge-warning", text: "Paused" },
      archived: { class: "badge-default", text: "Archived" },
    };
    const badge = badges[status] || badges.active;
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getRoleBadge = (role) => {
    if (!role) return <span className="text-muted">-</span>;
    return role === "host" ? (
      <span className="badge badge-info">{role}</span>
    ) : (
      <span className="badge badge-default">{role}</span>
    );
  };

  return (
    <Layout>
      <div className="flex-between" style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Projects</h1>
        <div className="flex-center gap-sm">
          <button
            onClick={() => {
              setShowJoinForm(!showJoinForm);
              setShowCreateForm(false);
            }}
            className="btn btn-secondary"
          >
            Join Project
          </button>
          <button
            onClick={() => {
              setShowWizard(true);
              setShowJoinForm(false);
            }}
            className="btn btn-primary"
          >
            + Create Project
          </button>
        </div>
      </div>

      {showWizard && (
        <ProjectWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleWizardSuccess}
        />
      )}

      {showJoinForm && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h2 style={{ marginBottom: "24px", fontSize: "1.5rem" }}>Join Project</h2>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="form-label">Session Code / Invite Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                className="form-input"
                placeholder="EX: X9Y2Z"
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.125rem",
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  fontWeight: 600,
                }}
                required
                autoFocus
              />
              {joinError && (
                <div style={{ marginTop: "8px", color: "var(--error)", fontSize: "0.875rem" }}>
                  {joinError}
                </div>
              )}
              <p className="text-muted" style={{ marginTop: "8px", fontSize: "0.875rem" }}>
                Enter the invite code provided by the project host
              </p>
            </div>
            <div className="flex-center gap-sm" style={{ marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Join Project
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div className="loading" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Loading projects...</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "var(--error)", background: "rgba(239, 68, 68, 0.1)" }}>
          <p className="text-error" style={{ fontWeight: 500 }}>Error: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {projects.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📁</div>
              <h3 style={{ marginBottom: "8px", fontSize: "1.25rem" }}>No projects yet</h3>
              <p className="text-muted" style={{ marginBottom: "24px" }}>
                Create a new project or join one with an invite code
              </p>
              <button
                onClick={() => setShowWizard(true)}
                className="btn btn-primary"
              >
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="card"
                    style={{
                      cursor: "pointer",
                      transition: "all 0.3s",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(6, 182, 212, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.3)";
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {p.name}
                      </h3>
                      {getStatusBadge(p.status)}
                    </div>
                    {p.description && (
                      <p className="text-secondary" style={{ marginBottom: "16px", fontSize: "0.875rem" }}>
                        {p.description}
                      </p>
                    )}
                    <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                      <div className="flex-between" style={{ marginBottom: "8px" }}>
                        <span className="text-muted" style={{ fontSize: "0.875rem" }}>Task:</span>
                        <span className="text-secondary" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                          {p.task_type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex-between" style={{ marginBottom: "8px" }}>
                        <span className="text-muted" style={{ fontSize: "0.875rem" }}>Role:</span>
                        {getRoleBadge(p.role)}
                      </div>
                      <div className="flex-between">
                        <span className="text-muted" style={{ fontSize: "0.875rem" }}>Invite Code:</span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "var(--accent)",
                          }}
                        >
                          {p.invite_code}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
