import { useEffect, useMemo, useRef, useState } from 'react';

import 'leaflet/dist/leaflet.css';
import '../styles/FacilityMap.css';

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;
const DISTRICT_DATA_PATH = '/static-data/street_team_coverage.geojson';

// SVG paths for icons (matching CategoryIcon component)
const STETHOSCOPE_PATH = 'M4 2H3C2.46957 2 1.96086 2.21071 1.58579 2.58579C1.21071 2.96086 1 3.46957 1 4V7.5C1 8.95869 1.57946 10.3576 2.61091 11.3891C3.64236 12.4205 5.04131 13 6.5 13C7.95869 13 9.35764 12.4205 10.3891 11.3891C11.4205 10.3576 12 8.95869 12 7.5V4C12 3.46957 11.7893 2.96086 11.4142 2.58579C11.0391 2.21071 10.5304 2 10 2H9M6 13C6 13.7879 6.15519 14.5681 6.45672 15.2961C6.75825 16.0241 7.20021 16.6855 7.75736 17.2426C8.31451 17.7998 8.97595 18.2417 9.7039 18.5433C10.4319 18.8448 11.2121 19 12 19C12.7879 19 13.5681 18.8448 14.2961 18.5433C15.0241 18.2417 15.6855 17.7998 16.2426 17.2426C16.7998 16.6855 17.2417 16.0241 17.5433 15.2961C17.8448 14.5681 18 13.7879 18 13V10M18 10C19.1046 10 20 9.10457 20 8C20 6.89543 19.1046 6 18 6C16.8954 6 16 6.89543 16 8C16 9.10457 16.8954 10 18 10ZM9 1V3M4 1V3';

const HEALTH_RECOGNITION_PATH = 'M3 2C2.73478 2 2.48043 2.10536 2.29289 2.29289C2.10536 2.48043 2 2.73478 2 3V5C2 5.55228 1.55228 6 1 6C0.447715 6 0 5.55228 0 5V3C0 2.20435 0.31607 1.44129 0.87868 0.87868C1.44129 0.31607 2.20435 0 3 0H5C5.55228 0 6 0.447715 6 1C6 1.55228 5.55228 2 5 2H3ZM12 1C12 0.447715 12.4477 0 13 0H15C15.7956 0 16.5587 0.31607 17.1213 0.87868C17.6839 1.44129 18 2.20435 18 3V5C18 5.55228 17.5523 6 17 6C16.4477 6 16 5.55228 16 5V3C16 2.73478 15.8946 2.48043 15.7071 2.29289C15.5196 2.10536 15.2652 2 15 2H13C12.4477 2 12 1.55228 12 1ZM7.05899 6.99878C6.92077 6.99878 6.78394 7.02633 6.65649 7.07983C6.52904 7.13332 6.41353 7.21169 6.31672 7.31034C6.11374 7.51681 5.99939 7.79538 5.99939 8.08491C5.99939 8.37415 6.1129 8.65182 6.31548 8.85822C6.31569 8.85844 6.31527 8.85801 6.31548 8.85822L8.99999 11.5767L11.6836 8.8591C11.6839 8.85885 11.6841 8.85859 11.6844 8.85833C11.8867 8.65196 12.0001 8.37446 12.0001 8.08541C12.0001 7.796 11.8865 7.51817 11.6836 7.31172C11.5876 7.21392 11.4729 7.13602 11.3466 7.08284C11.2203 7.02966 11.0846 7.0021 10.9475 7.00177C10.8105 7.00144 10.6747 7.02834 10.5481 7.08091C10.4215 7.13348 10.3066 7.21068 10.2101 7.30802C10.182 7.33638 10.1522 7.36303 10.1209 7.38783L9.62086 7.78383C9.25491 8.07366 8.73713 8.07174 8.37334 7.77921L7.88834 7.38921C7.8578 7.36465 7.82872 7.33831 7.80127 7.31034C7.70445 7.21169 7.58895 7.13332 7.4615 7.07983C7.33405 7.02633 7.19721 6.99878 7.05899 6.99878ZM5.88244 5.23569C6.25499 5.07932 6.65496 4.99878 7.05899 4.99878C7.46302 4.99878 7.863 5.07932 8.23554 5.23569C8.51422 5.35266 8.77336 5.5103 9.00471 5.70302C9.2381 5.50897 9.49972 5.35068 9.78104 5.23385C10.1523 5.07969 10.5504 5.0008 10.9524 5.00177C11.3543 5.00274 11.7521 5.08355 12.1226 5.23951C12.493 5.39543 12.8287 5.62338 13.1103 5.9101C13.6806 6.49055 14.0001 7.27171 14.0001 8.08541C14.0001 8.89911 13.6806 9.68027 13.1103 10.2607L13.1085 10.2626L9.71153 13.7026C9.52365 13.8928 9.26739 13.9999 8.99999 13.9999C8.7326 13.9999 8.47634 13.8928 8.28845 13.7026L4.88988 10.261C4.31919 9.68044 3.99939 8.89897 3.99939 8.08491C3.99939 7.27115 4.31896 6.48994 4.88927 5.90949C5.17226 5.62112 5.5099 5.39206 5.88244 5.23569ZM1 12C1.55228 12 2 12.4477 2 13V15C2 15.2652 2.10536 15.5196 2.29289 15.7071C2.48043 15.8946 2.73478 16 3 16H5C5.55228 16 6 16.4477 6 17C6 17.5523 5.55228 18 5 18H3C2.20435 18 1.44129 17.6839 0.87868 17.1213C0.31607 16.5587 0 15.7956 0 15V13C0 12.4477 0.447715 12 1 12ZM17 12C17.5523 12 18 12.4477 18 13V15C18 15.7957 17.6839 16.5587 17.1213 17.1213C16.5587 17.6839 15.7957 18 15 18H13C12.4477 18 12 17.5523 12 17C12 16.4477 12.4477 16 13 16H15C15.2652 16 15.5196 15.8946 15.7071 15.7071C15.8946 15.5196 16 15.2652 16 15V13C16 12.4477 16.4477 12 17 12Z';

const NURSE_PATH = 'M2.12293 3.80233L3.81475 12H14.1854L15.8772 3.80324C13.8469 2.65541 11.5009 2.00002 9.00005 2.00002L8.99844 2.00002C6.58547 1.99613 4.21692 2.61904 2.12293 3.80233ZM9.00086 1.94026e-05C5.9798 -0.00469485 3.01968 0.849749 0.46583 2.46368C0.113854 2.68611 -0.0634644 3.10336 0.0206913 3.51114L2.02069 13.2021C2.11657 13.6667 2.52567 14 3.00005 14H15.0001C15.4744 14 15.8835 13.6667 15.9794 13.2022L17.9794 3.51216C18.0636 3.10438 17.8863 2.68712 17.5343 2.46468C15.0643 0.903766 12.1362 0.000174136 9.00086 1.94026e-05ZM9.00005 4C9.55234 4 10.0001 4.44772 10.0001 5V6H11.0001C11.5523 6 12.0001 6.44772 12.0001 7C12.0001 7.55228 11.5523 8 11.0001 8H10.0001V9C10.0001 9.55229 9.55234 10 9.00005 10C8.44777 10 8.00005 9.55229 8.00005 9V8H7.00005C6.44777 8 6.00005 7.55228 6.00005 7C6.00005 6.44772 6.44777 6 7.00005 6H8.00005V5C8.00005 4.44772 8.44777 4 9.00005 4Z';

const CATEGORY_ICON_CONFIG = {
  medical: {
    path: STETHOSCOPE_PATH,
    viewBox: '0 0 21 20',
    color: '#15AABF',
  },
  shelter: {
    path: HEALTH_RECOGNITION_PATH,
    viewBox: '0 0 18 18',
    color: '#F06595',
  },
  ongoing: {
    path: NURSE_PATH,
    viewBox: '0 0 18 14',
    color: '#FFA94D',
  },
  basic: {
    path: STETHOSCOPE_PATH,
    viewBox: '0 0 21 20',
    color: '#748FFC',
  },
  mobile: {
    path: STETHOSCOPE_PATH,
    viewBox: '0 0 21 20',
    color: '#1C7ED6',
  },
  other: {
    path: NURSE_PATH,
    viewBox: '0 0 18 14',
    color: '#FFA94D',
  },
};

function createFacilityMarkerIcon (L, categoryId = 'other') {
  const config = CATEGORY_ICON_CONFIG[categoryId] || CATEGORY_ICON_CONFIG.other;
  // Scale down by 20%: original is 52x60, so 20% smaller is ~42x48
  const scale = 0.8;
  const pinWidth = 52 * scale; // ~42px
  const pinHeight = 60 * scale; // ~48px
  const iconSize = 19; // Scaled proportionally
  // Colored circle center in viewBox: x=26, y=25 (circle goes from 9 to 43 horizontally, centered at 26)
  const iconCenterX = 26; // Center X in viewBox coordinates
  const iconCenterY = 25; // Center Y in viewBox coordinates
  const iconOffsetX = iconCenterX - iconSize / 2;
  const iconOffsetY = iconCenterY - iconSize / 2;
  const fillColor = 'white';
  // Nurse icon (ongoing, other) and Health Recognition icon (shelter) use fill
  const useFill = categoryId === 'shelter' || categoryId === 'ongoing' || categoryId === 'other';
  // Stethoscope icons (medical, basic, mobile) use stroke
  const strokeColor = useFill ? 'none' : 'white';

  const svgPath = useFill
    ? `<path fill-rule="evenodd" clip-rule="evenodd" d="${config.path}" fill="${fillColor}"/>`
    : `<path d="${config.path}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  // Generate unique filter IDs to avoid conflicts when multiple pins are rendered
  const filterId0 = `filter0_f_358_9886_${categoryId}`;
  const filterId1 = `filter1_d_358_9886_${categoryId}`;

  return L.divIcon({
    className: 'facility-map__marker facility-map__marker--facility',
    iconSize: [pinWidth, pinHeight],
    iconAnchor: [pinWidth / 2, pinHeight], // Anchor at the tip of the pin
    popupAnchor: [0, -pinHeight],
    html: `
      <div class="facility-map__marker-wrapper" style="position: relative; width: ${pinWidth}px; height: ${pinHeight}px;">
        <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; left: 0; top: 0;">
          <!-- Shadow -->
          <g filter="url(#${filterId0})">
            <ellipse cx="26" cy="53.5" rx="7" ry="2.5" fill="black" fill-opacity="0.2"/>
          </g>
          <!-- White pin shape with drop shadow -->
          <g filter="url(#${filterId1})">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M26 4C37.598 4 47 13.402 47 25C47 33.8926 41.4727 41.4942 33.6663 44.5567L27.1961 53.4007C27.0612 53.5858 26.8821 53.7369 26.6739 53.8412C26.4657 53.9455 26.2346 54 26 54C25.7654 54 25.5343 53.9455 25.3261 53.8412C25.1179 53.7369 24.9388 53.5858 24.8039 53.4007L18.3337 44.5567C10.5273 41.4941 5 33.8926 5 25C5 13.402 14.402 4 26 4Z" fill="white"/>
          </g>
          <!-- Colored circle (category color) -->
          <path d="M43 25C43 15.6112 35.3888 8 26 8C16.6112 8 9 15.6112 9 25C9 34.3888 16.6112 42 26 42C35.3888 42 43 34.3888 43 25Z" fill="${config.color}"/>
          <!-- Category icon -->
          <svg width="${iconSize}" height="${iconSize}" viewBox="${config.viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" x="${iconOffsetX}" y="${iconOffsetY}">
            ${svgPath}
          </svg>
          <!-- Filters -->
          <defs>
            <filter id="${filterId0}" x="17" y="49" width="18" height="9" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="1" result="effect1_foregroundBlur_358_9886"/>
            </filter>
            <filter id="${filterId1}" x="0" y="0" width="52" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feFlood flood-opacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="1"/>
              <feGaussianBlur stdDeviation="2.5"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_358_9886"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_358_9886" result="shape"/>
            </filter>
          </defs>
        </svg>
      </div>
    `,
  });
}

function createUserMarkerIcon (L) {
  return L.divIcon({
    className: 'facility-map__marker facility-map__marker--user',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -16],
    html: `
      <div class="facility-map__marker-wrapper facility-map__marker-wrapper--user">
        <span class="facility-map__marker-circle facility-map__marker-circle--user"></span>
      </div>
    `,
  });
}

function FacilityMap ({ facilities, userLocation = null, height = 350 }) {
  const [leaflet, setLeaflet] = useState(null);
  const [districtCollection, setDistrictCollection] = useState(null);
  const [districtLoadError, setDistrictLoadError] = useState(null);
  const [showDistricts, setShowDistricts] = useState(true);
  const mapRef = useRef(null);
  const previousCenterRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    async function loadLeaflet () {
      const [{ GeoJSON, MapContainer, Marker, Popup, TileLayer }, L] = await Promise.all([
        import('react-leaflet'),
        import('leaflet'),
      ]);

      if (isMounted) {
        setLeaflet({
          GeoJSON,
          MapContainer,
          Marker,
          Popup,
          TileLayer,
          leafletLib: L,
          userIcon: createUserMarkerIcon(L),
        });
      }
    }

    loadLeaflet();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isActive = true;

    async function loadDistricts () {
      try {
        const response = await fetch(DISTRICT_DATA_PATH, { cache: 'reload' });

        if (!response.ok) {
          throw new Error(`Failed to load NST districts (${response.status})`);
        }

        const json = await response.json();

        if (isActive) {
          setDistrictCollection(json);
        }
      } catch (error) {
        console.error('[FacilityMap] failed to load NST districts', error);
        if (isActive) {
          setDistrictLoadError(error);
        }
      }
    }

    loadDistricts();

    return () => {
      isActive = false;
    };
  }, []);

  const facilityMarkers = useMemo(() => facilities
    .map((facility) => {
      const latitude = Number(facility.latitude);
      const longitude = Number(facility.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        ...facility,
        latitude,
        longitude,
        slug: facility.slug,
      };
    })
    .filter(Boolean), [facilities]);

  const districtColors = useMemo(
    () => ({
      'Bayview/Ingleside': { stroke: '#803d8f', fill: '#d9b3e6' },
      'Central/Southern': { stroke: '#0f4c75', fill: '#a8d8ff' },
      'Mission/Castro': { stroke: '#9a3412', fill: '#f8caa7' },
      'Richmond/Taraval/Park': { stroke: '#166534', fill: '#bfe8c8' },
      'Tenderloin/Northern': { stroke: '#7c2d12', fill: '#f2b8a6' },
    }),
    []
  );
  const districtLabelPositions = useMemo(
    () => ({
      'Bayview/Ingleside': [37.7265, -122.3925],
      'Central/Southern': [37.7745, -122.4095],
      'Mission/Castro': [37.7555, -122.4245],
      'Richmond/Taraval/Park': [37.763, -122.483],
      'Tenderloin/Northern': [37.7885, -122.4165],
    }),
    []
  );

  function getDistrictStyle (feature) {
    const colors = feature?.properties?.streetteam ? districtColors[feature.properties.streetteam] : null;
    const stroke = colors?.stroke ?? '#414c4c';
    const fill = colors?.fill ?? '#b7d4d0';

    return {
      color: stroke,
      weight: 1.5,
      opacity: 0.9,
      fillOpacity: 0.38,
      fillColor: fill,
    };
  }

  function renderDistrictLabel (feature, layer) {
    const name = feature?.properties?.streetteam;
    const { leafletLib } = leaflet ?? {};

    if (!name || !leafletLib) {
      return;
    }

    const preferredPosition = districtLabelPositions[name];
    const fallbackPosition = layer.getBounds()?.isValid?.() ? layer.getBounds().getCenter() : null;
    const position = preferredPosition ?? fallbackPosition;

    if (!position) {
      return;
    }

    let labelMarker = null;

    const ensureLabel = () => {
      if (!layer._map || labelMarker) {
        return;
      }

      const labelHtml = name.replace(/\//g, '<br />');

      labelMarker = leafletLib
        .marker(position, {
          icon: leafletLib.divIcon({
            className: 'facility-map__district-label',
            html: `<span>${labelHtml}</span>`,
          }),
          interactive: false,
          zIndexOffset: 500,
        })
        .addTo(layer._map);
    };

    const removeLabel = () => {
      if (labelMarker && layer._map) {
        layer._map.removeLayer(labelMarker);
      }
      labelMarker = null;
    };

    layer.on('add', ensureLabel);
    layer.on('remove', removeLabel);
    ensureLabel();
  }

  const center = useMemo(() => {
    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }

    if (facilityMarkers.length) {
      return facilityMarkers.reduce(
        (acc, facility, index, array) => {
          acc[0] += facility.latitude / array.length;
          acc[1] += facility.longitude / array.length;
          return acc;
        },
        [0, 0]
      );
    }

    return DEFAULT_CENTER;
  }, [facilityMarkers, userLocation]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (!Array.isArray(center) || center.length !== 2) {
      return;
    }

    const [lat, lng] = center;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const previous = previousCenterRef.current;

    if (
      !previous ||
      Math.abs(previous[0] - lat) > 1e-5 ||
      Math.abs(previous[1] - lng) > 1e-5
    ) {
      mapRef.current.flyTo([lat, lng], mapRef.current.getZoom(), { animate: true });
      previousCenterRef.current = [lat, lng];
    }
  }, [center]);

  useEffect(() => {
    if (districtLoadError) {
      console.warn('[FacilityMap] NST district overlay unavailable', districtLoadError);
    }
  }, [districtLoadError]);

  if (typeof window === 'undefined' || !leaflet) {
    return null;
  }

  const { GeoJSON, MapContainer, Marker, Popup, TileLayer, userIcon, leafletLib } = leaflet;

  return (
    <div className='facility-map'>
      <div className='facility-map__controls'>
        <button
          type='button'
          className={`facility-map__control-button ${showDistricts ? 'facility-map__control-button--active' : ''}`}
          onClick={() => setShowDistricts((previous) => !previous)}
        >
          NST Districts
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: `${height}px`, width: '100%' }}
        scrollWheelZoom={false}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
          previousCenterRef.current = center;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        />
        {districtCollection && showDistricts && (
          <GeoJSON
            data={districtCollection}
            style={getDistrictStyle}
            onEachFeature={renderDistrictLabel}
          />
        )}
        {userLocation && userIcon && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userIcon}
          >
            <Popup>
              <strong>Your location</strong>
            </Popup>
          </Marker>
        )}
        {facilityMarkers.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.latitude, facility.longitude]}
            icon={createFacilityMarkerIcon(leafletLib, facility.primaryCategory || 'other')}
          >
            <Popup>
              <strong>{facility.name}</strong>
              {facility.displayAddress && (
                <div>{facility.displayAddress}</div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default FacilityMap;
