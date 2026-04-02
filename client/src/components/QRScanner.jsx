import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Alert, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import PropTypes from 'prop-types';

import classes from './QRScanner.module.css';

/**
 * Detect if running on iOS
 */
function isIOS () {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if browser supports camera access
 */
function isCameraSupported () {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check if running over HTTPS or localhost
 */
function isSecureContext () {
  return window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
}

/** Corner bracket color: white while scanning, green on success, red on error */
const VIEWFINDER_COLOR = {
  idle: '#DEE2E6',
  success: '#12B886',
  error: '#FA5252',
};

/** Full-screen overlay copy below the viewfinder after a scan is validated by the parent */
const FULLSCREEN_SCAN_STATUS_TEXT = {
  success: 'Valid QR code. Person received.',
  error: 'Invalid QR code. Try again.',
};

function Viewfinder ({ error = false, success = false }) {
  const size = 240;
  const len = 50;
  const thickness = 8;
  const radius = 20;
  const color = error
    ? VIEWFINDER_COLOR.error
    : success
      ? VIEWFINDER_COLOR.success
      : VIEWFINDER_COLOR.idle;

  const corner = {
    position: 'absolute',
    width: len,
    height: len,
    borderColor: color,
    borderStyle: 'solid',
    borderWidth: 0,
    transition: 'border-color 150ms ease',
  };

  const inset = thickness;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Inner cutout — bright area is smaller than the corner brackets */}
      <div
        className={classes.viewfinder}
        style={{ position: 'absolute', inset, borderRadius: radius - inset }}
      />
      <div style={{ ...corner, top: 0, left: 0, borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: radius }} />
      <div style={{ ...corner, top: 0, right: 0, borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: radius }} />
      <div style={{ ...corner, bottom: 0, left: 0, borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: radius }} />
      <div style={{ ...corner, bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: radius }} />
    </div>
  );
}

/**
 * QR Code Scanner component
 * Uses device camera to scan QR codes
 * @param {function} onScanSuccess - Callback when QR code is successfully scanned
 * @param {function} onScanError - Callback for scan errors
 * @param {string} className - Additional CSS classes
 * @param {boolean} autoStart - Automatically start scanning when component mounts (iOS will ignore this)
 * @param {boolean} fullScreen - Render as full-screen camera feed with no built-in UI
 * @param {string} prompt - Prompt text beneath the viewfinder (hidden briefly on scan success/error)
 */
export default function QRScanner ({ onScanSuccess, onScanError, className = '', autoStart = false, fullScreen = false, prompt, _debugScanPhase }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showStartButton, setShowStartButton] = useState(true);
  const [scanPhase, setScanPhase] = useState('idle');
  const displayPhase = _debugScanPhase || scanPhase;
  const scannerRef = useRef(null);
  const scannerId = useId().replace(/:/g, '-');
  const html5QrCodeRef = useRef(null);
  const hasStartedRef = useRef(false);
  const pendingRef = useRef(false);
  const lastScannedRef = useRef(null);
  const scannerRunningRef = useRef(false);
  const isIOSDevice = isIOS();

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current && isScanning) {
      const scanner = html5QrCodeRef.current;
      try {
        await scanner.stop();
        scannerRunningRef.current = false;
      } catch (err) {
        // Ignore errors when stopping (e.g., "scanner is not running")
        console.log('Error stopping scanner (ignored):', err.message);
      }
      try {
        await scanner.clear();
      } catch (err) {
        console.log('Error clearing scanner (ignored):', err.message);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }, [isScanning]);

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setShowStartButton(false);

      // Check browser support first
      if (!isCameraSupported()) {
        throw new Error('Camera access is not supported by this browser. Please use a modern browser like Safari, Chrome, or Firefox.');
      }

      // Check secure context (HTTPS or localhost)
      if (!isSecureContext()) {
        throw new Error('Camera access requires HTTPS. Please access this page over HTTPS or from localhost.');
      }

      // Ensure the div exists
      if (!scannerRef.current) {
        throw new Error('Scanner container not found');
      }

      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: isIOSDevice ? 5 : 10,
        disableFlip: false,
      };

      if (!fullScreen) {
        config.qrbox = { width: 250, height: 250 };
        config.aspectRatio = 1.0;
      }

      const onSuccess = async (decodedText) => {
        if (pendingRef.current) return;
        if (fullScreen && lastScannedRef.current === decodedText) return;
        pendingRef.current = true;

        if (fullScreen) {
          lastScannedRef.current = decodedText;
          setScanPhase('pending');

          let succeeded = false;
          try {
            await onScanSuccess?.(decodedText);
            succeeded = true;
          } catch {
            // parent handles error messaging
          }

          setScanPhase(succeeded ? 'success' : 'error');
          setTimeout(() => {
            setScanPhase('idle');
            pendingRef.current = false;
            setTimeout(() => { lastScannedRef.current = null; }, 2000);
          }, succeeded ? 1200 : 800);
        } else {
          try {
            await onScanSuccess?.(decodedText);
            stopScanning();
          } catch {
            pendingRef.current = false;
          }
        }
      };

      const onError = (errorMessage) => {
        const isScanError =
          errorMessage.includes('No QR code found') ||
          errorMessage.includes('NotFoundException') ||
          errorMessage.includes('No multi-format reads') ||
          errorMessage.includes('QR code parse error');

        if (!isScanError) {
          onScanError?.(errorMessage);
        }
      };

      // Try to get available cameras first (more reliable on iOS)
      let cameraId = null;
      try {
        const cameras = await Html5Qrcode.getCameras();
        console.log('Available cameras:', cameras);

        if (cameras && cameras.length > 0) {
          // Try to find back camera (environment facing)
          const backCamera = cameras.find(cam =>
            cam.label.toLowerCase().includes('back') ||
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
          );

          // Use back camera if found, otherwise use first available
          cameraId = backCamera ? backCamera.id : cameras[0].id;
          console.log('Using camera:', cameraId);
        }
      } catch (camError) {
        console.log('Could not get cameras list, using config object:', camError);
        // Fall back to config object approach
      }

      // Try different approaches based on what's available
      try {
        if (cameraId) {
          await html5QrCode.start(cameraId, config, onSuccess, onError);
        } else {
          await html5QrCode.start({ facingMode: 'environment' }, config, onSuccess, onError);
        }
        scannerRunningRef.current = true;
      } catch (cameraError) {
        // If back camera fails, try front camera
        if (cameraId) {
          try {
            const cameras = await Html5Qrcode.getCameras();
            const frontCamera = cameras.find(cam =>
              cam.label.toLowerCase().includes('front') ||
              cam.label.toLowerCase().includes('user')
            );

            if (frontCamera && frontCamera.id !== cameraId) {
              console.log('Retrying with front camera:', frontCamera.id);
              await html5QrCode.start(frontCamera.id, config, onSuccess, onError);
              scannerRunningRef.current = true;
            } else {
              throw cameraError;
            }
          } catch (retryError) {
            throw cameraError;
          }
        } else {
          throw cameraError;
        }
      }
    } catch (err) {
      let errorMsg = err.message || 'Failed to start camera';

      // Provide more helpful error messages
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (errorMsg.includes('NotFoundError')) {
        errorMsg = 'No camera found on this device.';
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('TrackStartError')) {
        errorMsg = 'Camera is already in use by another application.';
      } else if (errorMsg.includes('OverconstrainedError')) {
        errorMsg = 'Camera does not support the requested settings.';
      } else if (errorMsg.includes('streaming not supported')) {
        if (!isSecureContext()) {
          errorMsg = 'Camera streaming requires HTTPS. Please access this page over HTTPS (not HTTP).';
        } else if (!isCameraSupported()) {
          errorMsg = 'Camera streaming is not supported by this browser. Please use Safari, Chrome, or Firefox.';
        } else {
          errorMsg = 'Camera streaming not supported. Please ensure you are using HTTPS and have granted camera permissions.';
        }
      } else if (errorMsg.includes('NotSupportedError') || errorMsg.includes('getUserMedia')) {
        errorMsg = 'Camera access is not supported. Please use HTTPS or try a different browser.';
      } else if (errorMsg.includes('Camera access is not supported by this browser')) {
        // Keep the custom message
      } else if (errorMsg.includes('Camera access requires HTTPS')) {
        // Keep the custom message
      }

      setError(errorMsg);
      setIsScanning(false);
      setShowStartButton(true);
      onScanError?.(errorMsg);
      console.error('QR Scanner error:', err);
    }
  }, [onScanSuccess, onScanError, stopScanning, isIOSDevice, fullScreen, scannerId]);

  // Unconditional cleanup on unmount — ensures camera is released
  // regardless of isScanning state at unmount time.
  // Uses scannerRunningRef to avoid calling stop() on a scanner that
  // hasn't finished starting (which throws synchronously on some browsers).
  useEffect(() => {
    return () => {
      const scanner = html5QrCodeRef.current;
      if (!scanner) return;
      html5QrCodeRef.current = null;

      if (scannerRunningRef.current) {
        scannerRunningRef.current = false;
        try {
          scanner.stop()
            .catch(() => {})
            .finally(() => {
              scanner.clear().catch(() => {});
            });
        } catch {
          // stop() threw synchronously (scanner not fully started)
          try { scanner.clear(); } catch {}
        }
      } else {
        // Scanner was never fully started; just clean up the DOM
        try { scanner.clear(); } catch {}
      }
    };
  }, []);

  // Auto-start scanning when component mounts if autoStart is true
  // Note: iOS Safari requires user gesture, so auto-start won't work on iOS
  // Uses ResizeObserver to wait for the container to have real dimensions
  // before starting — avoids race with Modal layout on narrow viewports.
  useEffect(() => {
    if (autoStart && !_debugScanPhase && scannerRef.current && !isScanning && !error && !hasStartedRef.current) {
      // In fullScreen mode, always auto-start — the parent modal was opened
      // by a user gesture so we have camera permission context even on iOS.
      // In normal mode, skip auto-start on iOS and show a start button instead.
      if (!fullScreen && isIOSDevice) {
        setShowStartButton(true);
        hasStartedRef.current = true;
        return;
      }

      const timer = setTimeout(() => {
        hasStartedRef.current = true;
        startScanning();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isScanning, error, startScanning, isIOSDevice, fullScreen]);

  if (fullScreen) {
    return (
      <>
        <div
          id={scannerId}
          ref={scannerRef}
          className={classes.fullScreen}
        />
        <div className={classes.prompt}>
          <div className={classes.promptViewfinderCenter}>
            {displayPhase === 'idle' && <Viewfinder />}
            {displayPhase === 'pending' && <Loader color='white' size='xl' />}
            {displayPhase === 'success' && <Viewfinder success />}
            {displayPhase === 'error' && <Viewfinder error />}
          </div>
          <Stack align='center' gap='xs' className={classes.promptBelowViewfinder}>
            <Center maw={300} mih='5.5rem' w='100%'>
              {(displayPhase === 'success' || displayPhase === 'error') && (
                <Text
                  ta='center'
                  fw={500}
                  size='lg'
                  maw={300}
                  style={{
                    color: displayPhase === 'success' ? VIEWFINDER_COLOR.success : VIEWFINDER_COLOR.error,
                  }}
                  className={classes.promptText}
                >
                  {displayPhase === 'success'
                    ? FULLSCREEN_SCAN_STATUS_TEXT.success
                    : FULLSCREEN_SCAN_STATUS_TEXT.error}
                </Text>
              )}
            </Center>
          </Stack>
        </div>
      </>
    );
  }

  return (
    <div className={className}>
      <div id={scannerId} ref={scannerRef} style={{ width: '100%', minHeight: '300px' }} />

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title='Camera Error' color='red' mt='md'>
          <Text size='sm'>{error}</Text>
          {error.includes('permission') && (
            <Text size='xs' mt='xs'>
              On iOS: Go to Settings → Safari → Camera → Allow
            </Text>
          )}
          {error.includes('HTTPS') && (
            <Text size='xs' mt='xs'>
              If accessing from iPhone, you need HTTPS. Try using your Mac&apos;s IP address with HTTPS, or use a tool like ngrok.
            </Text>
          )}
          {error.includes('not supported by this browser') && (
            <Text size='xs' mt='xs'>
              Make sure you&apos;re using Safari on iOS, or Chrome/Firefox/Safari on desktop.
            </Text>
          )}
        </Alert>
      )}

      {!isScanning && showStartButton && (
        <Button
          onClick={startScanning}
          type='button'
          fullWidth
          mt='md'
          size='lg'
        >
          {isIOSDevice ? 'Tap to Start Camera' : 'Start Camera'}
        </Button>
      )}

      {isScanning && (
        <Button
          onClick={stopScanning}
          type='button'
          variant='outline'
          fullWidth
          mt='md'
        >
          Stop Camera
        </Button>
      )}

      {isIOSDevice && !isScanning && !error && (
        <Text size='xs' c='dimmed' mt='xs' ta='center'>
          Tap the button above to start the camera
        </Text>
      )}
    </div>
  );
}

QRScanner.propTypes = {
  onScanSuccess: PropTypes.func.isRequired,
  onScanError: PropTypes.func,
  className: PropTypes.string,
  autoStart: PropTypes.bool,
  fullScreen: PropTypes.bool,
  prompt: PropTypes.string,
};
