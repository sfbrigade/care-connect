import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/**
 * Hook for Web Speech API speech-to-text (segmented mode).
 *
 * Each call to `start()` begins a single recognition segment. Recognition
 * ends naturally when the user pauses, delivering the transcript via
 * `onTranscript`. The user taps the mic again for the next segment.
 *
 * No auto-restart — works with Android Chrome's single-utterance behavior
 * instead of fighting it.
 *
 * @param {object} options
 * @param {function} [options.onError] - Called with user-friendly error message
 * @param {function} [options.onTranscript] - Called with each finalized utterance string
 * @returns {{ isListening: boolean, isSupported: boolean, liveText: string, start: function, stop: function }}
 */
export function useSpeechRecognition ({ onError, onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const recognitionRef = useRef(null);
  const onErrorRef = useRef(onError);
  const onTranscriptRef = useRef(onTranscript);
  const pendingTranscriptRef = useRef('');

  onErrorRef.current = onError;
  onTranscriptRef.current = onTranscript;

  const start = useCallback(() => {
    if (!SpeechRecognition) return;

    // Abort any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const text = latest[0].transcript.trim();
      if (text) {
        pendingTranscriptRef.current = text;
        setLiveText(text);
      }
    };

    recognition.onerror = (event) => {
      const messages = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found. Please check your device.',
        'not-allowed': 'Microphone permission denied. Please allow access in your browser settings.',
        network: 'Network error. Please check your connection.',
      };
      const message = messages[event.error] || `Speech recognition error: ${event.error}`;

      if (event.error === 'aborted') return;

      onErrorRef.current?.(message);
      setIsListening(false);
      setLiveText('');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (pendingTranscriptRef.current) {
        onTranscriptRef.current?.(pendingTranscriptRef.current);
        pendingTranscriptRef.current = '';
      }
      setIsListening(false);
      setLiveText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    pendingTranscriptRef.current = '';
    setIsListening(true);
    setLiveText('');
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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
    liveText,
    start,
    stop,
  };
}
