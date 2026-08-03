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
    return 'Kerajaan'; // Civil Servant (Free)
  }
  if (isFpp === 'Yes' || isFpp === 'Ya') {
    return 'Bayar Sendiri'; // Full Paying Patient
  }
  return 'Kerajaan'; // Malaysian Standard Subsidized
}

export function formatPaymentCategoryBadge(
  category?: MohPaymentCategory,
  lang: 'en' | 'ms' = 'en'
): { label: string; color: string } {
  const isMs = lang === 'ms';
  switch (category) {
    case 'Kerajaan':
    case 'Government':
      return {
        label: isMs ? 'Kerajaan (Penjawat Awam / Subsidi)' : 'Government / Subsidized',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'Bayar Sendiri':
    case 'Self-Pay':
      return {
        label: isMs ? 'Skim FPP (Bayar Sendiri)' : 'Full Paying Patient (FPP)',
        color: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    case 'Swasta':
    case 'Private':
      return {
        label: isMs ? 'Bukan Warganegara (Caj Penuh)' : 'Non-Citizen (Full Fee)',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    default:
      return {
        label: isMs ? 'Kerajaan (Subsidi)' : 'Malaysian Citizen (Subsidized)',
        color: 'bg-slate-50 text-slate-800 border-slate-200',
      };
  }
}
