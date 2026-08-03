/**
 * Official Ministry of Health (MOH) Malaysia PER.SS-RA301 (Pind1/2018)
 * SENARAI DOS BERKESAN UNTUK PEMERIKSAAN RADIOLOGI
 * 
 * Source: Health Physics Society Fact Sheet 2010, UNSCEAR 2008 Report Vol.1
 * and FA Mettler et al., Radiology 2008; 248:254-63
 */

export interface EffectiveDoseReference {
  id: string;
  examination: string;
  dosMsv: number | string; // e.g. 0.02 or '18.2 - 19.5'
  chestXrayRatio: number | string; // e.g. 1 or '910 - 975'
  category: 'X-Ray' | 'Fluoroscopy / Contrast' | 'CT Scan' | 'Angiography / Special';
  notes?: string;
}

export const SENARAI_DOS_BERKESAN: EffectiveDoseReference[] = [
  // --- General X-Ray ---
  { id: 'dose-01', examination: 'Chest (AP)', dosMsv: 0.02, chestXrayRatio: 1, category: 'X-Ray' },
  { id: 'dose-02', examination: 'Extremities (2 views)', dosMsv: 0.01, chestXrayRatio: 0.5, category: 'X-Ray' },
  { id: 'dose-03', examination: 'Chest (LAT)', dosMsv: 0.04, chestXrayRatio: 2, category: 'X-Ray' },
  { id: 'dose-04', examination: 'Skull (2 views)', dosMsv: 0.04, chestXrayRatio: 2, category: 'X-Ray' },
  { id: 'dose-05', examination: 'Pelvis (AP)', dosMsv: 0.7, chestXrayRatio: 35, category: 'X-Ray' },
  { id: 'dose-06', examination: 'Cervical Spine', dosMsv: 0.1, chestXrayRatio: 5, category: 'X-Ray' },
  { id: 'dose-07', examination: 'Thoracic Spine (AP)', dosMsv: 0.4, chestXrayRatio: 20, category: 'X-Ray' },
  { id: 'dose-08', examination: 'Lumbar Spine (AP)', dosMsv: 0.7, chestXrayRatio: 35, category: 'X-Ray' },
  { id: 'dose-10', examination: 'Dental (LAT)', dosMsv: 0.02, chestXrayRatio: 1, category: 'X-Ray' },
  { id: 'dose-11', examination: 'Dental (Panoramic)', dosMsv: 0.09, chestXrayRatio: 4.5, category: 'X-Ray' },
  { id: 'dose-12', examination: 'DEXA (Whole Body)', dosMsv: 0.0004, chestXrayRatio: 0.02, category: 'X-Ray' },
  { id: 'dose-13', examination: 'Hip', dosMsv: 0.8, chestXrayRatio: 40, category: 'X-Ray' },
  { id: 'dose-14', examination: 'Abdomen', dosMsv: 1.2, chestXrayRatio: 60, category: 'X-Ray' },
  { id: 'dose-15', examination: 'Mammogram (4 views)', dosMsv: 0.7, chestXrayRatio: 35, category: 'X-Ray', notes: 'Sila lengkapkan Borang Soal Selidik MMG' },

  // --- Fluoroscopy & Contrast Procedures ---
  { id: 'dose-09', examination: 'IVU / IVP (5 films)', dosMsv: 2.5, chestXrayRatio: 125, category: 'Fluoroscopy / Contrast' },
  { id: 'dose-16', examination: 'Barium Swallow', dosMsv: 1.5, chestXrayRatio: 75, category: 'Fluoroscopy / Contrast' },
  { id: 'dose-17', examination: 'Barium Enema', dosMsv: 7.0, chestXrayRatio: 350, category: 'Fluoroscopy / Contrast' },
  { id: 'dose-18', examination: 'HSG', dosMsv: 1.2, chestXrayRatio: 60, category: 'Fluoroscopy / Contrast' },
  { id: 'dose-19', examination: 'ERCP', dosMsv: 4.0, chestXrayRatio: 200, category: 'Fluoroscopy / Contrast' },

  // --- CT Scan ---
  { id: 'dose-20', examination: 'CT Head / Brain', dosMsv: 2.0, chestXrayRatio: 100, category: 'CT Scan' },
  { id: 'dose-21', examination: 'CT Cervical Spine', dosMsv: 1.5, chestXrayRatio: 75, category: 'CT Scan' },
  { id: 'dose-22', examination: 'CT Thoracic Spine', dosMsv: 6.0, chestXrayRatio: 300, category: 'CT Scan' },
  { id: 'dose-23', examination: 'CT Chest', dosMsv: 8.0, chestXrayRatio: 400, category: 'CT Scan' },
  { id: 'dose-24', examination: 'CT Lumbar Spine', dosMsv: 3.3, chestXrayRatio: 165, category: 'CT Scan' },
  { id: 'dose-25', examination: 'CT Abdomen', dosMsv: 10.0, chestXrayRatio: 500, category: 'CT Scan' },
  { id: 'dose-26', examination: 'CT Pelvis', dosMsv: 10.0, chestXrayRatio: 500, category: 'CT Scan' },
  { id: 'dose-27', examination: 'CT Pulmonary Angio', dosMsv: '18.2 - 19.5', chestXrayRatio: '910 - 975', category: 'CT Scan' },
  { id: 'dose-28', examination: 'CT Urography', dosMsv: 4.5, chestXrayRatio: 225, category: 'CT Scan' },
  { id: 'dose-29', examination: 'CT Angio (Brain/Thorax/Abdomen)', dosMsv: 16.4, chestXrayRatio: 820, category: 'CT Scan' },

  // --- Special Angiography ---
  { id: 'dose-30', examination: 'Coronary Angiogram', dosMsv: '4.60 - 15.80', chestXrayRatio: '230 - 790', category: 'Angiography / Special' },
  { id: 'dose-31', examination: 'Angioplasty (Heart Study)', dosMsv: '7.50 - 57.00', chestXrayRatio: '375 - 2850', category: 'Angiography / Special' },
];

/**
 * Find matching effective dose reference by exam name / body region
 */
export function getEffectiveDoseForExam(scanType: string, bodyRegion?: string): EffectiveDoseReference | undefined {
  const query = `${scanType} ${bodyRegion || ''}`.toLowerCase();

  if (query.includes('chest') && query.includes('ct')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-23');
  if (query.includes('chest')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-01');
  if (query.includes('head') || query.includes('brain')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-20');
  if (query.includes('lumbar') && query.includes('ct')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-24');
  if (query.includes('lumbar')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-08');
  if (query.includes('abdomen') && query.includes('ct')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-25');
  if (query.includes('abdomen')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-14');
  if (query.includes('pelvis') && query.includes('ct')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-26');
  if (query.includes('pelvis')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-05');
  if (query.includes('cervical')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-06');
  if (query.includes('thoracic')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-07');
  if (query.includes('mammogram') || query.includes('mammo')) return SENARAI_DOS_BERKESAN.find((d) => d.id === 'dose-15');

  return SENARAI_DOS_BERKESAN.find((d) => query.includes(d.examination.toLowerCase()));
}
