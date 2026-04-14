import { useCallback, useEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconRefresh, IconX } from '@tabler/icons-react';
import { Box, Button, Group, Image, Loader, Modal, Stack, Text } from '@mantine/core';

import Api from '@/Api';

function IdScanner ({ opened, onResult, onClose }) {
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

  useEffect(() => {
    if (opened) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [opened]);

  async function startCamera () {
    setError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
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

    const displayW = video.clientWidth;
    const displayH = video.clientHeight;
    const displayAspect = displayW / displayH;
    const videoAspect = video.videoWidth / video.videoHeight;

    let cropX = 0;
    let cropY = 0;
    let cropW = video.videoWidth;
    let cropH = video.videoHeight;

    if (videoAspect > displayAspect) {
      cropW = video.videoHeight * displayAspect;
      cropX = (video.videoWidth - cropW) / 2;
    } else {
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
      handleClose();
    } catch {
      setError('Could not read ID. Try again with better lighting.');
      setCapturedImage(null);
      startCamera();
    } finally {
      setProcessing(false);
    }
  }

  function retake () {
    setCapturedImage(null);
    setError(null);
    startCamera();
  }

  function handleClose () {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setProcessing(false);
    onClose();
  }

  if (!opened) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      closeOnClickOutside={false}
      styles={{
        content: {
          background: '#000',
        },
        body: {
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box px='md' pt='xl' pb='sm'>
        <Group justify='space-between'>
          <Button variant='subtle' c='white' p={0} onClick={handleClose}>
            <IconArrowLeft size={24} />
          </Button>
          <Button variant='subtle' c='white' p={0} onClick={handleClose}>
            <IconX size={24} />
          </Button>
        </Group>
        <Stack gap={4} mt='md' align='center'>
          <Text c='white' size='lg' fw={600}>Place the ID inside the frame</Text>
          <Text c='gray.5' size='sm'>The image will not be saved</Text>
        </Stack>
      </Box>

      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {cameraActive && !capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {capturedImage && (
          <Box pos='relative' w='100%' h='100%' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src={capturedImage} alt='Captured ID' style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            {processing && (
              <Box
                pos='absolute'
                top={0}
                left={0}
                right={0}
                bottom={0}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
              >
                <Group gap='xs'>
                  <Loader size='sm' color='teal' />
                  <Text c='teal.4' fw={600}>Extracting details</Text>
                </Group>
              </Box>
            )}
          </Box>
        )}
        {!cameraActive && !capturedImage && (
          <Stack align='center' gap='md'>
            <Loader size='lg' color='white' />
            <Text c='gray.5'>Starting camera...</Text>
          </Stack>
        )}
      </Box>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Box px='md' pb='xl' pt='sm'>
        {error && <Text c='red.4' size='sm' ta='center' mb='sm'>{error}</Text>}

        {!capturedImage && cameraActive && (
          <Stack gap='xs' align='center'>
            <Text c='gray.5' size='sm'>Is the photo clear enough to use?</Text>
            <Button size='lg' fullWidth onClick={capture}>
              Capture
            </Button>
          </Stack>
        )}

        {capturedImage && !processing && (
          <Stack gap='xs' align='center'>
            <Text c='gray.5' size='sm'>Is the photo clear enough to use?</Text>
            <Group grow w='100%'>
              <Button
                variant='light'
                size='lg'
                leftSection={<IconRefresh size={18} />}
                onClick={retake}
              >
                Retake
              </Button>
              <Button size='lg' onClick={submitCapture}>
                Use photo
              </Button>
            </Group>
          </Stack>
        )}
      </Box>
    </Modal>
  );
}

export default IdScanner;
