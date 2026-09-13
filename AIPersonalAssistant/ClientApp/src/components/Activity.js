import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import CreateActivity from "./CreateActivity";
import { VoiceInput } from "../context/VoiceInput";

// 1. Komponen Ikon SVG
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
    <path
      fillRule="evenodd"
      d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
    />
  </svg>
);

const RefreshIcon = ({ spinning }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
    style={
      spinning
        ? {
            animation: "spin 1s linear infinite",
            transformOrigin: "center",
          }
        : {}
    }
  >
    <path
      fillRule="evenodd"
      d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
    />
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
  </svg>
);

// 2. Fungsi Badge Warna Kategori
const renderCategoryBadge = (category) => {
  switch (category?.toLowerCase()) {
    case "productivity":
      return <span className="badge bg-primary">💼 Productivity</span>;
    case "learning":
      return <span className="badge bg-success">📚 Learning</span>;
    case "health":
      return <span className="badge bg-danger">❤️ Health</span>;
    case "personal":
      return (
        <span
          className="badge text-white"
          style={{ backgroundColor: "#6f42c1" }}
        >
          👤 Personal
        </span>
      );
    default:
      return (
        <span className="badge bg-secondary">📌 {category || "General"}</span>
      );
  }
};

export function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // State Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // State Modal Popup
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State Voice Input & Gemini AI
  const voiceInputRef = useRef(null);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceInitialData, setVoiceInitialData] = useState(null);
  const [originalVoiceText, setOriginalVoiceText] = useState("");

  const toggleModal = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
      setVoiceInitialData(null);
      setOriginalVoiceText("");
    } else {
      setVoiceInitialData(null);
      setOriginalVoiceText("");
      setIsModalOpen(true);
    }
  };

  // Mengambil data dari backend dengan pagination
  const fetchActivities = async (
    currentPage = page,
    currentPageSize = pageSize,
  ) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/activity?page=${currentPage}&pageSize=${currentPageSize}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        throw new Error("Gagal mengambil data dari server.");
      }
      const data = await response.json();

      if (data && data.items) {
        setActivities(data.items);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || currentPage);
      } else if (Array.isArray(data)) {
        setActivities(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch setiap kali halaman (page) atau ukuran halaman (pageSize) berubah
  useEffect(() => {
    fetchActivities(page, pageSize);
  }, [page, pageSize]);

  // Saat transkrip suara selesai ditangkap dari VoiceInput (User klik Stop)
  const handleSpeechComplete = async (speechText) => {
    if (!speechText || !speechText.trim()) return;

    setIsVoiceProcessing(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/activity/parse-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ speechText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.warn("Response is not JSON:", jsonErr);
      }

      if (!response.ok || !data?.success) {
        const warningMsg =
          data?.message ||
          "Gemini AI tidak dapat memproses ucapan. Teks suara Anda tetap dimasukkan ke form agar tidak hilang.";
        console.warn("Voice parsing non-success:", warningMsg);
        setError(warningMsg);

        // Fallback: tetap buka modal dengan teks suara agar user tidak kehilangan apa yang sudah diucapkan
        const fallbackActivity = data?.activity || {
          title:
            speechText.length > 50
              ? speechText.substring(0, 50) + "..."
              : speechText,
          description: speechText,
          category: "General",
          isReminder: false,
          remindAt: null,
        };
        setVoiceInitialData(fallbackActivity);
        setOriginalVoiceText(speechText);
        setIsModalOpen(true);
        return;
      }

      // Berhasil: Buka popup modal verifikasi dengan data terisi otomatis dari Gemini AI
      setVoiceInitialData(data.activity);
      setOriginalVoiceText(data.rawTranscript || speechText);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Voice parse error:", err);
      const isTimeout = err.name === "AbortError";
      const errMsg = isTimeout
        ? "Waktu pemrosesan Gemini AI melebihi batas waktu (timeout). Ucapan Anda tetap dimasukkan ke form."
        : err.message || "Gagal memproses input suara.";
      setError(errMsg);

      // Fallback jika timeout / network error: tetap buka modal dengan transkrip asli
      setVoiceInitialData({
        title:
          speechText.length > 50
            ? speechText.substring(0, 50) + "..."
            : speechText,
        description: speechText,
        category: "General",
        isReminder: false,
        remindAt: null,
      });
      setOriginalVoiceText(speechText);
      setIsModalOpen(true);
    } finally {
      clearTimeout(timeoutId);
      setIsVoiceProcessing(false);
    }
  };

  // Opsi Bicara Ulang (Re-speech) dari popup modal
  const handleReSpeech = () => {
    setIsModalOpen(false);
    setVoiceInitialData(null);
    setOriginalVoiceText("");
    // Beri jeda singkat agar modal menutup dengan mulus, lalu langsung buka mikrofon
    setTimeout(() => {
      if (voiceInputRef.current) {
        voiceInputRef.current.startListening();
      }
    }, 300);
  };

  // Saat aktivitas berhasil disimpan dari modal
  const handleActivityCreated = (createdData) => {
    setIsModalOpen(false);
    setVoiceInitialData(null);
    setOriginalVoiceText("");

    setFeedbackMsg(
      `Aktivitas "${createdData?.title || "baru"}" berhasil disimpan!`,
    );
    setTimeout(() => setFeedbackMsg(null), 5000);

    if (page === 1) {
      fetchActivities(1, pageSize);
    } else {
      setPage(1);
    }
  };

  // Hapus aktivitas
  const handleDelete = async (id, title) => {
    if (
      !window.confirm(`Apakah Anda yakin ingin menghapus aktivitas "${title}"?`)
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/activity/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        if (activities.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          fetchActivities(page, pageSize);
        }
      } else {
        alert("Gagal menghapus aktivitas.");
      }
    } catch (err) {
      console.error("Error deleting activity:", err);
      alert("Terjadi kesalahan saat menghapus aktivitas.");
    }
  };

  // Navigasi Pagination
  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1);
  };

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="container py-4">
      {/* Header Halaman & Tombol Aksi */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="mb-1 text-primary fw-bold">Catatan Aktivitas</h2>
          <p className="text-muted mb-0">
            Kelola kegiatan harian dan jadwalkan pengingat email otomatis dengan
            bantuan AI.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3 mt-sm-0">
          {/* Kontrol Input Suara */}
          <VoiceInput
            ref={voiceInputRef}
            onSpeechComplete={handleSpeechComplete}
            isProcessing={isVoiceProcessing}
          />

          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => fetchActivities(page, pageSize)}
            disabled={loading}
            title="Muat Ulang Data"
          >
            <RefreshIcon spinning={loading} />
            <span className="d-none d-md-inline">Refresh</span>
          </button>

          <button
            className="btn btn-primary d-flex align-items-center gap-1 shadow-sm"
            onClick={() => {
              setVoiceInitialData(null);
              setOriginalVoiceText("");
              setIsModalOpen(true);
            }}
            title="Tambah Aktivitas Manual"
          >
            <PlusIcon />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

      {/* Banner status pemrosesan suara oleh Gemini AI */}
      {isVoiceProcessing && (
        <div className="alert alert-primary d-flex align-items-center gap-2 mb-3 shadow-sm border-primary">
          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          />
          <div>
            <strong>Gemini AI sedang menganalisis ucapan Anda...</strong>{" "}
            Mengekstrak judul, deskripsi, kategori, dan jadwal pengingat.
          </div>
        </div>
      )}

      {/* Banner pesan sukses */}
      {feedbackMsg && (
        <div className="alert alert-success alert-dismissible fade show mb-3 shadow-sm">
          ✨ {feedbackMsg}
          <button
            type="button"
            className="btn-close"
            onClick={() => setFeedbackMsg(null)}
          />
        </div>
      )}

      {/* Banner pesan error / peringatan */}
      {error && (
        <div className="alert alert-warning alert-dismissible fade show mb-3 shadow-sm">
          ⚠️ {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {/* Tabel Data Aktivitas */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat data aktivitas...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-5">
              <div className="display-6 text-muted mb-2">📋</div>
              <h5 className="text-muted">Belum ada aktivitas</h5>
              <p className="text-secondary small mb-3">
                Gunakan mikrofon di atas atau klik tombol "Tambah Manual" untuk
                mulai mencatat kegiatan.
              </p>
              <button
                className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1"
                onClick={() => {
                  setVoiceInitialData(null);
                  setOriginalVoiceText("");
                  setIsModalOpen(true);
                }}
              >
                <PlusIcon /> Tambah Manual
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "25%" }}>Judul</th>
                    <th style={{ width: "15%" }}>Kategori</th>
                    <th style={{ width: "35%" }}>Deskripsi</th>
                    <th style={{ width: "15%" }}>Pengingat</th>
                    <th style={{ width: "10%" }} className="text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="fw-semibold text-dark">
                        {activity.title}
                      </td>
                      <td>{renderCategoryBadge(activity.category)}</td>
                      <td className="text-muted small">
                        {activity.description}
                      </td>
                      <td>
                        {activity.isReminder ? (
                          <span
                            className="badge bg-light text-success border border-success d-inline-flex align-items-center gap-1"
                            title="Pengingat Aktif"
                          >
                            🔔{" "}
                            {activity.remindAt
                              ? new Date(activity.remindAt).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "short",
                                  },
                                )
                              : "Aktif"}
                          </span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-danger p-1 px-2 rounded-circle"
                          onClick={() =>
                            handleDelete(activity.id, activity.title)
                          }
                          title="Hapus Aktivitas"
                          style={{
                            width: "32px",
                            height: "32px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER PAGINATION */}
        {!loading && totalCount > 0 && (
          <div className="card-footer bg-white border-top py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted small">
                Menampilkan <strong>{startItem}</strong> -{" "}
                <strong>{endItem}</strong> dari <strong>{totalCount}</strong>{" "}
                aktivitas
              </span>
              <div className="d-flex align-items-center gap-1">
                <span className="text-muted small">Baris:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "70px" }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <nav aria-label="Page navigation">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                    aria-label="Sebelumnya"
                  >
                    &laquo; Prev
                  </button>
                </li>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <li
                      key={pageNum}
                      className={`page-item ${page === pageNum ? "active" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ),
                )}

                <li
                  className={`page-item ${page >= totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                    aria-label="Berikutnya"
                  >
                    Next &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* POPUP / MODAL VERIFIKASI & FORM AKTIVITAS */}
      <Modal
        isOpen={isModalOpen}
        toggle={toggleModal}
        centered
        backdrop="static"
        size={originalVoiceText ? "lg" : "md"}
      >
        <ModalHeader toggle={toggleModal} className="bg-light">
          <span className="fw-bold">
            {originalVoiceText
              ? "✨ Verifikasi Hasil Suara Gemini AI"
              : "Tambah Catatan Aktivitas"}
          </span>
        </ModalHeader>
        <ModalBody className="p-4">
          <CreateActivity
            initialData={voiceInitialData}
            originalVoiceText={originalVoiceText}
            onActivityCreated={handleActivityCreated}
            onCancel={toggleModal}
            onReSpeech={originalVoiceText ? handleReSpeech : null}
          />
        </ModalBody>
      </Modal>
    </div>
  );
}

export default Activity;
