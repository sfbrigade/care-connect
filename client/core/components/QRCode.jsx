import { QRCodeSVG } from 'qrcode.react';
import PropTypes from 'prop-types';

/**
 * QR Code display component
 * @param {string} value - The value/URL to encode in the QR code
 * @param {number} size - Size of the QR code in pixels (default: 256)
 * @param {string} level - Error correction level: 'L', 'M', 'Q', 'H' (default: 'M')
 * @param {string} className - Additional CSS classes
 */
export default function QRCode ({ value, size = 256, level = 'M', className = '' }) {
  if (!value) {
    return null;
  }

  return (
    <div className={className}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={true}
      />
    </div>
  );
}

QRCode.propTypes = {
  value: PropTypes.string.isRequired,
  size: PropTypes.number,
  level: PropTypes.oneOf(['L', 'M', 'Q', 'H']),
  className: PropTypes.string,
};

