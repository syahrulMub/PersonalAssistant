import React from "react";
import { BsCheck2, BsClock } from "react-icons/bs";
import { CategoryBadge } from "../common/CategoryBadge";
import { formatWibTime } from "../../utils/dateUtils";

/**
 * Activity Card Component
 * Merender kartu kegiatan individu dengan mode Completed vs Pending/Overdue
 */
export const ActivityCard = ({ activity, activeTab, onSelect }) => {
  const scheduleTime = activity.remindAt || activity.createdAt;
  const reminderTimeFormatted = formatWibTime(scheduleTime);
  const completedTimeFormatted = formatWibTime(activity.completedAt);
  const isPastDue = scheduleTime ? new Date(scheduleTime) < new Date() : false;

  // KARTU PENCAPAIAN (STATUS: COMPLETED)
  if (activeTab === "completed") {
    return (
      <div
        onClick={() => onSelect(activity)}
        className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:!bg-deep-850 border border-slate-200/90 dark:!border-slate-800 text-slate-900 dark:!text-slate-100 shadow-sm dark:shadow-glass hover:shadow-md hover:border-emerald-300 dark:hover:!border-emerald-700 transition-all flex items-start gap-3.5 group cursor-pointer relative overflow-hidden w-[98%] sm:w-full mx-auto"
      >
        {/* Sisi Kiri: Ikon Centang Hijau Lembut */}
        <div
          className="w-7 h-7 rounded-full bg-emerald-100 dark:!bg-emerald-950/60 text-emerald-600 dark:!text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-300 dark:!border-emerald-800/60 shadow-xs"
          title="Telah Diselesaikan"
        >
          <BsCheck2 className="text-base stroke-[1]" />
        </div>

        {/* Konten Pencapaian: Judul Bersih Tanpa Coretan */}
        <div className="flex-1 min-w-0">
          {/* Baris 1: Judul Aktivitas */}
          <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:!text-white leading-snug break-words mb-1">
            {activity.title}
          </h4>

          {/* Baris 2: Category Badge (Di Bawah Judul) */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            <CategoryBadge category={activity.category} />
          </div>

          {/* Baris 3: Deskripsi (Space Lebih Leluasa & Leading Rileks) */}
          {activity.description && (
            <p className="my-2.5 text-xs text-slate-600 dark:!text-slate-300 line-clamp-2 leading-relaxed">
              {activity.description}
            </p>
          )}

          {/* Baris 4: Timestamp Penyelesaian & Sumber Resolusi */}
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:!text-emerald-300 bg-emerald-50 dark:!bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:!border-emerald-800/40">
              <span>✓ Selesai:</span>
              <span>{completedTimeFormatted || "Hari ini"}</span>
            </span>

            {activity.resolutionSource && (
              <span className="text-[10px] font-mono text-slate-400 dark:!text-slate-500">
                via {activity.resolutionSource}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // KARTU PENJADWALAN (STATUS: PENDING / RESCHEDULED)
  return (
    <div
      onClick={() => onSelect(activity)}
      className={`p-4 sm:p-5 rounded-2xl bg-white/95 dark:!bg-deep-850 border text-slate-900 dark:!text-slate-100 shadow-sm dark:shadow-glass hover:shadow-md transition-all flex items-start gap-3.5 group relative overflow-hidden cursor-pointer w-[98%] sm:w-full mx-auto ${
        activeTab === "overdue"
          ? "border-rose-200/80 dark:!border-rose-900/60 hover:border-rose-300 dark:hover:!border-rose-700"
          : "border-slate-200/90 dark:!border-slate-800 hover:border-ai-violet-300 dark:hover:!border-ai-violet-700"
      }`}
    >
      {/* Sisi Kiri: Lingkaran Aksi */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(activity);
        }}
        aria-label="Buka Opsi Penyelesaian Aktivitas"
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all group-hover:scale-105 ${
          activeTab === "overdue"
            ? "border-rose-300 dark:!border-rose-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:!bg-emerald-950/40"
            : "border-slate-300 dark:!border-slate-600 hover:border-emerald-500 dark:hover:!border-emerald-400 hover:bg-emerald-50 dark:hover:!bg-emerald-950/40"
        }`}
        title="Klik untuk membuka detail & menyelesaikan tugas"
      >
        <BsCheck2 className="text-xs text-transparent group-hover:text-emerald-500 dark:group-hover:!text-emerald-400 transition-colors" />
      </button>

      {/* Konten Kartu */}
      <div className="flex-1 min-w-0">
        {/* Baris 1: Judul Aktivitas */}
        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:!text-white leading-snug break-words mb-1">
          {activity.title}
        </h4>

        {/* Baris 2: Category Badge & Reschedule Count (Di Bawah Judul) */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <CategoryBadge category={activity.category} />
          {activity.rescheduleCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-50 text-purple-700 dark:!bg-purple-950/60 dark:!text-purple-300 border border-purple-200/60 dark:!border-purple-800/50">
              Rescheduled ({activity.rescheduleCount}x)
            </span>
          )}
        </div>

        {/* Baris 3: Deskripsi */}
        {activity.description && (
          <p className="my-2.5 text-xs text-slate-600 dark:!text-slate-300 line-clamp-2 leading-relaxed">
            {activity.description}
          </p>
        )}

        {/* Baris 4: Chip Waktu Pengingat */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {reminderTimeFormatted ? (
            isPastDue ? (
              // Sudah Lewat Jatuh Tempo
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border bg-rose-50 text-rose-700 dark:!bg-rose-950/60 dark:!text-rose-300 border-rose-200/80 dark:!border-rose-900/60"
                title={
                  activity.isReminder
                    ? "Waktu telah lewat (Email alarm aktif)"
                    : "Waktu telah lewat"
                }
              >
                <BsClock className="text-xs text-rose-500" />
                <span>{reminderTimeFormatted}</span>
                <span className="text-[10px] font-sans font-bold px-1 rounded bg-rose-200/70 dark:!bg-rose-800/60 text-rose-800 dark:!text-rose-200">
                  Lewat
                </span>
              </span>
            ) : (
              // Belum Jatuh Tempo
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
                  activeTab === "upcoming"
                    ? "bg-amber-50 text-amber-700 dark:!bg-amber-950/50 dark:!text-amber-300 border-amber-200/80 dark:!border-amber-900/60"
                    : "bg-sky-50 text-sky-700 dark:!bg-sky-950/60 dark:!text-sky-300 border-sky-200/80 dark:!border-sky-900/60"
                }`}
                title={
                  activity.isReminder
                    ? "Email alarm aktif"
                    : "Jadwal waktu kegiatan"
                }
              >
                <BsClock
                  className={`text-xs ${
                    activeTab === "upcoming" ? "text-amber-500" : "text-sky-500"
                  }`}
                />
                <span>{reminderTimeFormatted}</span>
              </span>
            )
          ) : (
            <span className="text-[11px] font-mono text-slate-400 dark:!text-slate-500">
              Tanpa jadwal waktu
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
