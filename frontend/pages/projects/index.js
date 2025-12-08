import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const DEFAULT_EMAIL = "host@example.com";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/projects`, {
      headers: {
        "x-user-email": DEFAULT_EMAIL,
      },
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
  }, []);

  return (
    <Layout>
      <h1>Projects</h1>
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
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Task</th>
              <th style={{ textAlign: "left", padding: 8 }}>Role</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>
                  <Link href={`/projects/${p.id}`}>{p.name}</Link>
                </td>
                <td style={{ padding: 8 }}>{p.task_type}</td>
                <td style={{ padding: 8 }}>{p.role || "-"}</td>
                <td style={{ padding: 8 }}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
}
