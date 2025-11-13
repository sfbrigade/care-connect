import { useEffect, useMemo, useRef, useState } from 'react';

import 'leaflet/dist/leaflet.css';
import '../styles/FacilityMap.css';

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;
const DISTRICT_DATA_PATH = '/data/street_team_coverage.geojson';

function createFacilityMarkerIcon (L, slug) {
  const display = (slug ?? '').toString().slice(0, 3).toUpperCase();

  return L.divIcon({
    className: 'facility-map__marker facility-map__marker--facility',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    html: `
      <div class="facility-map__marker-wrapper">
        <span class="facility-map__marker-circle">${display}</span>
        <span class="facility-map__marker-pointer"></span>
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
        <span class="facility-map__marker-circle facility-map__marker-circle--user\"></span>
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
        // eslint-disable-next-line no-console
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
    if (typeof window === 'undefined') {
      return;
    }

    // eslint-disable-next-line no-console
    console.info('[FacilityMap] facilities (raw)', facilities);
    // eslint-disable-next-line no-console
    console.info('[FacilityMap] markers used for centering', facilityMarkers);
    // eslint-disable-next-line no-console
    console.info('[FacilityMap] computed center', center);
    if (facilityMarkers.length) {
      const latitudes = facilityMarkers.map((facility) => facility.latitude);
      const longitudes = facilityMarkers.map((facility) => facility.longitude);
      const stats = {
        latMin: Math.min(...latitudes),
        latMax: Math.max(...latitudes),
        lonMin: Math.min(...longitudes),
        lonMax: Math.max(...longitudes),
      };
      // eslint-disable-next-line no-console
      console.info('[FacilityMap] coordinate bounds', stats);
    }
  }, [facilities, facilityMarkers, center]);

  useEffect(() => {
    if (districtLoadError) {
      // eslint-disable-next-line no-console
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
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
          icon={createFacilityMarkerIcon(leafletLib, facility.slug)}
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
