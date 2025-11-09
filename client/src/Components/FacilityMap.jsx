import { useEffect, useMemo, useState } from 'react';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;

function FacilityMap ({ facilities }) {
  const [leaflet, setLeaflet] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    async function loadLeaflet () {
      const [{ MapContainer, Marker, Popup, TileLayer }, L] = await Promise.all([
        import('react-leaflet'),
        import('leaflet'),
      ]);

      const markerIcon = new L.Icon({
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowAnchor: [12, 41],
        iconSize: [25, 41],
        shadowSize: [41, 41],
      });

      if (isMounted) {
        setLeaflet({
          MapContainer,
          Marker,
          Popup,
          TileLayer,
          markerIcon,
        });
      }
    }

    loadLeaflet();

    return () => {
      isMounted = false;
    };
  }, []);

  const facilityMarkers = useMemo(() => facilities
    .map((facility) => ({
      ...facility,
      latitude: Number(facility.latitude),
      longitude: Number(facility.longitude),
    }))
    .filter((facility) => Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude)), [facilities]);

  const center = useMemo(() => (facilityMarkers.length
    ? facilityMarkers.reduce(
      (acc, facility, index, array) => {
        acc[0] += facility.latitude / array.length;
        acc[1] += facility.longitude / array.length;
        return acc;
      },
      [0, 0]
    )
    : DEFAULT_CENTER), [facilityMarkers]);

  if (typeof window === 'undefined' || !leaflet) {
    return null;
  }

  const { MapContainer, Marker, Popup, TileLayer, markerIcon } = leaflet;

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: '350px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {facilityMarkers.map((facility) => (
        <Marker
          key={facility.id}
          position={[facility.latitude, facility.longitude]}
          icon={markerIcon}
        >
          <Popup>
            <strong>{facility.name}</strong>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default FacilityMap;
