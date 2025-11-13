import { useEffect, useMemo, useState } from 'react';

import 'leaflet/dist/leaflet.css';
import '../styles/FacilityMap.css';

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;

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
        <span class="facility-map__marker-circle facility-map__marker-circle--user"></span>
      </div>
    `,
  });
}

function FacilityMap ({ facilities, userLocation = null, height = 350 }) {
  const [leaflet, setLeaflet] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    async function loadLeaflet () {
      const [{ MapContainer, Marker, Popup, TileLayer, useMap }, L] = await Promise.all([
        import('react-leaflet'),
        import('leaflet'),
      ]);

      if (isMounted) {
        setLeaflet({
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

  if (typeof window === 'undefined' || !leaflet) {
    return null;
  }

  const { MapContainer, Marker, Popup, TileLayer, userIcon, leafletLib, useMap } = leaflet;

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
