import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setIsLoading(true);

    try {
      const res = await register(fullName, email, password);
      // Jika butuh approval
      if (res.message) {
        setInfoMsg(res.message);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Registrasi gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "24px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2>Daftar Akun Baru</h2>

      {infoMsg && (
        <div
          style={{
            padding: "10px",
            background: "#e8f5e9",
            color: "#2e7d32",
            marginBottom: "16px",
            borderRadius: "4px",
          }}
        >
          {infoMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: "10px",
            background: "#ffebee",
            color: "#c62828",
            marginBottom: "16px",
            borderRadius: "4px",
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>
            Nama Lengkap
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "10px",
            background: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {isLoading ? "Mendaftarkan..." : "Register"}
        </button>
      </form>

      <p style={{ marginTop: "16px", textAlign: "center" }}>
        Sudah punya akun? <Link to="/login">Login di sini</Link>
      </p>
    </div>
  );
};
