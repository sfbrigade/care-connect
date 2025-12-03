import { useEffect, useMemo, useRef, useState } from 'react';

import 'leaflet/dist/leaflet.css';
import '../../src/styles/FacilityMap.css';

import stethoscopeSvg from '../../src/assets/icons/stethoscope.svg?raw';
import healthRecognitionSvg from '../../src/assets/icons/health-recognition.svg?raw';
import nurseSvg from '../../src/assets/icons/nurse.svg?raw';

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;
const DISTRICT_DATA_PATH = '/static-data/street_team_coverage.geojson';

// Extract path data from SVG strings (works in both Node.js and browser)
function extractPathData (svgString) {
  // Use regex to extract the 'd' attribute from the path element
  const pathMatch = svgString.match(/<path[^>]*\sd="([^"]+)"/);
  return pathMatch ? pathMatch[1] : '';
}

const STETHOSCOPE_PATH = extractPathData(stethoscopeSvg);
const HEALTH_RECOGNITION_PATH = extractPathData(healthRecognitionSvg);
const NURSE_PATH = extractPathData(nurseSvg);

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
