import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function JoinNodeModal({ onClose }) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/join`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.toUpperCase().trim() }),
      });

      if (res.ok) {
        const project = await res.json();
        // Redirect to the project page
        router.push(`/projects/${project.id}`);
        onClose();
      } else {
        const data = await res.json();
        setError(data.detail || "Invalid invite code. Please check and try again.");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "500px",
          width: "100%",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between" style={{ marginBottom: "24px" }}>
          <div>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(6, 182, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                fontSize: "24px",
              }}
            >
              💻
            </div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Node Configuration</h2>
            <p className="text-secondary" style={{ fontSize: "0.875rem" }}>
              Load your private dataset and connect to the federation
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "12px" }}>
              1. SESSION CODE
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setError(null);
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
            {error && (
              <div style={{ marginTop: "8px", color: "var(--error)", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "var(--bg-secondary)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "8px" }}>
              2. LOCAL DATASET
            </p>
            <p className="text-secondary" style={{ fontSize: "0.875rem" }}>
              You'll configure your local dataset after joining. The platform will handle data preprocessing based on the project's model configuration.
            </p>
          </div>

          <div className="flex-center gap-sm" style={{ marginTop: "32px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !inviteCode.trim()}
              style={{ minWidth: "120px" }}
            >
              {loading ? "Joining..." : "Join Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

