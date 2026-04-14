import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCamera, IconFaceIdError, IconKeyboard, IconRefresh, IconX } from '@tabler/icons-react';
import { Button, Group, Loader, Stack, Text } from '@mantine/core';

import Api from '@/Api';
import IconButtonLink from '@/components/IconButtonLink';

import classes from './IdScanner.module.css';

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
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const displayAspect = displayW / displayH;
    const videoAspect = videoW / videoH;

    // Compute the visible region of the video (object-fit: cover crops the overflow)
    let visX = 0;
    let visY = 0;
    let visW = videoW;
    let visH = videoH;

    if (videoAspect > displayAspect) {
      visW = videoH * displayAspect;
      visX = (videoW - visW) / 2;
    } else {
      visH = videoW / displayAspect;
      visY = (videoH - visH) / 2;
    }

    // Viewfinder rect in display coordinates (matches CSS: inset-inline 24px, top 50%, translateY(-60%), aspect-ratio 1.586)
    const INSET = 16; // mirrored in IdScanner.module.css as .viewfinder inset-inline
    const ASPECT = 1.586;
    const vfDisplayW = displayW - INSET * 2;
    const vfDisplayH = vfDisplayW / ASPECT;
    const vfDisplayX = INSET;
    const vfDisplayY = displayH / 2 - vfDisplayH * 0.6;

    // Map viewfinder display coordinates to video source coordinates
    const scaleX = visW / displayW;
    const scaleY = visH / displayH;
    const cropX = visX + vfDisplayX * scaleX;
    const cropY = visY + vfDisplayY * scaleY;
    const cropW = vfDisplayW * scaleX;
    const cropH = vfDisplayH * scaleY;

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
      setError('Couldn\u2019t read the ID');
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

  const showLiveCamera = cameraActive && !capturedImage;

  return (
    <div className={classes.root}>
      {/* Camera feed — fills the entire background */}
      {cameraActive && !capturedImage && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={classes.video}
        />
      )}

      {/* Captured preview — overlays the video */}
      {capturedImage && (
        <img src={capturedImage} alt='Captured ID' className={classes.preview} />
      )}

      {/* Viewfinder cutout overlay — only shown during live camera without error */}
      {showLiveCamera && (
        <div className={classes.viewfinder} />
      )}

      {/* Loading state while camera starts */}
      {!cameraActive && !capturedImage && !error && (
        <div className={classes.processingOverlay}>
          <Stack align='center' gap='md'>
            <Loader size='lg' color='white' />
            <Text c='gray.5'>Starting camera...</Text>
          </Stack>
        </div>
      )}

      {/* Processing indicator — shown below the preview image */}
      {processing && (
        <div className={classes.processingBanner}>
          <Group gap='xs' justify='center'>
            <Loader size='sm' color='teal' />
            <Text c='teal.4' fw={600}>Extracting details…</Text>
          </Group>
        </div>
      )}

      {/* Error banner — shown below where the preview was */}
      {error && showLiveCamera && (
        <div className={classes.processingBanner}>
          <Group gap='xs' justify='center'>
            <IconFaceIdError size={20} color='var(--mantine-color-red-4)' />
            <Text c='red.4' fw={600}>{error}</Text>
          </Group>
        </div>
      )}

      {/* Header */}
      <div className={classes.header}>
        <Group justify='flex-end'>
          <IconButtonLink
            variant='primary'
            color='dark.5'
            icon={IconX}
            onClick={handleClose}
          />
        </Group>
        {showLiveCamera && !error && (
          <Text c='white' size='lg' fw={600} ta='center' mt='md'>Place the ID inside the frame</Text>
        )}
      </div>

      {/* Footer with action buttons */}
      <div className={classes.footer}>
        {showLiveCamera && !error && (
          <Button size='lg' fullWidth leftSection={<IconCamera size={18} />} onClick={capture}>
            Capture
          </Button>
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

        {error && showLiveCamera && (
          <Group grow w='100%'>
            <Button
              size='lg'
              leftSection={<IconCamera size={18} />}
              onClick={() => { setError(null); capture(); }}
            >
              Try again
            </Button>
            <Button
              variant='light'
              size='lg'
              leftSection={<IconKeyboard size={18} />}
              onClick={handleClose}
            >
              Enter manually
            </Button>
          </Group>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default IdScanner;
