import React, { createContext, useContext, useState, useEffect } from "react";
import { applyDarkMode, readStoredDarkMode } from "../utils/theme";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyDarkMode(readStoredDarkMode());

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const controller = new AbortController();

    const bootstrapAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await authAPI.me(token, controller.signal);
        if (controller.signal.aborted) return;

        if (!result.success) throw new Error(result.error || "Session expired");

        const userData = result.data?.user;
        if (!userData) {
          throw new Error("Invalid session");
        }

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
      } catch (_error) {
        if (controller.signal.aborted) return;

        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();
    return () => {
      controller.abort();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const result = await authAPI.login(email, password);
      if (!result.success) {
        return { success: false, error: result.error || "Login failed" };
      }

      const userData = result.data?.user;
      const token = result.data?.token;
      if (!userData || !token) {
        return { success: false, error: "Invalid login response" };
      }

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
