'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

function fixIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function createCountIcon(count: number) {
  return L.divIcon({
    html: `<div style="background:#3ABFD4;color:#000;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid #fff">${count}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

// Forces Leaflet to recalculate container size on first render (needed after dynamic import)
function MapInit() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 0); }, []);
  return null;
}

// Recenter the map whenever the set of coords changes
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1], zoom]);
  return null;
}

interface Props {
  items: any[];
  onSelectItem: (item: any) => void;
}

export default function MapView({ items, onSelectItem }: Props) {
  useEffect(() => { fixIcons(); }, []);

  // Group items by zip, keeping only those with coordinates
  const byZip: Record<string, { lat: number; lng: number; items: any[] }> = {};
  for (const item of items) {
    const loc = item.locations;
    if (!loc?.latitude || !loc?.longitude || !loc?.zip_code) continue;
    if (!byZip[loc.zip_code]) {
      byZip[loc.zip_code] = { lat: loc.latitude, lng: loc.longitude, items: [] };
    }
    byZip[loc.zip_code].items.push(item);
  }

  const zips = Object.keys(byZip);
  const itemsWithCoords = zips.reduce((n, z) => n + byZip[z].items.length, 0);

  if (zips.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' as const, backgroundColor: '#f9f9f9', borderRadius: '12px', color: '#aaa' }}>
        <p style={{ margin: 0 }}>No items with location data to display yet. Coordinates are added when a location is saved — existing locations will appear as users update them.</p>
      </div>
    );
  }

  const lats = zips.map(z => byZip[z].lat);
  const lngs = zips.map(z => byZip[z].lng);
  const center: [number, number] = [
    lats.reduce((a, b) => a + b, 0) / lats.length,
    lngs.reduce((a, b) => a + b, 0) / lngs.length,
  ];
  const zoom = zips.length === 1 ? 10 : 5;

  return (
    <div>
      {itemsWithCoords < items.length && (
        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>
          Showing {itemsWithCoords} of {items.length} items — remaining items don't have location coordinates yet.
        </p>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '600px', width: '100%', borderRadius: '12px', border: '1px solid #eee' }}
      >
        <MapInit />
        <MapRecenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zips.map(zip => {
          const { lat, lng, items: zipItems } = byZip[zip];
          return (
            <Marker key={zip} position={[lat, lng]} icon={createCountIcon(zipItems.length)}>
              <Popup minWidth={180}>
                <div style={{ fontFamily: 'inherit' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>
                    {zipItems[0].locations?.city ? `${zipItems[0].locations.city}, ${zipItems[0].locations.state}` : `Zip ${zip}`}
                  </div>
                  {zipItems.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      style={{ cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#111' }}>{item.item_name}</div>
                      <div style={{ fontSize: '11px', color: '#3ABFD4', fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: '2px' }}>
                        {item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
                      </div>
                    </div>
                  ))}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
