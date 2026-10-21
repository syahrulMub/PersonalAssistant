import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { isTokenExpired } from "./utils/authUtils";
import "./custom.css";

// Pembungkus route yang memerlukan otentikasi
function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (loading) {
    return <div className="text-center p-5">Memuat...</div>;
  }

  // Jika tidak ada user atau token sudah expired, tendang ke login
  if (!user || !token || isTokenExpired(token)) {
    if (token && isTokenExpired(token)) {
      logout();
    }
    return <Navigate to="/login?expired=1" replace />;
  }

  return children;
}

// Pembungkus route publik/tamu (jika sudah login dan token masih valid, redirect ke /)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (loading) {
    return <div className="text-center p-5">Memuat...</div>;
  }

  // Hanya redirect ke home jika user ada dan token masih aktif
  if (user && token && !isTokenExpired(token)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* 1. Route Publik / Auth (Tanpa Layout) */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* 2. Route Utama (Dilindungi Otorisasi & Dibungkus Layout) */}
          {AppRoutes.map((route, index) => {
            const { element, requireAuth = true, ...rest } = route;
            return (
              <Route
                key={index}
                {...rest}
                element={
                  requireAuth ? (
                    <ProtectedRoute>
                      <Layout>{element}</Layout>
                    </ProtectedRoute>
                  ) : (
                    <Layout>{element}</Layout>
                  )
                }
              />
            );
          })}

          {/* 3. Fallback Route jika URL tidak ditemukan */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
