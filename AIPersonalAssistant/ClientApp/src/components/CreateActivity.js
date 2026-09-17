import React, { useState, useEffect } from "react";
import { BsStars, BsMicFill, BsClock, BsCheck2 } from "react-icons/bs";

const initialState = {
  title: "",
  description: "",
  category: "Productivity",
  isReminder: true,
  remindAt: "",
};

export function CreateActivity({
  initialData = null,
  originalVoiceText = "",
  onActivityCreated,
  onCancel,
  onReSpeech,
}) {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Populate data awal jika berasal dari hasil parsing suara Gemini
  useEffect(() => {
    if (initialData) {
      let formattedRemindAt = "";
      if (initialData.remindAt) {
        try {
          const d = new Date(initialData.remindAt);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            formattedRemindAt = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch (e) {
          formattedRemindAt = "";
        }
      }

      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "General",
        isReminder:
          initialData.isReminder !== undefined
            ? Boolean(initialData.isReminder)
            : true,
        remindAt: formattedRemindAt,
      });
    } else {
      setFormData(initialState);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.title.trim() || !formData.description.trim()) {
      setErrorMessage("Judul dan deskripsi kegiatan wajib diisi.");
      return;
    }

    if (!formData.remindAt) {
      setErrorMessage("Waktu jadwal kegiatan wajib diisi.");
      return;
    }

    const scheduledDate = new Date(formData.remindAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setErrorMessage(
        "Waktu jadwal kegiatan harus lebih besar dari waktu sekarang.",
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category || "General",
        isReminder: Boolean(formData.isReminder),
        remindAt: scheduledDate.toISOString(),
      };

      const token = localStorage.getItem("token");
      const response = await fetch("/api/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Gagal menambahkan aktivitas ke database.");
      }

      const createdData = await response.json();
      setFormData(initialState);

      if (onActivityCreated) {
        onActivityCreated(createdData);
      }
    } catch (error) {
      console.error("Error creating activity:", error);
      setErrorMessage(
        error.message || "Terjadi kesalahan saat menyimpan aktivitas.",
      );
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "Productivity", label: "💼 Productivity" },
    { value: "Learning", label: "📚 Learning" },
    { value: "Health", label: "❤️ Health" },
    { value: "Personal", label: "👤 Personal" },
    { value: "General", label: "📌 General" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Banner informasi jika data di-generate oleh AI Gemini */}
      {originalVoiceText && (
        <div className="p-3.5 rounded-2xl bg-ai-violet-50/80 dark:bg-ai-violet-950/40 border border-ai-violet-200/80 dark:border-ai-violet-800/60 flex items-start gap-2.5">
          <BsStars className="text-ai-violet-600 dark:text-ai-violet-400 text-lg flex-shrink-0 mt-0.5" />
          <div className="text-xs flex-1 min-w-0">
            <strong className="text-ai-violet-900 dark:text-ai-violet-200 block mb-1">
              Dihasilkan otomatis oleh Gemini AI dari ucapan:
            </strong>
            <div className="italic text-slate-800 dark:text-slate-200 p-2.5 bg-white/80 dark:bg-deep-900/80 rounded-xl border border-ai-violet-200/60 dark:border-ai-violet-800/40 font-mono text-[11px] leading-relaxed">
              "{originalVoiceText}"
            </div>
            <span className="text-slate-500 dark:text-slate-400 block mt-1.5">
              Silakan periksa atau sesuaikan data di bawah sebelum menyimpan.
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Input Judul */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Judul Kegiatan
        </label>
        <input
          type="text"
          name="title"
          placeholder="Contoh: Meeting Evaluasi Proyek Harian"
          value={formData.title}
          onChange={handleChange}
          disabled={loading}
          required
          className="w-full px-3.5 py-2.5 text-sm rounded-2xl border bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all"
        />
      </div>

      {/* Input Kategori */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Kategori
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, category: cat.value }))
              }
              className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all ${
                formData.category === cat.value
                  ? "bg-ai-violet-50 dark:bg-ai-violet-950/50 border-ai-violet-500 text-ai-violet-700 dark:text-ai-violet-300 shadow-xs"
                  : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <span>{cat.label}</span>
              {formData.category === cat.value && (
                <BsCheck2 className="text-ai-violet-600 dark:text-ai-violet-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Input Deskripsi */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Deskripsi / Catatan
        </label>
        <textarea
          name="description"
          rows="3"
          placeholder="Catatan detail atau hal penting yang perlu diingat..."
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          required
          className="w-full p-3.5 text-sm rounded-2xl border bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all resize-none"
        />
      </div>

      {/* Input Waktu Jadwal Kegiatan */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
          <BsClock className="text-amber-500" />
          <span>Waktu Jadwal Kegiatan (WIB) *</span>
        </label>
        <input
          type="datetime-local"
          name="remindAt"
          value={formData.remindAt}
          onChange={handleChange}
          disabled={loading}
          required
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-900 dark:text-[#F8FAFC] font-mono focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 [color-scheme:light] dark:[color-scheme:dark]"
        />
        <small className="text-[11px] text-slate-400 mt-1 block">
          Tentukan jam/tanggal kegiatan (harus lebih besar dari waktu sekarang).
        </small>
      </div>

      {/* Toggle Reminder Email Opsional */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200 block">
            Kirim Pengingat Email
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            Background reminder akan mengirim email notifikasi tepat waktu.
          </span>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="isReminder"
            checked={formData.isReminder}
            onChange={handleChange}
            disabled={loading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-ai-violet-600" />
        </label>
      </div>

      {/* Tombol Aksi Modal */}
      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
        <div>
          {onReSpeech && (
            <button
              type="button"
              onClick={onReSpeech}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/40 flex items-center gap-1.5 transition-colors"
            >
              <BsMicFill className="text-xs" />
              <span>Bicara Ulang</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#334155] border border-slate-200 dark:border-[#334155] transition-colors"
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Aktivitas</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default CreateActivity;
