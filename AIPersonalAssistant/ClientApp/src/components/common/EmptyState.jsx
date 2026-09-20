import React from "react";
import { BsPlusLg, BsArrowCounterclockwise, BsFunnel } from "react-icons/bs";

/**
 * Reusable & Mindful Empty State Component
 * Menampilkan pesan adaptif dan positif sesuai tab yang sedang aktif atau status filter
 */
export const EmptyState = ({
  activeTab,
  onAddActivity,
  isFiltered = false,
  onResetFilter,
}) => {
  const getEmptyStateConfig = () => {
    if (isFiltered) {
      return {
        icon: <BsFunnel className="text-emerald-500 text-2xl" />,
        title: "Tidak ada pencapaian yang cocok",
        description:
          "Tidak ada aktivitas yang sesuai dengan kriteria filter atau kata kunci pencarian yang Anda pilih.",
        showAddButton: false,
        showResetButton: true,
      };
    }

    switch (activeTab) {
      case "today":
        return {
          icon: <span className="text-2xl">📋</span>,
          title: "Tidak ada fokus hari ini",
          description:
            "Semua fokus hari ini telah tuntas! Gunakan tombol 'Bicara' atau 'Tambah' untuk merencanakan hal baru.",
          showAddButton: true,
          showResetButton: false,
        };
      case "upcoming":
        return {
          icon: <span className="text-2xl">📅</span>,
          title: "Tidak ada jadwal mendatang",
          description:
            "Belum ada aktivitas yang dijadwalkan untuk esok hari atau seterusnya.",
          showAddButton: true,
          showResetButton: false,
        };
      case "overdue":
        return {
          icon: <span className="text-2xl">⏳</span>,
          title: "Bagus, tidak ada tugas yang tertinggal!",
          description:
            "Bagus sekali! Tidak ada aktivitas yang terlewat dari hari-hari sebelumnya.",
          showAddButton: false,
          showResetButton: false,
        };
      case "completed":
        return {
          icon: <span className="text-2xl">🏆</span>,
          title: "Belum ada pencapaian yang tuntas",
          description:
            "Aktivitas yang Anda selesaikan akan otomatis tercatat di sini sebagai rekam jejak progres Anda.",
          showAddButton: false,
          showResetButton: false,
        };
      default:
        return {
          icon: <span className="text-2xl">📋</span>,
          title: "Belum ada catatan aktivitas",
          description: "Mulai tambahkan kegiatan baru untuk hari ini.",
          showAddButton: true,
          showResetButton: false,
        };
    }
  };

  const { icon, title, description, showAddButton, showResetButton } =
    getEmptyStateConfig();

  return (
    <div className="p-12 text-center rounded-3xl bg-white/90 dark:!bg-deep-850/80 border border-slate-200/80 dark:!border-slate-800/80 space-y-3 shadow-sm animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center mx-auto">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:!text-slate-200">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:!text-slate-400 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      {showResetButton && onResetFilter && (
        <button
          type="button"
          onClick={onResetFilter}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:!text-rose-400 bg-rose-50 dark:!bg-rose-950/50 hover:bg-rose-100 dark:hover:!bg-rose-900/60 border border-rose-200 dark:!border-rose-800/60 transition-colors shadow-xs active:scale-95 mt-2"
        >
          <BsArrowCounterclockwise className="text-xs" />
          <span>Reset Filter</span>
        </button>
      )}

      {showAddButton && onAddActivity && (
        <button
          type="button"
          onClick={onAddActivity}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-ai-violet-600 hover:bg-ai-violet-700 transition-colors shadow-xs active:scale-95 mt-2"
        >
          <BsPlusLg className="text-xs" />
          <span>Tambah Kegiatan</span>
        </button>
      )}
    </div>
  );
};
