import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { isTokenExpired, handleAuthExpired, setupFetchInterceptor } from "../utils/authUtils";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pasang global fetch interceptor saat AuthProvider pertama kali dimuat
  useEffect(() => {
    setupFetchInterceptor();
  }, []);

  const logout = useCallback(() => {
    handleAuthExpired();
    setUser(null);
  }, []);

  // 1. Validasi token saat aplikasi dibuka / di-refresh
  useEffect(() => {
    const storeUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storeUser && token) {
      if (isTokenExpired(token)) {
        // Token sudah expired, tendang ke login
        handleAuthExpired();
        setUser(null);
      } else {
        try {
          setUser(JSON.parse(storeUser));
        } catch (e) {
          handleAuthExpired();
          setUser(null);
        }
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // 2. Pemeriksaan berkala (tiap 10 detik) & saat tab browser kembali aktif (focus)
  useEffect(() => {
    const checkExpiration = () => {
      const token = localStorage.getItem("token");
      if (token && isTokenExpired(token)) {
        handleAuthExpired();
        setUser(null);
      }
    };

    // Jalankan interval tiap 10 detik
    const interval = setInterval(checkExpiration, 10000);

    // Jalankan pemeriksaan ketika tab/jendela kembali difokuskan
    window.addEventListener("focus", checkExpiration);

    // Tangkap custom event auth:expired (dari interceptor axios / fetch)
    const onAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener("auth:expired", onAuthExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkExpiration);
      window.removeEventListener("auth:expired", onAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { token, fullName, fullname, role } = response.data;
    const name = fullName || fullname || "";
    const userData = { email, fullName: name, role };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return response.data;
  };

  const register = async (fullName, email, password) => {
    const response = await api.post("/auth/register", {
      fullName,
      email,
      password,
    });
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
