import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  BsClockHistory,
  BsToggleOff,
} from "react-icons/bs";
import { ToastFeedback } from "./common/ToastFeedback";
import { formatDateTime } from "../context/DateFormat";

export function AIFeatureActivation() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ isOpen: true, message, type });
  };

  const fetchFeatures = useCallback(async () => {
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
        throw new Error("Gagal memuat data fitur AI dari server.");
      }

      const data = await response.json();
      setFeatures(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching AI features:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data fitur AI.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const handleToggle = async (featureId, currentStatus) => {
    const nextStatus = !currentStatus;
    setTogglingId(featureId);

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

      // Update state dengan data terbaru dari server
      setFeatures((prev) =>
        prev.map((f) =>
          f.featureId === featureId
            ? { ...f, isEnabled: result.isEnabled, updatedAt: result.updatedAt }
            : f,
        ),
      );

      showToast(
        result.message ||
          `Fitur berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}.`,
        "success",
      );
    } catch (err) {
      console.error("Error toggling feature:", err);
      // Revert optimistic update
      setFeatures((prev) =>
        prev.map((f) =>
          f.featureId === featureId ? { ...f, isEnabled: currentStatus } : f,
        ),
      );
      showToast(
        err.message || "Terjadi kesalahan saat mengubah status fitur.",
        "error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Helper Ikon dan Aksen Warna Berdasarkan Fitur
  const getFeatureStyle = (key = "", name = "") => {
    const text = (key + " " + name).toLowerCase();

    if (
      text.includes("voice") ||
      text.includes("speech") ||
      text.includes("suara")
    ) {
      return {
        icon: <BsMicFill className="text-xl" />,
        badge:
          "bg-sky-50 dark:!bg-sky-950/60 text-sky-600 dark:!text-sky-400 border-sky-200 dark:!border-sky-800",
        activeGlow: "group-hover:border-sky-400/50",
      };
    }
    if (
      text.includes("morning") ||
      text.includes("pagi") ||
      text.includes("brief")
    ) {
      return {
        icon: <BsSunFill className="text-xl" />,
        badge:
          "bg-amber-50 dark:!bg-amber-950/60 text-amber-600 dark:!text-amber-400 border-amber-200 dark:!border-amber-800",
        activeGlow: "group-hover:border-amber-400/50",
      };
    }
    if (
      text.includes("night") ||
      text.includes("malam") ||
      text.includes("recap")
    ) {
      return {
        icon: <BsMoonStarsFill className="text-xl" />,
        badge:
          "bg-indigo-50 dark:!bg-indigo-950/60 text-indigo-600 dark:!text-indigo-400 border-indigo-200 dark:!border-indigo-800",
        activeGlow: "group-hover:border-indigo-400/50",
      };
    }
    if (
      text.includes("email") ||
      text.includes("reminder") ||
      text.includes("notif")
    ) {
      return {
        icon: <BsEnvelopeCheckFill className="text-xl" />,
        badge:
          "bg-emerald-50 dark:!bg-emerald-950/60 text-emerald-600 dark:!text-emerald-400 border-emerald-200 dark:!border-emerald-800",
        activeGlow: "group-hover:border-emerald-400/50",
      };
    }
    return {
      icon: <BsCpu className="text-xl" />,
      badge:
        "bg-ai-violet-50 dark:!bg-ai-violet-950/60 text-ai-violet-600 dark:!text-ai-violet-400 border-ai-violet-200 dark:!border-ai-violet-800",
      activeGlow: "group-hover:border-ai-violet-400/50",
    };
  };

  // Statistik Cepat
  const activeCount = useMemo(
    () => features.filter((f) => f.isEnabled).length,
    [features],
  );
  const inactiveCount = useMemo(
    () => features.filter((f) => !f.isEnabled).length,
    [features],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Feedback Notification */}
      <ToastFeedback
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:!border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-ai-violet-600 via-ai-violet-500 to-sage-500 flex items-center justify-center text-white shadow-glow-violet flex-shrink-0">
              <BsStars className="text-xl animate-twinkle" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:!text-white flex items-center gap-2">
                Aktivasi Fitur AI
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:!text-slate-400">
                Kelola dan sesuaikan modul kecerdasan buatan (Gemini AI) untuk
                akun Anda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchFeatures}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border bg-white dark:!bg-deep-850 border-slate-200 dark:!border-slate-800 text-slate-700 dark:!text-slate-200 hover:bg-slate-50 dark:hover:!bg-deep-750 active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <BsArrowRepeat
              className={`text-sm ${loading ? "animate-spin" : ""}`}
            />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* 2. Metric / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Features */}
        <div className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-slate-700 dark:!text-slate-300 text-lg flex-shrink-0">
            <BsCpu />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:!text-slate-400">
              Total Modul AI
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:!text-white">
              {features.length}
            </div>
          </div>
        </div>

        {/* Active Features */}
        <div className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:!bg-emerald-950/60 border border-emerald-200 dark:!border-emerald-800 flex items-center justify-center text-emerald-600 dark:!text-emerald-400 text-lg flex-shrink-0">
            <BsCheckCircleFill />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:!text-slate-400">
              Fitur Aktif
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:!text-emerald-400 flex items-center gap-2">
              <span>{activeCount}</span>
              {activeCount > 0 && (
                <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:!bg-emerald-900/60 dark:!text-emerald-200 font-semibold">
                  Berjalan
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inactive Features */}
        <div className="p-4 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-slate-500 dark:!text-slate-400 text-lg flex-shrink-0">
            <BsToggleOff />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 dark:!text-slate-400">
              Fitur Nonaktif
            </div>
            <div className="text-xl font-bold font-mono text-slate-600 dark:!text-slate-400">
              {inactiveCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:!bg-rose-950/50 border border-rose-200 dark:!border-rose-800/80 text-rose-700 dark:!text-rose-300 flex items-start gap-3">
          <BsExclamationTriangleFill className="text-lg flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-medium">{error}</div>
        </div>
      )}

      {/* 4. Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-5 rounded-3xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:!bg-deep-800" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-4 rounded-md bg-slate-200 dark:!bg-deep-800" />
                    <div className="w-20 h-3 rounded-md bg-slate-200 dark:!bg-deep-800" />
                  </div>
                </div>
                <div className="w-12 h-6 rounded-full bg-slate-200 dark:!bg-deep-800" />
              </div>
              <div className="w-full h-10 rounded-md bg-slate-100 dark:!bg-deep-900" />
              <div className="pt-3 border-t border-slate-100 dark:!border-slate-800 flex justify-between">
                <div className="w-28 h-3 rounded-md bg-slate-200 dark:!bg-deep-800" />
                <div className="w-16 h-3 rounded-md bg-slate-200 dark:!bg-deep-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && !error && features.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-white dark:!bg-deep-850 border border-slate-200/80 dark:!border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center text-slate-400 text-2xl mx-auto">
            <BsCpu />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:!text-slate-200">
            Belum Ada Fitur AI Terdaftar
          </h3>
          <p className="text-xs text-slate-500 dark:!text-slate-400 max-w-sm mx-auto">
            Belum ada data modul fitur AI yang tersedia di server saat ini.
          </p>
        </div>
      )}

      {/* 6. Feature Cards Grid */}
      {!loading && features.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => {
            const isBusy = togglingId === feature.featureId;
            const style = getFeatureStyle(feature.key, feature.name);

            return (
              <div
                key={feature.featureId}
                className={`group relative p-5 rounded-3xl transition-all duration-200 flex flex-col justify-between border ${
                  feature.isEnabled
                    ? "bg-white dark:!bg-deep-850 border-ai-violet-300/80 dark:!border-ai-violet-500/40 shadow-xs hover:shadow-md ring-1 ring-ai-violet-500/20 dark:ring-ai-violet-500/20"
                    : "bg-white/90 dark:!bg-deep-850/90 border-slate-200/80 dark:!border-slate-800 shadow-xs hover:border-slate-300 dark:hover:!border-slate-700"
                }`}
              >
                {/* Top Row: Icon, Titles, and Status Pill */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Icon Container */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${style.badge}`}
                      >
                        {style.icon}
                      </div>

                      {/* Name & Key */}
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:!text-white truncate">
                          {feature.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:!bg-deep-900 text-slate-600 dark:!text-slate-400 border border-slate-200/80 dark:!border-slate-800">
                            {feature.key}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0 ${
                        feature.isEnabled
                          ? "bg-emerald-50 text-emerald-700 dark:!bg-emerald-950/60 dark:!text-emerald-300 border-emerald-200 dark:!border-emerald-800"
                          : "bg-slate-100 text-slate-600 dark:!bg-deep-900 dark:!text-slate-400 border-slate-200 dark:!border-slate-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          feature.isEnabled
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-slate-400"
                        }`}
                      />
                      {feature.isEnabled ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  {/* Feature Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:!text-slate-300 leading-relaxed min-h-[44px]">
                    {feature.description ||
                      "Tidak ada deskripsi rinci untuk fitur ini."}
                  </p>
                </div>

                {/* Card Footer: Timestamp & Custom Tailwind Switch */}
                <div className="pt-3.5 mt-3 border-t border-slate-100 dark:!border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:!text-slate-500">
                    <BsClockHistory className="text-[11px]" />
                    <span className="truncate">
                      {feature.updatedAt
                        ? `Diperbarui: ${formatDateTime(feature.updatedAt)}`
                        : "Konfigurasi bawaan"}
                    </span>
                  </div>

                  {/* Custom Tailwind Switch Toggle (iOS / Linear style) */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-700 dark:!text-slate-300 select-none hidden sm:inline-block">
                      {feature.isEnabled ? "Aktif" : "Mati"}
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={feature.isEnabled}
                      aria-label={`Toggle ${feature.name}`}
                      disabled={isBusy}
                      onClick={() =>
                        handleToggle(feature.featureId, feature.isEnabled)
                      }
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-ai-violet-500 focus:ring-offset-2 dark:focus:ring-offset-deep-950 ${
                        feature.isEnabled
                          ? "bg-ai-violet-600 dark:!bg-ai-violet-500 shadow-xs"
                          : "bg-slate-300 dark:!bg-slate-700"
                      } ${isBusy ? "opacity-60 cursor-wait" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          feature.isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      >
                        {isBusy ? (
                          <BsArrowRepeat className="text-[11px] text-ai-violet-600 animate-spin" />
                        ) : feature.isEnabled ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-ai-violet-600" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </span>
                    </button>
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
