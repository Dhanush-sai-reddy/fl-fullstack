import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function Home() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health/ready`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status ?? "unknown");
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <Layout>
      <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto", paddingTop: "60px" }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            fontWeight: "bold",
            color: "white",
            boxShadow: "0 8px 24px rgba(6, 182, 212, 0.3)",
          }}
        >
          ✓
        </div>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            marginBottom: "16px",
            background: "linear-gradient(135deg, var(--text-primary), var(--accent-light))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FedLearn Nexus
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--text-secondary)",
            marginBottom: "48px",
            lineHeight: 1.7,
          }}
        >
          Deploy secure, decentralized training sessions instantly. Configure Hugging Face models
          with PEFT/LoRA and orchestrate federated learning across any device with a browser.
        </p>

        <div className="grid grid-2" style={{ marginTop: "48px", gap: "24px" }}>
          <Link href="/projects" style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{
                padding: "32px",
                cursor: "pointer",
                transition: "all 0.3s",
                border: "1px solid var(--border)",
                height: "100%",
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
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                  fontSize: "24px",
                }}
              >
                🖥️
              </div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "12px", color: "var(--text-primary)" }}>
                Host Session
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Initialize a FL server, configure model parameters, and invite peers.
              </p>
            </div>
          </Link>

          <div
            className="card"
            style={{
              padding: "32px",
              border: "1px solid var(--border)",
              height: "100%",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(6, 182, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                fontSize: "24px",
              }}
            >
              💻
            </div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "12px", color: "var(--text-primary)" }}>
              Join Node
            </h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Connect your device to an existing session and contribute compute.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "48px",
            padding: "16px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: status === "ready" ? "var(--success)" : "var(--error)",
                animation: status === "ready" ? "pulse 2s infinite" : "none",
              }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Backend: {status === "ready" ? "Ready" : error ? "Error" : "Checking..."}
            </span>
          </div>
        </div>

        <p
          style={{
            marginTop: "32px",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          Powered by FastAPI & Hugging Face • Local Simulation Mode
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Layout>
  );
}
