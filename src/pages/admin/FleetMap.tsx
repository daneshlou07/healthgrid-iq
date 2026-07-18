import React, { useEffect, useState, useRef } from 'react';
import { getMobilePacsVans, getClinics } from '../../services/dataService';
import type { MobilePacsVan, Clinic } from '../../types';
import L from 'leaflet';

export default function FleetMap() {
  const [vans, setVans] = useState<MobilePacsVan[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => { getMobilePacsVans().then(setVans); getClinics().then(setClinics); }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (vans.length === 0 && clinics.length === 0) return;
    const map = L.map(mapRef.current).setView([2.93, 101.7], 12);
    mapInstance.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

    clinics.forEach((clinic) => {
      L.circleMarker([clinic.latitude, clinic.longitude], { radius: 10, fillColor: '#1B2B5B', color: '#1B2B5B', weight: 2, opacity: 1, fillOpacity: 0.8 }).addTo(map)
        .bindPopup(`<strong>${clinic.name}</strong><br/><small>${clinic.address}</small>`);
    });

    vans.forEach((van) => {
      const color = van.status === 'deployed' ? '#10b981' : van.status === 'idle' ? '#9BA5B7' : '#f59e0b';
      L.circleMarker([van.latitude, van.longitude], { radius: 8, fillColor: color, color: '#1B2B5B', weight: 2, opacity: 1, fillOpacity: 0.9 }).addTo(map)
        .bindPopup(`<strong>${van.name}</strong><br/><small>${van.plateNumber} &middot; ${van.status}</small>`);
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, [vans, clinics]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Fleet Map</h1>
        <p className="page-subtitle">Geospatial view of mobile PACS vans and clinics</p>
      </div>

      <div className="flex items-center gap-6 text-xs text-surface-600">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-navy-600" />Clinics</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" />Deployed</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-surface-500" />Idle</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" />Maintenance</div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div ref={mapRef} className="h-[500px] w-full" />
      </div>
    </div>
  );
}
