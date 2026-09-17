import React, { useState, useCallback, useEffect } from "react";
import { BsMicFill } from "react-icons/bs";
import { ModalWrapper } from "../common/ModalWrapper";
import { useSpeechRecognition } from "../useSpeechRecognition";

/**
 * Quick Voice Modal Component
 * Perekam suara cepat dengan live transkrip, textarea editable, dan trigger ekstraksi AI
 */
export const QuickVoiceModal = ({ isOpen, onClose, onProcessTranscript }) => {
  const [quickSpeechTranscript, setQuickSpeechTranscript] = useState("");
  const [quickInterimText, setQuickInterimText] = useState("");

  const handleQuickFinalChunk = useCallback((finalText) => {
    if (!finalText) return;
    setQuickSpeechTranscript((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${finalText}` : finalText;
    });
    setQuickInterimText("");
  }, []);

  const handleQuickInterimChunk = useCallback((interim) => {
    setQuickInterimText(interim);
  }, []);

  const {
    isListening: isQuickListening,
    startListening: startQuickListening,
    stopListening: stopQuickListening,
    resetTranscript: resetQuickTranscript,
  } = useSpeechRecognition(
    "id-ID",
    handleQuickFinalChunk,
    handleQuickInterimChunk,
  );

  // Mulai dengar otomatis saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setQuickSpeechTranscript("");
      setQuickInterimText("");
      resetQuickTranscript();
      const timer = setTimeout(() => {
        try {
          startQuickListening();
        } catch (e) {
          console.warn("Speech recognition autoplay block:", e);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      try {
        stopQuickListening();
      } catch {}
    }
  }, [isOpen]);

  const handleClose = () => {
    try {
      stopQuickListening();
    } catch {}
    onClose();
  };

  const handleRepeat = () => {
    setQuickSpeechTranscript("");
    setQuickInterimText("");
    resetQuickTranscript();
    startQuickListening();
  };

  const handleSubmit = () => {
    try {
      stopQuickListening();
    } catch {}
    const text = quickSpeechTranscript.trim();
    if (text) {
      onProcessTranscript(text);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      title="Quick Voice Capture"
      icon={
        <BsMicFill className="text-ai-violet-600 dark:!text-ai-violet-400" />
      }
      bodyClassName="p-6 space-y-4"
    >
      <div className="text-center py-2 space-y-3">
        {/* Visual Pulser Mic */}
        <div className="relative inline-flex items-center justify-center">
          {isQuickListening && (
            <span className="absolute w-20 h-20 rounded-full bg-ai-violet-500/20 animate-ping" />
          )}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-lg transition-all ${
              isQuickListening
                ? "bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/30 animate-pulse"
                : "bg-gradient-to-tr from-ai-violet-600 to-purple-500 shadow-ai-violet-500/30"
            }`}
          >
            <BsMicFill />
          </div>
        </div>

        <div>
          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:!text-white">
            {isQuickListening
              ? "Silakan berbicara sekarang..."
              : "Mikrofon dihentikan (Anda dapat mengedit teks di bawah)"}
          </h4>
          <p className="text-xs text-slate-500 dark:!text-slate-400 max-w-xs mx-auto mt-0.5">
            Sebutkan tugas atau jadwal pengingat, atau ketik langsung di bawah.
          </p>
        </div>
      </div>

      {/* Area Textarea Transkrip Suara (Bisa Diedit Bebas oleh Pengguna) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:!text-slate-300">
            Teks Suara / Catatan
          </label>
          {isQuickListening && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-100 text-red-700 dark:!bg-red-950/60 dark:!text-red-300 border border-red-200 dark:!border-red-900/50 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Mendengarkan...
            </span>
          )}
        </div>

        <textarea
          rows="4"
          value={quickSpeechTranscript}
          onChange={(e) => setQuickSpeechTranscript(e.target.value)}
          placeholder="Mulai bicara atau ketik langsung di sini untuk menyesuaikan kalimat..."
          className="w-full p-3.5 text-sm rounded-2xl border bg-slate-50 dark:!bg-deep-950 border-slate-200 dark:!border-slate-800 text-slate-900 dark:!text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500/50 transition-all resize-none shadow-inner"
        />

        {/* Status Pembantu Saat Merekam */}
        {isQuickListening && (
          <div className="p-2.5 rounded-xl bg-ai-violet-50/70 dark:!bg-ai-violet-950/30 border border-ai-violet-200/50 dark:!border-ai-violet-800/40 text-xs text-ai-violet-700 dark:!text-ai-violet-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>
                🎙️ Suara Anda sedang ditranskrip langsung ke textarea...
              </span>
              <button
                type="button"
                onClick={() => {
                  resetQuickTranscript();
                  setQuickSpeechTranscript("");
                  setQuickInterimText("");
                }}
                className="text-[11px] underline text-slate-400 hover:text-slate-600 dark:hover:!text-slate-200"
              >
                Hapus Teks
              </button>
            </div>
            {quickInterimText && (
              <div className="pt-1 text-[11px] text-ai-violet-600 dark:!text-ai-violet-300 italic animate-pulse">
                Mendengar: "{quickInterimText}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aksi Modal Suara (Responsif Mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleRepeat}
          className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:!text-slate-300 hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
        >
          Ulangi
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:!border-slate-800 text-slate-600 dark:!text-slate-300 hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!quickSpeechTranscript.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Selesai & Analisis AI
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
