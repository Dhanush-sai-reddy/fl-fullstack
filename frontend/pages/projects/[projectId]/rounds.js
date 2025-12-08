import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const DEFAULT_EMAIL = "host@example.com";

export default function ProjectRoundsPage() {
  const router = useRouter();
  const { projectId } = router.query;

  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    fetch(`${API_BASE_URL}/api/projects/${projectId}/rounds`, {
      headers: { "x-user-email": DEFAULT_EMAIL },
    })
      .then((res) => res.json())
      .then((data) => {
        setRounds(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);

  return (
    <Layout>
      <h1>Rounds for project {projectId}</h1>
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
              <th style={{ textAlign: "left", padding: 8 }}>Round</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", padding: 8 }}>Min clients</th>
              <th style={{ textAlign: "left", padding: 8 }}>Expected</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{r.round_number}</td>
                <td style={{ padding: 8 }}>{r.status}</td>
                <td style={{ padding: 8 }}>{r.min_clients}</td>
                <td style={{ padding: 8 }}>{r.expected_clients ?? "-"}</td>
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
