import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function UserSwitcher() {
  const { currentUser, switchUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const commonUsers = [
    "user1@local.test",
    "user2@local.test",
    "user3@local.test",
    "host@local.test",
    "client@local.test",
  ];

  const handleAddUser = (e) => {
    e.preventDefault();
    if (newEmail && !commonUsers.includes(newEmail)) {
      commonUsers.push(newEmail);
    }
    switchUser(newEmail);
    setNewEmail("");
    setShowForm(false);
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: "24px",
        padding: "16px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
          Current user:
        </span>
        <select
          value={currentUser}
          onChange={(e) => switchUser(e.target.value)}
          className="form-select"
          style={{ width: "auto", minWidth: "200px", padding: "6px 12px" }}
        >
          {commonUsers.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-secondary"
          style={{ padding: "6px 16px", fontSize: "0.875rem" }}
        >
          {showForm ? "Cancel" : "+ New User"}
        </button>
      </div>
      {showForm && (
        <form
          onSubmit={handleAddUser}
          style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px" }}>
            Add & Switch
          </button>
        </form>
      )}
    </div>
  );
}

