/* global MediaRecorder, AudioContext */
import { useRef, useState } from 'react';
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react';
import { ActionIcon, Group, Loader, Text } from '@mantine/core';

import Api from '@/Api';
import AudioWaveform from '@/components/AudioWaveform';

const TARGET_SAMPLE_RATE = 16000;

function downsampleToInt16 (audioBuffer) {
  // Take the first channel, downsample to TARGET_SAMPLE_RATE, convert to 16-bit PCM
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

function AudioRecorder ({ onResult, disabled }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStream, setActiveStream] = useState(null);

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
    } catch (err) {
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
      // Decode browser audio to raw PCM
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();

      const pcmData = downsampleToInt16(audioBuffer);
      const base64 = int16ToBase64(pcmData);

      const response = await Api.ai.transcribe(base64, 'audio/pcm');
      onResult(response.data.text);
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Transcription failed. Try again.');
    } finally {
      setProcessing(false);
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
    <Group gap='xs'>
      {recording
        ? (
          <>
            <ActionIcon
              variant='filled'
              color='red'
              size='xl'
              radius='xl'
              onClick={stopRecording}
              disabled={disabled}
            >
              <IconPlayerStop size={24} />
            </ActionIcon>
            <AudioWaveform stream={activeStream} />
          </>
          )
        : (
          <ActionIcon
            variant='filled'
            color='blue'
            size='xl'
            radius='xl'
            onClick={startRecording}
            disabled={disabled}
          >
            <IconMicrophone size={24} />
          </ActionIcon>
          )}
      {error && <Text c='red' size='sm'>{error}</Text>}
    </Group>
  );
}

export default AudioRecorder;
