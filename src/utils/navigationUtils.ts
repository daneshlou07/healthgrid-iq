/**
 * Navigation and Turn-by-Turn GPS Utilities for Mobile Fleets and Clinical Staff.
 * Generates direct deep links to Waze and Google Maps with 0 API charges.
 */

/**
 * Open turn-by-turn navigation in Waze App (or Waze Web)
 */
export function openWazeNavigation(lat: number, lon: number, address?: string): void {
  if (!lat || !lon) {
    if (address) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`, '_blank');
    }
    return;
  }
  // Universal Waze navigation deep link
  window.open(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank');
}

/**
 * Open turn-by-turn navigation in Google Maps
 */
export function openGoogleMapsNavigation(lat: number, lon: number, address?: string): void {
  if (!lat || !lon) {
    if (address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
    }
    return;
  }
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
}
