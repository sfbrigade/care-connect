import { useCallback, useRef, useState } from 'react';
import { IconCamera, IconRefresh, IconX } from '@tabler/icons-react';
import { ActionIcon, Box, Button, Group, Image, Loader, Stack, Text } from '@mantine/core';

import Api from '@/Api';

function IdScanner ({ onResult, onCancel }) {
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const videoNodeRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useCallback((node) => {
    videoNodeRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  async function startCamera () {
    setError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      setError('Could not access camera. Check permissions.');
    }
  }

  function stopCamera () {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoNodeRef.current) {
      videoNodeRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  function capture () {
    if (!videoNodeRef.current || !canvasRef.current) return;

    const video = videoNodeRef.current;
    const canvas = canvasRef.current;

    // Capture what the user sees: the video is displayed with objectFit: 'cover'
    // in a container that matches the screen width with a fixed aspect ratio.
    // We need to crop the video frame to match.
    const displayW = video.clientWidth;
    const displayH = video.clientHeight;
    const displayAspect = displayW / displayH;
    const videoAspect = video.videoWidth / video.videoHeight;

    let cropX = 0;
    let cropY = 0;
    let cropW = video.videoWidth;
    let cropH = video.videoHeight;

    if (videoAspect > displayAspect) {
      // Video is wider than display — crop sides
      cropW = video.videoHeight * displayAspect;
      cropX = (video.videoWidth - cropW) / 2;
    } else {
      // Video is taller than display — crop top/bottom
      cropH = video.videoWidth / displayAspect;
      cropY = (video.videoHeight - cropH) / 2;
    }

    canvas.width = cropW;
    canvas.height = cropH;
    canvas.getContext('2d').drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();
    setCapturedImage(dataUrl);
  }

  async function submitCapture () {
    if (!capturedImage) return;

    const base64 = capturedImage.split(',')[1];
    setProcessing(true);
    setError(null);

    try {
      const response = await Api.ai.parseId(base64, 'image/jpeg');
      onResult(response.data);
    } catch (err) {
      console.error('ID parse error:', err);
      setError('Could not read ID. Try again with better lighting.');
      setCapturedImage(null);
    } finally {
      setProcessing(false);
    }
  }

  function retake () {
    setCapturedImage(null);
    startCamera();
  }

  function handleCancel () {
    stopCamera();
    setCapturedImage(null);
    onCancel();
  }

  if (processing) {
    return (
      <Stack align='center' gap='md' py='xl'>
        <Loader size='lg' />
        <Text c='dimmed'>Reading ID...</Text>
      </Stack>
    );
  }

  if (capturedImage) {
    return (
      <Stack gap='sm'>
        <Box style={{ borderRadius: 8, overflow: 'hidden' }}>
          <Image src={capturedImage} alt='Captured ID' style={{ width: '100%', display: 'block' }} />
        </Box>
        <Text size='sm' c='dimmed' ta='center'>Is the text on the ID clear and readable?</Text>
        <Group grow>
          <Button
            variant='light'
            size='lg'
            leftSection={<IconRefresh size={18} />}
            onClick={retake}
          >
            Retake
          </Button>
          <Button size='lg' onClick={submitCapture}>
            Use this photo
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap='sm'>
      {cameraActive
        ? (
          <>
            <Box pos='relative' style={{ borderRadius: 8, overflow: 'hidden', background: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block', height: '35vh', objectFit: 'cover' }}
              />
              <ActionIcon
                variant='filled'
                color='dark'
                size='lg'
                pos='absolute'
                top={8}
                right={8}
                onClick={handleCancel}
              >
                <IconX size={18} />
              </ActionIcon>
            </Box>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <Group grow>
              <Button size='lg' onClick={capture}>
                Capture
              </Button>
            </Group>
          </>
          )
        : (
          <Button
            leftSection={<IconCamera size={20} />}
            size='lg'
            onClick={startCamera}
            fullWidth
          >
            Scan ID with camera
          </Button>
          )}
      {error && <Text c='red' size='sm'>{error}</Text>}
    </Stack>
  );
}

export default IdScanner;
