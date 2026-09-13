import { useState, useEffect, useRef, useCallback } from "react";

export const useSpeechRecognition = (language = "id-ID") => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const isListeningRef = useRef(false);

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
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += piece;
        } else {
          interimTranscript += piece;
        }
      }

      const currentFull = (finalTranscript + " " + interimTranscript).trim();
      transcriptRef.current = currentFull;
      setText(currentFull);
    };

    recognition.onerror = (event) => {
      // "aborted" and "no-speech" are expected during normal user cancellations or pauses
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
        setError(event.error);
      }
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
        isListeningRef.current = false;
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    setText("");
    transcriptRef.current = "";
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
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Speech recognition stop warning:", err);
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
    return transcriptRef.current;
  }, []);

  const resetTranscript = useCallback(() => {
    setText("");
    transcriptRef.current = "";
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
    text,
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
    latestText: transcriptRef.current,
  };
};
