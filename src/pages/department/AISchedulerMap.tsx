import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  getRadioSchedulesByClinic,
  getRadioScheduleProfiles,
} from '../../services/dataService';
import { getRoute, findNearestClinic, geocodeAddress } from '../../services/routingService';
import {
  extractModality,
  getEarliestSlot,
  getAvailableSlots,
  recommendBestRadiographer,
} from '../../components/scheduling/RadiograperSelector';
import RadiograperSelector from '../../components/scheduling/RadiograperSelector';
import type { Case, Clinic, Patient, RadioScheduleProfile, RouteInfo } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  ChevronRight,
  Calendar,
  Zap,
} from 'lucide-react';

type Step = 'select-case' | 'map-routing' | 'assign-radiographer' | 'confirm';

interface BulkAssignment {
  caseId: string;
  caseNumber: string;
  patientName: string;
  scanType: string;
  clinicId: string;
  clinicName: string;
  radiographerId: string;
  radiographerName: string;
  scheduledAt: string;
  distanceKm?: number;
  excluded?: boolean;
}

export default function AISchedulerMap() {
  const { currentUser } = useAuth();
  const { cases: allCases, clinics: allClinics, patients: allPatients, editCase, addAuditLog } = useData();
  const { addNotification } = useNotifications();

  // Derived from DataContext (always in sync)
  const cases = allCases.filter((c) => c.status === 'CREATED');
  const clinics = allClinics.filter((c) => c.status === 'active');
  const patients = allPatients;
  const [scheduleProfiles, setScheduleProfiles] = useState<RadioScheduleProfile[]>([]);

  const [step, setStep] = useState<Step>('select-case');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [recommendedClinicId, setRecommendedClinicId] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedRadiographerId, setSelectedRadiographerId] = useState<string | null>(null);
  const [recommendedRadiographerId, setRecommendedRadiographerId] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [bulkPreview, setBulkPreview] = useState<BulkAssignment[]>([]);
  const [showBulkReview, setShowBulkReview] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([3.1, 101.5], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapInstance.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Auto-draw all scheduled routes on the map when there are no pending cases or after bulk
  useEffect(() => {
    if (cases.length === 0 && step === 'select-case') {
      drawBulkRoutes();
    }
  }, [cases.length, step]);


  const updateMap = useCallback(
    (patient: Patient | null, clinicId: string | null, route: RouteInfo | null) => {
      const map = mapInstance.current;
      const markers = markersLayer.current;
      if (!map || !markers) return;
      markers.clearLayers();
      if (routeLayer.current) { map.removeLayer(routeLayer.current); routeLayer.current = null; }

      clinics.forEach((clinic) => {
        const isSelected = clinic.id === clinicId;
        const isRecommended = clinic.id === recommendedClinicId;
        const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
          radius: isSelected ? 12 : 9,
          fillColor: isSelected ? '#10b981' : isRecommended ? '#34d399' : '#1B2B5B',
          color: isSelected ? '#065f46' : '#1B2B5B',
          weight: isSelected ? 3 : 2,
          opacity: 1, fillOpacity: 0.85,
        });
        marker.bindPopup(`<strong>${clinic.name}</strong><br/><small>${clinic.address}</small>${isSelected ? '<br/><b style="color:#10b981">Selected</b>' : ''}`);
        markers.addLayer(marker);
      });

      if (patient && patient.latitude && patient.longitude) {
        const patientMarker = L.marker([patient.latitude, patient.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        });
        patientMarker.bindPopup(`<strong>${patient.name}</strong><br/><small>${patient.address}</small>`);
        markers.addLayer(patientMarker);
      }

      if (route && route.polylineCoords.length > 0) {
        routeLayer.current = L.polyline(route.polylineCoords, { color: '#1B2B5B', weight: 3, opacity: 0.7, dashArray: '6 4' }).addTo(map);
        const bounds = L.latLngBounds(route.polylineCoords.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (patient && patient.latitude && patient.longitude) {
        map.setView([patient.latitude, patient.longitude], 13);
      }
    },
    [clinics, recommendedClinicId]
  );

  const handleCaseSelect = async (caseItem: Case) => {
    setSelectedCase(caseItem); setSuccess(false);
    const patient = patients.find((p) => p.id === caseItem.patientId) || null;
    setSelectedPatient(patient);

    if (patient) {
      // Geocode address if lat/lng missing
      let patLat = patient.latitude;
      let patLon = patient.longitude;
      if (!patLat || !patLon) {
        setRouteLoading(true);
        const geo = await geocodeAddress(patient.address);
        if (geo) { patLat = geo.lat; patLon = geo.lon; patient.latitude = geo.lat; patient.longitude = geo.lon; }
        setRouteLoading(false);
      }

      if (patLat && patLon) {
        const nearest = findNearestClinic(patLat, patLon, clinics.filter((c) => c.status === 'active'));
        const nearestId = nearest?.clinicId || null;
        setRecommendedClinicId(nearestId); setSelectedClinicId(nearestId);
        if (nearestId) {
          const clinic = clinics.find((c) => c.id === nearestId);
          if (clinic) {
            setRouteLoading(true);
            const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
            setRouteInfo(route); setRouteLoading(false);
            updateMap(patient, nearestId, route);
          }
        }
        setStep('map-routing');
      } else { setStep('map-routing'); updateMap(patient, null, null); }
    } else { setStep('map-routing'); updateMap(null, null, null); }
  };

  const handleClinicChange = async (clinicId: string) => {
    setSelectedClinicId(clinicId); setSelectedRadiographerId(null); setRecommendedRadiographerId(null); setAppointmentTime('');
    if (selectedPatient) {
      let patLat = selectedPatient.latitude;
      let patLon = selectedPatient.longitude;
      if (!patLat || !patLon) {
        const geo = await geocodeAddress(selectedPatient.address);
        if (geo) { patLat = geo.lat; patLon = geo.lon; selectedPatient.latitude = geo.lat; selectedPatient.longitude = geo.lon; }
      }
      if (patLat && patLon) {
        const clinic = clinics.find((c) => c.id === clinicId);
        if (clinic) {
          setRouteLoading(true);
          const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
          setRouteInfo(route); setRouteLoading(false);
          updateMap(selectedPatient, clinicId, route);
        }
      }
    }
  };

  const handleProceedToAssignment = async () => {
    if (!selectedClinicId || !selectedCase) return;
    // Try clinic-specific first, then ALL radiographers
    let profiles = await getRadioSchedulesByClinic(selectedClinicId);
    if (profiles.length === 0) profiles = await getRadioScheduleProfiles();
    setScheduleProfiles(profiles);
    const modality = extractModality(selectedCase.scanType);
    const bestId = recommendBestRadiographer(profiles, modality);
    setRecommendedRadiographerId(bestId); setSelectedRadiographerId(bestId);
    if (bestId) {
      const bestProfile = profiles.find((p) => p.userId === bestId);
      if (bestProfile) { const slot = getEarliestSlot(bestProfile.schedule); if (slot) setAppointmentTime(`${slot.date}T${slot.startTime}`); }
    }
    setStep('assign-radiographer');
  };

  const handleRadiographerSelect = (userId: string) => {
    setSelectedRadiographerId(userId);
    const profile = scheduleProfiles.find((p) => p.userId === userId);
    if (profile) { const slot = getEarliestSlot(profile.schedule); if (slot) setAppointmentTime(`${slot.date}T${slot.startTime}`); }
  };

  const handleConfirm = async () => {
    if (!currentUser || !selectedCase || !selectedClinicId || !selectedRadiographerId || !appointmentTime) return;
    setConfirming(true);
    const clinic = clinics.find((c) => c.id === selectedClinicId);
    const profile = scheduleProfiles.find((p) => p.userId === selectedRadiographerId);

    await editCase(selectedCase.id, { status: 'SCHEDULED', scheduledAt: new Date(appointmentTime).toISOString(), clinicId: selectedClinicId, clinicName: clinic?.name || '', radiographerId: selectedRadiographerId, radiographerName: profile?.userName || '' });
    await addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role, action: 'CASE_SCHEDULED', target: `cases/${selectedCase.id}`, details: `AI Scheduler: ${selectedCase.caseNumber} at ${clinic?.name} with ${profile?.userName} on ${appointmentTime}. Route: ${routeInfo?.distanceKm}km, ~${routeInfo?.durationMinutes}min.`, timestamp: new Date().toISOString() });
    addNotification({ userId: selectedRadiographerId, title: 'New Case Assigned', message: `Case ${selectedCase.caseNumber} scheduled for ${appointmentTime}.`, type: 'info' });
    addNotification({ userId: selectedCase.doctorId, title: 'Case Scheduled', message: `Case ${selectedCase.caseNumber} scheduled at ${clinic?.name}.`, type: 'success' });

    setConfirming(false); setSuccess(true); setStep('confirm');
  };

  const handleReset = () => {
    setStep('select-case'); setSelectedCase(null); setSelectedPatient(null); setSelectedClinicId(null);
    setRecommendedClinicId(null); setRouteInfo(null); setSelectedRadiographerId(null);
    setRecommendedRadiographerId(null); setAppointmentTime(''); setSuccess(false);
    updateMap(null, null, null);
  };

  // Bulk Schedule — generate preview (don't commit yet)
  const handleBulkSchedule = async () => {
    if (!currentUser) return;
    setBulkLoading(true);
    setBulkResult(null);
    setBulkPreview([]);
    const assignments: BulkAssignment[] = [];

    for (const caseItem of cases) {
      try {
        const patient = patients.find((p) => p.id === caseItem.patientId);
        if (!patient) continue;

        let patLat = patient.latitude;
        let patLon = patient.longitude;
        if (!patLat || !patLon) {
          const geo = await geocodeAddress(patient.address);
          if (geo) { patLat = geo.lat; patLon = geo.lon; }
        }
        if (!patLat || !patLon) continue;

        const nearest = findNearestClinic(patLat, patLon, clinics);
        if (!nearest) continue;

        const clinic = clinics.find((c) => c.id === nearest.clinicId);
        if (!clinic) continue;

        let profiles = await getRadioSchedulesByClinic(nearest.clinicId);
        if (profiles.length === 0) profiles = await getRadioScheduleProfiles();
        const modality = extractModality(caseItem.scanType);
        const bestId = recommendBestRadiographer(profiles, modality);
        if (!bestId) continue;

        const bestProfile = profiles.find((p) => p.userId === bestId);
        const slot = bestProfile ? getEarliestSlot(bestProfile.schedule) : null;
        if (!slot) continue;

        assignments.push({
          caseId: caseItem.id,
          caseNumber: caseItem.caseNumber,
          patientName: caseItem.patientName,
          scanType: caseItem.scanType,
          clinicId: nearest.clinicId,
          clinicName: clinic.name,
          radiographerId: bestId,
          radiographerName: bestProfile?.userName || '',
          scheduledAt: `${slot.date}T${slot.startTime}`,
          distanceKm: nearest.distanceKm,
        });
      } catch {}
    }

    setBulkPreview(assignments);
    setBulkLoading(false);
    setShowBulkReview(true);
  };

  // Confirm all bulk assignments
  const handleBulkConfirm = async () => {
    if (!currentUser) return;
    setBulkLoading(true);
    let successCount = 0;
    const toSchedule = bulkPreview.filter((a) => !a.excluded);

    for (const assignment of toSchedule) {
      try {
        await editCase(assignment.caseId, {
          status: 'SCHEDULED',
          scheduledAt: new Date(assignment.scheduledAt).toISOString(),
          clinicId: assignment.clinicId,
          clinicName: assignment.clinicName,
          radiographerId: assignment.radiographerId,
          radiographerName: assignment.radiographerName,
        });
        await addAuditLog({
          userId: currentUser.id, userName: currentUser.name, userRole: currentUser.role,
          action: 'CASE_SCHEDULED', target: `cases/${assignment.caseId}`,
          details: `Bulk: ${assignment.caseNumber} at ${assignment.clinicName} with ${assignment.radiographerName}`,
          timestamp: new Date().toISOString(),
        });
        successCount++;
      } catch {}
    }

    setBulkLoading(false);
    setBulkResult({ total: toSchedule.length, success: successCount, failed: toSchedule.length - successCount });
    setShowBulkReview(false);
    setBulkPreview([]);
    drawBulkRoutes();
  };

  // Draw multiple routes on map for all scheduled cases
  const drawBulkRoutes = async () => {
    const map = mapInstance.current;
    const markers = markersLayer.current;
    if (!map || !markers) return;
    markers.clearLayers();
    if (routeLayer.current) { map.removeLayer(routeLayer.current); routeLayer.current = null; }

    // Add all clinic markers
    allClinics.filter((c) => c.status === 'active').forEach((clinic) => {
      const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
        radius: 9, fillColor: '#1B2B5B', color: '#1B2B5B', weight: 2, opacity: 1, fillOpacity: 0.85,
      });
      marker.bindPopup(`<strong>${clinic.name}</strong>`);
      markers.addLayer(marker);
    });

    // Draw routes for recently scheduled cases
    const scheduledCases = allCases.filter((c) => c.status === 'SCHEDULED' && c.clinicId);
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

    for (let i = 0; i < Math.min(scheduledCases.length, 25); i++) {
      const c = scheduledCases[i];
      const patient = allPatients.find((p) => p.id === c.patientId);
      const clinic = allClinics.find((cl) => cl.id === c.clinicId);
      if (!patient || !clinic) continue;

      let patLat = patient.latitude;
      let patLon = patient.longitude;
      if (!patLat || !patLon) {
        const geo = await geocodeAddress(patient.address);
        if (geo) { patLat = geo.lat; patLon = geo.lon; }
      }
      if (!patLat || !patLon) continue;

      // Add patient marker
      const patientMarker = L.marker([patLat, patLon], {
        icon: L.divIcon({ className: '', html: `<div style="background:${colors[i % colors.length]};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }),
      });
      patientMarker.bindPopup(`<strong>${c.caseNumber}</strong><br/><small>${patient.name} → ${clinic.name}</small>`);
      markers.addLayer(patientMarker);

      // Draw route — thick and visible
      try {
        const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
        if (route.polylineCoords.length > 0) {
          L.polyline(route.polylineCoords, { color: colors[i % colors.length], weight: 4, opacity: 0.85 }).addTo(map);
        }
      } catch {}
    }

    // Fit map to show all markers
    const allLayers = markers.getLayers();
    if (allLayers.length > 0) {
      const group = L.featureGroup(allLayers);
      map.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
  };

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-surface-300">
        <h1 className="text-base font-bold text-navy-800">AI Scheduling Dispatch</h1>
        <div className="flex items-center gap-1 text-xs">
          {(['select-case', 'map-routing', 'assign-radiographer', 'confirm'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-surface-400" />}
              <span className={`px-2 py-1 rounded-md ${step === s ? 'bg-navy-600 text-white font-medium' : 'text-surface-500'}`}>
                {i + 1}. {s === 'select-case' ? 'Case' : s === 'map-routing' ? 'Route' : s === 'assign-radiographer' ? 'Assign' : 'Done'}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Map — hidden on mobile */}
        <div className="hidden lg:block flex-1 relative">
          <div ref={mapRef} className="h-full w-full" />
          {routeInfo && step !== 'select-case' && !routeLoading && (
            <div className="absolute top-4 left-4 bg-white border border-surface-300 rounded-xl p-4 shadow-elevated z-[1000] max-w-[240px]">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4 text-navy-600" />
                <span className="text-xs font-semibold text-surface-500 uppercase">Route</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-surface-500">Distance</p><p className="text-lg font-bold text-navy-800">{routeInfo.distanceKm} <span className="text-xs font-normal">km</span></p></div>
                <div><p className="text-[10px] text-surface-500">Time</p><p className="text-lg font-bold text-navy-800">{routeInfo.durationMinutes} <span className="text-xs font-normal">min</span></p></div>
              </div>
              {selectedClinic && <p className="text-xs text-surface-600 mt-2 pt-2 border-t border-surface-200">{selectedClinic.name}</p>}
            </div>
          )}
          {routeLoading && (
            <div className="absolute top-4 left-4 bg-white border border-surface-300 rounded-xl px-4 py-3 shadow-elevated z-[1000]">
              <div className="flex items-center gap-2 text-surface-600 text-sm">
                <div className="w-4 h-4 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                Calculating route...
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[370px] bg-white border-l border-surface-300 overflow-y-auto">
          <div className="p-4 lg:p-5 space-y-4">
            {step === 'select-case' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-navy-600" />
                    <h2 className="text-sm font-semibold text-navy-800">Select Case</h2>
                  </div>
                  {cases.length > 1 && (
                    <button onClick={handleBulkSchedule} disabled={bulkLoading} className="text-xs text-navy-600 hover:text-navy-800 font-medium bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg border border-navy-200 transition-colors disabled:opacity-50">
                      {bulkLoading ? 'Scheduling...' : `Schedule All (${cases.length})`}
                    </button>
                  )}
                </div>
                {bulkResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                    <p className="font-medium">Scheduling complete</p>
                    <p className="mt-0.5">{bulkResult.success} of {bulkResult.total} cases scheduled.</p>
                    {bulkResult.failed > 0 && <p className="text-amber-600 mt-0.5">{bulkResult.failed} could not be scheduled.</p>}
                  </div>
                )}
                {/* Bulk Review Panel */}
                {showBulkReview && bulkPreview.length > 0 && (
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-800">Review Assignments ({bulkPreview.filter((a) => !a.excluded).length} of {bulkPreview.length})</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">Uncheck cases you don't want to schedule. Then confirm.</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                      {bulkPreview.map((a) => (
                        <div key={a.caseId} className={`p-2.5 rounded-lg border text-xs transition-all ${a.excluded ? 'bg-surface-50 border-surface-200 opacity-50' : 'bg-white border-surface-300'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono font-semibold text-navy-600">{a.caseNumber}</p>
                              <p className="text-surface-700 font-medium truncate">{a.patientName}</p>
                              <p className="text-surface-500">{a.scanType}</p>
                              <p className="text-surface-500">→ {a.clinicName}</p>
                              <p className="text-surface-500">⊕ {a.radiographerName}</p>
                              <p className="text-emerald-600">{a.scheduledAt.replace('T', ' ')}</p>
                            </div>
                            <button
                              onClick={() => setBulkPreview((prev) => prev.map((p) => p.caseId === a.caseId ? { ...p, excluded: !p.excluded } : p))}
                              className={`w-6 h-6 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${a.excluded ? 'border-surface-300 bg-white' : 'border-navy-500 bg-navy-600 text-white'}`}
                            >
                              {!a.excluded && <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => { setShowBulkReview(false); setBulkPreview([]); }} className="btn-secondary flex-1 text-xs">Cancel</button>
                      <button onClick={handleBulkConfirm} disabled={bulkLoading || bulkPreview.filter((a) => !a.excluded).length === 0} className="btn-primary flex-1 text-xs disabled:opacity-50">
                        {bulkLoading ? 'Scheduling...' : `Confirm (${bulkPreview.filter((a) => !a.excluded).length})`}
                      </button>
                    </div>
                  </div>
                )}
                {cases.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-60" />
                    <p className="text-sm text-surface-600 font-medium">All cases scheduled</p>
                    <p className="text-xs text-surface-400">{allCases.filter((c) => c.status === 'SCHEDULED').length} cases currently scheduled. Routes displayed on map.</p>
                    <button onClick={drawBulkRoutes} className="text-xs text-navy-600 hover:text-navy-800 font-medium bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-lg border border-navy-200 transition-colors">
                      Refresh Map Routes
                    </button>
                  </div>
                ) : (
                  cases.map((c) => (
                    <button key={c.id} onClick={() => handleCaseSelect(c)} className="w-full text-left p-3 rounded-lg bg-surface-100 border border-surface-200 hover:border-navy-300 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-navy-600 font-medium">{c.caseNumber}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-sm font-medium text-surface-800">{c.patientName}</p>
                      <p className="text-xs text-surface-500">{c.scanType} &middot; {c.disease || ''}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {step === 'map-routing' && selectedCase && selectedPatient && (
              <div className="space-y-4">
                <div className="p-3 bg-surface-100 rounded-lg border border-surface-200">
                  <p className="text-xs text-surface-500 mb-1">Patient</p>
                  <p className="text-sm font-medium text-navy-800">{selectedPatient.name}</p>
                  <p className="text-xs text-surface-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {selectedPatient.address}</p>
                  <p className="text-xs text-surface-500 mt-1">Scan: <span className="text-navy-600 font-medium">{selectedCase.scanType}</span></p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase mb-1">Healthcare Centre</label>
                  <select value={selectedClinicId || ''} onChange={(e) => handleClinicChange(e.target.value)} className="select-field text-sm">
                    {clinics.filter((c) => c.status === 'active').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.id === recommendedClinicId ? ' (Nearest)' : ''}</option>
                    ))}
                  </select>
                  {recommendedClinicId === selectedClinicId && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Nearest facility selected</p>}
                </div>

                {routeInfo && (
                  <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] text-surface-500">Distance</p><p className="text-base font-bold text-navy-800">{routeInfo.distanceKm} km</p></div>
                    <div><p className="text-[10px] text-surface-500">Travel Time</p><p className="text-base font-bold text-navy-800">{routeInfo.durationMinutes} min</p></div>
                  </div>
                )}

                <button onClick={handleProceedToAssignment} disabled={!selectedClinicId || routeLoading} className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
                  Proceed to Assignment <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="btn-ghost w-full text-sm">&larr; Back</button>
              </div>
            )}

            {step === 'assign-radiographer' && selectedCase && (
              <div className="space-y-4">
                <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 flex items-center justify-between">
                  <div><p className="text-xs text-surface-500">Case</p><p className="text-sm font-medium text-navy-700">{selectedCase.caseNumber}</p></div>
                  <div className="text-right"><p className="text-xs text-surface-500">Clinic</p><p className="text-sm text-emerald-600 font-medium">{selectedClinic?.name}</p></div>
                </div>

                <RadiograperSelector
                  profiles={scheduleProfiles}
                  requiredModality={extractModality(selectedCase.scanType)}
                  selectedId={selectedRadiographerId}
                  recommendedId={recommendedRadiographerId}
                  onSelect={handleRadiographerSelect}
                />

                {/* AI-Recommended Appointment */}
                {selectedRadiographerId && appointmentTime && (
                  <div className="space-y-3">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700 uppercase">Recommended Appointment</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div><p className="text-[10px] text-emerald-600">Date</p><p className="text-sm font-bold text-navy-800">{new Date(appointmentTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                        <div><p className="text-[10px] text-emerald-600">Time</p><p className="text-sm font-bold text-navy-800">{new Date(appointmentTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p></div>
                        <div><p className="text-[10px] text-emerald-600">Est. Duration</p><p className="text-sm font-medium text-navy-800">30 min</p></div>
                        <div><p className="text-[10px] text-emerald-600">Est. Travel</p><p className="text-sm font-medium text-navy-800">{routeInfo?.durationMinutes || '—'} min</p></div>
                      </div>
                    </div>

                    {/* Override option */}
                    <AppointmentOverride
                      scheduleProfiles={scheduleProfiles}
                      selectedRadiographerId={selectedRadiographerId}
                      currentTime={appointmentTime}
                      onChangeTime={(t) => setAppointmentTime(t)}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStep('map-routing')} className="btn-secondary flex-1 text-sm">&larr; Back</button>
                  <button onClick={handleConfirm} disabled={!selectedRadiographerId || !appointmentTime || confirming} className="btn-primary flex-1 disabled:opacity-50">
                    {confirming ? 'Confirming...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            )}

            {step === 'confirm' && success && (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-800">Appointment Confirmed</h2>
                  <p className="text-sm text-surface-500 mt-1">{selectedCase?.caseNumber} scheduled.</p>
                </div>
                <div className="p-3 bg-surface-100 rounded-lg border border-surface-200 text-left text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-surface-500">Patient</span><span className="text-surface-800">{selectedCase?.patientName}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Scan</span><span className="text-surface-800">{selectedCase?.scanType}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Clinic</span><span className="text-emerald-600">{selectedClinic?.name}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Radiographer</span><span className="text-surface-800">{scheduleProfiles.find((p) => p.userId === selectedRadiographerId)?.userName}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Date/Time</span><span className="text-surface-800">{appointmentTime.replace('T', ' ')}</span></div>
                  {routeInfo && <div className="flex justify-between"><span className="text-surface-500">Travel</span><span className="text-surface-800">{routeInfo.distanceKm}km / ~{routeInfo.durationMinutes}min</span></div>}
                </div>
                <button onClick={handleReset} className="btn-primary w-full">Schedule Another</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Appointment Override Component
function AppointmentOverride({ scheduleProfiles, selectedRadiographerId, currentTime, onChangeTime }: {
  scheduleProfiles: import('../../types').RadioScheduleProfile[];
  selectedRadiographerId: string;
  currentTime: string;
  onChangeTime: (time: string) => void;
}) {
  const [showSlots, setShowSlots] = React.useState(false);
  const profile = scheduleProfiles.find((p) => p.userId === selectedRadiographerId);
  if (!profile) return null;

  const slots = getAvailableSlots(profile.schedule, 8).filter(
    (s) => `${s.date}T${s.startTime}` !== currentTime
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowSlots(!showSlots)}
        className="text-xs text-navy-600 hover:text-navy-700 font-medium underline underline-offset-2"
      >
        {showSlots ? 'Hide alternative slots' : 'Change Appointment'}
      </button>
      {showSlots && (
        <div className="mt-2 p-3 bg-surface-50 border border-surface-200 rounded-lg">
          <p className="text-[10px] text-surface-500 mb-2">Alternative available slots:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {slots.map((s) => {
              const timeStr = `${s.date}T${s.startTime}`;
              return (
                <button
                  key={timeStr}
                  type="button"
                  onClick={() => { onChangeTime(timeStr); setShowSlots(false); }}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-surface-300 text-surface-700 hover:border-navy-300 hover:bg-navy-50 transition-colors text-center"
                >
                  {s.startTime}
                  <span className="block text-[9px] text-surface-400 font-normal">{s.date}</span>
                </button>
              );
            })}
          </div>
          {slots.length === 0 && <p className="text-[10px] text-surface-400 text-center py-2">No other slots available.</p>}
        </div>
      )}
    </div>
  );
}
