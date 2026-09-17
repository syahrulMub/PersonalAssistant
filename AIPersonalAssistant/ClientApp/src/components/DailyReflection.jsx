import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import {
  BsStars,
  BsMicFill,
  BsStopFill,
  BsArrowRight,
  BsCheckCircleFill,
  BsLightbulb,
  BsClockHistory,
} from "react-icons/bs";

const tokenHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function DailyReflection() {
  const [context, setContext] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const hasFetched = useRef(false);

  // Load reflection context from API
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

  // INLINE SPEECH RECOGNITION (Zero Modal-in-Modal Bug!)
  const handleFinalChunk = useCallback((finalText) => {
    if (!finalText) return;
    setTranscript((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${finalText}` : finalText;
    });
    setInterimText("");
  }, []);

  const handleInterimChunk = useCallback((interim) => {
    setInterimText(interim);
  }, []);

  const {
    isListening,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition("id-ID", handleFinalChunk, handleInterimChunk);

  // Stop listening on unmount
  useEffect(() => {
    return () => {
      try {
        stopListening();
      } catch {}
    };
  }, [stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setError("");
      startListening();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isListening) stopListening();

    const fullText = transcript.trim();
    if (!fullText || !context) return;

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
        body: JSON.stringify({ ...context, transcript: fullText }),
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
    <div className="space-y-6">
      {/* Header Modal */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-ai-violet-100 text-ai-violet-700 dark:bg-ai-violet-950/60 dark:text-ai-violet-300 border border-ai-violet-200 dark:border-ai-violet-800/60">
              <BsStars className="text-xs" /> AI Guided Reflection
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Daily Reflection
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Ceritakan perkembangan hari ini. AI akan mengekstrak pencapaian dan
            memperbarui jadwal Anda.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-100 dark:bg-deep-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
          {context?.periodLabel || "Refleksi Harian"}
        </span>
      </div>

      {/* Error Banners */}
      {(error || speechError) && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error || speechError}</span>
        </div>
      )}

      {loadingContext ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-8 h-8 border-3 border-ai-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Menyiapkan konteks refleksi harian dengan AI...
          </p>
        </div>
      ) : context ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: AI Context & Insights (Span 7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-deep-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ai-violet-600 dark:text-ai-violet-400 flex items-center gap-1.5">
                  <BsStars /> Ringkasan Hari Ini
                </span>
                <span className="text-xs font-mono text-slate-400">
                  AI Context
                </span>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {context.briefDigest ||
                  "Belum ada ringkasan aktivitas sebelumnya."}
              </p>

              {/* Personalized AI Question */}
              {context.personalizedQuestion && (
                <div className="p-4 rounded-2xl bg-ai-violet-50/80 dark:bg-ai-violet-950/40 border border-ai-violet-200/80 dark:border-ai-violet-800/60">
                  <span className="text-xs font-mono font-bold text-ai-violet-700 dark:text-ai-violet-300 flex items-center gap-1.5 mb-1">
                    <BsLightbulb className="text-sm" /> Pertanyaan Refleksi
                    untuk Anda:
                  </span>
                  <p className="text-sm text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
                    "{context.personalizedQuestion}"
                  </p>
                </div>
              )}

              {/* Capaian & Hal yang Perlu Diperjelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <BsCheckCircleFill /> Yang Sudah Tercapai
                  </h4>
                  {context.winsAndCompletions?.length ? (
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {context.winsAndCompletions.map((item, index) => (
                        <li key={index} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Belum ada capaian tercatat.
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <BsClockHistory /> Perlu Diperjelas
                  </h4>
                  {context.itemsToClarify?.length ? (
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {context.itemsToClarify.map((item, index) => (
                        <li key={index} className="flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.keyTopic || "Aktivitas"}
                            </strong>
                            {item.contextNote && (
                              <span className="block text-[11px] text-slate-400">
                                {item.contextNote}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Semua aktivitas jelas.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Form Refleksi dengan PEREKAM SUARA INLINE (Span 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-3xl bg-slate-50/80 dark:bg-deep-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Jawaban & Catatan Anda
                </h3>
                {isListening && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    Mendengarkan...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ketik langsung atau klik tombol mikrofon untuk berbicara.
              </p>

              {/* Textarea dengan Live Streaming Transkrip */}
              <div className="relative mt-3">
                <textarea
                  rows="7"
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                  }}
                  placeholder="Apa yang berjalan baik hari ini? Apa kendala atau rencana yang ingin diselesaikan besok?"
                  disabled={submitting}
                  className="w-full p-4 text-sm rounded-2xl border bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-750 text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all resize-none shadow-inner"
                />

                {/* Tombol Mikrofon Inline Terintegrasi di Pojok Bawah Textarea */}
                <div className="absolute right-3 bottom-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={submitting}
                    aria-label={
                      isListening ? "Hentikan Rekaman" : "Mulai Rekam Suara"
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "bg-ai-violet-600 hover:bg-ai-violet-700 text-white"
                    }`}
                    title={
                      isListening
                        ? "Klik untuk berhenti merekam"
                        : "Klik untuk mulai input suara"
                    }
                  >
                    {isListening ? (
                      <>
                        <BsStopFill className="text-sm" />
                        <span>Selesai</span>
                      </>
                    ) : (
                      <>
                        <BsMicFill className="text-sm" />
                        <span>Bicara</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Pembantu Saat Merekam */}
              {isListening && (
                <div className="mt-2 p-2.5 rounded-xl bg-ai-violet-50/70 dark:bg-ai-violet-950/30 border border-ai-violet-200/50 dark:border-ai-violet-800/40 text-xs text-ai-violet-700 dark:text-ai-violet-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>
                      🎙️ Suara Anda sedang ditranskrip langsung ke form...
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetTranscript();
                        setTranscript("");
                        setInterimText("");
                      }}
                      className="text-[11px] underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Hapus Teks
                    </button>
                  </div>
                  {interimText && (
                    <div className="pt-1 text-[11px] text-ai-violet-600 dark:text-ai-violet-300 italic">
                      Mendengar: "{interimText}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tombol Submit Refleksi */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                AI Gemini Analysis
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!transcript.trim() || submitting}
                className="px-5 py-2.5 rounded-2xl font-semibold text-xs text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-ai-violet-500/25 transition-all flex items-center gap-2 active:scale-95"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Refleksi</span>
                    <BsArrowRight />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* HASIL REFLEKSI DARI GEMINI AI */}
      {result && (
        <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
              ✓
            </span>
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
              Refleksi Berhasil Diproses oleh AI
            </h3>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {result.feedbackText}
          </p>

          {result.appliedActivityChanges?.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-deep-900/60 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 block mb-1.5">
                Perubahan Aktivitas yang Diterapkan:
              </span>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {result.appliedActivityChanges.map((item, index) => (
                  <li key={index} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.appliedMemoryChanges?.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-deep-900/60 border border-ai-violet-200/60 dark:border-ai-violet-900/40">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-ai-violet-700 dark:text-ai-violet-300 block mb-1.5">
                Pembaruan Memori AI Jangka Panjang:
              </span>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {result.appliedMemoryChanges.map((item, index) => (
                  <li key={index} className="flex items-center gap-1.5">
                    <span className="text-ai-violet-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DailyReflection;
