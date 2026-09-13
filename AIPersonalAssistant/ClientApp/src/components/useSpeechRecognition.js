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
  const sessionFinalRef = useRef(""); // Menyimpan final text khusus di sesi aktif berjalan

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
      sessionFinalRef.current = "";
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      // Mulai dari event.resultIndex untuk mencegah duplikasi token di Android & Desktop
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          sessionFinalRef.current += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      const fullSessionText = (
        sessionFinalRef.current +
        " " +
        interimTranscript
      )
        .trim()
        .replace(/\s+/g, " ");

      if (onSpeechRef.current && fullSessionText) {
        onSpeechRef.current(fullSessionText);
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
      // Notifikasi ke consumer untuk mengunci teks sesi sebelumnya
      if (onSessionEndRef.current) {
        onSessionEndRef.current();
      }

      sessionFinalRef.current = "";

      // Sambung otomatis jika user masih dalam mode mendengarkan (mengatasi auto-stop di Chrome Mobile)
      if (shouldListenRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Abaikan jika recognition sudah dalam status running
            }
          }
        }, 200);
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
    sessionFinalRef.current = "";

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Recognition mungkin sedang aktif
      }
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
    sessionFinalRef.current = "";
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
