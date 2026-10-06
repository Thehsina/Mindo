import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useVoiceInput hook
 * Provides clean abstraction over Web Speech API for speech-to-text.
 * Voice input populates text input for user review/editing before submission.
 */
export function useVoiceInput({ onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Voice input isn't supported in this browser. You can still type your command.");
      return;
    }

    try {
      if (recognitionRef.current) {
        stopListening();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = window.navigator.language || "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        if (currentTranscript && onTranscript) {
          onTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);

        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            setError("Microphone access is needed for voice input.");
            break;
          case "no-speech":
            setError("I didn't hear anything. Try again.");
            break;
          case "audio-capture":
            setError("No microphone was found on your device.");
            break;
          case "aborted":
            break;
          default:
            setError("Couldn't capture your voice. Try again or type instead.");
            break;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      setError("Couldn't capture your voice. Try again or type instead.");
    }
  }, [onTranscript, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    setError,
  };
}
