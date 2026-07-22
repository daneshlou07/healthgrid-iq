import type { Case } from '../types';

/**
 * New cases record the patient's presenting indication or symptom rather
 * than an assumed diagnosis. `disease` remains as a read-only fallback for
 * historical case records created before this workflow changed.
 */
export function getCaseIndication(caseItem: Pick<Case, 'indication' | 'disease'>): string {
  return caseItem.indication || caseItem.disease || '';
}

/**
 * New cases are registered by the radiology department. The legacy doctor
 * fields are only used when opening an older record.
 */
export function getCaseRegistrar(caseItem: Pick<Case, 'registeredByName' | 'doctorName'>): string {
  return caseItem.registeredByName || caseItem.doctorName || 'Not recorded';
}
