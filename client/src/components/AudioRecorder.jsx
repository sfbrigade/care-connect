/* global MediaRecorder, AudioContext */
import { useRef, useState } from 'react';
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react';
import { Button, Group, Loader, Text } from '@mantine/core';

import Api from '@/Api';
import AudioWaveform from '@/components/AudioWaveform';

const TARGET_SAMPLE_RATE = 16000;

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

function AudioRecorder ({ onResult, onBusyChange, disabled }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStream, setActiveStream] = useState(null);

  function setBusy (busy) {
    onBusyChange?.(busy);
  }

  async function startRecording () {
    setError(null);
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
    } catch {
      setError('Could not access microphone. Check permissions.');
    }
  }

  function stopRecording () {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
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

      const response = await Api.ai.transcribe(base64, 'audio/pcm');
      onResult(response.data.text);
      setError(null);
    } catch {
      setError('Transcription failed. Try again.');
    } finally {
      setProcessing(false);
      setBusy(false);
    }
  }

  if (processing) {
    return (
      <Group gap='xs'>
        <Loader size='sm' />
        <Text size='sm' c='dimmed'>Transcribing...</Text>
      </Group>
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
            </>
            )
          : (
            <Button
              variant='light'
              leftSection={<IconMicrophone size={18} />}
              onClick={startRecording}
              disabled={disabled}
            >
              Record
            </Button>
            )}
      </Group>
      {error && <Text c='red' size='sm' mt='xs'>{error}</Text>}
    </>
  );
}

export default AudioRecorder;
