import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useRef,
} from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { useSpeechRecognition } from "../components/useSpeechRecognition";

export const VoiceInput = forwardRef(
  ({ onSpeechComplete, isProcessing = false }, ref) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editableText, setEditableText] = useState("");
    const editableTextRef = useRef("");
    const baseTextRef = useRef("");

    const updateEditableText = useCallback((val) => {
      editableTextRef.current = val;
      setEditableText(val);
    }, []);

    // Callback saat ada suara baru yang terdeteksi di sesi perekaman berjalan
    const handleSpeech = useCallback(
      (sessionTranscript) => {
        const base = baseTextRef.current.trim();
        const speech = (sessionTranscript || "").trim();
        const combined = base ? `${base} ${speech}` : speech;
        updateEditableText(combined);
      },
      [updateEditableText],
    );

    // Callback saat satu sesi pengenalan selesai (misal onend di Mobile Chrome saat jeda napas)
    // Simpan teks yang sudah terbentuk ke baseTextRef agar ucapan berikutnya menyambung
    const handleSessionEnd = useCallback(() => {
      if (editableTextRef.current) {
        baseTextRef.current = editableTextRef.current.trim();
      }
    }, []);

    const {
      isListening,
      error,
      startListening,
      stopListening,
      resetTranscript,
    } = useSpeechRecognition("id-ID", handleSpeech, handleSessionEnd);

    // Buka modal perekam suara dan otomatis mulai mendengarkan
    const openVoiceModal = useCallback(() => {
      resetTranscript();
      baseTextRef.current = "";
      updateEditableText("");
      setIsModalOpen(true);
      setTimeout(() => {
        startListening();
      }, 300);
    }, [resetTranscript, startListening, updateEditableText]);

    // Tutup modal perekam suara dan hentikan mikrofon
    const closeVoiceModal = useCallback(() => {
      stopListening();
      resetTranscript();
      baseTextRef.current = "";
      updateEditableText("");
      setIsModalOpen(false);
    }, [stopListening, resetTranscript, updateEditableText]);

    // Expose openVoiceModal ke parent via ref (misal untuk tombol 'Bicara Ulang')
    useImperativeHandle(ref, () => ({
      startListening: () => {
        openVoiceModal();
      },
      openVoiceModal: () => {
        openVoiceModal();
      },
      closeVoiceModal: () => {
        closeVoiceModal();
      },
    }));

    // Reset suara yang terekam jika user salah kata
    const handleReset = () => {
      baseTextRef.current = "";
      updateEditableText("");
      resetTranscript();
      setTimeout(() => {
        startListening();
      }, 150);
    };

    // Toggle jeda atau lanjut bicara
    const handleToggleListening = () => {
      if (isListening) {
        baseTextRef.current = editableTextRef.current.trim();
        stopListening();
      } else {
        baseTextRef.current = editableTextRef.current.trim();
        startListening();
      }
    };

    // Handler ketika user mengetik atau mengedit langsung teks di textarea
    const handleTextChange = (e) => {
      const newVal = e.target.value;
      updateEditableText(newVal);
      baseTextRef.current = newVal.trim();
      // Jeda otomatis jika sedang mendengarkan agar suara ketikan / ucapan tidak bentrok menimpa editan user
      if (isListening) {
        stopListening();
      }
    };

    // Kirim transkrip ke backend untuk diproses Gemini AI
    const handleProcessWithAi = () => {
      const finalTranscript = editableTextRef.current.trim();
      if (!finalTranscript) return;

      stopListening();
      setIsModalOpen(false);

      if (onSpeechComplete) {
        onSpeechComplete(finalTranscript);
      }
      baseTextRef.current = "";
      updateEditableText("");
    };

    return (
      <>
        {/* Tombol Ringkas di UI: Cukup Tampilkan Bicara */}
        <button
          type="button"
          className="btn btn-outline-primary d-flex align-items-center gap-1 shadow-sm"
          onClick={openVoiceModal}
          disabled={isProcessing}
          title="Bicara untuk membuat aktivitas dengan AI"
        >
          {isProcessing ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>🎤</span>
              <span>Bicara</span>
            </>
          )}
        </button>

        {/* POPUP MODAL PEREKAM SUARA YANG DAPAT DIEDIT LANGSUNG */}
        <Modal
          isOpen={isModalOpen}
          toggle={closeVoiceModal}
          centered
          backdrop="static"
          size="lg"
        >
          <ModalHeader toggle={closeVoiceModal} className="bg-light">
            <span className="fw-bold d-flex align-items-center gap-2">
              🎙️ Perekam Suara Aktivitas AI
            </span>
          </ModalHeader>

          <ModalBody className="p-4">
            {/* Status mikrofon dan tombol Reset */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                {isListening ? (
                  <>
                    <span
                      className="badge bg-danger d-inline-flex align-items-center gap-1 px-2 py-1"
                      style={{ animation: "pulse 1.5s infinite" }}
                    >
                      <span
                        className="spinner-grow spinner-grow-sm"
                        role="status"
                        aria-hidden="true"
                        style={{ width: "8px", height: "8px" }}
                      />
                      MENDENGARKAN
                    </span>
                    <span className="text-muted small">
                      Silakan bicara dengan santai dan jelas...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="badge bg-secondary px-2 py-1">
                      DIJEDA / STOP
                    </span>
                    <span className="text-muted small">
                      {editableText
                        ? "Mikrofon dijeda. Anda dapat mengedit teks di atas atau klik 'Lanjut Bicara' untuk meneruskan rekaman suara."
                        : "Klik 'Lanjut Bicara' untuk mulai merekam suara."}
                    </span>
                  </>
                )}
              </div>

              {/* Tombol Reset Suara jika ada salah kata */}
              <button
                type="button"
                className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                onClick={handleReset}
                disabled={!editableText.trim()}
                title="Hapus rekaman saat ini dan mulai bicara dari awal"
              >
                <span>🔄</span>
                <span>Reset Suara</span>
              </button>
            </div>

            {/* Kotak Textarea Transkripsi yang Dapat Diedit Langsung */}
            <div className="mb-2">
              <textarea
                className="form-control p-3 rounded shadow-sm"
                rows={6}
                value={editableText}
                onChange={handleTextChange}
                placeholder="🎙️ Ucapan Anda akan muncul di sini secara langsung. Anda juga bisa mengedit atau mengetik langsung di sini jika ada kata yang kurang pas..."
                style={{
                  minHeight: "200px",
                  maxHeight: "320px",
                  fontSize: "1.25rem",
                  lineHeight: "1.8",
                  letterSpacing: "0.2px",
                  backgroundColor: isListening ? "#fffdfd" : "#ffffff",
                  borderColor: isListening ? "#dc3545" : "#ced4da",
                  boxShadow: isListening
                    ? "0 0 0 0.2rem rgba(220, 53, 69, 0.15)"
                    : undefined,
                }}
              />
            </div>

            {/* Petunjuk Edit & Hitungan Karakter */}
            <div className="d-flex justify-content-between align-items-center text-muted small px-1">
              <span>
                ✍️{" "}
                <em>
                  Teks di atas dapat Anda edit/ketik langsung secara bebas jika
                  ingin memperbaiki kata.
                </em>
              </span>
              <span>
                {editableText ? `${editableText.length} karakter` : ""}
              </span>
            </div>

            {error && (
              <div className="alert alert-warning py-2 small mt-3 mb-0">
                ⚠️ {error}
              </div>
            )}
          </ModalBody>

          <ModalFooter className="d-flex justify-content-between bg-light">
            {/* Tombol Jeda / Lanjut */}
            <button
              type="button"
              className={`btn d-inline-flex align-items-center gap-1 ${
                isListening ? "btn-outline-danger" : "btn-outline-primary"
              }`}
              onClick={handleToggleListening}
            >
              <span>{isListening ? "⏸️ Jeda Bicara" : "🎤 Lanjut Bicara"}</span>
            </button>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeVoiceModal}
              >
                Batal
              </button>

              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2 px-3 shadow-sm"
                onClick={handleProcessWithAi}
                disabled={!editableText.trim() || isProcessing}
                title="Kirim ke Gemini AI untuk dianalisis dan dimasukkan ke form"
              >
                <span>✨</span>
                <span>Proses dengan AI</span>
              </button>
            </div>
          </ModalFooter>
        </Modal>
      </>
    );
  },
);

VoiceInput.displayName = "VoiceInput";
