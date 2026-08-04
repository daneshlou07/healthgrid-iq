/**
 * Malaysian Personal Data Protection Act (PDPA) & Clinical Data Privacy Utilities
 * Masking sensitive Patient Identifiable Information (PII) for non-treating views
 */

export function maskNric(nric: string): string {
  if (!nric) return '—';
  const clean = nric.trim();
  if (clean.length < 12) return '************';
  // Standard format 950815-10-5431 -> 950815-10-****
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[0]}-${parts[1]}-****`;
  }
  return `${clean.slice(0, 6)}-${clean.slice(6, 8)}-****`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '—';
  const clean = phone.trim();
  if (clean.length < 8) return '****';
  return `${clean.slice(0, 5)}***${clean.slice(-3)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '—';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}
