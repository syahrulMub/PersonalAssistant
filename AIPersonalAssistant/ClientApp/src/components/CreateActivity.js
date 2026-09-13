import React, { useState, useEffect } from "react";

const initialState = {
  title: "",
  description: "",
  category: "Productivity",
  isReminder: false,
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
        isReminder: Boolean(initialData.isReminder),
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

    if (formData.isReminder && !formData.remindAt) {
      setErrorMessage("Harap tentukan waktu pengingat.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category || "General",
        isReminder: formData.isReminder,
        remindAt:
          formData.isReminder && formData.remindAt ? formData.remindAt : null,
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

  return (
    <form onSubmit={handleSubmit}>
      {/* Banner informasi jika data di-generate oleh AI Gemini */}
      {originalVoiceText && (
        <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-start gap-2 shadow-sm border-info">
          <span className="fs-5">✨</span>
          <div className="small flex-grow-1">
            <strong>Dihasilkan otomatis oleh Gemini AI dari ucapan:</strong>
            <div className="fst-italic text-dark mt-1 p-2 bg-white rounded border">
              "{originalVoiceText}"
            </div>
            <span className="text-muted d-block mt-1">
              Silakan periksa atau sesuaikan data di bawah sebelum menyimpan.
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger py-2">{errorMessage}</div>
      )}

      {/* Input Judul */}
      <div className="mb-3">
        <label className="form-label fw-bold">Judul Kegiatan</label>
        <input
          type="text"
          className="form-control"
          name="title"
          placeholder="Contoh: Meeting Evaluasi Proyek"
          value={formData.title}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      {/* Input Kategori */}
      <div className="mb-3">
        <label className="form-label fw-bold">Kategori</label>
        <select
          className="form-select"
          name="category"
          value={formData.category}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="Productivity">💼 Productivity</option>
          <option value="Learning">📚 Learning</option>
          <option value="Health">❤️ Health</option>
          <option value="Personal">👤 Personal</option>
          <option value="General">📌 General</option>
        </select>
      </div>

      {/* Input Deskripsi */}
      <div className="mb-3">
        <label className="form-label fw-bold">Deskripsi / Catatan</label>
        <textarea
          className="form-control"
          name="description"
          rows="3"
          placeholder="Catatan detail atau hal penting yang perlu diingat..."
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      {/* Checkbox & Datetime Reminder */}
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="isReminderToggle"
          name="isReminder"
          checked={formData.isReminder}
          onChange={handleChange}
          disabled={loading}
        />
        <label className="form-check-label fw-bold" htmlFor="isReminderToggle">
          Setel Pengingat Email
        </label>
      </div>

      {formData.isReminder && (
        <div className="mb-3 p-3 bg-light border rounded">
          <label className="form-label fw-bold">
            Waktu Pengingat (WIB / Waktu Lokal)
          </label>
          <input
            type="datetime-local"
            className="form-control"
            name="remindAt"
            value={formData.remindAt}
            onChange={handleChange}
            disabled={loading}
            required={formData.isReminder}
          />
          <small className="text-muted d-block mt-1">
            Email pengingat akan otomatis dikirim 10 menit sebelum waktu ini.
          </small>
        </div>
      )}

      {/* Tombol Aksi Modal */}
      <div className="d-flex justify-content-between align-items-center gap-2 pt-3 border-top">
        <div>
          {onReSpeech && (
            <button
              type="button"
              className="btn btn-outline-danger d-inline-flex align-items-center gap-1"
              onClick={onReSpeech}
              disabled={loading}
              title="Rekam ulang suara Anda"
            >
              <span>🎤</span>
              <span>Bicara Ulang</span>
            </button>
          )}
        </div>
        <div className="d-flex gap-2">
          {onCancel && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary px-4"
            disabled={loading}
          >
            {loading ? (
              <span>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Menyimpan...
              </span>
            ) : (
              "Simpan Aktivitas"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default CreateActivity;
