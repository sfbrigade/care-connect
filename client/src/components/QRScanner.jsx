import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Alert, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import PropTypes from 'prop-types';

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

/**
 * QR Code Scanner component
 * Uses device camera to scan QR codes
 * @param {function} onScanSuccess - Callback when QR code is successfully scanned
 * @param {function} onScanError - Callback for scan errors
 * @param {string} className - Additional CSS classes
 * @param {boolean} autoStart - Automatically start scanning when component mounts (iOS will ignore this)
 */
export default function QRScanner ({ onScanSuccess, onScanError, className = '', autoStart = false }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showStartButton, setShowStartButton] = useState(true);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const hasStartedRef = useRef(false);
  const isIOSDevice = isIOS();

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Ignore errors when stopping (e.g., "scanner is not running")
        console.log('Error stopping scanner (ignored):', err.message);
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

      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: isIOSDevice ? 5 : 10, // Lower FPS for iOS
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
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
          // Use camera ID (more reliable on iOS)
          await html5QrCode.start(
            cameraId,
            config,
            (decodedText) => {
              onScanSuccess?.(decodedText);
              stopScanning();
            },
            (errorMessage) => {
              // Filter out normal scanning errors - these happen continuously while scanning
              const isScanError =
                errorMessage.includes('No QR code found') ||
                errorMessage.includes('NotFoundException') ||
                errorMessage.includes('No multi-format reads') ||
                errorMessage.includes('QR code parse error');

              if (!isScanError) {
                onScanError?.(errorMessage);
              }
            }
          );
        } else {
          // Fall back to config object
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              onScanSuccess?.(decodedText);
              stopScanning();
            },
            (errorMessage) => {
              // Filter out normal scanning errors - these happen continuously while scanning
              const isScanError =
                errorMessage.includes('No QR code found') ||
                errorMessage.includes('NotFoundException') ||
                errorMessage.includes('No multi-format reads') ||
                errorMessage.includes('QR code parse error');

              if (!isScanError) {
                onScanError?.(errorMessage);
              }
            }
          );
        }
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
              await html5QrCode.start(
                frontCamera.id,
                config,
                (decodedText) => {
                  onScanSuccess?.(decodedText);
                  stopScanning();
                },
                (errorMessage) => {
                  // Filter out normal scanning errors - these happen continuously while scanning
                  const isScanError =
                    errorMessage.includes('No QR code found') ||
                    errorMessage.includes('NotFoundException') ||
                    errorMessage.includes('No multi-format reads') ||
                    errorMessage.includes('QR code parse error');

                  if (!isScanError) {
                    onScanError?.(errorMessage);
                  }
                }
              );
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
  }, [onScanSuccess, onScanError, stopScanning, isIOSDevice]);

  useEffect(() => {
    return () => {
      // Cleanup: stop scanning when component unmounts
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current.stop().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, [isScanning]);

  // Auto-start scanning when component mounts if autoStart is true
  // Note: iOS Safari requires user gesture, so auto-start won't work on iOS
  useEffect(() => {
    if (autoStart && !isIOSDevice && scannerRef.current && !isScanning && !error && !hasStartedRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        hasStartedRef.current = true;
        startScanning();
      }, 300);
      return () => clearTimeout(timer);
    } else if (autoStart && isIOSDevice) {
      // On iOS, show the start button instead of auto-starting
      setShowStartButton(true);
      hasStartedRef.current = true;
    }
  }, [autoStart, isScanning, error, startScanning, isIOSDevice]);

  return (
    <div className={className}>
      <div id='qr-reader' ref={scannerRef} style={{ width: '100%', minHeight: '300px' }} />

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
              If accessing from iPhone, you need HTTPS. Try using your Mac's IP address with HTTPS, or use a tool like ngrok.
            </Text>
          )}
          {error.includes('not supported by this browser') && (
            <Text size='xs' mt='xs'>
              Make sure you're using Safari on iOS, or Chrome/Firefox/Safari on desktop.
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
};
