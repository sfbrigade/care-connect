/* global MediaRecorder, AudioContext */
import { useEffect, useRef, useState } from 'react';
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react';
import { Button, Group, Loader, Text } from '@mantine/core';

import Api from '@/Api';
import AudioWaveform from '@/components/AudioWaveform';

const TARGET_SAMPLE_RATE = 16000;
const MAX_RECORDING_SECONDS = 180;
const WARNING_SECONDS = 150;
const URGENT_SECONDS = 170;

function downsampleToInt16 (audioBuffer) {
  const inputData = audioBuffer.getChannelData(0);
  const inputRate = audioBuffer.sampleRate;
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sample = inputData[Math.floor(i * ratio)];
    output[i] = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
  }

  return output;
}

function int16ToBase64 (int16Array) {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function formatTimer (seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioRecorder ({ onResult, onBusyChange, disabled, mode = 'narrative', recordLabel }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  function setBusy (busy) {
    onBusyChange?.(busy);
  }

  function stopRecording () {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  useEffect(() => {
    if (recording && elapsed >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [elapsed, recording]);

  async function startRecording () {
    setError(null);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setActiveStream(null);
        const blob = new Blob(chunksRef.current);
        await processAudio(blob);
      };

      mediaRecorder.start();
      setActiveStream(stream);
      setRecording(true);
      setBusy(true);

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } catch {
      setError('Could not access microphone. Check permissions.');
    }
  }

  async function processAudio (blob) {
    setProcessing(true);
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();

      const pcmData = downsampleToInt16(audioBuffer);
      const base64 = int16ToBase64(pcmData);

      const response = await Api.ai.transcribe(base64, 'audio/pcm', { mode });
      const text = (response.data.text || '').trim();
      if (!text) {
        setError('No speech detected. Try again.');
        return;
      }
      if (mode === 'location') {
        onResult(response.data);
      } else {
        onResult(text);
      }
      setError(null);
    } catch {
      setError('Transcription failed. Try again.');
    } finally {
      setProcessing(false);
      setBusy(false);
    }
  }

  let timerColor;
  if (elapsed >= URGENT_SECONDS) {
    timerColor = 'red.6';
  } else if (elapsed >= WARNING_SECONDS) {
    timerColor = 'orange.6';
  } else {
    timerColor = 'dimmed';
  }

  if (processing) {
    return (
      <>
        <Group gap='xs'>
          <Button
            variant='light'
            color='gray'
            leftSection={<Loader size={16} />}
            disabled
          >
            Transcribing...
          </Button>
        </Group>
        {error && <Text c='red' size='sm' mt='xs'>{error}</Text>}
      </>
    );
  }

  return (
    <>
      <Group gap='xs'>
        {recording
          ? (
            <>
              <Button
                variant='filled'
                color='red'
                leftSection={<IconPlayerStop size={18} />}
                onClick={stopRecording}
                disabled={disabled}
              >
                Stop
              </Button>
              <AudioWaveform stream={activeStream} />
              <Text size='sm' c={timerColor} fw={elapsed >= WARNING_SECONDS ? 600 : 400}>
                {formatTimer(elapsed)}
              </Text>
            </>
            )
          : (
            <Button
              variant='light'
              leftSection={<IconMicrophone size={18} />}
              onClick={startRecording}
              disabled={disabled}
            >
              {recordLabel ?? 'Record voice'}
            </Button>
            )}
      </Group>
      {error && <Text c='red' size='sm' mt='xs'>{error}</Text>}
    </>
  );
}

export default AudioRecorder;
