import { useState, useEffect, useRef, useCallback } from "react";

export const useSpeechRecognition = (
  language = "id-ID",
  onSpeech,
  onSessionEnd,
) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const shouldListenRef = useRef(false);
  const restartTimeoutRef = useRef(null);

  const onSpeechRef = useRef(onSpeech);
  useEffect(() => {
    onSpeechRef.current = onSpeech;
  }, [onSpeech]);

  const onSessionEndRef = useRef(onSessionEnd);
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Browser tidak mendukung Web Speech API. Gunakan Google Chrome atau Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          // Di Chrome Mobile / Android, hasil interim ditambahkan sebagai snapshot lengkap dari kalimat berjalan.
          // Jangan gunakan += karena akan menduplikasi kata-kata. Ambil snapshot paling mutakhir.
          interimTranscript = result[0].transcript;
        }
      }

      const sessionFull = (finalTranscript + " " + interimTranscript)
        .trim()
        .replace(/\s+/g, " ");

      if (onSpeechRef.current && sessionFull) {
        onSpeechRef.current(sessionFull);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldListenRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        setError("Izin mikrofon ditolak atau tidak didukung di browser ini.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;

      // Beritahu consumer untuk commit teks sesi yang baru selesai
      if (onSessionEndRef.current) {
        onSessionEndRef.current();
      }

      // Jika user masih dalam mode mendengarkan (kasus Chrome Mobile yang sering memutus audio saat jeda napas),
      // otomatis sambung kembali sesi perekaman tanpa mematikan status UI.
      if (shouldListenRef.current) {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        restartTimeoutRef.current = setTimeout(() => {
          if (
            shouldListenRef.current &&
            recognitionRef.current &&
            !isListeningRef.current
          ) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
              isListeningRef.current = true;
            } catch (err) {
              console.warn("Speech recognition auto-restart warning:", err);
              setTimeout(() => {
                if (
                  shouldListenRef.current &&
                  recognitionRef.current &&
                  !isListeningRef.current
                ) {
                  try {
                    recognitionRef.current.start();
                    setIsListening(true);
                    isListeningRef.current = true;
                  } catch (e) {
                    setIsListening(false);
                    isListeningRef.current = false;
                  }
                }
              }, 250);
            }
          }
        }, 120);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
        isListeningRef.current = false;
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    setError(null);
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (err) {
        console.warn("Speech recognition start warning:", err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Speech recognition stop warning:", err);
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn("Speech recognition abort warning:", err);
      }
      setIsListening(false);
      isListeningRef.current = false;
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
