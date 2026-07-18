/**
 * Input sanitization utilities for HealthGrid IQ.
 * Prevents XSS when rendering user-provided content.
 */

/**
 * Sanitize a string by escaping HTML special characters.
 */
export function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize for CSV export — prevent CSV injection.
 * Prefixes cells starting with =, +, -, @ with a single quote.
 */
export function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

/**
 * Strip control characters from user input.
 */
export function stripControlChars(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate and sanitize an email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a Malaysian phone number format.
 */
export function isValidMYPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+?60|0)\d{9,10}$/.test(cleaned);
}
