import { useState, useEffect, useRef, useCallback } from "react";

export const useSpeechRecognition = (
  language = "id-ID",
  onSpeech,
  onSessionEnd,
) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);

  const onSpeechRef = useRef(onSpeech);
  const onSessionEndRef = useRef(onSessionEnd);

  useEffect(() => {
    onSpeechRef.current = onSpeech;
  }, [onSpeech]);

  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      // Rekonstruksi transkrip sesi aktif secara langsung tanpa akumulasi berulang
      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalTranscript += item + " ";
        } else {
          interimTranscript += item;
        }
      }

      const sessionText = (finalTranscript + " " + interimTranscript)
        .trim()
        .replace(/\s+/g, " ");

      if (onSpeechRef.current && sessionText) {
        onSpeechRef.current(sessionText);
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
      // Simpan hasil sesi sebelumnya sebelum restart
      if (onSessionEndRef.current) {
        onSessionEndRef.current();
      }

      // Auto-restart jika masih dalam mode aktif mendengarkan (mengatasi auto-disconnect Chrome Mobile)
      if (shouldListenRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {}
          }
        }, 150);
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
