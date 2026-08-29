import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextCore";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Define callbacks BEFORE any effect that depends on them to avoid TDZ errors.
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/users/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!res.ok) {
        let message = "Login failed";
        try {
          const errData = await res.json();
          message = errData.message || errData.error || message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.data.user);
      setIsAuthenticated(true);
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.data.user));
      return data;
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    }
  }, []);

  // Load persisted auth on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error("Failed to parse stored auth data", e);
    }
  }, []);

  // Validate stored token still maps to an existing user (detect reseed)
  useEffect(() => {
    const verify = async () => {
      if (!token || !user?._id) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/users/${user._id}`
        );
        if (res.status === 404) {
          console.warn(
            "[Auth] Stored user no longer exists (likely reseed); clearing auth"
          );
          logout();
        }
      } catch {
        // Network errors ignored; don't log out on transient issues
      }
    };
    verify();
  }, [token, user, logout]);

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
