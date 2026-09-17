import React, { useEffect } from "react";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsExclamationTriangleFill,
  BsInfoCircleFill,
  BsX,
} from "react-icons/bs";

/**
 * Reusable Mindful Tech Toast Feedback Notification
 *
 * @param {boolean} isOpen - Apakah toast sedang aktif/tampil
 * @param {string} message - Pesan notifikasi
 * @param {"success"|"error"|"warning"|"info"} type - Tipe notifikasi
 * @param {function} onClose - Handler saat toast ditutup
 * @param {number} duration - Durasi tampil sebelum auto-close (default: 4000ms, 0 untuk manual)
 */
export function ToastFeedback({
  isOpen,
  message,
  type = "success",
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    if (!isOpen || !duration) return;

    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose, message]);

  if (!isOpen || !message) return null;

  const config = {
    success: {
      icon: (
        <BsCheckCircleFill className="text-emerald-500 text-lg flex-shrink-0" />
      ),
      accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      border: "border-emerald-500/30 dark:border-emerald-500/30",
      badge: "text-emerald-700 dark:text-emerald-300",
      label: "Berhasil",
    },
    error: {
      icon: <BsXCircleFill className="text-rose-500 text-lg flex-shrink-0" />,
      accentBg: "bg-rose-500/10 dark:bg-rose-500/15",
      border: "border-rose-500/30 dark:border-rose-500/30",
      badge: "text-rose-700 dark:text-rose-300",
      label: "Perhatian",
    },
    warning: {
      icon: (
        <BsExclamationTriangleFill className="text-amber-500 text-lg flex-shrink-0" />
      ),
      accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
      border: "border-amber-500/30 dark:border-amber-500/30",
      badge: "text-amber-700 dark:text-amber-300",
      label: "Peringatan",
    },
    info: {
      icon: (
        <BsInfoCircleFill className="text-ai-violet-500 text-lg flex-shrink-0" />
      ),
      accentBg: "bg-ai-violet-500/10 dark:bg-ai-violet-500/15",
      border: "border-ai-violet-500/30 dark:border-ai-violet-500/30",
      badge: "text-ai-violet-700 dark:text-ai-violet-300",
      label: "Informasi",
    },
  }[type] || {
    icon: (
      <BsInfoCircleFill className="text-ai-violet-500 text-lg flex-shrink-0" />
    ),
    accentBg: "bg-ai-violet-500/10",
    border: "border-ai-violet-500/30",
    badge: "text-ai-violet-700 dark:text-ai-violet-300",
    label: "Info",
  };

  return (
    <aside
      aria-label="Notifikasi Feedback"
      className="fixed top-5 left-4 right-4 sm:left-auto sm:right-6 z-[9999] max-w-md animate-fade-in pointer-events-auto"
    >
      <div
        className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-200 bg-white/95 text-slate-900 border-slate-200/90 dark:bg-[#1E293B]/95 dark:text-[#F8FAFC] ${config.border}`}
      >
        <div className={`p-2 rounded-xl flex-shrink-0 ${config.accentBg}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs font-mono uppercase tracking-wider font-bold ${config.badge}`}
            >
              {config.label}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug break-words">
            {message}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Notifikasi"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex-shrink-0"
          >
            <BsX className="text-xl" />
          </button>
        )}
      </div>
    </aside>
  );
}

export default ToastFeedback;
