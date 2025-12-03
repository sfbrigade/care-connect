import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import PropTypes from 'prop-types';

/**
 * QR Code Scanner component
 * Uses device camera to scan QR codes
 * @param {function} onScanSuccess - Callback when QR code is successfully scanned
 * @param {function} onScanError - Callback for scan errors
 * @param {string} className - Additional CSS classes
 */
export default function QRScanner ({ onScanSuccess, onScanError, className = '' }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

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

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          onScanSuccess?.(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Error callback - ignore if it's just "No QR code found"
          if (!errorMessage.includes('No QR code found')) {
            onScanError?.(errorMessage);
          }
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to start camera');
      setIsScanning(false);
      onScanError?.(err.message);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Ignore errors when stopping
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className={className}>
      <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} />
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
      {!isScanning && !error && (
        <button onClick={startScanning} type="button">
          Start Camera
        </button>
      )}
      {isScanning && (
        <button onClick={stopScanning} type="button">
          Stop Camera
        </button>
      )}
    </div>
  );
}

QRScanner.propTypes = {
  onScanSuccess: PropTypes.func.isRequired,
  onScanError: PropTypes.func,
  className: PropTypes.string,
};

