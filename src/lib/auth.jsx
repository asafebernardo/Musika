import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { request } from "@/api/songs.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    request("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        setAvailable(true);
      })
      .catch(() => {
        if (!active) return;
        setAvailable(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      available,
      async login(credentials) {
        const result = await request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        setUser(result.user);
        setAvailable(true);
        return result.user;
      },
      async register(person) {
        const result = await request("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(person),
        });
        setUser(result.user);
        setAvailable(true);
        return result.user;
      },
      async setupAdmin(person) {
        const result = await request("/api/auth/setup", {
          method: "POST",
          body: JSON.stringify(person),
        });
        setUser(result.user);
        setAvailable(true);
        return result.user;
      },
      async logout() {
        await request("/api/auth/logout", { method: "POST", body: "{}" });
        setUser(null);
      },
      async deleteAccount() {
        await request("/api/auth/account", { method: "DELETE" });
        setUser(null);
      },
    }),
    [available, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
