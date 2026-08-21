import { useRef, useState } from 'react';
import { ActionIcon, Box, Button, Group, Loader, Text } from '@mantine/core';
import { IconMicrophone, IconPlayerStop, IconX } from '@tabler/icons-react';

import Api from '@/Api';
import AudioWaveform from '@/components/AudioWaveform';

const TARGET_SAMPLE_RATE = 16000;
const MAX_RECORDING_SECONDS = 180;

function downsampleToInt16 (audioBuffer) {
  const inputData = audioBuffer.getChannelData(0);
  const ratio = audioBuffer.sampleRate / TARGET_SAMPLE_RATE;
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
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Compact mic button for the Location field. When tapped, records audio,
 * transcribes via /api/ai/transcribe?mode=location, and calls onResult with
 * the structured response { text, matches, parsed }.
 */
function LocationVoiceButton ({ onResult, disabled, size = 'lg' }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording () {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      // eslint-disable-next-line no-undef
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setActiveStream(null);

        const blob = new Blob(chunksRef.current);
        await processAudio(blob);
      };
      recorder.start();
      setActiveStream(stream);
      setRecording(true);

      // Hard stop at max seconds.
      setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
          setRecording(false);
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      setError('Could not access microphone.');
    }
  }

  function stopRecording () {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setRecording(false);
    }
  }

  async function processAudio (blob) {
    setProcessing(true);
    try {
      const arrayBuffer = await blob.arrayBuffer();
      // eslint-disable-next-line no-undef
      const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();
      const pcm = downsampleToInt16(audioBuffer);
      const base64 = int16ToBase64(pcm);
      const response = await Api.ai.transcribe(base64, 'audio/pcm', { mode: 'location' });
      const text = (response.data.text || '').trim();
      if (!text) {
        setError('No speech detected.');
        return;
      }
      onResult(response.data);
    } catch {
      setError('Transcription failed.');
    } finally {
      setProcessing(false);
    }
  }

  if (processing) {
    return <Loader size={size === 'lg' ? 'sm' : 'xs'} />;
  }

  if (recording) {
    return (
      <Box>
        <Group gap='xs' wrap='nowrap'>
          <ActionIcon variant='filled' color='red' size={size} onClick={stopRecording} aria-label='Stop recording'>
            <IconPlayerStop size={18} />
          </ActionIcon>
          <AudioWaveform stream={activeStream} />
        </Group>
      </Box>
    );
  }

  return (
    <>
      <ActionIcon
        variant='subtle'
        size={size}
        onClick={startRecording}
        disabled={disabled}
        aria-label='Speak cross-streets'
      >
        <IconMicrophone size={20} />
      </ActionIcon>
      {error && <Text c='red' size='xs' mt={4}>{error}</Text>}
    </>
  );
}

/**
 * Inline confirmation UI shown after voice transcription. Surfaces the heard
 * text and up to N candidate matches; tapping one commits to the form via the
 * provided callback.
 */
export function LocationConfirmationChip ({ result, onPick, onDismiss }) {
  if (!result) return null;
  const { text, matches, parsed } = result;
  if (!matches || matches.length === 0) {
    return (
      <Box mt='xs' p='xs' style={{ border: '1px solid var(--mantine-color-orange-3)', borderRadius: 4, background: 'var(--mantine-color-orange-0)' }}>
        <Text size='sm'>
          Heard: <strong>“{text}”</strong>
        </Text>
        <Text size='xs' c='dimmed' mt={4}>
          {parsed
            ? 'Couldn\'t match those streets — try typing the intersection instead.'
            : 'Didn\'t sound like a cross-street — try typing it instead.'}
        </Text>
        <Button size='xs' variant='subtle' mt='xs' onClick={onDismiss} leftSection={<IconX size={14} />}>Dismiss</Button>
      </Box>
    );
  }
  const prompt = matches.length === 1 ? 'Tap to confirm:' : 'Did you mean:';
  return (
    <Box mt='xs' p='xs' style={{ border: '1px solid var(--mantine-color-blue-3)', borderRadius: 4, background: 'var(--mantine-color-blue-0)' }}>
      <Text size='sm'>
        Heard: <strong>“{text}”</strong>. {prompt}
      </Text>
      <Group gap='xs' mt='xs' wrap='wrap'>
        {matches.slice(0, 4).map((m) => (
          <Button key={m.cnn} size='xs' variant='light' onClick={() => onPick(m)}>
            {m.label}
          </Button>
        ))}
        <ActionIcon variant='subtle' color='gray' size='sm' onClick={onDismiss} aria-label='Dismiss'>
          <IconX size={14} />
        </ActionIcon>
      </Group>
    </Box>
  );
}

export default LocationVoiceButton;
