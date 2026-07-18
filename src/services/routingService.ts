import type { RouteInfo } from '../types';

/**
 * Calculate the Haversine distance between two lat/lng points in km.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate driving time in minutes based on distance.
 * Assumes average 40 km/h in urban Malaysian context.
 */
export function estimateDriveTime(distanceKm: number): number {
  const avgSpeedKmh = 40;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Generate a simplified polyline between two points (straight-line with midpoint curve).
 * In production, this would call OSRM or Google Directions API.
 */
function generateSimulatedPolyline(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 20;
  // Add slight curve via midpoint offset for visual realism
  const midLat = (lat1 + lat2) / 2 + (Math.random() - 0.5) * 0.005;
  const midLon = (lon1 + lon2) / 2 + (Math.random() - 0.5) * 0.005;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier interpolation
    const lat = (1 - t) ** 2 * lat1 + 2 * (1 - t) * t * midLat + t ** 2 * lat2;
    const lon = (1 - t) ** 2 * lon1 + 2 * (1 - t) * t * midLon + t ** 2 * lon2;
    points.push([lat, lon]);
  }
  return points;
}

/**
 * Try to fetch route from OSRM public demo server.
 * Falls back to Haversine + simulated polyline if unavailable.
 */
export async function getRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<RouteInfo> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
        );
        return {
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMinutes: Math.round(route.duration / 60),
          polylineCoords: coords,
        };
      }
    }
  } catch {
    // OSRM unavailable, fall through to fallback
  }

  // Fallback: Haversine distance + estimated time + simulated polyline
  const distance = haversineDistance(fromLat, fromLon, toLat, toLon);
  const roadFactor = 1.3; // Roads are ~30% longer than straight line
  const adjustedDistance = Math.round(distance * roadFactor * 10) / 10;

  return {
    distanceKm: adjustedDistance,
    durationMinutes: estimateDriveTime(adjustedDistance),
    polylineCoords: generateSimulatedPolyline(fromLat, fromLon, toLat, toLon),
  };
}

/**
 * Find the nearest clinic to a given point from a list of clinics.
 */
export function findNearestClinic(
  patientLat: number,
  patientLon: number,
  clinics: { id: string; latitude: number; longitude: number }[]
): { clinicId: string; distanceKm: number } | null {
  if (clinics.length === 0) return null;

  let nearest = clinics[0];
  let minDist = haversineDistance(patientLat, patientLon, nearest.latitude, nearest.longitude);

  for (let i = 1; i < clinics.length; i++) {
    const dist = haversineDistance(patientLat, patientLon, clinics[i].latitude, clinics[i].longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = clinics[i];
    }
  }

  return { clinicId: nearest.id, distanceKm: Math.round(minDist * 10) / 10 };
}

/**
 * Geocode a Malaysian address to approximate lat/lng.
 * Uses Nominatim (OpenStreetMap) with fallback to keyword-based estimation.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  // Try Nominatim first
  try {
    const encoded = encodeURIComponent(address + ', Malaysia');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&countrycodes=my`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }
  } catch {
    // Nominatim unavailable, fall through to keyword fallback
  }

  // Keyword-based fallback for common Malaysian locations
  const lower = address.toLowerCase();
  const locations: { keywords: string[]; lat: number; lon: number }[] = [
    { keywords: ['tanjong karang', 'tanjung karang'], lat: 3.4242, lon: 101.1824 },
    { keywords: ['jeram'], lat: 3.2072, lon: 101.4633 },
    { keywords: ['batang berjuntai', 'ijok', 'bestari jaya'], lat: 3.3636, lon: 101.3843 },
    { keywords: ['putrajaya'], lat: 2.9264, lon: 101.6964 },
    { keywords: ['cyberjaya'], lat: 2.9213, lon: 101.6559 },
    { keywords: ['bangi', 'bandar baru bangi'], lat: 2.9469, lon: 101.7636 },
    { keywords: ['puchong'], lat: 3.0004, lon: 101.6168 },
    { keywords: ['kajang'], lat: 2.9927, lon: 101.7909 },
    { keywords: ['subang', 'subang jaya'], lat: 3.0565, lon: 101.5852 },
    { keywords: ['petaling jaya', 'pj'], lat: 3.1073, lon: 101.6067 },
    { keywords: ['shah alam'], lat: 3.0738, lon: 101.5183 },
    { keywords: ['kuala lumpur', 'kl'], lat: 3.1390, lon: 101.6869 },
    { keywords: ['ampang'], lat: 3.1500, lon: 101.7667 },
    { keywords: ['cheras'], lat: 3.1073, lon: 101.7514 },
    { keywords: ['klang'], lat: 3.0449, lon: 101.4455 },
    { keywords: ['rawang'], lat: 3.3213, lon: 101.5767 },
    { keywords: ['seremban'], lat: 2.7258, lon: 101.9424 },
    { keywords: ['nilai'], lat: 2.8174, lon: 101.7987 },
    { keywords: ['sepang'], lat: 2.6874, lon: 101.7412 },
    { keywords: ['serdang'], lat: 3.0222, lon: 101.7131 },
    { keywords: ['semenyih'], lat: 2.9513, lon: 101.8421 },
    { keywords: ['dengkil'], lat: 2.8577, lon: 101.6819 },
    { keywords: ['banting'], lat: 2.8134, lon: 101.5024 },
    { keywords: ['selangor'], lat: 3.0738, lon: 101.5183 },
    { keywords: ['johor', 'johor bahru', 'jb'], lat: 1.4927, lon: 103.7414 },
    { keywords: ['penang', 'pulau pinang', 'georgetown'], lat: 5.4141, lon: 100.3288 },
    { keywords: ['ipoh', 'perak'], lat: 4.5975, lon: 101.0901 },
    { keywords: ['melaka', 'malacca'], lat: 2.1896, lon: 102.2501 },
    { keywords: ['kota kinabalu', 'sabah'], lat: 5.9804, lon: 116.0735 },
    { keywords: ['kuching', 'sarawak'], lat: 1.5535, lon: 110.3593 },
  ];

  for (const loc of locations) {
    if (loc.keywords.some((kw) => lower.includes(kw))) {
      // Add small random offset to avoid exact overlap
      const jitter = () => (Math.random() - 0.5) * 0.01;
      return { lat: loc.lat + jitter(), lon: loc.lon + jitter() };
    }
  }

  // Last resort: default to central Selangor area with random offset
  const jitter = () => (Math.random() - 0.5) * 0.05;
  return { lat: 3.0 + jitter(), lon: 101.65 + jitter() };
}
