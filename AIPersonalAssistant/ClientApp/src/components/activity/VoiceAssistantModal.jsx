import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BsStars,
  BsMicFill,
  BsStopFill,
  BsX,
  BsVolumeMuteFill,
  BsCheck2,
  BsTrash,
  BsPlusLg,
  BsClock,
  BsArrowRight,
  BsLightbulb,
  BsExclamationTriangle,
  BsLockFill,
} from "react-icons/bs";
import { useSpeechRecognition } from "../useSpeechRecognition";
import { useVoiceAssistant } from "../../context/VoiceAssistantContext";
import { useTheme } from "../../context/ThemeContext";
import { formatWibTime, toInputDatetimeString } from "../../utils/dateUtils";

const CATEGORIES = [
  { value: "Productivity", label: "💼 Productivity" },
  { value: "Learning", label: "📚 Learning" },
  { value: "Health", label: "❤️ Health" },
  { value: "Personal", label: "👤 Personal" },
  { value: "General", label: "📌 General" },
];

export const VoiceAssistantModal = () => {
  const { isOpen, closeAssistant } = useVoiceAssistant();
  const { isDark } = useTheme();

  // State percakapan
  const [sessionId, setSessionId] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [proposedSchedules, setProposedSchedules] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);

  // State input ucapan
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState(null);

  // State mode editor jadwal (tetap mempertahankan chat, tidak ganti popup)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editableSchedules, setEditableSchedules] = useState([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Evaluasi batas limit
  const isLimitReached = currentTurn >= 4 || isSessionEnded;
  const isAiInputDisabled = isLimitReached || isEditingSchedule;

  // TTS SpeechSynthesis ref
  const currentUtteranceRef = useRef(null);
  const chatScrollRef = useRef(null);

  // STT Handlers
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

  // Auto-scroll ke bawah saat percakapan bertambah atau saat masuk mode edit
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [
    conversationHistory,
    isProcessing,
    isSpeaking,
    proposedSchedules,
    isEditingSchedule,
  ]);

  // Hentikan TTS saat modal ditutup atau unmount
  const stopTts = useCallback(() => {
    try {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    setIsSpeaking(false);
  }, []);

  // Reset sesi total saat modal dibuka baru
  const resetSession = useCallback(() => {
    stopTts();
    try {
      stopListening();
    } catch {}
    resetTranscript();
    setSessionId(null);
    setCurrentTurn(1);
    setIsSessionEnded(false);
    setProposedSchedules([]);
    setConversationHistory([]);
    setTranscript("");
    setInterimText("");
    setIsProcessing(false);
    setErrorMsg("");
    setIsEditingSchedule(false);
    setEditableSchedules([]);
  }, [stopListening, resetTranscript, stopTts]);

  // Inisialisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      resetSession();
    } else {
      stopTts();
      try {
        stopListening();
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle TTS untuk membacakan teks respon AI
  const speakText = useCallback(
    (text) => {
      if (!text || !window.speechSynthesis) return;
      stopTts();

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        // Cari suara Bahasa Indonesia jika ada
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find(
          (v) => v.lang === "id-ID" || v.lang.startsWith("id"),
        );
        if (idVoice) utterance.voice = idVoice;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("TTS Error:", e);
        setIsSpeaking(false);
      }
    },
    [stopTts],
  );

  // Mengirim giliran suara ke backend TracebackMemoryService
  const sendVoiceTurn = async (speechInput) => {
    if (isAiInputDisabled) return;

    const textToSend = (speechInput || transcript).trim();
    if (!textToSend || isProcessing) return;

    stopTts();
    try {
      stopListening();
    } catch {}

    setIsProcessing(true);
    setErrorMsg("");

    // Tambah input pengguna ke riwayat lokal
    const userTurnItem = { speaker: "User", message: textToSend };
    setConversationHistory((prev) => [...prev, userTurnItem]);
    setTranscript("");
    setInterimText("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/activity/traceback-memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId,
          userSpeechInput: textToSend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Gagal memproses giliran suara.");
      }

      // Update state dari server result (VoiceClientResultDto)
      setSessionId(data.sessionId);
      setCurrentTurn(data.currentTurn);
      setIsSessionEnded(Boolean(data.isSessionEnded));

      // Simpan usulan jadwal jika ada
      if (data.proposedSchedules && data.proposedSchedules.length > 0) {
        setProposedSchedules(data.proposedSchedules);
      }

      // Tambah respon asisten ke riwayat lokal
      const aiTurnItem = {
        speaker: "Assistant",
        message: data.textToSpeak,
        schedules: data.proposedSchedules || [],
      };
      setConversationHistory((prev) => [...prev, aiTurnItem]);

      // Jalankan Text-to-Speech
      if (data.textToSpeak) {
        speakText(data.textToSpeak);
      }
    } catch (err) {
      console.error("Voice Turn Error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses suara.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler toggle mikrofon
  const handleToggleMic = () => {
    if (isAiInputDisabled) return;

    if (isListening) {
      stopListening();
    } else {
      stopTts();
      setErrorMsg("");
      startListening();
    }
  };

  // Handler klik rekomendasi di kartu panduan 3 pilar
  const handleQuickPillarClick = (text) => {
    if (isAiInputDisabled) return;
    setTranscript(text);
  };

  // Handler buka editor jadwal dari tombol "Selesai & Jadwalkan"
  const handleOpenScheduleEditor = () => {
    stopTts();
    try {
      stopListening();
    } catch {}

    // Inisialisasi editableSchedules dari proposedSchedules jika belum ada
    if (editableSchedules.length === 0) {
      const initialized = proposedSchedules.map((item, index) => {
        const formatted = toInputDatetimeString(item.suggestedTime);
        return {
          id: index + 1,
          title: item.title || "",
          category: item.category || "General",
          remindAt: formatted,
          isReminder: Boolean(formatted),
          description: item.description || "",
        };
      });
      setEditableSchedules(initialized);
    }
    setIsEditingSchedule(true);
  };

  // Ubah field di editor jadwal
  const handleScheduleChange = (index, field, value) => {
    setEditableSchedules((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "remindAt") {
        item.isReminder = Boolean(value);
      }
      updated[index] = item;
      return updated;
    });
  };

  // Hapus item di editor jadwal
  const handleDeleteSchedule = (index) => {
    setEditableSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  // Tambah item manual di editor jadwal
  const handleAddScheduleItem = () => {
    setEditableSchedules((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        category: "General",
        remindAt: "",
        isReminder: false,
        description: "",
      },
    ]);
  };

  // Simpan batch aktivitas ke backend (/api/activity/batch) dan langsung tutup popup
  const handleSaveBatch = async () => {
    if (editableSchedules.length === 0) {
      setErrorMsg("Tidak ada jadwal yang dapat disimpan.");
      return;
    }

    // Validasi judul
    for (let i = 0; i < editableSchedules.length; i++) {
      if (!editableSchedules[i].title.trim()) {
        setErrorMsg(`Judul kegiatan #${i + 1} wajib diisi.`);
        return;
      }
    }

    setIsSavingSchedule(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");
      const payload = editableSchedules.map((item) => {
        const hasTime = Boolean(item.remindAt);
        return {
          title: item.title.trim(),
          description: item.description?.trim() || "",
          category: item.category || "General",
          isReminder: hasTime ? Boolean(item.isReminder) : false,
          remindAt: hasTime
            ? item.remindAt.length === 16
              ? `${item.remindAt}:00`
              : item.remindAt
            : null,
        };
      });

      const response = await fetch("/api/activity/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Gagal menyimpan jadwal kegiatan.");
      }

      setToastMsg(`✨ ${payload.length} jadwal berhasil disimpan!`);
      // Setelah simpan, langsung tutup popup
      stopTts();
      setTimeout(() => {
        setToastMsg(null);
        closeAssistant();
      }, 700);
    } catch (err) {
      console.error("Save Schedule Error:", err);
      setErrorMsg(err.message || "Gagal menyimpan jadwal.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  if (!isOpen) return null;

  // Visual Status Logic
  const visualStatus = isProcessing
    ? "processing"
    : isSpeaking
      ? "speaking"
      : isListening
        ? "listening"
        : "idle";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center p-0 lg:p-4 transition-all">
      {/* Semi-transparent Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={() => {
          stopTts();
          closeAssistant();
        }}
      />

      {/* Main Container: Bottom Sheet (Mobile) & Floating Overlay Pop-up (Desktop) */}
      <div
        className={`relative z-10 w-full lg:max-w-xl flex flex-col max-h-[88vh] lg:max-h-[84vh] rounded-t-3xl lg:rounded-3xl shadow-2xl border transition-all duration-300 overflow-hidden animate-slide-up ${
          isDark
            ? "bg-[#0B1120]/95 text-slate-100 border-slate-800 shadow-ai-violet-950/40"
            : "bg-white/95 text-slate-900 border-slate-200/90 shadow-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Drag Handle */}
        <div className="lg:hidden flex items-center justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* 1. HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-ai-violet-600 via-purple-500 to-sage-500 flex items-center justify-center text-white shadow-glow-violet flex-shrink-0">
              <BsStars className="text-sm animate-twinkle" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                AI Voice Assistant
              </h3>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Siri & Gemini Style Quick Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Turn Counter Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight border transition-colors ${
                isLimitReached
                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60"
                  : currentTurn === 3
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                    : "bg-ai-violet-100 dark:bg-ai-violet-950/60 text-ai-violet-700 dark:text-ai-violet-300 border-ai-violet-200 dark:border-ai-violet-800/60"
              }`}
            >
              {isLimitReached
                ? "Sesi Berakhir (4/4)"
                : `Turn ${currentTurn}/4 (Sisa ${Math.max(0, 4 - currentTurn)})`}
            </span>

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={() => {
                stopTts();
                closeAssistant();
              }}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup & Reset Sesi"
            >
              <BsX className="text-2xl leading-none" />
            </button>
          </div>
        </div>

        {/* 2. BODY CONTENT (SCROLLABLE CHAT & MULTIPLE ACTIVITY IN-PLACE) */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm"
        >
          {/* Toast Notification Banner */}
          {toastMsg && (
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold text-xs flex items-center gap-2 animate-fade-in">
              <BsCheck2 className="text-base" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {(errorMsg || speechError) && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <BsExclamationTriangle className="text-sm mt-0.5 flex-shrink-0" />
              <span>{errorMsg || speechError}</span>
            </div>
          )}

          {/* AREA INFORMASI AWAL: Tampil di Turn 1 jika belum ada riwayat bicara */}
          {conversationHistory.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ai-violet-600 dark:text-ai-violet-400 uppercase tracking-wider">
                <BsLightbulb className="text-sm" /> 3 Pilar Interaksi yang
                Didukung:
              </div>

              <div className="space-y-2">
                {/* Pilar 1 */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPillarClick(
                      "Bagaimana rekap dan progres kegiatanku?",
                    )
                  }
                  className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 hover:border-ai-violet-400 dark:hover:border-ai-violet-500 transition-all flex items-start gap-2.5 group"
                >
                  <span className="text-base flex-shrink-0">📊</span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-ai-violet-600 dark:group-hover:text-ai-violet-400 transition-colors">
                      Ringkasan Aktivitas
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Rekap progres dan audit riwayat yang tersimpan.
                    </div>
                  </div>
                </button>

                {/* Pilar 2 */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPillarClick(
                      "Bisa jelaskan konsep dan prinsip kerja...",
                    )
                  }
                  className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 hover:border-ai-violet-400 dark:hover:border-ai-violet-500 transition-all flex items-start gap-2.5 group"
                >
                  <span className="text-base flex-shrink-0">💡</span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-ai-violet-600 dark:group-hover:text-ai-violet-400 transition-colors">
                      Tanya Pengetahuan
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Pembahasan teori, konsep, dan prinsip kerja materi.
                    </div>
                  </div>
                </button>

                {/* Pilar 3 */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPillarClick(
                      "Apa rekomendasi langkah prioritasku berikutnya?",
                    )
                  }
                  className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 hover:border-ai-violet-400 dark:hover:border-ai-violet-500 transition-all flex items-start gap-2.5 group"
                >
                  <span className="text-base flex-shrink-0">🚀</span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-ai-violet-600 dark:group-hover:text-ai-violet-400 transition-colors">
                      Langkah Lanjutan
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Rekomendasi prioritas dan rencana aksi berikutnya.
                    </div>
                  </div>
                </button>
              </div>

              {/* Peringatan Tegas */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed flex items-center gap-2">
                <span className="text-sm flex-shrink-0">⚠️</span>
                <span>
                  Masukan di luar 3 fungsi ini otomatis ditolak dan sesi akan
                  ditutup.
                </span>
              </div>
            </div>
          )}

          {/* DAFTAR PERCAKAPAN BERJALAN (SELALU DIPERTAHANKAN) */}
          {conversationHistory.map((item, idx) => (
            <div key={idx} className="space-y-2">
              {item.speaker === "User" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-xs bg-gradient-to-r from-ai-violet-600 to-purple-600 text-white shadow-md shadow-ai-violet-500/15">
                    <p className="leading-relaxed">{item.message}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-ai-violet-100 dark:bg-ai-violet-950 text-ai-violet-600 dark:text-ai-violet-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    <BsStars />
                  </div>
                  <div className="max-w-[92%] p-3.5 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 shadow-xs space-y-2.5">
                    <p className="leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>

                    {/* KARTU USULAN JADWAL (READ-ONLY PREVIEW) JIKA TIDAK SEDANG DALAM MODE EDIT */}
                    {!isEditingSchedule &&
                      item.schedules &&
                      item.schedules.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-ai-violet-600 dark:text-ai-violet-400">
                            <span>
                              📅 DRAF USULAN JADWAL ({item.schedules.length})
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {item.schedules.map((sch, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {sch.title}
                                  </div>
                                  {sch.description && (
                                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                                      {sch.description}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                                    <span className="px-1.5 py-0.2 rounded-md bg-ai-violet-50 dark:bg-ai-violet-950/60 text-ai-violet-700 dark:text-ai-violet-300 font-mono font-medium">
                                      {sch.category || "General"}
                                    </span>
                                    {sch.suggestedTime && (
                                      <span className="flex items-center gap-1">
                                        <BsClock className="text-[9px]" />
                                        {formatWibTime(sch.suggestedTime)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Keterangan Sedikit Mengenai Edit */}
                          <div className="p-2 rounded-lg bg-ai-violet-50/70 dark:bg-ai-violet-950/30 border border-ai-violet-200/50 dark:border-ai-violet-800/40 text-[11px] text-ai-violet-700 dark:text-ai-violet-300">
                            ℹ️ Anda bisa mengedit jadwal pada{" "}
                            <span className="font-bold">
                              "Selesai & Jadwalkan"
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* KOMPONEN MULTIPLE ACTIVITY EDITOR LANGSUNG DI DALAM VIEW (TIDAK GANTI POPUP) */}
          {isEditingSchedule && (
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border-2 border-ai-violet-500/40 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-ai-violet-600 dark:text-ai-violet-400 flex items-center gap-1.5">
                  <BsClock /> Edit Jadwal Aktivitas ({editableSchedules.length})
                </span>

                <button
                  type="button"
                  onClick={handleAddScheduleItem}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-sage-600 hover:bg-sage-500 transition-colors flex items-center gap-1 shadow-xs"
                >
                  <BsPlusLg className="text-[10px]" />
                  <span>Tambah Kegiatan</span>
                </button>
              </div>

              <div className="space-y-3">
                {editableSchedules.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase text-ai-violet-600 dark:text-ai-violet-400">
                        Agenda #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        title="Hapus Agenda Ini"
                      >
                        <BsTrash className="text-xs" />
                      </button>
                    </div>

                    {/* Judul Kegiatan */}
                    <div>
                      <label className="block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Judul Kegiatan *
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          handleScheduleChange(index, "title", e.target.value)
                        }
                        placeholder="Nama kegiatan..."
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ai-violet-500 font-semibold"
                      />
                    </div>

                    {/* Deskripsi / Catatan Agenda */}
                    <div>
                      <label className="block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Deskripsi / Catatan Agenda
                      </label>
                      <textarea
                        rows="2"
                        value={item.description || ""}
                        onChange={(e) =>
                          handleScheduleChange(
                            index,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Rincian aksi, tujuan, atau catatan agenda..."
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ai-violet-500 resize-none font-normal"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Kategori */}
                      <div>
                        <label className="block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Kategori
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleScheduleChange(
                              index,
                              "category",
                              e.target.value,
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ai-violet-500"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Waktu Jadwal */}
                      <div>
                        <label className="block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Waktu Jadwal Pengingat
                        </label>
                        <input
                          type="datetime-local"
                          value={item.remindAt || ""}
                          onChange={(e) =>
                            handleScheduleChange(
                              index,
                              "remindAt",
                              e.target.value,
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-ai-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-ai-violet-50/60 dark:bg-ai-violet-950/30 border border-ai-violet-200/50 dark:border-ai-violet-800/40 animate-pulse">
              <div className="w-4 h-4 border-2 border-ai-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-ai-violet-700 dark:text-ai-violet-300 font-medium">
                AI sedang menganalisis memori dan menyiapkan jawaban...
              </span>
            </div>
          )}
        </div>

        {/* 3. FOOTER AREA */}
        <div className="p-4 border-t border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex-shrink-0 space-y-3">
          {/* JIKA SEDANG DALAM MODE EDIT JADWAL: TAMPILKAN TOMBOL BATAL & SIMPAN AKTIVITAS */}
          {isEditingSchedule ? (
            <div className="flex items-center justify-between gap-3 animate-fade-in">
              <button
                type="button"
                onClick={() => setIsEditingSchedule(false)}
                disabled={isSavingSchedule}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Batal Edit
              </button>

              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={isSavingSchedule || editableSchedules.length === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingSchedule ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Aktivitas...</span>
                  </>
                ) : (
                  <>
                    <BsCheck2 className="text-sm stroke-1" />
                    <span>Simpan Aktivitas ({editableSchedules.length})</span>
                  </>
                )}
              </button>
            </div>
          ) : isLimitReached ? (
            /* JIKA BATAS 4 TURN ATAU SESI SELESAI: FUNGSI KIRIM RESPONSE AI HILANG */
            <div className="space-y-3 animate-fade-in">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <BsLockFill className="text-ai-violet-500 text-xs flex-shrink-0" />
                <span>
                  Sesi percakapan telah selesai (Batas 4 giliran bicara
                  tercapai).
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    stopTts();
                    closeAssistant();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Selesai
                </button>

                {proposedSchedules.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenScheduleEditor}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Selesai & Jadwalkan</span>
                    <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                      {proposedSchedules.length}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* MODE PERCAKAPAN AKTIF: AUDIO VISUALIZER, INPUT TEXT & MIC UTAMA */
            <>
              {/* WAVEFORM / AUDIO VISUALIZER BAR */}
              <div className="flex items-center justify-between gap-3 px-2">
                <div className="flex items-center gap-2">
                  {/* Status Indicator Visualizer */}
                  {visualStatus === "listening" && (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-4 rounded-full bg-rose-500 animate-pulse" />
                      <span className="w-1.5 h-6 rounded-full bg-rose-500 animate-bounce" />
                      <span className="w-1.5 h-3 rounded-full bg-rose-500 animate-pulse delay-75" />
                      <span className="w-1.5 h-5 rounded-full bg-rose-500 animate-bounce delay-150" />
                      <span className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 ml-1">
                        Mendengarkan ucapan...
                      </span>
                    </div>
                  )}

                  {visualStatus === "processing" && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-ai-violet-600 dark:text-ai-violet-400">
                      <div className="w-3.5 h-3.5 border-2 border-ai-violet-500 border-t-transparent rounded-full animate-spin" />
                      <span>Memproses pemahaman AI...</span>
                    </div>
                  )}

                  {visualStatus === "speaking" && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 h-4">
                        <span className="w-1 h-3 rounded-full bg-emerald-500 animate-[bounce_0.8s_infinite]" />
                        <span className="w-1 h-4 rounded-full bg-emerald-500 animate-[bounce_0.6s_infinite]" />
                        <span className="w-1 h-2 rounded-full bg-emerald-500 animate-[bounce_0.9s_infinite]" />
                        <span className="w-1 h-4 rounded-full bg-emerald-500 animate-[bounce_0.7s_infinite]" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        AI sedang membacakan respon...
                      </span>
                    </div>
                  )}

                  {visualStatus === "idle" && (
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      Tekan mikrofon untuk mulai bicara atau ketik di bawah
                    </span>
                  )}
                </div>

                {/* Tombol Stop TTS jika sedang bersuara */}
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopTts}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"
                    title="Hentikan Suara TTS"
                  >
                    <BsVolumeMuteFill /> Hentikan Suara
                  </button>
                )}
              </div>

              {/* INPUT AREA EDITABLE (BISA DIKETIK / DIEDIT SEBELUM KIRIM) */}
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={
                    interimText ? `${transcript} ${interimText}` : transcript
                  }
                  onChange={(e) => setTranscript(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendVoiceTurn();
                    }
                  }}
                  disabled={isProcessing}
                  placeholder={
                    isListening
                      ? "Sedang mendengarkan... (atau ketik langsung di sini)"
                      : "Bicara dengan mic atau ketik pertanyaanmu di sini..."
                  }
                  className="flex-1 px-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ai-violet-500 shadow-inner"
                />

                {/* Tombol Kirim Manual (Jika teks terisi) */}
                {transcript.trim() && (
                  <button
                    type="button"
                    onClick={() => sendVoiceTurn()}
                    disabled={isProcessing}
                    className="p-2.5 rounded-2xl text-white bg-ai-violet-600 hover:bg-ai-violet-500 transition-colors shadow-md shadow-ai-violet-500/25 flex-shrink-0"
                    title="Kirim Pesan"
                  >
                    <BsArrowRight className="text-sm" />
                  </button>
                )}
              </div>

              {/* TOMBOL AKSI BAWAH: MIC UTAMA & TOMBOL SELESAI */}
              <div className="flex items-center justify-between pt-1">
                {/* Tombol Selesai (Batal & Tutup) */}
                <button
                  type="button"
                  onClick={() => {
                    stopTts();
                    closeAssistant();
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Selesai
                </button>

                {/* TOMBOL MIC UTAMA BULAT DI TENGAH */}
                <div className="relative inline-flex items-center justify-center">
                  {isListening && (
                    <span className="absolute w-14 h-14 rounded-full bg-rose-500/25 animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    disabled={isProcessing}
                    aria-label={isListening ? "Hentikan Suara" : "Mulai Bicara"}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg shadow-lg transition-all duration-200 active:scale-90 ${
                      isListening
                        ? "bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/40 animate-pulse"
                        : "bg-gradient-to-tr from-ai-violet-600 via-purple-600 to-indigo-600 shadow-ai-violet-500/30 hover:scale-105"
                    }`}
                  >
                    {isListening ? <BsStopFill /> : <BsMicFill />}
                  </button>
                </div>

                {/* Tombol Selesai & Jadwalkan (Muncul jika ada usulan jadwal) */}
                {proposedSchedules.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleOpenScheduleEditor}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-ai-violet-600 to-purple-600 hover:from-ai-violet-500 hover:to-purple-500 shadow-md shadow-ai-violet-500/25 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Selesai & Jadwalkan</span>
                    <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                      {proposedSchedules.length}
                    </span>
                  </button>
                ) : (
                  <div className="w-16" /> /* Spacer menjaga mic di tengah */
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantModal;
