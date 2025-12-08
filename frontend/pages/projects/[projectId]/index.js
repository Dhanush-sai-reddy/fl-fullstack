import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const DEFAULT_EMAIL = "host@example.com";

export default function ProjectOverviewPage() {
  const router = useRouter();
  const { projectId } = router.query;

  const [project, setProject] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    async function load() {
      try {
        const [projRes, roundRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
            headers: { "x-user-email": DEFAULT_EMAIL },
          }),
          fetch(`${API_BASE_URL}/api/projects/${projectId}/rounds/current`, {
            headers: { "x-user-email": DEFAULT_EMAIL },
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
  }, [projectId]);

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
      <h1>{project.name}</h1>
      <p style={{ marginTop: 8 }}>{project.description}</p>
      <p style={{ marginTop: 4 }}>Task: {project.task_type}</p>
      <p style={{ marginTop: 4 }}>Role: {project.role}</p>
      <p style={{ marginTop: 4 }}>Status: {project.status}</p>
      <p style={{ marginTop: 4 }}>Invite code: {project.invite_code}</p>

      {project.model && (
        <div style={{ marginTop: 16 }}>
          <strong>Model</strong>
          <p>Base: {project.model.base_model_id}</p>
          <p>Tuning: {project.model.tuning_strategy}</p>
          <p>Precision: {project.model.precision}</p>
        </div>
      )}

      {currentRound && (
        <div style={{ marginTop: 16 }}>
          <strong>Current round</strong>
          <p>Round: {currentRound.round_number}</p>
          <p>Status: {currentRound.status}</p>
          <p>
            Clients reporting: ? / {currentRound.expected_clients ?? "?"}
          </p>
        </div>
      )}

      <nav
        style={{
          marginTop: 24,
          display: "flex",
          gap: 16,
          borderTop: "1px solid #e5e7eb",
          paddingTop: 16,
        }}
      >
        <Link href={`/projects/${project.id}`}>Overview</Link>
        <Link href={`/projects/${project.id}/clients`}>Clients</Link>
        <Link href={`/projects/${project.id}/rounds`}>Rounds</Link>
        <Link href={`/projects/${project.id}/models`}>Models</Link>
      </nav>
    </Layout>
  );
}
