import React, { useState } from "react";

const initialState = {
  title: "",
  description: "",
  category: "Productivity",
  isReminder: false,
  remindAt: "",
};

export function CreateActivity({ onActivityCreated, onCancel }) {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

      const response = await fetch("/api/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      <div className="d-flex justify-content-end gap-2 pt-3 border-top">
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
    </form>
  );
}

export default CreateActivity;
