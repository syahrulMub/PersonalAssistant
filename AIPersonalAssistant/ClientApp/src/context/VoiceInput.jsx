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

    const baseTextRef = useRef("");
    const interimTextRef = useRef("");

    // Helper render penggabungan teks permanen + preview kata yang sedang diucapkan
    const syncDisplayText = () => {
      const base = baseTextRef.current.trim();
      const interim = interimTextRef.current.trim();
      if (base && interim) {
        setEditableText(`${base} ${interim}`);
      } else {
        setEditableText(base || interim || "");
      }
    };

    // Dipanggil hanya saat satu kata/kalimat sudah final (dikunci)
    const handleFinalChunk = useCallback((finalText) => {
      if (!finalText) return;
      const base = baseTextRef.current.trim();
      baseTextRef.current = base ? `${base} ${finalText}` : finalText;
      interimTextRef.current = "";
      syncDisplayText();
    }, []);

    // Dipanggil saat suara sedang mengalir (belum final)
    const handleInterimChunk = useCallback((interimText) => {
      interimTextRef.current = interimText;
      syncDisplayText();
    }, []);

    const {
      isListening,
      error,
      startListening,
      stopListening,
      resetTranscript,
    } = useSpeechRecognition("id-ID", handleFinalChunk, handleInterimChunk);

    const openVoiceModal = useCallback(() => {
      resetTranscript();
      baseTextRef.current = "";
      interimTextRef.current = "";
      setEditableText("");
      setIsModalOpen(true);
      setTimeout(() => {
        startListening();
      }, 250);
    }, [resetTranscript, startListening]);

    const closeVoiceModal = useCallback(() => {
      stopListening();
      resetTranscript();
      baseTextRef.current = "";
      interimTextRef.current = "";
      setEditableText("");
      setIsModalOpen(false);
    }, [stopListening, resetTranscript]);

    useImperativeHandle(ref, () => ({
      startListening: openVoiceModal,
      openVoiceModal,
      closeVoiceModal,
    }));

    const handleReset = () => {
      baseTextRef.current = "";
      interimTextRef.current = "";
      setEditableText("");
      resetTranscript();
      setTimeout(() => {
        startListening();
      }, 150);
    };

    const handleToggleListening = () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    };

    const handleTextChange = (e) => {
      const val = e.target.value;
      baseTextRef.current = val;
      interimTextRef.current = "";
      setEditableText(val);

      if (isListening) {
        stopListening();
      }
    };

    const handleProcessWithAi = () => {
      const finalTranscript = editableText.trim();
      if (!finalTranscript) return;

      stopListening();
      setIsModalOpen(false);

      if (onSpeechComplete) {
        onSpeechComplete(finalTranscript);
      }

      baseTextRef.current = "";
      interimTextRef.current = "";
      setEditableText("");
    };

    return (
      <>
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
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                {isListening ? (
                  <>
                    <span className="badge bg-danger d-inline-flex align-items-center gap-1 px-2 py-1">
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
                        ? "Mikrofon dijeda. Anda dapat mengedit teks atau klik 'Lanjut Bicara'."
                        : "Klik 'Lanjut Bicara' untuk mulai merekam suara."}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                onClick={handleReset}
                disabled={!editableText.trim()}
                title="Hapus rekaman saat ini dan mulai dari awal"
              >
                <span>🔄</span>
                <span>Reset Suara</span>
              </button>
            </div>

            <div className="mb-2">
              <textarea
                className="form-control p-3 rounded shadow-sm"
                rows={6}
                value={editableText}
                onChange={handleTextChange}
                placeholder="🎙️ Ucapan Anda akan muncul di sini secara langsung. Anda juga bisa mengedit atau mengetik langsung jika ada kata yang kurang pas..."
                style={{
                  minHeight: "200px",
                  maxHeight: "320px",
                  fontSize: "1.25rem",
                  lineHeight: "1.8",
                  backgroundColor: isListening ? "#fffdfd" : "#ffffff",
                  borderColor: isListening ? "#dc3545" : "#ced4da",
                  boxShadow: isListening
                    ? "0 0 0 0.2rem rgba(220, 53, 69, 0.15)"
                    : undefined,
                }}
              />
            </div>

            <div className="d-flex justify-content-between align-items-center text-muted small px-1">
              <span>
                ✍️ <em>Teks di atas dapat diedit atau diketik langsung.</em>
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
