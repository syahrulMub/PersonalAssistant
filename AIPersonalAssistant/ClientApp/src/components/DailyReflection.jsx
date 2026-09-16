import React, { useRef, useEffect, useState } from "react";
import { VoiceInput } from "../context/VoiceInput";

const tokenHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function DailyReflection() {
  const [context, setContext] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const loadContext = async () => {
      try {
        const response = await fetch("/api/activity/reflection/context", {
          headers: tokenHeaders(),
        });
        if (!response.ok) {
          throw new Error("Gagal mengambil konteks refleksi dari server.");
        }
        setContext(await response.json());
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoadingContext(false);
      }
    };

    loadContext();
  }, []);

  const handleSpeechComplete = (speechText) => {
    setTranscript(speechText);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!transcript.trim() || !context) return;

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/activity/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeaders(),
        },
        body: JSON.stringify({ ...context, transcript: transcript.trim() }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Gagal memproses refleksi.");
      }
      setResult(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <h1 className="h2 text-primary fw-bold mb-1">Daily Reflection</h1>
          <p className="text-muted mb-0">
            Ceritakan perkembangan hari ini. AI akan membantu merangkum langkah
            berikutnya.
          </p>
        </div>
        <span className="badge rounded-pill text-bg-light border px-3 py-2">
          {context?.periodLabel || "Refleksi harian"}
        </span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loadingContext ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0">Menyiapkan konteks refleksi...</p>
        </div>
      ) : context ? (
        <div className="row g-4">
          <div className="col-lg-7">
            <section className="card shadow-sm border-0 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <p className="text-uppercase text-primary small fw-bold mb-1">
                      Ringkasan AI
                    </p>
                    <h2 className="h4 mb-0">Lihat kembali hari Anda</h2>
                  </div>
                  <span className="fs-3" aria-hidden="true">
                    &#10024;
                  </span>
                </div>
                <p className="mb-4">
                  {context.briefDigest || "Belum ada ringkasan."}
                </p>

                {context.personalizedQuestion && (
                  <div className="alert alert-primary border-0">
                    <strong>Pertanyaan untuk Anda</strong>
                    <p className="mb-0 mt-1">{context.personalizedQuestion}</p>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-6">
                    <h3 className="h6">Yang sudah tercapai</h3>
                    {context.winsAndCompletions?.length ? (
                      <ul className="mb-0 ps-3">
                        {context.winsAndCompletions.map((item, index) => (
                          <li key={`${item}-${index}`} className="mb-2">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted small">
                        Belum ada capaian yang dirangkum.
                      </p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h3 className="h6">Yang perlu diperjelas</h3>
                    {context.itemsToClarify?.length ? (
                      <ul className="mb-0 ps-3">
                        {context.itemsToClarify.map((item, index) => (
                          <li
                            key={`${item.keyTopic || "item"}-${index}`}
                            className="mb-2"
                          >
                            <strong>{item.keyTopic || "Topik"}</strong>
                            {item.contextNote && (
                              <span className="d-block text-muted small">
                                {item.contextNote}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted small">
                        Tidak ada hal yang perlu diperjelas.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="col-lg-5">
            <section className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="h4 mb-2">Catatan refleksi Anda</h2>
                <p className="text-muted small">
                  Gunakan suara atau ketik langsung jawaban Anda.
                </p>
                <VoiceInput
                  onSpeechComplete={handleSpeechComplete}
                  isProcessing={submitting}
                />
                <form onSubmit={handleSubmit} className="mt-3">
                  <textarea
                    className="form-control"
                    rows="8"
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    placeholder="Apa yang berjalan baik? Apa yang ingin Anda perbaiki?"
                    disabled={submitting}
                  />
                  <div className="d-flex justify-content-end mt-3">
                    <button
                      type="submit"
                      className="btn btn-primary px-4"
                      disabled={!transcript.trim() || submitting}
                    >
                      {submitting ? "Memproses..." : "Kirim refleksi"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {result && (
        <section className="card shadow-sm border-success mt-4">
          <div className="card-body p-4">
            <p className="text-uppercase text-success small fw-bold mb-1">
              Hasil reflection AI
            </p>
            <h2 className="h4">Refleksi berhasil diproses</h2>
            <p>{result.feedbackText}</p>
            {result.appliedActivityChanges?.length > 0 && (
              <div className="mb-3">
                <h3 className="h6">Perubahan aktivitas</h3>
                <ul>
                  {result.appliedActivityChanges.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.appliedMemoryChanges?.length > 0 && (
              <div>
                <h3 className="h6">Pembaruan memori AI</h3>
                <ul className="mb-0">
                  {result.appliedMemoryChanges.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default DailyReflection;
