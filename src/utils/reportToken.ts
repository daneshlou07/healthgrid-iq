/** Generates a secure report share token and shareable URL for patient-facing access. */

/**
 * Generates a random 8-character alphanumeric token.
 * In production this would be a cryptographically random value stored server-side.
 * For demo purposes it's deterministic from the caseId to survive page refreshes.
 */
export function generateReportToken(caseId: string): string {
  // Simple deterministic hash from caseId for demo stability
  let hash = 0;
  for (let i = 0; i < caseId.length; i++) {
    const char = caseId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  // Convert to a base-36 alphanumeric string and pad/trim to 8 chars
  const token = Math.abs(hash).toString(36).padStart(8, '0').slice(0, 8);
  return token;
}

/** Builds the full public patient report URL from caseId + token */
export function buildPatientReportUrl(caseId: string, token: string): string {
  const base = window.location.origin;
  return `${base}/report/${caseId}/${token}`;
}

/** Validates a token against a known caseId (client-side demo validation) */
export function validateReportToken(caseId: string, token: string): boolean {
  return generateReportToken(caseId) === token;
}
