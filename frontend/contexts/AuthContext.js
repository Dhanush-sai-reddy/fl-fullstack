import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Load saved user from localStorage
    const saved = localStorage.getItem("fl_current_user");
    if (saved) {
      setCurrentUser(saved);
    } else {
      // Default to first user
      setCurrentUser("user1@local.test");
      localStorage.setItem("fl_current_user", "user1@local.test");
    }
  }, []);

  const switchUser = (email) => {
    setCurrentUser(email);
    localStorage.setItem("fl_current_user", email);
  };

  const getAuthHeaders = () => {
    return currentUser ? { "x-user-email": currentUser } : {};
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchUser, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

