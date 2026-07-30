/**
 * Official Jabatan Pendaftaran Negara (JPN) Malaysian NRIC (MyKad) Parser & State Code Lookup
 * Format: YYMMDD-PB-####
 * PB = Place of Birth Code (Digits 7-8)
 */

export interface MalaysianNricDetails {
  valid: boolean;
  normalized: string;
  formatted: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  stateOfBirth: string;
  stateCode: string;
  age: number;
  error?: string;
}

// Complete Jabatan Pendaftaran Negara (JPN) State Code Mapping Table
export const JPN_STATE_CODES: Record<string, string> = {
  // Johor
  '01': 'Johor', '21': 'Johor', '22': 'Johor', '23': 'Johor', '24': 'Johor',
  // Kedah
  '02': 'Kedah', '25': 'Kedah', '26': 'Kedah', '27': 'Kedah',
  // Kelantan
  '03': 'Kelantan', '28': 'Kelantan', '29': 'Kelantan',
  // Melaka
  '04': 'Melaka', '30': 'Melaka',
  // Negeri Sembilan
  '05': 'Negeri Sembilan', '31': 'Negeri Sembilan', '59': 'Negeri Sembilan',
  // Pahang
  '06': 'Pahang', '32': 'Pahang', '33': 'Pahang',
  // Pulau Pinang
  '07': 'Pulau Pinang (Penang)', '34': 'Pulau Pinang (Penang)', '35': 'Pulau Pinang (Penang)',
  // Perak
  '08': 'Perak', '36': 'Perak', '37': 'Perak', '38': 'Perak', '39': 'Perak',
  // Perlis
  '09': 'Perlis', '40': 'Perlis',
  // Selangor
  '10': 'Selangor', '41': 'Selangor', '42': 'Selangor', '43': 'Selangor', '44': 'Selangor',
  // Terengganu
  '11': 'Terengganu', '45': 'Terengganu', '46': 'Terengganu',
  // Sabah
  '12': 'Sabah', '47': 'Sabah', '48': 'Sabah', '49': 'Sabah',
  // Sarawak
  '13': 'Sarawak', '50': 'Sarawak', '51': 'Sarawak', '52': 'Sarawak', '53': 'Sarawak',
  // Wilayah Persekutuan Kuala Lumpur
  '14': 'Wilayah Persekutuan Kuala Lumpur', '54': 'Wilayah Persekutuan Kuala Lumpur', '55': 'Wilayah Persekutuan Kuala Lumpur', '56': 'Wilayah Persekutuan Kuala Lumpur', '57': 'Wilayah Persekutuan Kuala Lumpur',
  // Wilayah Persekutuan Labuan
  '15': 'Wilayah Persekutuan Labuan', '58': 'Wilayah Persekutuan Labuan',
  // Wilayah Persekutuan Putrajaya
  '16': 'Wilayah Persekutuan Putrajaya',
  // Foreign Born / Other
  '82': 'Born Outside Malaysia (Warganegara Luar)',
  '98': 'Unspecified / Foreign Born',
  '99': 'Unspecified / Foreign Born',
};

export function normalizeNric(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function formatNric(normalized: string): string {
  if (normalized.length <= 6) return normalized;
  if (normalized.length <= 8) return `${normalized.slice(0, 6)}-${normalized.slice(6)}`;
  return `${normalized.slice(0, 6)}-${normalized.slice(6, 8)}-${normalized.slice(8, 12)}`;
}

export function parseMalaysianNric(raw: string): MalaysianNricDetails {
  const normalized = normalizeNric(raw);

  if (!/^\d{12}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      formatted: raw,
      dob: '',
      gender: 'Male',
      stateOfBirth: 'Unknown',
      stateCode: '',
      age: 0,
      error: 'NRIC must be exactly 12 digits (e.g. 950815-10-5431)',
    };
  }

  const yyStr = normalized.slice(0, 2);
  const mmStr = normalized.slice(2, 4);
  const ddStr = normalized.slice(4, 6);
  const pbStr = normalized.slice(6, 8);

  const yy = parseInt(yyStr, 10);
  const mm = parseInt(mmStr, 10);
  const dd = parseInt(ddStr, 10);

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const fullYear = century + yy;

  if (mm < 1 || mm > 12) {
    return {
      valid: false,
      normalized,
      formatted: formatNric(normalized),
      dob: '',
      gender: 'Male',
      stateOfBirth: 'Unknown',
      stateCode: pbStr,
      age: 0,
      error: 'Invalid month in NRIC (digits 3-4 must be 01-12)',
    };
  }

  const daysInMonth = new Date(fullYear, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return {
      valid: false,
      normalized,
      formatted: formatNric(normalized),
      dob: '',
      gender: 'Male',
      stateOfBirth: 'Unknown',
      stateCode: pbStr,
      age: 0,
      error: 'Invalid day in NRIC',
    };
  }

  const dobDate = new Date(fullYear, mm - 1, dd);
  if (dobDate > new Date()) {
    return {
      valid: false,
      normalized,
      formatted: formatNric(normalized),
      dob: '',
      gender: 'Male',
      stateOfBirth: 'Unknown',
      stateCode: pbStr,
      age: 0,
      error: 'Date of birth cannot be in the future',
    };
  }

  const dob = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

  // Gender: last digit odd = Male, even = Female
  const lastDigit = parseInt(normalized.charAt(11), 10);
  const gender: 'Male' | 'Female' = lastDigit % 2 === 0 ? 'Female' : 'Male';

  // State of Birth
  const stateOfBirth = JPN_STATE_CODES[pbStr] || `State Code (${pbStr})`;

  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - fullYear;
  const monthDiff = today.getMonth() - (mm - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dd)) {
    age--;
  }

  return {
    valid: true,
    normalized,
    formatted: formatNric(normalized),
    dob,
    gender,
    stateOfBirth,
    stateCode: pbStr,
    age,
  };
}
