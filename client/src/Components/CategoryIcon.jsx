import stethoscopeSvg from '../assets/icons/stethoscope.svg?raw';
import healthRecognitionSvg from '../assets/icons/health-recognition.svg?raw';
import nurseSvg from '../assets/icons/nurse.svg?raw';

// Parse SVG strings to extract viewBox and path attributes
function parseSvg (svgString) {
  // eslint-disable-next-line no-undef
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  const path = doc.querySelector('path');
  return {
    viewBox: svg?.getAttribute('viewBox') || '',
    d: path?.getAttribute('d') || '',
    fillRule: path?.getAttribute('fill-rule') || null,
    clipRule: path?.getAttribute('clip-rule') || null,
    strokeWidth: path?.getAttribute('stroke-width') || null,
    strokeLinecap: path?.getAttribute('stroke-linecap') || null,
    strokeLinejoin: path?.getAttribute('stroke-linejoin') || null,
  };
}

const stethoscopeData = parseSvg(stethoscopeSvg);
const healthRecognitionData = parseSvg(healthRecognitionSvg);
const nurseData = parseSvg(nurseSvg);

const StethoscopeIcon = ({ color = 'white', size = 24 }) => (
  <svg
    preserveAspectRatio="none"
    width={size}
    height={size}
    overflow="visible"
    style={{ display: 'block', color }}
    viewBox={stethoscopeData.viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={stethoscopeData.d}
      stroke={color}
      strokeWidth={stethoscopeData.strokeWidth}
      strokeLinecap={stethoscopeData.strokeLinecap}
      strokeLinejoin={stethoscopeData.strokeLinejoin}
    />
  </svg>
);

const HealthRecognitionIcon = ({ color = 'white', size = 24 }) => (
  <svg
    preserveAspectRatio="none"
    width={size}
    height={size}
    overflow="visible"
    style={{ display: 'block', color }}
    viewBox={healthRecognitionData.viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={healthRecognitionData.d}
      fillRule={healthRecognitionData.fillRule}
      clipRule={healthRecognitionData.clipRule}
      fill={color}
    />
  </svg>
);

const NurseIcon = ({ color = 'white', size = 24 }) => (
  <svg
    preserveAspectRatio="none"
    width={size}
    height={size}
    overflow="visible"
    style={{ display: 'block', color }}
    viewBox={nurseData.viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={nurseData.d}
      fillRule={nurseData.fillRule}
      clipRule={nurseData.clipRule}
      fill={color}
    />
  </svg>
);

const CATEGORY_ICON_CONFIG = {
  medical: {
    Icon: StethoscopeIcon,
    color: '#15AABF',
  },
  shelter: {
    Icon: HealthRecognitionIcon,
    color: '#F06595',
  },
  ongoing: {
    Icon: NurseIcon,
    color: '#FFA94D',
  },
  basic: {
    Icon: StethoscopeIcon,
    color: '#748FFC',
  },
  mobile: {
    Icon: StethoscopeIcon,
    color: '#1C7ED6',
  },
  other: {
    Icon: NurseIcon,
    color: '#FFA94D',
  },
};

function CategoryIcon ({ categoryId, variant = 'header', size = 24 }) {
  const config = CATEGORY_ICON_CONFIG[categoryId] || CATEGORY_ICON_CONFIG.other;
  const IconComponent = config.Icon;
  const color = variant === 'header' ? '#868E96' : 'white';

  if (variant === 'card' || variant === 'map') {
    const circleSize = 34;
    const iconSize = 24;
    const iconOffset = (circleSize - iconSize) / 2;

    return (
      <div
        style={{
          position: 'relative',
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            borderRadius: '50%',
            backgroundColor: config.color,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${iconOffset}px`,
            top: `${iconOffset}px`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
          }}
        >
          <IconComponent color={color} size={iconSize} />
        </div>
      </div>
    );
  }

  return <IconComponent color={color} size={size} />;
}

export default CategoryIcon;

