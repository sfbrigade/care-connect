import { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    async function loadLeaflet () {
      const [{ GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap }, L] = await Promise.all([
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
          useMap,
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

  const districtStyle = useMemo(
    () => ({
      color: '#84c8bb',
      weight: 1,
      opacity: 0.35,
      fillOpacity: 0.06,
      fillColor: '#bfe5db'
    }),
    []
  );

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

  const { GeoJSON, MapContainer, Marker, Popup, TileLayer, userIcon, leafletLib, useMap } = leaflet;

  function RecenterOnChange ({ position }) {
    const map = useMap();

    useEffect(() => {
      if (!Array.isArray(position) || position.length !== 2) {
        return;
      }

      const [lat, lng] = position;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      map.flyTo([lat, lng], map.getZoom(), { animate: true });
    }, [map, position]);

    return null;
  }

  return (
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: `${height}px`, width: '100%' }}
        scrollWheelZoom={false}
      >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {districtCollection && (
        <GeoJSON data={districtCollection} style={districtStyle} />
      )}
      <RecenterOnChange position={center} />
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
            {facility.neighborhoodLabel && (
              <div>{facility.neighborhoodLabel}</div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default FacilityMap;
