import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ProjectModelsPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { getAuthHeaders } = useAuth();

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    fetch(`${API_BASE_URL}/api/projects/${projectId}/models`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        setModels(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);

  return (
    <Layout>
      <h1>Models for project {projectId}</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!loading && !error && (
        <table
          style={{
            marginTop: 16,
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #e5e7eb",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Version</th>
              <th style={{ textAlign: "left", padding: 8 }}>Source</th>
              <th style={{ textAlign: "left", padding: 8 }}>Base model</th>
              <th style={{ textAlign: "left", padding: 8 }}>Tuning</th>
              <th style={{ textAlign: "left", padding: 8 }}>Precision</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.version} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{m.version}</td>
                <td style={{ padding: 8 }}>{m.source}</td>
                <td style={{ padding: 8 }}>{m.base_model_id}</td>
                <td style={{ padding: 8 }}>{m.tuning_strategy || "-"}</td>
                <td style={{ padding: 8 }}>{m.precision || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 16 }}>
        <Link href={`/projects/${projectId}`}>Back to overview</Link>
      </div>
    </Layout>
  );
}
