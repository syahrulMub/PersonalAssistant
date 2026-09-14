import React, { useState, useEffect } from "react";
import {
  BsCpu,
  BsMicFill,
  BsSunFill,
  BsMoonStarsFill,
  BsEnvelopeCheckFill,
  BsArrowRepeat,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsStars,
} from "react-icons/bs";

export function AIFeatureActivation() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/aifeature", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Sesi login Anda telah berakhir. Silakan login kembali.",
          );
        }
        throw new Error("Gagal memuat data fitur AI.");
      }

      const data = await response.json();
      setFeatures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching AI features:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleToggle = async (featureId, currentStatus) => {
    const nextStatus = !currentStatus;
    setTogglingId(featureId);
    setFeedback(null);

    // Optimistic UI update
    setFeatures((prev) =>
      prev.map((f) =>
        f.featureId === featureId ? { ...f, isEnabled: nextStatus } : f,
      ),
    );

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/aifeature/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          featureId,
          isEnabled: nextStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui status fitur di server.");
      }

      const result = await response.json();
      // Update with server returned updatedAt
      setFeatures((prev) =>
        prev.map((f) =>
          f.featureId === featureId
            ? { ...f, isEnabled: result.isEnabled, updatedAt: result.updatedAt }
            : f,
        ),
      );

      setFeedback({
        type: "success",
        message:
          result.message ||
          `Fitur berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}.`,
      });

      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback(null);
      }, 3500);
    } catch (err) {
      console.error("Error toggling feature:", err);
      // Revert optimistic update
      setFeatures((prev) =>
        prev.map((f) =>
          f.featureId === featureId ? { ...f, isEnabled: currentStatus } : f,
        ),
      );
      setFeedback({
        type: "danger",
        message: err.message || "Terjadi kesalahan saat mengubah status fitur.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const getFeatureIcon = (key = "", name = "") => {
    const lowerKey = (key + " " + name).toLowerCase();
    if (
      lowerKey.includes("voice") ||
      lowerKey.includes("speech") ||
      lowerKey.includes("suara")
    ) {
      return <BsMicFill className="text-primary fs-3" />;
    }
    if (
      lowerKey.includes("morning") ||
      lowerKey.includes("pagi") ||
      lowerKey.includes("brief")
    ) {
      return <BsSunFill className="text-warning fs-3" />;
    }
    if (
      lowerKey.includes("night") ||
      lowerKey.includes("malam") ||
      lowerKey.includes("recap")
    ) {
      return <BsMoonStarsFill className="text-info fs-3" />;
    }
    if (
      lowerKey.includes("email") ||
      lowerKey.includes("reminder") ||
      lowerKey.includes("notif")
    ) {
      return <BsEnvelopeCheckFill className="text-success fs-3" />;
    }
    return <BsCpu className="text-purple fs-3" style={{ color: "#6f42c1" }} />;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container py-4">
      {/* Header Section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <BsStars className="text-warning" /> Aktivasi Fitur AI
          </h2>
          <p className="text-muted mb-0">
            Kelola dan sesuaikan fitur kecerdasan buatan (AI) yang ingin Anda
            aktifkan untuk akun Anda.
          </p>
        </div>
        <button
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 mt-2 mt-md-0"
          onClick={fetchFeatures}
          disabled={loading}
        >
          <BsArrowRepeat
            className={loading ? "spinner-border spinner-border-sm" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Alert / Feedback Notification */}
      {feedback && (
        <div
          className={`alert alert-${feedback.type} alert-dismissible fade show d-flex align-items-center gap-2`}
          role="alert"
        >
          {feedback.type === "success" ? (
            <BsCheckCircleFill className="fs-5 flex-shrink-0" />
          ) : (
            <BsExclamationTriangleFill className="fs-5 flex-shrink-0" />
          )}
          <div>{feedback.message}</div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setFeedback(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <BsExclamationTriangleFill className="fs-5" />
          <div>{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-2">Memuat daftar fitur AI...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && features.length === 0 && (
        <div className="card border-0 shadow-sm text-center py-5 px-3">
          <div className="card-body">
            <BsCpu className="display-4 text-muted mb-3" />
            <h5 className="fw-bold">Belum Ada Fitur AI Terdaftar</h5>
            <p className="text-muted mx-auto" style={{ maxWidth: "480px" }}>
              Belum ada data master fitur AI yang tersedia di database saat ini.
            </p>
          </div>
        </div>
      )}

      {/* Feature Cards Grid */}
      {!loading && features.length > 0 && (
        <div className="row g-4">
          {features.map((feature) => {
            const isBusy = togglingId === feature.featureId;
            return (
              <div key={feature.featureId} className="col-12 col-md-6 col-lg-6">
                <div
                  className={`card h-100 shadow-sm border ${
                    feature.isEnabled
                      ? "border-primary bg-light-subtle"
                      : "border-secondary-subtle"
                  }`}
                  style={{
                    borderRadius: "14px",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex align-items-start justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="p-3 rounded-circle bg-white shadow-sm d-flex align-items-center justify-content-center"
                          style={{ width: "54px", height: "54px" }}
                        >
                          {getFeatureIcon(feature.key, feature.name)}
                        </div>
                        <div>
                          <h5 className="card-title fw-bold mb-1">
                            {feature.name}
                          </h5>
                          <span className="badge bg-light text-secondary border font-monospace small">
                            {feature.key}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`badge ${
                          feature.isEnabled
                            ? "bg-success-subtle text-success border border-success"
                            : "bg-secondary-subtle text-secondary border"
                        } px-2 py-1 rounded-pill`}
                        style={{ fontSize: "0.8rem" }}
                      >
                        {feature.isEnabled ? "● Aktif" : "○ Nonaktif"}
                      </span>
                    </div>

                    {/* Feature Description */}
                    <p
                      className="card-text text-muted flex-grow-1"
                      style={{ fontSize: "0.95rem" }}
                    >
                      {feature.description ||
                        "Tidak ada deskripsi untuk fitur ini."}
                    </p>

                    {/* Card Footer: Switch Toggle & Last Updated */}
                    <div className="d-flex align-items-center justify-content-between pt-3 mt-2 border-top">
                      <small
                        className="text-muted"
                        style={{ fontSize: "0.8rem" }}
                      >
                        {feature.updatedAt
                          ? `Diperbarui: ${formatDateTime(feature.updatedAt)}`
                          : "Status default"}
                      </small>

                      <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                        <label
                          className="form-check-label user-select-none small fw-semibold"
                          htmlFor={`switch-${feature.featureId}`}
                          style={{ cursor: isBusy ? "wait" : "pointer" }}
                        >
                          {feature.isEnabled ? "Aktif" : "Nonaktif"}
                        </label>
                        <input
                          className="form-check-input ms-0"
                          type="checkbox"
                          role="switch"
                          id={`switch-${feature.featureId}`}
                          checked={feature.isEnabled}
                          disabled={isBusy}
                          onChange={() =>
                            handleToggle(feature.featureId, feature.isEnabled)
                          }
                          style={{
                            cursor: isBusy ? "wait" : "pointer",
                            width: "2.5em",
                            height: "1.25em",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default AIFeatureActivation;
