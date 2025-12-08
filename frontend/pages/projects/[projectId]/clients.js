import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useAuth } from "../../../contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ProjectClientsPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { getAuthHeaders } = useAuth();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    fetch(`${API_BASE_URL}/api/projects/${projectId}/clients`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);

  return (
    <Layout>
      <h1>Clients for project {projectId}</h1>
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
              <th style={{ textAlign: "left", padding: 8 }}>User</th>
              <th style={{ textAlign: "left", padding: 8 }}>Role</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.user_email} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{c.user_email}</td>
                <td style={{ padding: 8 }}>{c.role}</td>
                <td style={{ padding: 8 }}>{c.status || "-"}</td>
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
