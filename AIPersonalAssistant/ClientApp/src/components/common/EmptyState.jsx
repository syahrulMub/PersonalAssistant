import React from "react";
import { BsPlusLg } from "react-icons/bs";

/**
 * Reusable & Mindful Empty State Component
 * Menampilkan pesan adaptif dan positif sesuai tab yang sedang aktif
 */
export const EmptyState = ({ activeTab, onAddActivity }) => {
  const getEmptyStateConfig = () => {
    switch (activeTab) {
      case "today":
        return {
          icon: "📋",
          title: "Tidak ada fokus hari ini",
          description:
            "Semua fokus hari ini telah tuntas! Gunakan tombol 'Bicara' atau 'Tambah' untuk merencanakan hal baru.",
          showAddButton: true,
        };
      case "upcoming":
        return {
          icon: "📅",
          title: "Tidak ada jadwal mendatang",
          description:
            "Belum ada aktivitas yang dijadwalkan untuk esok hari atau seterusnya.",
          showAddButton: true,
        };
      case "overdue":
        return {
          icon: "⏳",
          title: "Bagus, tidak ada tugas yang tertinggal!",
          description:
            "Bagus sekali! Tidak ada aktivitas yang terlewat dari hari-hari sebelumnya.",
          showAddButton: false,
        };
      case "completed":
        return {
          icon: "🏆",
          title: "Belum ada pencapaian yang tuntas",
          description:
            "Aktivitas yang Anda selesaikan akan otomatis tercatat di sini sebagai rekam jejak progres Anda.",
          showAddButton: false,
        };
      default:
        return {
          icon: "📋",
          title: "Belum ada catatan aktivitas",
          description: "Mulai tambahkan kegiatan baru untuk hari ini.",
          showAddButton: true,
        };
    }
  };

  const { icon, title, description, showAddButton } = getEmptyStateConfig();

  return (
    <div className="p-12 text-center rounded-3xl bg-white/90 dark:!bg-deep-850/80 border border-slate-200/80 dark:!border-slate-800/80 space-y-3 shadow-sm animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:!bg-deep-900 flex items-center justify-center mx-auto text-2xl">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:!text-slate-200">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:!text-slate-400 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
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
