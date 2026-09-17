import React, { useState, useEffect } from "react";
import {
  BsStars,
  BsTrash,
  BsPlusLg,
  BsClock,
  BsCheck2,
  BsMicFill,
  BsExclamationCircle,
} from "react-icons/bs";
import { ModalWrapper } from "../common/ModalWrapper";
import { toInputDatetimeString } from "../../utils/dateUtils";

const CATEGORIES = [
  { value: "Productivity", label: "💼 Productivity" },
  { value: "Learning", label: "📚 Learning" },
  { value: "Health", label: "❤️ Health" },
  { value: "Personal", label: "👤 Personal" },
  { value: "General", label: "📌 General" },
];

/**
 * VoiceConfirmationModal Component
 * Menampilkan hasil ekstraksi AI berupa daftar multiple activities yang seluruhnya dapat diedit sebelum disimpan batch.
 */
export const VoiceConfirmationModal = ({
  isOpen,
  onClose,
  items = [],
  rawTranscript = "",
  onSaveBatch,
  onReSpeech,
  isSaving = false,
}) => {
  const [editableItems, setEditableItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Inisialisasi items saat modal dibuka atau items berubah
  useEffect(() => {
    if (items && items.length > 0) {
      const initialized = items.map((item, index) => ({
        id: index + 1,
        title: item.title || "",
        description: item.description || "",
        category: item.category || "General",
        isReminder:
          item.isReminder !== undefined ? Boolean(item.isReminder) : true,
        remindAt: toInputDatetimeString(item.remindAt),
      }));
      setEditableItems(initialized);
    } else {
      setEditableItems([]);
    }
    setErrorMessage("");
  }, [items, isOpen]);

  const handleItemChange = (index, field, value) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleDeleteItem = (index) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = () => {
    setEditableItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        description: "",
        category: "General",
        isReminder: true,
        remindAt: "",
      },
    ]);
  };

  const handleSave = () => {
    setErrorMessage("");

    if (editableItems.length === 0) {
      setErrorMessage("Tidak ada aktivitas untuk disimpan.");
      return;
    }

    // Validasi setiap item
    for (let i = 0; i < editableItems.length; i++) {
      const item = editableItems[i];
      if (!item.title.trim()) {
        setErrorMessage(`Judul kegiatan #${i + 1} wajib diisi.`);
        return;
      }
    }

    // Format payload
    const payload = editableItems.map((item) => ({
      title: item.title.trim(),
      description: item.description?.trim() || "",
      category: item.category || "General",
      isReminder: Boolean(item.isReminder),
      remindAt: item.remindAt ? new Date(item.remindAt).toISOString() : null,
    }));

    onSaveBatch(payload);
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      scrollable
      title="Konfirmasi Hasil Analisis AI"
      icon={<BsStars className="text-ai-violet-500" />}
    >
      <div className="space-y-4">
        {/* Ringkasan Transkrip Asli */}
        {rawTranscript && (
          <div className="p-3.5 rounded-2xl bg-ai-violet-50/70 dark:!bg-ai-violet-950/40 border border-ai-violet-200/80 dark:!border-ai-violet-800/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ai-violet-800 dark:!text-ai-violet-300 mb-1">
              <BsMicFill className="text-ai-violet-500" />
              <span>Transkrip Ucapan Anda:</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:!text-slate-300 italic font-mono">
              "{rawTranscript}"
            </p>
          </div>
        )}

        {/* Informasi Jumlah Item */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-slate-600 dark:!text-slate-400">
            AI mendeteksi{" "}
            <strong className="text-ai-violet-600 dark:!text-ai-violet-400 font-mono">
              {editableItems.length}
            </strong>{" "}
            kegiatan. Seluruh item dapat diedit sebelum disimpan:
          </div>

          <button
            type="button"
            onClick={handleAddNewItem}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-ai-violet-400 text-ai-violet-600 dark:!text-ai-violet-400 hover:bg-ai-violet-50 dark:hover:!bg-ai-violet-950/40 transition-colors flex items-center gap-1.5"
          >
            <BsPlusLg className="text-xs" />
            <span>Tambah Kegiatan Manual</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:!bg-rose-950/60 border border-rose-200 dark:!border-rose-800 text-rose-700 dark:!text-rose-300 text-xs flex items-center gap-2">
            <BsExclamationCircle className="flex-shrink-0 text-sm" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Daftar Kartu Editable */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {editableItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada aktivitas dalam daftar.
            </div>
          ) : (
            editableItems.map((item, index) => (
              <div
                key={item.id || index}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:!bg-deep-850 border border-slate-200 dark:!border-slate-800 shadow-sm space-y-3 relative group"
              >
                {/* Header Kartu: Nomor & Tombol Hapus */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:!border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-ai-violet-100 dark:!bg-ai-violet-950/80 text-ai-violet-700 dark:!text-ai-violet-300 font-mono font-bold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:!text-slate-300">
                      Rencana Kegiatan
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:!bg-rose-950/60 dark:hover:!text-rose-400 transition-colors"
                    title="Hapus kegiatan ini dari daftar"
                  >
                    <BsTrash className="text-sm" />
                  </button>
                </div>

                {/* Baris 1: Judul Aktivitas */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:!text-slate-400 mb-1">
                    Judul Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      handleItemChange(index, "title", e.target.value)
                    }
                    placeholder="Contoh: Meeting evaluasi proyek mingguan"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-ai-violet-500 font-medium"
                  />
                </div>

                {/* Baris 2: Kategori & Waktu Pengingat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Kategori */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:!text-slate-400 mb-1">
                      Kategori
                    </label>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        handleItemChange(index, "category", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-ai-violet-500 font-medium"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Waktu Jadwal / Pengingat */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:!text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <BsClock className="text-ai-violet-500" />
                        <span>Waktu / Jadwal Pengingat</span>
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={item.remindAt}
                      onChange={(e) =>
                        handleItemChange(index, "remindAt", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-ai-violet-500 font-mono"
                    />
                  </div>
                </div>

                {/* Baris 3: Toggle Notifikasi Pengingat */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:!bg-deep-900/60 border border-slate-200/60 dark:!border-slate-800">
                  <div className="text-[11px] text-slate-600 dark:!text-slate-300">
                    Kirim pengingat email otomatis untuk agenda ini
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isReminder}
                      onChange={(e) =>
                        handleItemChange(index, "isReminder", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-ai-violet-600"></div>
                  </label>
                </div>

                {/* Baris 4: Deskripsi Kegiatan */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:!text-slate-400 mb-1">
                    Deskripsi / Rincian
                  </label>
                  <textarea
                    rows="2"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, "description", e.target.value)
                    }
                    placeholder="Catatan tambahan atau rincian agenda..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:!bg-deep-900 border border-slate-200 dark:!border-slate-700 text-slate-900 dark:!text-white focus:outline-none focus:ring-2 focus:ring-ai-violet-500 resize-none font-normal"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Tombol Aksi */}
        <div className="pt-3 border-t border-slate-200 dark:!border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:!text-slate-300 hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
            >
              Batal
            </button>
            {onReSpeech && (
              <button
                type="button"
                onClick={onReSpeech}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ai-violet-600 dark:!text-ai-violet-400 hover:bg-ai-violet-50 dark:hover:!bg-ai-violet-950/40 border border-ai-violet-200 dark:!border-ai-violet-800/60 transition-colors flex items-center gap-1.5"
              >
                <BsMicFill className="text-xs" />
                <span>Bicara Ulang</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || editableItems.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <BsCheck2 className="text-sm stroke-1" />
                <span>Simpan Semua ({editableItems.length} Kegiatan)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default VoiceConfirmationModal;
