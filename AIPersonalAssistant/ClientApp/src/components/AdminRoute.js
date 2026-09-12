import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Memuat...</div>;
  }

  // Jika belum login atau role bukan Admin, lempar ke home
  if (!user || user.role !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};
