import type { MohYaTidak, MohPaymentCategory } from '../types';

/**
 * Auto-calculates MOH payment category according to Malaysian MOH guidelines.
 */
export function calculateMohPaymentCategory(
  isWarganegara?: MohYaTidak,
  isPenjawatAwam?: MohYaTidak,
  isFpp?: MohYaTidak
): MohPaymentCategory {
  if (isWarganegara === 'No' || isWarganegara === 'Tidak') {
    return 'Swasta'; // Foreigner / Non-Malaysian full charge
  }
  if (isPenjawatAwam === 'Yes' || isPenjawatAwam === 'Ya') {
    return 'Kerajaan'; // Civil Servant (Percuma / Free)
  }
  if (isFpp === 'Yes' || isFpp === 'Ya') {
    return 'Bayar Sendiri'; // Full Paying Patient
  }
  return 'Kerajaan'; // Malaysian Standard Subsidized
}

export function formatPaymentCategoryBadge(category?: MohPaymentCategory): { label: string; color: string } {
  switch (category) {
    case 'Kerajaan':
    case 'Government':
      return { label: 'Kerajaan (Penjawat Awam / Subsidi)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Bayar Sendiri':
    case 'Self-Pay':
      return { label: 'Full Paying Patient (FPP)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'Swasta':
    case 'Private':
      return { label: 'Bukan Warganegara (Full Charge)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: 'Kerajaan (Subsidi)', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}
