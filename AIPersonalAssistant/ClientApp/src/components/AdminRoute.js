import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isTokenExpired } from "../utils/authUtils";

export const AdminRoute = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (loading) {
    return <div>Memuat...</div>;
  }

  // Jika belum login atau token sudah expired, tendang ke login
  if (!user || !token || isTokenExpired(token)) {
    if (token && isTokenExpired(token)) {
      logout();
    }
    return <Navigate to="/login?expired=1" replace />;
  }

  // Jika bukan Admin, lempar ke home
  if (user.role !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};
