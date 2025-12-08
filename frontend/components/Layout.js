import Link from "next/link";

export default function Layout({ children }) {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
        }}
      >
        <Link href="/">
          <span style={{ fontWeight: 600 }}>FL Platform</span>
        </Link>
        <nav style={{ display: "flex", gap: 16 }}>
          <Link href="/projects">Projects</Link>
        </nav>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
