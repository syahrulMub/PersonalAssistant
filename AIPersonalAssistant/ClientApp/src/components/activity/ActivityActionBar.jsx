import React from "react";
import { BsStars, BsMicFill, BsPlusLg, BsArrowRepeat } from "react-icons/bs";

/**
 * Activity Action Bar Component
 * Header halaman dan tombol aksi 2 baris simetris untuk mobile & desktop
 */
export const ActivityActionBar = ({
  loading,
  onOpenReflection,
  onOpenQuickVoice,
  onOpenManualCreate,
  onRefresh,
}) => {
  return (
    <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:!border-slate-800/80">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-100 text-emerald-800 dark:!bg-emerald-950/60 dark:!text-emerald-300 border border-emerald-200 dark:!border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Activity Tracker
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:!text-white">
          Catatan Aktivitas & Kebiasaan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:!text-slate-400 mt-1">
          Pantau jadwal harian, refleksi mindful, dan log pencapaian Anda.
        </p>
      </div>

      {/* Action Bar 2 Baris Simetris (Mobile-First) */}
      <div className="flex flex-col gap-2 w-full lg:w-auto">
        {/* Baris 1: Tombol Utama Daily Reflection */}
        <button
          type="button"
          onClick={onOpenReflection}
          className="w-full lg:w-auto px-4 py-2.5 rounded-2xl font-semibold text-xs text-white bg-gradient-to-r from-ai-violet-600 via-ai-violet-500 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
          title="Buka Daily Reflection Harian"
        >
          <BsStars className="text-sm" />
          <span>Daily Reflection</span>
        </button>

        {/* Baris 2: 3 Tombol Aksi Sejajar dalam Grid Seimbang */}
        <div className="grid grid-cols-3 gap-2 w-full lg:w-auto lg:flex lg:items-center">
          {/* Tombol Cepat: Bicara */}
          <button
            type="button"
            onClick={onOpenQuickVoice}
            className="w-full lg:w-auto px-3 py-2.5 rounded-2xl font-semibold text-xs text-ai-violet-700 dark:!text-ai-violet-300 bg-ai-violet-50 dark:!bg-ai-violet-950/50 hover:bg-ai-violet-100 dark:hover:!bg-ai-violet-900/60 border border-ai-violet-200 dark:!border-ai-violet-800/60 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            title="Rekam Jadwal atau Pencapaian dengan Suara"
          >
            <BsMicFill className="text-sm text-ai-violet-600 dark:!text-ai-violet-400" />
            <span>Bicara</span>
          </button>

          {/* Tombol Manual: Tambah */}
          <button
            type="button"
            onClick={onOpenManualCreate}
            className="w-full lg:w-auto px-3 py-2.5 rounded-2xl font-semibold text-xs text-slate-700 dark:!text-slate-200 bg-white/95 dark:!bg-deep-850 hover:bg-slate-50 dark:hover:!bg-deep-750 border border-slate-200 dark:!border-slate-800 shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
            title="Tambah Kegiatan Manual"
          >
            <BsPlusLg className="text-xs" />
            <span>Tambah</span>
          </button>

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="w-full lg:w-auto px-3 py-2.5 rounded-2xl font-semibold text-xs text-slate-700 dark:!text-slate-300 bg-white/95 dark:!bg-deep-850 hover:bg-slate-50 dark:hover:!bg-deep-750 border border-slate-200 dark:!border-slate-800 shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <BsArrowRepeat
              className={`text-sm ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </section>
  );
};
