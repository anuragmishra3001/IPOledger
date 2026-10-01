import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/status");
      setInitialized(data.initialized);
      setUser(data.user);
      setStatus("ready");
    } catch (_) {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setup = useCallback(async (username, password) => {
    const r = await api.post("/api/auth/setup", { username, password });
    setUser(r.user);
    setInitialized(true);
    navigate("/", { replace: true });
  }, [navigate]);

  const login = useCallback(async (username, password) => {
    const r = await api.post("/api/auth/login", { username, password });
    setUser(r.user);
    navigate("/", { replace: true });
  }, [navigate]);

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch (_) {}
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(() => ({ status, user, initialized, setup, login, logout, refresh }), [status, user, initialized, setup, login, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
