import React, { useState, useEffect } from "react";
import { BsInfoCircle, BsCheck2, BsFloppy, BsBan } from "react-icons/bs";
import { ModalWrapper } from "../common/ModalWrapper";
import { CategoryBadge } from "../common/CategoryBadge";
import { formatWibTime, toInputDatetimeString } from "../../utils/dateUtils";

// Chip cepat opsional untuk Catatan Tambahan
const NOTE_QUICK_CHIPS = [
  "Selesai Sesuai Target",
  "Lanjut Besok",
  "Bentrok Jadwal",
  "Ditunda",
  "Salah Input",
];

// Kategori yang didukung
const CATEGORIES = [
  { value: "Productivity", label: "💼 Productivity" },
  { value: "Learning", label: "📚 Learning" },
  { value: "Health", label: "❤️ Health" },
  { value: "Personal", label: "👤 Personal" },
  { value: "General", label: "📌 General" },
];

/**
 * Activity Detail & Action Modal (Mindful Resolution)
 * Menampilkan detail tugas, input edit draft, dan 3 tombol aksi simetris
 */
export const ActivityDetailModal = ({
  isOpen,
  activity,
  onClose,
  onMarkComplete,
  onCancelActivity,
  onSaveRevision,
  isActionLoading = false,
  showToast,
}) => {
  const [detailForm, setDetailForm] = useState({
    title: "",
    category: "General",
    description: "",
    isReminder: true,
    remindAt: "",
    note: "",
  });
  const [isCancelConfirming, setIsCancelConfirming] = useState(false);

  // Sinkronisasi draft input form saat activity berubah atau modal dibuka
  useEffect(() => {
    if (activity) {
      const isCompletedOrCancelled =
        activity.status === "Completed" || activity.status === "Cancelled";

      const timeSource = activity.remindAt || activity.createdAt;
      const formattedRemindAt = toInputDatetimeString(timeSource);

      setDetailForm({
        title: activity.title || "",
        category: activity.category || "General",
        description: activity.description || "",
        isReminder: isCompletedOrCancelled
          ? false
          : activity.isReminder !== false, // default aktif untuk pending/reschedule
        remindAt: formattedRemindAt,
        note: activity.note || "",
      });
      setIsCancelConfirming(false);
    }
  }, [activity, isOpen]);

  if (!activity) return null;

  const isCompleted = activity.status === "Completed";

  // Helper Tambah Catatan dari Chip Cepat
  const handleApplyQuickNote = (chipText) => {
    setDetailForm((prev) => {
      const current = (prev.note || "").trim();
      if (!current) return { ...prev, note: chipText };
      if (current.includes(chipText)) return prev;
      return { ...prev, note: `${current} • ${chipText}` };
    });
  };

  // Handler Simpan Revisi dengan Validasi
  const handleSave = () => {
    if (!isCompleted && !detailForm.title.trim()) {
      showToast?.("Judul kegiatan tidak boleh kosong.", "warning");
      return;
    }

    if (!isCompleted) {
      if (!detailForm.remindAt) {
        showToast?.("Waktu jadwal kegiatan tidak boleh kosong.", "warning");
        return;
      }
      const scheduledDate = new Date(detailForm.remindAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        showToast?.(
          "Waktu jadwal kegiatan harus lebih besar dari waktu sekarang untuk menyimpan revisi.",
          "warning",
        );
        return;
      }
    }

    const payload = isCompleted
      ? {
          description: detailForm.description.trim(),
          note: detailForm.note ? detailForm.note.trim() : null,
          isReminder: false,
        }
      : {
          title: detailForm.title.trim(),
          description: detailForm.description.trim(),
          category: detailForm.category,
          isReminder:
            detailForm.isReminder !== undefined ? detailForm.isReminder : true,
          remindAt: detailForm.remindAt
            ? new Date(detailForm.remindAt).toISOString()
            : null,
          note: detailForm.note ? detailForm.note.trim() : null,
        };

    onSaveRevision(activity.id, payload);
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isCompleted ? "Detail Pencapaian" : "Detail & Resolusi Aktivitas"}
      icon={<BsInfoCircle className="text-ai-violet-500" />}
      bodyClassName="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
    >
      <div className="space-y-4">
        {/* Status Header Badge Info */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200/70 dark:!border-slate-800/70">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Status:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                activity.status === "Completed"
                  ? "bg-emerald-100 text-emerald-800 dark:!bg-emerald-950/60 dark:!text-emerald-300"
                  : activity.status === "Rescheduled"
                    ? "bg-purple-100 text-purple-800 dark:!bg-purple-950/60 dark:!text-purple-300"
                    : "bg-ai-violet-100 text-ai-violet-800 dark:!bg-ai-violet-950/60 dark:!text-ai-violet-300"
              }`}
            >
              {activity.status}
            </span>

            {activity.rescheduleCount > 0 && (
              <span className="text-[11px] font-mono text-purple-600 dark:!text-purple-400">
                (Dijadwalkan ulang {activity.rescheduleCount}x)
              </span>
            )}
          </div>

          {activity.createdAt && (
            <span className="text-[11px] font-mono text-slate-400 dark:!text-slate-500">
              Dibuat: {formatWibTime(activity.createdAt)}
            </span>
          )}
        </div>

        {/* Judul Kegiatan: Read-only untuk Completed, Editable untuk Pending */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:!text-slate-300 mb-1.5">
            Judul Kegiatan
          </label>
          {isCompleted ? (
            <input
              type="text"
              value={detailForm.title}
              disabled
              readOnly
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl border bg-slate-100/70 dark:!bg-deep-950/70 border-slate-200 dark:!border-slate-800 text-slate-600 dark:!text-slate-400 cursor-not-allowed font-medium"
            />
          ) : (
            <input
              type="text"
              value={detailForm.title}
              onChange={(e) =>
                setDetailForm((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              disabled={isActionLoading}
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl border bg-slate-50 dark:!bg-deep-950 border-slate-200 dark:!border-slate-800 text-slate-900 dark:!text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all font-medium"
            />
          )}
        </div>

        {/* Kategori: Dikunci untuk Completed, Editable untuk Pending */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:!text-slate-300 mb-1.5">
            Kategori
          </label>
          {isCompleted ? (
            <div className="flex items-center gap-2.5 py-1">
              <CategoryBadge category={detailForm.category} />
              <span className="text-xs font-mono text-slate-400 dark:!text-slate-500">
                (Kategori telah dikunci untuk riwayat pencapaian)
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  disabled={isActionLoading}
                  onClick={() =>
                    setDetailForm((prev) => ({
                      ...prev,
                      category: cat.value,
                    }))
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    detailForm.category === cat.value
                      ? "bg-ai-violet-50 dark:!bg-ai-violet-950/50 border-ai-violet-500 text-ai-violet-700 dark:!text-ai-violet-300 font-bold shadow-xs"
                      : "bg-white/95 dark:!bg-deep-950 border-slate-200 dark:!border-slate-800 text-slate-600 dark:!text-slate-300 hover:border-slate-300 dark:hover:!border-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit Deskripsi: Selalu Editable (Untuk Completed & Pending) */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:!text-slate-300 mb-1.5">
            {isCompleted ? "Deskripsi Pencapaian" : "Deskripsi Kegiatan"}
          </label>
          <textarea
            rows="3"
            value={detailForm.description}
            onChange={(e) =>
              setDetailForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            disabled={isActionLoading}
            placeholder="Deskripsi kegiatan..."
            className="w-full p-3.5 text-sm rounded-2xl border bg-slate-50 dark:!bg-deep-950 border-slate-200 dark:!border-slate-800 text-slate-900 dark:!text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all resize-none shadow-inner"
          />
        </div>

        {/* Jadwal: Jika Completed, tampilkan info riwayat terkunci; jika Pending, tampilkan input presisi */}
        {isCompleted ? (
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:!bg-emerald-950/30 border border-emerald-200/60 dark:!border-emerald-800/40 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:!text-emerald-300">
              <BsCheck2 className="text-base stroke-[1]" />
              <span>Aktivitas Telah Selesai Dikerjakan</span>
            </div>
            <p className="text-[11px] text-emerald-700/90 dark:!text-emerald-400/90">
              Jadwal pengingat dan kategori telah dikunci sebagai rekam jejak
              pencapaian. Anda dapat memperbarui catatan/deskripsi kapan saja.
            </p>
            {activity.completedAt && (
              <div className="text-[11px] font-mono pt-1 text-emerald-600 dark:!text-emerald-400">
                Selesai pada: {formatWibTime(activity.completedAt)}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:!bg-deep-950 border border-slate-200 dark:!border-slate-800 space-y-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:!text-slate-200 block">
                Waktu Jadwal & Pengingat (WIB)
              </span>
              <span className="text-[11px] text-slate-500 dark:!text-slate-400 block">
                Tentukan jam dan tanggal secara presisi. Jika merevisi, pilih
                waktu yang akan datang.
              </span>
            </div>

            <div>
              <input
                type="datetime-local"
                value={detailForm.remindAt}
                onChange={(e) =>
                  setDetailForm((prev) => ({
                    ...prev,
                    remindAt: e.target.value,
                  }))
                }
                disabled={isActionLoading}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:!bg-deep-900 border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white font-mono focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:!border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:!text-slate-300 font-medium">
                Aktifkan notifikasi email pengingat
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={detailForm.isReminder}
                  onChange={(e) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      isReminder: e.target.checked,
                    }))
                  }
                  disabled={isActionLoading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-ai-violet-600" />
              </label>
            </div>
          </div>
        )}

        {/* KOLOM CATATAN TAMBAHAN */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:!text-slate-300">
              Catatan Tambahan (Opsional)
            </label>
          </div>

          {/* Chip Cepat Opsional */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {NOTE_QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleApplyQuickNote(chip)}
                disabled={isActionLoading}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:!bg-deep-800 text-slate-700 dark:!text-slate-300 hover:bg-ai-violet-50 dark:hover:!bg-ai-violet-950/60 hover:text-ai-violet-700 dark:hover:!text-ai-violet-300 border border-slate-200 dark:!border-slate-700 transition-colors active:scale-95"
              >
                + {chip}
              </button>
            ))}
          </div>

          <textarea
            rows="3"
            value={detailForm.note}
            onChange={(e) =>
              setDetailForm((prev) => ({
                ...prev,
                note: e.target.value,
              }))
            }
            disabled={isActionLoading}
            placeholder="Catatan progres, kendala, atau keterangan tambahan..."
            className="w-full p-3 text-sm rounded-2xl border bg-slate-50 dark:!bg-deep-950 border-slate-200 dark:!border-slate-800 text-slate-900 dark:!text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all resize-none shadow-inner"
          />
        </div>

        {/* Tombol Aksi Modal */}
        <div className="pt-4 border-t border-slate-200/70 dark:!border-slate-800/70 space-y-3 w-full">
          {/* Konfirmasi Pembatalan jika Tombol Batalkan Ditekan */}
          {isCancelConfirming && (
            <div className="w-full p-3 rounded-2xl bg-rose-50 dark:!bg-rose-950/40 border border-rose-200 dark:!border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-fade-in">
              <div className="text-xs text-rose-800 dark:!text-rose-200">
                <span className="font-bold block">
                  ⚠️ Konfirmasi Pembatalan
                </span>
                <span>
                  Yakin batalkan kegiatan ini? Data tetap diarsipkan dalam
                  riwayat.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsCancelConfirming(false)}
                  disabled={isActionLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:!bg-deep-800 border border-slate-200 dark:!border-slate-700 text-slate-700 dark:!text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => onCancelActivity(activity.id, detailForm.note)}
                  disabled={isActionLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isActionLoading ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <BsBan className="text-xs" />
                  )}
                  <span>Ya, Batalkan</span>
                </button>
              </div>
            </div>
          )}

          {isCompleted ? (
            // Jika Completed: HANYA ada tombol Simpan Catatan & Deskripsi
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isActionLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                {isActionLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BsFloppy className="text-xs" />
                )}
                <span>Simpan Catatan & Deskripsi</span>
              </button>
            </div>
          ) : (
            // Jika Pending / Rescheduled: 3 Tombol Bersih & Simetris (Batalkan di kiri, Tandai Selesai & Simpan Revisi di kanan)
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
              {/* Tombol Batalkan di sisi kiri */}
              <button
                type="button"
                onClick={() => setIsCancelConfirming(true)}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:!text-slate-400 hover:text-rose-600 dark:hover:!text-rose-400 bg-slate-100 dark:!bg-deep-800 hover:bg-rose-50 dark:hover:!bg-rose-950/40 border border-slate-200 dark:!border-slate-700 hover:border-rose-200 dark:hover:!border-rose-900/50 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                title="Batalkan kegiatan ini"
              >
                <BsBan className="text-xs text-rose-500" />
                <span>Batalkan</span>
              </button>

              {/* Tombol Tandai Selesai & Simpan Revisi di sisi kanan */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onMarkComplete(activity.id, detailForm.note)}
                  disabled={isActionLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  title="Tandai kegiatan ini telah selesai dikerjakan"
                >
                  <BsCheck2 className="text-sm stroke-[1.5]" />
                  <span>Tandai Selesai</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isActionLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isActionLoading ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <BsFloppy className="text-xs" />
                  )}
                  <span>Simpan Revisi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
