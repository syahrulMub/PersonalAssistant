import { useState, useEffect, useRef, useCallback } from "react";

export const useSpeechRecognition = (
  language = "id-ID",
  onFinalChunk,
  onInterimChunk,
) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);

  const onFinalChunkRef = useRef(onFinalChunk);
  const onInterimChunkRef = useRef(onInterimChunk);

  useEffect(() => {
    onFinalChunkRef.current = onFinalChunk;
  }, [onFinalChunk]);

  useEffect(() => {
    onInterimChunkRef.current = onInterimChunk;
  }, [onInterimChunk]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Browser tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau Microsoft Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    // continuous = false mencegah bug duplikasi kata di Android Chrome
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalTranscript += item;
        } else {
          interimTranscript += item;
        }
      }

      // Kirim hasil final untuk dikunci ke base text
      if (finalTranscript.trim() && onFinalChunkRef.current) {
        onFinalChunkRef.current(finalTranscript.trim());
      }

      // Kirim preview sementara saat pengguna sedang berbicara
      if (onInterimChunkRef.current) {
        onInterimChunkRef.current(interimTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldListenRef.current = false;
        setIsListening(false);
        setError("Izin mikrofon ditolak atau tidak didukung di browser ini.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      // Bersihkan preview interim saat satu hembusan kalimat selesai
      if (onInterimChunkRef.current) {
        onInterimChunkRef.current("");
      }

      // Sambung otomatis ke kalimat berikutnya tanpa menduplikasi data lama
      if (shouldListenRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {}
          }
        }, 80);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    setError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
