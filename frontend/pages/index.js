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
      <h1>FL Platform Dashboard</h1>
      <p>Backend health: {status}</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <div style={{ marginTop: 24 }}>
        <Link href="/projects">Go to Projects</Link>
      </div>
    </Layout>
  );
}
