import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/**
 * Hook for Web Speech API speech-to-text with live interim results.
 *
 * Uses continuous=false + interimResults=true for cross-platform consistency
 * (Android & iOS). The hook manages a live `transcript` that updates as the
 * user speaks. When recognition ends, `isListening` flips to false but
 * `transcript` is preserved — the consumer should read it, commit it, then
 * call `resetTranscript()`.
 *
 * @param {object} options
 * @param {function} [options.onError] - Called with user-friendly error message
 * @returns {{ isListening: boolean, isSupported: boolean, transcript: string, resetTranscript: function, start: function, stop: function }}
 */
export function useSpeechRecognition ({ onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const onErrorRef = useRef(onError);

  onErrorRef.current = onError;

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;

    // Abort any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    // Reset transcript for new session
    transcriptRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      text = text.trim();
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      const messages = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found. Please check your device.',
        'not-allowed': 'Microphone permission denied. Please allow access in your browser settings.',
        network: 'Network error. Please check your connection.',
      };
      const message = messages[event.error] || `Speech recognition error: ${event.error}`;

      // 'aborted' is expected when we call abort() — don't surface it
      if (event.error !== 'aborted') {
        onErrorRef.current?.(message);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Don't reset transcript — let the consumer read and commit it first
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported: !!SpeechRecognition,
    transcript,
    resetTranscript,
    start,
    stop,
  };
}
