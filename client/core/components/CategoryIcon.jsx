import stethoscopeSvg from '../../src/assets/icons/stethoscope.svg?raw';
import healthRecognitionSvg from '../../src/assets/icons/health-recognition.svg?raw';
import nurseSvg from '../../src/assets/icons/nurse.svg?raw';

// Parse SVG strings to extract viewBox and path attributes (works in both Node.js and browser)
function parseSvg (svgString) {
  const svgMatch = svgString.match(/<svg[^>]*\sviewBox="([^"]+)"/);
  const pathMatch = svgString.match(/<path[^>]*\sd="([^"]+)"/);
  const fillRuleMatch = svgString.match(/fill-rule="([^"]+)"/);
  const clipRuleMatch = svgString.match(/clip-rule="([^"]+)"/);
  const strokeWidthMatch = svgString.match(/stroke-width="([^"]+)"/);
  const strokeLinecapMatch = svgString.match(/stroke-linecap="([^"]+)"/);
  const strokeLinejoinMatch = svgString.match(/stroke-linejoin="([^"]+)"/);

  return {
    viewBox: svgMatch ? svgMatch[1] : '',
    d: pathMatch ? pathMatch[1] : '',
    fillRule: fillRuleMatch ? fillRuleMatch[1] : null,
    clipRule: clipRuleMatch ? clipRuleMatch[1] : null,
    strokeWidth: strokeWidthMatch ? strokeWidthMatch[1] : null,
    strokeLinecap: strokeLinecapMatch ? strokeLinecapMatch[1] : null,
    strokeLinejoin: strokeLinejoinMatch ? strokeLinejoinMatch[1] : null,
  };
}

const stethoscopeData = parseSvg(stethoscopeSvg);
const healthRecognitionData = parseSvg(healthRecognitionSvg);
const nurseData = parseSvg(nurseSvg);

const StethoscopeIcon = ({ color = 'white', size = 24 }) => (
  <svg
    preserveAspectRatio='none'
    width={size}
    height={size}
    overflow='visible'
    style={{ display: 'block', color }}
    viewBox={stethoscopeData.viewBox}
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
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
    preserveAspectRatio='none'
    width={size}
    height={size}
    overflow='visible'
    style={{ display: 'block', color }}
    viewBox={healthRecognitionData.viewBox}
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
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
    preserveAspectRatio='none'
    width={size}
    height={size}
    overflow='visible'
    style={{ display: 'block', color }}
    viewBox={nurseData.viewBox}
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
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
