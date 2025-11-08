import { useMemo } from 'react';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

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

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 12;

function FacilityMap ({ facilities }) {
  const facilityMarkers = useMemo(() => {
    return facilities
      .map((facility) => ({
        ...facility,
        latitude: Number(facility.latitude),
        longitude: Number(facility.longitude),
      }))
      .filter((facility) => Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude));
  }, [facilities]);

  const center = useMemo(() => {
    if (!facilityMarkers.length) {
      return DEFAULT_CENTER;
    }
    const [latSum, lngSum] = facilities.reduce(
      (acc, facility) => {
        acc[0] += Number(facility.latitude);
        acc[1] += Number(facility.longitude);
        return acc;
      },
      [0, 0]
    );
    return [latSum / facilities.length, lngSum / facilities.length];
  }, [facilities]);

  if (typeof window === 'undefined') {
    return null;
  }

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

