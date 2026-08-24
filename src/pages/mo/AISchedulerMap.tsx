import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { buildLiveRadioSchedules } from '../../services/dataService';
import { getRoute, findNearestClinic, geocodeAddress } from '../../services/routingService';
import {
  extractModality,
  getEarliestSlot,
  getAvailableSlots,
  recommendBestRadiographer,
  slotToDateTimeValue,
  timeToMinutes,
} from '../../components/scheduling/RadiograperSelector';
import RadiograperSelector from '../../components/scheduling/RadiograperSelector';
import type { Case, Clinic, Patient, RadioScheduleProfile, RouteInfo, SeverityLevel, User } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import SeverityBadge from '../../components/ui/SeverityBadge';
import { getCaseIndication } from '../../utils/caseDisplay';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  ChevronRight,
  Calendar,
  Zap,
  Loader2,
  Users,
  Layers,
  ArrowRight,
  RotateCw,
  Activity,
  AlertTriangle,
  FileText,
  UserCheck,
  TrendingUp,
} from 'lucide-react';

type Step = 'select-case' | 'map-routing' | 'assign-radiographer' | 'confirm';
type SchedulerMode = 'itinerary' | 'intake';
type SeverityFilter = 'All' | SeverityLevel;

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

// Coordinate cache shared across the lifetime of the page
const geocodeCache = new Map<string, { lat: number; lon: number }>();

// Route cache to avoid refetching routes
const routeCache = new Map<string, L.Polyline>();

// Run up to `concurrency` promises at a time
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress?: (done: number, total: number) => void
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;
  let done = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      try {
        const taskPromise = tasks[idx]();
        const timeoutPromise = new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), 4000)
        );
        results[idx] = { status: 'fulfilled', value: await Promise.race([taskPromise, timeoutPromise]) };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
      done++;
      onProgress?.(done, tasks.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// Geocode with cache
async function cachedGeocode(address: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  const result = await geocodeAddress(address);
  if (result) geocodeCache.set(address, result);
  return result;
}

function createSyntheticPatient(caseItem: Case): Patient {
  return {
    id: caseItem.patientId || `pat-${caseItem.id}`,
    name: caseItem.patientName || 'Unknown Patient',
    dob: '1995-01-01',
    gender: ((caseItem as any).patientGender || 'Other') as any,
    phone: (caseItem as any).patientPhone || '',
    email: '',
    address: (caseItem as any).patientAddress || 'Kuala Lumpur, Malaysia',
    latitude: (caseItem as any).patientLatitude || 3.1390,
    longitude: (caseItem as any).patientLongitude || 101.6869,
    medicalHistory: [],
    nric: (caseItem as any).icNumber || '',
    mrn: `MRN-${caseItem.id}`,
    preferredClinicId: caseItem.clinicId,
  };
}

export default function AISchedulerMap() {
  const { currentUser } = useAuth();
  const { cases: allCases, clinics: allClinics, patients: allPatients, users, trash, editCase, addAuditLog } = useData();
  const { addNotification } = useNotifications();

  // Mode: 'itinerary' (Radiographer Workload & Route Map) or 'intake' (4-step intake dispatch)
  const [schedulerMode, setSchedulerMode] = useState<SchedulerMode>('itinerary');

  const pendingCases = useMemo(() => allCases.filter((c) => c.status === 'CREATED' || c.status === 'CASE_CREATED' || c.status === 'SCHEDULING'), [allCases]);
  const scheduledCases = useMemo(() => allCases.filter((c) => c.status === 'SCHEDULED' || c.status === 'SCANNING' || c.status === 'COMPLETED'), [allCases]);
  
  const clinics = useMemo(
    () => (allClinics.some((c) => c.status === 'active') ? allClinics.filter((c) => c.status === 'active') : allClinics),
    [allClinics]
  );
  const patients = allPatients;

  // Active radiographers list from live database
  const deletedUserIds = useMemo(
    () => new Set((trash || []).filter((t) => t.type === 'user' && t.data).map((t) => t.data.id)),
    [trash]
  );

  const radiographers = useMemo(() => {
    return (users || []).filter((u) => u.role === 'Radiographer' && !deletedUserIds.has(u.id));
  }, [users, deletedUserIds]);

  const allScheduleProfiles = useMemo(() => {
    return buildLiveRadioSchedules(users, allClinics, deletedUserIds);
  }, [users, allClinics, deletedUserIds]);

  // Selected Radiographer in Itinerary View
  const [selectedRadioId, setSelectedRadioId] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  
  // Reassign Modal State
  const [reassignModalCase, setReassignModalCase] = useState<Case | null>(null);
  const [reassignTargetRadioId, setReassignTargetRadioId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);

  // Stepper Intake State
  const [scheduleProfiles, setScheduleProfiles] = useState<RadioScheduleProfile[]>([]);
  const [step, setStep] = useState<Step>('select-case');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const selectedClinic = useMemo(
    () => clinics.find((c) => c.id === selectedClinicId) || allClinics.find((c) => c.id === selectedClinicId) || null,
    [clinics, allClinics, selectedClinicId]
  );
  const [recommendedClinicId, setRecommendedClinicId] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedRadiographerId, setSelectedRadiographerId] = useState<string | null>(null);
  const [recommendedRadiographerId, setRecommendedRadiographerId] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  // Bulk Dispatch State
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [bulkPreview, setBulkPreview] = useState<BulkAssignment[]>([]);
  const [showBulkReview, setShowBulkReview] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; phase: string } | null>(null);

  // Set initial selected radiographer
  useEffect(() => {
    if (radiographers.length > 0 && !selectedRadioId) {
      setSelectedRadioId(radiographers[0].id);
    }
  }, [radiographers, selectedRadioId]);

  useEffect(() => {
    setScheduleProfiles(allScheduleProfiles);
  }, [allScheduleProfiles]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const routesLayer = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([3.14, 101.69], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapInstance.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Selected Radiographer object
  const activeRadiographer = useMemo(() => {
    return radiographers.find((r) => r.id === selectedRadioId) || radiographers[0] || null;
  }, [radiographers, selectedRadioId]);

  // Cases assigned to active radiographer
  const activeRadioCases = useMemo(() => {
    if (!activeRadiographer) return [];
    return allCases.filter(
      (c) =>
        c.radiographerId === activeRadiographer.id ||
        (c.radiographerName && c.radiographerName.toLowerCase() === activeRadiographer.name.toLowerCase())
    ).sort((a, b) => {
      const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [allCases, activeRadiographer]);

  // Triage filter counts for active radiographer
  const triageStats = useMemo(() => {
    const mild = activeRadioCases.filter((c) => c.severity === 'Mild').length;
    const moderate = activeRadioCases.filter((c) => c.severity === 'Moderate' || !c.severity).length;
    const severe = activeRadioCases.filter((c) => c.severity === 'Severe').length;
    const critical = activeRadioCases.filter((c) => c.severity === 'Critical').length;
    return { mild, moderate, severe, critical, total: activeRadioCases.length };
  }, [activeRadioCases]);

  // Filtered cases by severity
  const displayedRadioCases = useMemo(() => {
    if (severityFilter === 'All') return activeRadioCases;
    if (severityFilter === 'Moderate') {
      return activeRadioCases.filter((c) => c.severity === 'Moderate' || !c.severity);
    }
    return activeRadioCases.filter((c) => c.severity === severityFilter);
  }, [activeRadioCases, severityFilter]);

  // 3-Day Workload Utilization (1,440 min total capacity = 3 days * 8h * 60m)
  const MAX_3DAY_MINUTES = 1440;
  const totalAssignedMinutes = useMemo(() => {
    return activeRadioCases.length * 25; // 25 min standard scan duration per case
  }, [activeRadioCases]);
  const utilizationPct = Math.min(100, Math.round((totalAssignedMinutes / MAX_3DAY_MINUTES) * 100));

  // Radiographer Route Itinerary on Map
  const drawRadiographerItinerary = useCallback(async (radioCases: Case[]) => {
    const map = mapInstance.current;
    const markers = markersLayer.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (routeLayer.current) { map.removeLayer(routeLayer.current); routeLayer.current = null; }
    if (routesLayer.current) { map.removeLayer(routesLayer.current); routesLayer.current = null; }

    const waypoints: [number, number][] = [];
    const stopLabels: string[] = [];

    // Map through cases in chronological sequence to find stops
    const stopsMap = new Map<string, { clinic: Clinic; caseCount: number; firstCase: Case }>();

    for (const c of radioCases) {
      const clinic = clinics.find((cl) => cl.id === c.clinicId) || clinics.find((cl) => cl.name === c.clinicName);
      if (clinic && clinic.latitude && clinic.longitude) {
        if (!stopsMap.has(clinic.id)) {
          stopsMap.set(clinic.id, { clinic, caseCount: 1, firstCase: c });
        } else {
          const existing = stopsMap.get(clinic.id)!;
          existing.caseCount += 1;
        }
      }
    }

    const stops = Array.from(stopsMap.values());

    stops.forEach((stop, index) => {
      const { clinic, caseCount, firstCase } = stop;
      waypoints.push([clinic.latitude, clinic.longitude]);
      stopLabels.push(clinic.name);

      const isFirst = index === 0;
      const markerHtml = `
        <div style="background:#0F4C42;color:#FFFFFF;width:26px;height:26px;border-radius:50%;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,76,66,0.4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;font-family:sans-serif;">
          ${index + 1}
        </div>
      `;

      const marker = L.marker([clinic.latitude, clinic.longitude], {
        icon: L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      });

      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px;">
          <div style="font-size:10px;font-weight:bold;color:#0F4C42;text-transform:uppercase;margin-bottom:2px;">Stop ${index + 1} ${isFirst ? '(Next Destination)' : ''}</div>
          <strong style="font-size:13px;color:#112A28;">${clinic.name}</strong>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">${clinic.address}</div>
          <div style="margin-top:6px;padding-top:4px;border-top:1px solid #E2E8F0;font-size:11px;color:#0F4C42;font-weight:600;">
            ${caseCount} case${caseCount > 1 ? 's' : ''} assigned
          </div>
        </div>
      `);

      markers.addLayer(marker);
    });

    // Draw route connecting sequential stops
    if (waypoints.length > 1) {
      const polylines: [number, number][][] = [];
      for (let i = 0; i < waypoints.length - 1; i++) {
        const from = waypoints[i];
        const to = waypoints[i + 1];
        try {
          const route = await getRoute(from[0], from[1], to[0], to[1]);
          if (route && route.polylineCoords.length > 0) {
            polylines.push(route.polylineCoords);
          } else {
            polylines.push([from, to]);
          }
        } catch {
          polylines.push([from, to]);
        }
      }

      const flatCoords = polylines.flat();
      if (flatCoords.length > 0) {
        routeLayer.current = L.polyline(flatCoords, {
          color: '#0F4C42',
          weight: 4,
          opacity: 0.85,
          dashArray: undefined,
        }).addTo(map);
      }

      const bounds = L.latLngBounds(waypoints);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (waypoints.length === 1) {
      map.setView(waypoints[0], 13);
    } else {
      // If no assigned cases yet, show all active clinics
      clinics.forEach((clinic) => {
        const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
          radius: 7,
          fillColor: '#94A3B8',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });
        marker.bindPopup(`<strong>${clinic.name}</strong><br/><small>${clinic.address}</small>`);
        markers.addLayer(marker);
      });
      map.setView([3.14, 101.69], 10);
    }
  }, [clinics]);

  // Update Itinerary map whenever radiographer or assigned cases change
  useEffect(() => {
    if (schedulerMode === 'itinerary' && activeRadioCases) {
      drawRadiographerItinerary(activeRadioCases);
    }
  }, [schedulerMode, activeRadioCases, drawRadiographerItinerary]);

  // Clear routes on map
  const clearMapRoutes = useCallback(() => {
    const map = mapInstance.current;
    const markers = markersLayer.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (routeLayer.current) {
      map.removeLayer(routeLayer.current);
      routeLayer.current = null;
    }
    if (routesLayer.current) {
      map.removeLayer(routesLayer.current);
      routesLayer.current = null;
    }

    clinics.forEach((clinic) => {
      const marker = L.circleMarker([clinic.latitude, clinic.longitude], {
        radius: 8,
        fillColor: '#0F4C42',
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });
      marker.bindPopup(`<strong>${clinic.name}</strong><br/><small>${clinic.address}</small>`);
      markers.addLayer(marker);
    });

    map.setView([3.14, 101.69], 10);
  }, [clinics]);

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
          fillColor: isSelected ? '#0F4C42' : isRecommended ? '#8FBEB2' : '#94A3B8',
          color: isSelected ? '#0B3931' : '#64748B',
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
            html: `<div style="background:#0F4C42;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,76,66,0.28)"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        });
        patientMarker.bindPopup(`<strong>${patient.name}</strong><br/><small>${patient.address}</small>`);
        markers.addLayer(patientMarker);
      }

      if (route && route.polylineCoords.length > 0) {
        routeLayer.current = L.polyline(route.polylineCoords, { color: '#0F4C42', weight: 4, opacity: 0.82 }).addTo(map);
        const bounds = L.latLngBounds(route.polylineCoords.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (patient && patient.latitude && patient.longitude) {
        map.setView([patient.latitude, patient.longitude], 13);
      }
    },
    [clinics, recommendedClinicId]
  );

  // Single Case Selection (Stepper Mode)
  const handleCaseSelect = async (caseItem: Case) => {
    setSelectedCase(caseItem);
    setSuccess(false);

    const patient: Patient =
      patients.find((p) => p.id === caseItem.patientId) ||
      patients.find((p) => p.name?.trim().toLowerCase() === caseItem.patientName?.trim().toLowerCase()) ||
      createSyntheticPatient(caseItem);

    setSelectedPatient(patient);

    let patLat = patient.latitude;
    let patLon = patient.longitude;
    if (!patLat || !patLon) {
      setRouteLoading(true);
      const geo = await cachedGeocode(patient.address);
      if (geo) {
        patLat = geo.lat;
        patLon = geo.lon;
        patient.latitude = geo.lat;
        patient.longitude = geo.lon;
      }
      setRouteLoading(false);
    }

    if (!patLat || !patLon) {
      patLat = 3.1390;
      patLon = 101.6869;
      patient.latitude = patLat;
      patient.longitude = patLon;
    }

    const nearest = findNearestClinic(patLat, patLon, clinics);
    const nearestId = nearest?.clinicId || (clinics[0]?.id || null);
    setRecommendedClinicId(nearestId);

    const userPreferredId = caseItem.clinicId || patient.preferredClinicId;
    const isValidUserChoice = userPreferredId && clinics.some((c) => c.id === userPreferredId);
    const activeClinicId = isValidUserChoice ? userPreferredId : nearestId;

    setSelectedClinicId(activeClinicId);

    if (activeClinicId) {
      const clinic = clinics.find((c) => c.id === activeClinicId);
      if (clinic) {
        setRouteLoading(true);
        const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
        setRouteInfo(route);
        setRouteLoading(false);
        updateMap(patient, activeClinicId, route);
      } else {
        updateMap(patient, activeClinicId, null);
      }
    } else {
      updateMap(patient, null, null);
    }

    setStep('map-routing');
  };

  const handleClinicChange = async (clinicId: string) => {
    setSelectedClinicId(clinicId);
    setSelectedRadiographerId(null);
    setRecommendedRadiographerId(null);
    setAppointmentTime('');
    setScheduleProfiles(allScheduleProfiles);

    const pat: Patient = selectedPatient || (selectedCase ? createSyntheticPatient(selectedCase) : {
      id: '',
      name: 'Unknown Patient',
      dob: '1995-01-01',
      gender: 'Other' as any,
      phone: '',
      email: '',
      address: 'Kuala Lumpur, Malaysia',
      latitude: 3.1390,
      longitude: 101.6869,
      medicalHistory: [],
      nric: '',
      mrn: '',
      preferredClinicId: clinicId,
    });

    let patLat = pat.latitude;
    let patLon = pat.longitude;
    if (!patLat || !patLon) {
      const geo = await cachedGeocode(pat.address);
      if (geo) {
        patLat = geo.lat;
        patLon = geo.lon;
        pat.latitude = geo.lat;
        pat.longitude = geo.lon;
      }
    }
    if (!patLat || !patLon) {
      patLat = 3.1390;
      patLon = 101.6869;
    }

    const clinic = clinics.find((c) => c.id === clinicId);
    if (clinic) {
      setRouteLoading(true);
      const route = await getRoute(patLat, patLon, clinic.latitude, clinic.longitude);
      setRouteInfo(route);
      setRouteLoading(false);
      updateMap(pat, clinicId, route);
    }
  };

  const handleProceedToAssignment = async () => {
    if (!selectedClinicId || !selectedCase) return;
    setScheduleProfiles(allScheduleProfiles);
    const modality = extractModality(selectedCase.scanType);
    const onSiteProfiles = allScheduleProfiles.filter((s) => s.deployedClinicId === selectedClinicId);
    const bestId =
      recommendBestRadiographer(onSiteProfiles.length > 0 ? onSiteProfiles : allScheduleProfiles, modality, pendingCases) ||
      recommendBestRadiographer(allScheduleProfiles, modality, pendingCases);

    setSelectedRadiographerId(bestId);
    setRecommendedRadiographerId(bestId);
    if (bestId) {
      const bestProfile = allScheduleProfiles.find((p) => p.userId === bestId);
      if (bestProfile) {
        const slot = getEarliestSlot(bestProfile.schedule, bestId, pendingCases, undefined, selectedCase.id);
        if (slot) {
          const dateTimeValue = slotToDateTimeValue(slot.date, slot.startTime);
          setAppointmentTime(dateTimeValue || '');
        } else {
          setAppointmentTime('');
        }
      }
    }
    setStep('assign-radiographer');
  };

  const handleRadiographerSelect = (userId: string) => {
    setSelectedRadiographerId(userId);
    const profile = scheduleProfiles.find((p) => p.userId === userId);
    if (profile) {
      const slot = getEarliestSlot(profile.schedule, userId, pendingCases, undefined, selectedCase?.id);
      if (slot) {
        const dateTimeValue = slotToDateTimeValue(slot.date, slot.startTime);
        setAppointmentTime(dateTimeValue || '');
      } else {
        setAppointmentTime('');
      }
    }
  };

  const handleConfirm = async () => {
    if (!currentUser || !selectedCase || !selectedClinicId || !selectedRadiographerId || !appointmentTime) return;

    const appointmentDate = new Date(appointmentTime);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) {
      setAppointmentTime('');
      return;
    }

    setConfirming(true);
    const clinic = clinics.find((c) => c.id === selectedClinicId);
    const profile = scheduleProfiles.find((p) => p.userId === selectedRadiographerId);

    await editCase(selectedCase.id, {
      status: 'SCHEDULED',
      scheduledAt: new Date(appointmentTime).toISOString(),
      clinicId: selectedClinicId,
      clinicName: clinic?.name || '',
      radiographerId: selectedRadiographerId,
      radiographerName: profile?.userName || '',
    });
    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CASE_SCHEDULED',
      target: `cases/${selectedCase.id}`,
      details: `AI Scheduler: ${selectedCase.caseNumber} at ${clinic?.name} with ${profile?.userName} on ${appointmentTime}.`,
      timestamp: new Date().toISOString(),
    });
    addNotification({
      userId: selectedRadiographerId,
      title: 'New Case Assigned',
      message: `Case ${selectedCase.caseNumber} scheduled for ${appointmentTime}.`,
      type: 'info',
    });
    if (selectedCase.registeredById) {
      addNotification({
        userId: selectedCase.registeredById,
        title: 'Case Scheduled',
        message: `Case ${selectedCase.caseNumber} scheduled at ${clinic?.name}.`,
        type: 'success',
      });
    }

    setConfirming(false);
    setSuccess(true);
    setStep('confirm');
  };

  const handleReset = () => {
    setStep('select-case');
    setSelectedCase(null);
    setSelectedPatient(null);
    setSelectedClinicId(null);
    setRecommendedClinicId(null);
    setRouteInfo(null);
    setSelectedRadiographerId(null);
    setRecommendedRadiographerId(null);
    setAppointmentTime('');
    setSuccess(false);
    clearMapRoutes();
  };

  // Reassign Case Handler
  const handleExecuteReassign = async () => {
    if (!reassignModalCase || !reassignTargetRadioId || !currentUser) return;
    setReassigning(true);
    try {
      const targetRadio = radiographers.find((r) => r.id === reassignTargetRadioId);
      if (!targetRadio) return;

      await editCase(reassignModalCase.id, {
        radiographerId: targetRadio.id,
        radiographerName: targetRadio.name,
      });

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_SCHEDULED',
        target: `cases/${reassignModalCase.id}`,
        details: `Reassigned ${reassignModalCase.caseNumber} to Radiographer ${targetRadio.name}`,
        timestamp: new Date().toISOString(),
      });

      addNotification({
        userId: targetRadio.id,
        title: 'Case Reassigned To You',
        message: `Case ${reassignModalCase.caseNumber} has been reassigned to you.`,
        type: 'info',
      });

      setReassignModalCase(null);
      setReassignTargetRadioId('');
    } catch (err) {
      console.error('Failed reassigning case:', err);
    } finally {
      setReassigning(false);
    }
  };

  // Bulk Auto-Scheduler
  const handleBulkSchedule = async () => {
    if (!currentUser || pendingCases.length === 0) return;

    routeCache.clear();
    setBulkLoading(true);
    setBulkResult(null);
    setBulkPreview([]);
    setBulkProgress({ done: 0, total: pendingCases.length, phase: 'Geocoding patients' });

    const [allProfiles, clinicProfileMap] = (() => {
      const all = allScheduleProfiles;
      const byClinic = new Map<string, RadioScheduleProfile[]>();
      for (const p of all) {
        const existing = byClinic.get(p.deployedClinicId) ?? [];
        existing.push(p);
        byClinic.set(p.deployedClinicId, existing);
      }
      return [all, byClinic] as const;
    })();

    const geocodeTasks = pendingCases.map((caseItem) => async () => {
      const patient: Patient =
        patients.find((p) => p.id === caseItem.patientId) ||
        patients.find((p) => p.name?.trim().toLowerCase() === caseItem.patientName?.trim().toLowerCase()) ||
        createSyntheticPatient(caseItem);

      let patLat = patient.latitude;
      let patLon = patient.longitude;
      if (!patLat || !patLon) {
        const geo = await cachedGeocode(patient.address);
        if (geo) {
          patLat = geo.lat;
          patLon = geo.lon;
          patient.latitude = geo.lat;
          patient.longitude = geo.lon;
        }
      }
      if (!patLat || !patLon) {
        patLat = 3.1390;
        patLon = 101.6869;
        patient.latitude = patLat;
        patient.longitude = patLon;
      }
      return { caseItem, patient, patLat, patLon };
    });

    const geocodeResults = await parallelLimit(geocodeTasks, 6, (done) => {
      setBulkProgress({ done, total: pendingCases.length, phase: 'Geocoding patient addresses' });
    });

    const assignments: BulkAssignment[] = [];
    const transientAssignedSlots = new Set<string>();

    for (const result of geocodeResults) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const { caseItem, patient, patLat, patLon } = result.value;

      const nearest = findNearestClinic(patLat, patLon, clinics);
      const userPreferredId = caseItem.clinicId || patient.preferredClinicId;
      const isValidChoice = userPreferredId && clinics.some((c) => c.id === userPreferredId);
      const targetClinicId = isValidChoice ? userPreferredId : (nearest?.clinicId || clinics[0]?.id || null);

      if (!targetClinicId) continue;
      const clinic = clinics.find((c) => c.id === targetClinicId);
      if (!clinic) continue;

      const profiles = (clinicProfileMap.get(targetClinicId) ?? []).length > 0
        ? clinicProfileMap.get(targetClinicId)!
        : allProfiles;

      const modality = extractModality(caseItem.scanType);
      const bestId = recommendBestRadiographer(profiles, modality, pendingCases);
      if (!bestId) continue;

      const bestProfile = profiles.find((p) => p.userId === bestId);
      const slot = bestProfile ? getEarliestSlot(bestProfile.schedule, bestId, pendingCases, transientAssignedSlots) : null;
      if (!slot) continue;

      const slotMinutes = timeToMinutes(slot.startTime);
      if (slotMinutes === null) continue;
      transientAssignedSlots.add(`${bestId}_${slot.date}_${slotMinutes}`);

      const scheduledAt = slotToDateTimeValue(slot.date, slot.startTime);
      if (!scheduledAt) continue;

      assignments.push({
        caseId: caseItem.id,
        caseNumber: caseItem.caseNumber,
        patientName: caseItem.patientName,
        scanType: caseItem.scanType,
        clinicId: targetClinicId,
        clinicName: clinic.name,
        radiographerId: bestId,
        radiographerName: bestProfile?.userName || '',
        scheduledAt,
        distanceKm: nearest?.distanceKm || 0,
      });
    }

    setBulkPreview(assignments);
    setBulkProgress(null);
    setBulkLoading(false);
    setShowBulkReview(true);
    setSchedulerMode('intake');
    setStep('select-case');
  };

  const handleBulkConfirm = async () => {
    if (!currentUser) return;
    setBulkLoading(true);
    const toSchedule = bulkPreview.filter((a) => !a.excluded);
    setBulkProgress({ done: 0, total: toSchedule.length, phase: 'Saving assignments' });

    const writeTasks = toSchedule.map((assignment) => async () => {
      await editCase(assignment.caseId, {
        status: 'SCHEDULED',
        scheduledAt: new Date(assignment.scheduledAt).toISOString(),
        clinicId: assignment.clinicId,
        clinicName: assignment.clinicName,
        radiographerId: assignment.radiographerId,
        radiographerName: assignment.radiographerName,
      });
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CASE_SCHEDULED',
        target: `cases/${assignment.caseId}`,
        details: `Auto Scheduler: ${assignment.caseNumber} at ${assignment.clinicName} with ${assignment.radiographerName}`,
        timestamp: new Date().toISOString(),
      }).catch(() => { });
      addNotification({
        userId: assignment.radiographerId,
        title: 'New Case Assigned',
        message: `Case ${assignment.caseNumber} has been scheduled for you.`,
        type: 'info',
      });
    });

    const writeResults = await parallelLimit(writeTasks, 8, (done) => {
      setBulkProgress({ done, total: toSchedule.length, phase: 'Saving assignments' });
    });

    const successCount = writeResults.filter((r) => r.status === 'fulfilled').length;
    const failedCount = writeResults.filter((r) => r.status === 'rejected').length;

    setBulkProgress(null);
    setBulkLoading(false);
    setBulkResult({ total: toSchedule.length, success: successCount, failed: failedCount });
    setShowBulkReview(false);
    setBulkPreview([]);
    setSchedulerMode('itinerary');
  };

  return (
    <div className="h-full flex flex-col -m-6 bg-[#F5F8F7]">
      
      {/* Top Main Navigation & Mode Switcher */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#DCE6E3] shrink-0">
        <div>
          <h1 className="text-base font-bold text-[#112A28]">National AI Multi-Equipment Scheduler</h1>
          <p className="text-xs text-surface-500">Dynamic capacity monitoring, mobile deployment, and AI load balancing</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#EAF1EF] p-1 rounded-xl border border-[#DCE6E3] text-xs">
            <button
              onClick={() => setSchedulerMode('itinerary')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                schedulerMode === 'itinerary' ? 'bg-[#0F4C42] text-white shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Radiographer Workload &amp; Itinerary
            </button>
            <button
              onClick={() => setSchedulerMode('intake')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                schedulerMode === 'intake' ? 'bg-[#0F4C42] text-white shadow-sm' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Intake Case Dispatch {pendingCases.length > 0 && `(${pendingCases.length})`}
            </button>
          </div>

          {schedulerMode === 'intake' && (
            <div className="hidden sm:flex items-center gap-1 text-xs">
              {(['select-case', 'map-routing', 'assign-radiographer', 'confirm'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-surface-400" />}
                  <span className={`px-2.5 py-1 rounded-full transition-all ${step === s ? 'bg-[#0F4C42] text-white font-semibold shadow-sm' : 'text-surface-500'}`}>
                    {i + 1}. {s === 'select-case' ? 'Case' : s === 'map-routing' ? 'Route' : s === 'assign-radiographer' ? 'Assign' : 'Done'}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Map & Workspace Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Interactive Leaflet Map */}
        <div className="flex-1 relative bg-[#EAF1EF] min-h-[360px]">
          <div ref={mapRef} className="h-full w-full" />

          {/* Floating Top Summary Chips on Map */}
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 flex-wrap pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md border border-[#DCE6E3] rounded-xl px-3 py-2 shadow-md flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-500 leading-none">Pending</p>
                <p className="text-sm font-bold text-surface-900 leading-tight">{pendingCases.length}</p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md border border-[#DCE6E3] rounded-xl px-3 py-2 shadow-md flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-500 leading-none">Scheduled</p>
                <p className="text-sm font-bold text-surface-900 leading-tight">{scheduledCases.length}</p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md border border-[#DCE6E3] rounded-xl px-3 py-2 shadow-md flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0F4C42]" />
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-500 leading-none">Locations</p>
                <p className="text-sm font-bold text-surface-900 leading-tight">{clinics.length}</p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md border border-[#DCE6E3] rounded-xl px-3 py-2 shadow-md flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
              <div>
                <p className="text-[10px] uppercase font-bold text-surface-500 leading-none">Demand</p>
                <p className="text-sm font-bold text-surface-900 leading-tight">
                  {((pendingCases.length * 25) / 60).toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          {/* Top-Right Run Auto-Scheduler Button */}
          <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
            <button
              onClick={handleBulkSchedule}
              disabled={bulkLoading || pendingCases.length === 0}
              className="bg-[#0F4C42] hover:bg-[#0B3931] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  Optimizing Allocations...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  Run AI Auto-Scheduler
                </>
              )}
            </button>
          </div>

          {/* Bottom Radiographer Switcher Bar */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-auto overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#DCE6E3] p-1.5 rounded-2xl shadow-xl max-w-full">
              <span className="text-[11px] font-bold text-surface-500 px-3 uppercase tracking-wider whitespace-nowrap">
                Radiographers:
              </span>
              {radiographers.map((r) => {
                const isSelected = selectedRadioId === r.id;
                const caseCount = allCases.filter((c) => c.radiographerId === r.id || c.radiographerName?.toLowerCase() === r.name.toLowerCase()).length;
                const initials = r.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRadioId(r.id);
                      setSchedulerMode('itinerary');
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#0F4C42] text-white shadow-md'
                        : 'bg-surface-100 hover:bg-surface-200 text-surface-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isSelected ? 'bg-white text-[#0F4C42]' : 'bg-[#0F4C42] text-white'
                    }`}>
                      {initials}
                    </div>
                    <span>{r.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-emerald-400 text-emerald-950' : 'bg-surface-300 text-surface-800'
                    }`}>
                      {caseCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Details Sidebar */}
        <div className="w-full lg:w-[460px] bg-white border-l border-[#DCE6E3] overflow-y-auto shrink-0 flex flex-col">
          
          {/* ========================================================================= */}
          {/* MODE 1: RADIOGRAPHER WORKLOAD & ITINERARY (Shafiq Transformation Slide View) */}
          {/* ========================================================================= */}
          {schedulerMode === 'itinerary' && activeRadiographer && (
            <div className="p-5 space-y-4 flex-1">
              
              {/* Radiographer Profile Header Card */}
              <div className="bg-[#F5F8F7] border border-[#DCE6E3] p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#0F4C42] text-white font-bold text-sm flex items-center justify-center border-2 border-white shadow-sm">
                      {activeRadiographer.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#112A28]">{activeRadiographer.name}</h2>
                      <p className="text-xs text-surface-500 font-medium">
                        {activeRadioCases.length} assigned · {activeRadioCases.filter((c) => c.status === 'COMPLETED').length} completed
                      </p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    utilizationPct > 90
                      ? 'bg-red-100 text-red-900 border border-red-200'
                      : utilizationPct < 50
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}>
                    {utilizationPct > 90 ? 'High Load' : utilizationPct < 50 ? 'Available' : 'Optimal'}
                  </span>
                </div>

                {/* 3-Day Workload Utilization Card */}
                <div className="space-y-1.5 pt-2 border-t border-[#DCE6E3]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-surface-700">Utilization across 3 days:</span>
                    <span className="font-mono font-bold text-[#0F4C42]">
                      {totalAssignedMinutes} / {MAX_3DAY_MINUTES} min &middot; {utilizationPct}%
                    </span>
                  </div>
                  
                  <div className="h-2.5 w-full bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        utilizationPct > 90 ? 'bg-red-600' : utilizationPct > 70 ? 'bg-[#0F4C42]' : 'bg-[#2E7D32]'
                      }`}
                      style={{ width: `${utilizationPct}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-surface-500">
                    <span>Target: max 480 min/day</span>
                    <span>{MAX_3DAY_MINUTES - totalAssignedMinutes > 0 ? `${MAX_3DAY_MINUTES - totalAssignedMinutes} min capacity left` : 'Capacity exceeded'}</span>
                  </div>
                </div>
              </div>

              {/* Triage Severity Filter Pills (All / Mild / Moderate / Severe / Critical) */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Triage Urgency Filter</p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSeverityFilter('All')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      severityFilter === 'All'
                        ? 'bg-[#112A28] text-white shadow-sm'
                        : 'bg-surface-100 hover:bg-surface-200 text-surface-700'
                    }`}
                  >
                    All ({triageStats.total})
                  </button>

                  <button
                    onClick={() => setSeverityFilter('Mild')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      severityFilter === 'Mild'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Mild ({triageStats.mild})
                  </button>

                  <button
                    onClick={() => setSeverityFilter('Moderate')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      severityFilter === 'Moderate'
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'bg-amber-100/80 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    Moderate ({triageStats.moderate})
                  </button>

                  <button
                    onClick={() => setSeverityFilter('Severe')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      severityFilter === 'Severe'
                        ? 'bg-orange-700 text-white shadow-sm'
                        : 'bg-orange-100/80 text-orange-900 hover:bg-orange-200'
                    }`}
                  >
                    Severe ({triageStats.severe})
                  </button>

                  <button
                    onClick={() => setSeverityFilter('Critical')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      severityFilter === 'Critical'
                        ? 'bg-red-700 text-white shadow-sm'
                        : 'bg-red-100 text-red-900 hover:bg-red-200'
                    }`}
                  >
                    Critical ({triageStats.critical})
                  </button>
                </div>
              </div>

              {/* Assigned Cases Itinerary List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-surface-700">
                    Schedule Itinerary ({displayedRadioCases.length} case{displayedRadioCases.length !== 1 ? 's' : ''})
                  </p>
                  <span className="text-[11px] text-surface-500 font-medium">
                    Total Time: ~{displayedRadioCases.length * 25} min
                  </span>
                </div>

                {displayedRadioCases.length === 0 ? (
                  <div className="text-center py-10 bg-[#F5F8F7] rounded-2xl border border-dashed border-[#DCE6E3] space-y-3">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-sm font-bold text-surface-800">No matching cases</p>
                    <p className="text-xs text-surface-500 max-w-xs mx-auto">
                      There are currently no cases matching this triage category for {activeRadiographer.name}.
                    </p>
                    {pendingCases.length > 0 && (
                      <button
                        onClick={handleBulkSchedule}
                        className="btn-primary text-xs mx-auto flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" /> Assign Pending Intake Cases ({pendingCases.length})
                      </button>
                    )}
                  </div>
                ) : (
                  displayedRadioCases.map((c, index) => {
                    const isNextStop = index === 0 && c.status !== 'COMPLETED';
                    const scheduledDate = c.scheduledAt ? new Date(c.scheduledAt) : null;
                    const formattedTime = scheduledDate
                      ? `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`
                      : '09:00';

                    return (
                      <div
                        key={c.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isNextStop
                            ? 'bg-white border-[#0F4C42] shadow-md ring-1 ring-[#0F4C42]/20'
                            : 'bg-white border-surface-200 shadow-sm hover:border-[#9FC8BE]'
                        }`}
                      >
                        {/* Top Tag & Severity */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#0F4C42]">{c.caseNumber}</span>
                            <span className="text-[11px] font-semibold bg-surface-100 text-surface-700 px-2 py-0.5 rounded-md">
                              {c.scanType || 'X-Ray'}
                            </span>
                            <SeverityBadge severity={c.severity || 'Moderate'} />
                          </div>

                          {isNextStop && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0F4C42] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Navigation className="w-2.5 h-2.5" /> Next Stop
                            </span>
                          )}
                        </div>

                        {/* Patient & Exam Description */}
                        <div className="space-y-1 text-xs">
                          <p className="text-sm font-bold text-[#112A28]">{c.patientName}</p>
                          <p className="text-surface-500 font-mono">
                            {((c as any).icNumber || (c as any).mrn || (c as any).patientId || 'IC: —')} &middot; <span className="text-surface-700 font-semibold">{getCaseIndication(c)}</span>
                          </p>
                        </div>

                        {/* Location, Time & Quick Reassign Footer */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-100">
                          <div className="flex items-center gap-1.5 text-xs text-surface-600">
                            <MapPin className="w-3.5 h-3.5 text-[#0F4C42]" />
                            <span className="font-semibold">{c.clinicName || 'Facility Center'}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              Gov
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#112A28] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-surface-400" />
                              {formattedTime} &middot; 25m
                            </span>

                            <button
                              onClick={() => {
                                setReassignModalCase(c);
                                setReassignTargetRadioId(radiographers.find((r) => r.id !== activeRadiographer.id)?.id || '');
                              }}
                              className="text-[11px] font-bold text-[#0F4C42] hover:text-[#0B3931] bg-[#F1F8F6] hover:bg-[#E4F2EE] px-2.5 py-1 rounded-lg border border-[#BFD8D1] transition-colors"
                            >
                              Reassign
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: INTAKE CASE DISPATCH STEPPER (Single or Bulk Intake Queue) */}
          {/* ========================================================================= */}
          {schedulerMode === 'intake' && (
            <div className="p-5 lg:p-6 space-y-5 flex-1">
              {step === 'select-case' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#0F4C42]" />
                      <h2 className="text-sm font-bold text-[#112A28]">Select Intake Case</h2>
                    </div>
                    {pendingCases.length > 1 && (
                      <button
                        onClick={handleBulkSchedule}
                        disabled={bulkLoading}
                        className="text-xs text-[#0F4C42] hover:text-[#112A28] font-medium bg-[#F1F8F6] hover:bg-[#E4F2EE] px-2.5 py-1.5 rounded-lg border border-[#BFD8D1] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {bulkLoading ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Processing...</>
                        ) : (
                          <><Zap className="w-3 h-3" /> Schedule All ({pendingCases.length})</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Bulk progress indicator */}
                  {bulkProgress && (
                    <div className="p-3 bg-[#F1F8F6] border border-[#BFD8D1] rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#16433B] font-medium flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-[#397267]" />
                          {bulkProgress.phase}
                        </span>
                        <span className="text-[#397267] tabular-nums">{bulkProgress.done}/{bulkProgress.total}</span>
                      </div>
                      <div className="h-1.5 bg-[#D4E8E2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0F4C42] rounded-full transition-all duration-200"
                          style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

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
                      <div className="p-3 bg-[#F4F8FB] border border-[#D7E4EE] rounded-xl">
                        <p className="text-xs font-bold text-[#31566D]">
                          Review Allocations ({bulkPreview.filter((a) => !a.excluded).length} of {bulkPreview.length})
                        </p>
                        <p className="text-[10px] text-[#5B7C90] mt-0.5">Uncheck any case you wish to exclude before committing.</p>
                      </div>

                      <div className="max-h-[280px] overflow-y-auto space-y-1.5">
                        {bulkPreview.map((a) => (
                          <div
                            key={a.caseId}
                            className={`p-2.5 rounded-lg border text-xs transition-all ${
                              a.excluded ? 'bg-surface-50 border-surface-200 opacity-50' : 'bg-white border-surface-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono font-bold text-[#0F4C42]">{a.caseNumber}</p>
                                <p className="text-surface-800 font-medium truncate">{a.patientName}</p>
                                <p className="text-surface-500">{a.scanType} &rarr; {a.clinicName}</p>
                                <p className="text-emerald-700 font-semibold">{a.radiographerName} &middot; {a.scheduledAt.replace('T', ' ')}</p>
                              </div>
                              <button
                                onClick={() => setBulkPreview((prev) =>
                                  prev.map((p) => p.caseId === a.caseId ? { ...p, excluded: !p.excluded } : p)
                                )}
                                className={`w-6 h-6 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                  a.excluded ? 'border-surface-300 bg-white' : 'border-[#0F4C42] bg-[#0F4C42] text-white'
                                }`}
                              >
                                {!a.excluded && <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setShowBulkReview(false);
                            setBulkPreview([]);
                          }}
                          disabled={bulkLoading}
                          className="btn-secondary flex-1 text-xs disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBulkConfirm}
                          disabled={bulkLoading || bulkPreview.filter((a) => !a.excluded).length === 0}
                          className="btn-primary flex-1 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {bulkLoading ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Committing...</>
                          ) : (
                            `Confirm (${bulkPreview.filter((a) => !a.excluded).length})`
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {pendingCases.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto opacity-70" />
                      <p className="text-sm text-slate-800 font-bold">Intake Queue Clear</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        There are currently no unscheduled clinical cases awaiting AI routing dispatch.
                      </p>
                    </div>
                  ) : (
                    !showBulkReview && pendingCases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCaseSelect(c)}
                        disabled={bulkLoading}
                        className="w-full text-left p-3.5 rounded-xl bg-white border border-surface-200 shadow-sm hover:border-[#9FC8BE] hover:shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-[#0F4C42] font-bold">{c.caseNumber}</span>
                          <SeverityBadge severity={c.severity || 'Moderate'} />
                        </div>
                        <p className="text-sm font-bold text-surface-800">{c.patientName}</p>
                        <p className="text-xs text-surface-500">{c.scanType} &middot; {getCaseIndication(c)}</p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Step 2: Route */}
              {step === 'map-routing' && selectedCase && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-white rounded-xl border border-surface-200 shadow-sm">
                    <p className="text-xs text-surface-500 mb-1 font-semibold">Patient</p>
                    <p className="text-sm font-bold text-[#112A28]">{selectedPatient?.name || selectedCase.patientName}</p>
                    <p className="text-xs text-surface-500 flex items-center gap-1 mt-1 font-medium">
                      <MapPin className="w-3 h-3 text-[#0F4C42]" /> {selectedPatient?.address || (selectedCase as any).patientAddress || 'Kuala Lumpur, Malaysia'}
                    </p>
                    <p className="text-xs text-surface-500 mt-1">Scan: <span className="text-[#0F4C42] font-bold">{selectedCase.scanType}</span></p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-surface-500 uppercase">Healthcare Centre</label>
                      {selectedCase?.clinicId || selectedPatient?.preferredClinicId ? (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Patient Preferred
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          AI Recommended
                        </span>
                      )}
                    </div>
                    
                    <select
                      value={selectedClinicId || ''}
                      onChange={(e) => handleClinicChange(e.target.value)}
                      className="select-field text-sm"
                    >
                      {Array.from(new Map(clinics.map((c) => [c.name.trim().toLowerCase(), c])).values()).map((c) => {
                        const isUserChoice = c.id === (selectedCase?.clinicId || selectedPatient?.preferredClinicId);
                        const isNearest = c.id === recommendedClinicId;
                        let tag = '';
                        if (isUserChoice && isNearest) tag = ' (Patient Choice & AI Nearest)';
                        else if (isUserChoice) tag = ' (Patient Manual Override)';
                        else if (isNearest) tag = ' (AI Workflow Nearest)';

                        return (
                          <option key={c.id} value={c.id}>
                            {c.name}{tag}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {routeInfo && (
                    <div className="p-3.5 bg-[#F5F8F7] rounded-xl border border-surface-200 grid grid-cols-2 gap-3">
                      <div><p className="text-[10px] text-surface-500 font-bold uppercase">Distance</p><p className="text-base font-bold text-[#112A28]">{routeInfo.distanceKm} km</p></div>
                      <div><p className="text-[10px] text-surface-500 font-bold uppercase">Travel Time</p><p className="text-base font-bold text-[#112A28]">{routeInfo.durationMinutes} min</p></div>
                    </div>
                  )}

                  <button
                    onClick={handleProceedToAssignment}
                    disabled={!selectedClinicId || routeLoading}
                    className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    Proceed to Radiographer Assignment <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={handleReset} className="btn-ghost w-full text-xs font-semibold">&larr; Back to Intake Queue</button>
                </div>
              )}

              {/* Step 3: Assign Radiographer */}
              {step === 'assign-radiographer' && selectedCase && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-white rounded-xl border border-surface-200 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs text-surface-500">Case</p><p className="text-sm font-bold text-[#16433B]">{selectedCase.caseNumber}</p></div>
                    <div className="text-right"><p className="text-xs text-surface-500">Clinic</p><p className="text-sm text-emerald-600 font-bold">{selectedClinic?.name}</p></div>
                  </div>

                  <RadiograperSelector
                    profiles={scheduleProfiles}
                    requiredModality={extractModality(selectedCase.scanType)}
                    selectedId={selectedRadiographerId}
                    recommendedId={recommendedRadiographerId}
                    onSelect={handleRadiographerSelect}
                    existingCases={pendingCases}
                    targetClinicId={selectedClinicId}
                  />

                  {selectedRadiographerId && appointmentTime && (
                    <div className="p-4 bg-[#F1F8F6] border border-[#BFD8D1] rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700 uppercase">Recommended Slot</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-[10px] text-emerald-600">Date</p><p className="font-bold text-[#112A28]">{new Date(appointmentTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                        <div><p className="text-[10px] text-emerald-600">Time</p><p className="font-bold text-[#112A28]">{new Date(appointmentTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p></div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setStep('map-routing')} className="btn-secondary flex-1 text-xs">&larr; Back</button>
                    <button
                      onClick={handleConfirm}
                      disabled={!selectedRadiographerId || !appointmentTime || confirming}
                      className="btn-primary flex-1 disabled:opacity-50 text-xs font-bold"
                    >
                      {confirming ? 'Confirming...' : 'Confirm Assignment'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirm */}
              {step === 'confirm' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#112A28]">Appointment Confirmed</h2>
                    <p className="text-sm text-surface-500 mt-1">{selectedCase?.caseNumber} scheduled.</p>
                  </div>
                  <button onClick={handleReset} className="btn-primary w-full text-xs font-bold">Schedule Another</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reassign Case Modal */}
      {reassignModalCase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#112A28]">Reassign Clinical Case</h3>
              <p className="text-xs text-surface-500">Transfer {reassignModalCase.caseNumber} to another available radiographer</p>
            </div>

            <div className="p-3 bg-[#F5F8F7] rounded-xl border border-[#DCE6E3] space-y-1 text-xs">
              <p className="font-bold text-surface-800">{reassignModalCase.patientName}</p>
              <p className="text-surface-500">{reassignModalCase.scanType} &middot; {reassignModalCase.clinicName || 'Facility'}</p>
              <p className="text-surface-500">Current Radiographer: <span className="font-bold text-[#0F4C42]">{reassignModalCase.radiographerName || 'Assigned'}</span></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Target Radiographer</label>
              <select
                value={reassignTargetRadioId}
                onChange={(e) => setReassignTargetRadioId(e.target.value)}
                className="select-field text-sm"
              >
                <option value="">Select target radiographer...</option>
                {radiographers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReassignModalCase(null)}
                disabled={reassigning}
                className="btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReassign}
                disabled={!reassignTargetRadioId || reassigning}
                className="btn-primary text-xs font-bold flex items-center gap-1.5"
              >
                {reassigning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Transferring...</> : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
