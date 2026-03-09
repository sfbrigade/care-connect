import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/**
 * Hook for Web Speech API speech-to-text.
 *
 * Android Chrome ignores `continuous` and ends recognition after each
 * utterance, so this hook auto-restarts on `onend` to keep the mic open
 * until the user explicitly calls `stop()`. Each utterance is delivered
 * via the `onTranscript` callback so the consumer can accumulate text.
 *
 * `isListening` stays true across auto-restarts and only flips to false
 * when the user calls `stop()` or an error occurs.
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
  const wantListeningRef = useRef(false);
  const onErrorRef = useRef(onError);
  const onTranscriptRef = useRef(onTranscript);
  const pendingTranscriptRef = useRef('');

  onErrorRef.current = onError;
  onTranscriptRef.current = onTranscript;

  const createRecognition = useCallback(() => {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      // Only read the latest result. On Android in continuous mode, each new
      // final result contains the full cumulative transcript, so concatenating
      // all results causes duplication.
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

      // 'aborted' is expected when we call abort() — don't surface it.
      // 'no-speech' is expected during auto-restart gaps — don't stop listening.
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
      onErrorRef.current?.(message);
      wantListeningRef.current = false;
      setIsListening(false);
      setLiveText('');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Commit any pending transcript from this utterance
      if (pendingTranscriptRef.current) {
        onTranscriptRef.current?.(pendingTranscriptRef.current);
        pendingTranscriptRef.current = '';
        setLiveText('');
      }

      if (wantListeningRef.current) {
        // Android ended recognition after one utterance — auto-restart
        // to keep the mic open until the user presses stop.
        // Delay to let Android fully release the audio resource; restarting
        // immediately causes the new instance to be aborted.
        setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            const next = createRecognition();
            recognitionRef.current = next;
            next.start();
          } catch (e) {
            wantListeningRef.current = false;
            setIsListening(false);
            setLiveText('');
            recognitionRef.current = null;
          }
        }, 50);
      } else {
        setIsListening(false);
        setLiveText('');
        recognitionRef.current = null;
      }
    };

    return recognition;
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;

    // Abort any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    pendingTranscriptRef.current = '';
    wantListeningRef.current = true;
    setIsListening(true);
    setLiveText('');

    const recognition = createRecognition();
    recognitionRef.current = recognition;
    recognition.start();
  }, [createRecognition]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
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
