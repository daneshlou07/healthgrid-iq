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

/**
 * Share destination coordinates and navigation links to Driver via WhatsApp
 */
export function shareNavigationToWhatsApp(destinationName: string, lat?: number, lon?: number, address?: string): void {
  const wazeUrl = lat && lon 
    ? `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(address || destinationName)}&navigate=yes`;
    
  const gmapsUrl = lat && lon
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || destinationName)}`;

  const message = [
    `*HealthGrid IQ - Dispatch Location*`,
    `Destination: ${destinationName}`,
    address ? `Address: ${address}` : '',
    '',
    `Waze Navigation: ${wazeUrl}`,
    `Google Maps: ${gmapsUrl}`,
  ].filter(Boolean).join('\n');

  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
}
