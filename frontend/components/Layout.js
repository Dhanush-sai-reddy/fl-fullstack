import Link from "next/link";
import UserSwitcher from "./UserSwitcher";

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            FL
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--text-primary)" }}>
            FedLearn Nexus
          </span>
        </Link>
        <nav style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link
            href="/projects"
            style={{
              color: "var(--text-secondary)",
              fontWeight: 500,
              padding: "8px 16px",
              borderRadius: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--accent)";
              e.target.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-secondary)";
              e.target.style.background = "transparent";
            }}
          >
            Projects
          </Link>
        </nav>
      </header>
      <main style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
        <UserSwitcher />
        {children}
      </main>
    </div>
  );
}
