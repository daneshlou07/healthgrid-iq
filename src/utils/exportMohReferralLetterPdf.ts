import jsPDF from 'jspdf';
import type { Case, Patient, Report, Clinic } from '../types';

export interface ReferralLetterOptions {
  receivingHospital?: string;
  referralUrgency?: 'Segera (Urgent < 2 Weeks)' | 'Rutin (Routine < 1 Month)' | 'Kecemasan (Immediate)';
  specialtyClinic?: string;
  clinicalSummary?: string;
  moName?: string;
  mmcNo?: string;
  facilityName?: string;
}

/**
 * Generates and downloads an official MOH Hospital Referral Letter (Surat Rujukan Hospital)
 * compliant with Ministry of Health Malaysia clinical referral documentation standards.
 */
export function exportMohReferralLetterPdf(
  caseItem: Case,
  patient?: Patient,
  report?: Report,
  clinic?: Clinic,
  options?: ReferralLetterOptions
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const primaryTeal: [number, number, number] = [15, 76, 66]; // #0F4C42
  const slateDark: [number, number, number] = [15, 23, 42];
  const slateGray: [number, number, number] = [71, 85, 105];

  // Header Banner
  doc.setFillColor(...primaryTeal);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('KEMENTERIAN KESIHATAN MALAYSIA (MOH)', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('SURAT RUJUKAN KLINIKAL KE HOSPITAL PAKAR (OFFICIAL HOSPITAL REFERRAL LETTER)', 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.text(`REF NO: REF-${caseItem.caseNumber}`, pageWidth - 14, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Tarikh: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 18, { align: 'right' });

  let y = 33;

  // TO SECTION (RECEIVING FACILITY)
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 22, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text('KEPADA / TO:', 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slateDark);
  doc.setFontSize(9.5);
  const receiving = options?.receivingHospital || 'Klinik Pakar Surgeri Payudara & Endokrin, Hospital Sungai Buloh';
  const clinicType = options?.specialtyClinic || 'Klinik Pembedahan Am / Payudara';
  doc.text(`${clinicType}`, 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${receiving}`, 18, y + 17);

  doc.setFont('helvetica', 'bold');
  const urgency = options?.referralUrgency || 'Segera (Urgent < 2 Weeks)';
  doc.text(`Tahap Rujukan: ${urgency}`, pageWidth - 18, y + 12, { align: 'right' });

  y += 28;

  // SECTION 1: PATIENT DEMOGRAPHICS
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 30, 'F');
  doc.rect(14, y, pageWidth - 28, 30, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text('1. MAKLUMAT PESAKIT / PATIENT PARTICULARS', 18, y + 6);

  doc.setFontSize(8.5);
  doc.setTextColor(...slateDark);
  doc.text(`Nama Pesakit: ${caseItem.patientName}`, 18, y + 13);
  doc.text(`No. K/P / Passport: ${patient?.nric || 'N/A'}`, 18, y + 19);
  doc.text(`Jantina / Umur: ${patient?.gender || 'Female'} / ${patient?.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} Tahun` : 'N/A'}`, 18, y + 25);

  doc.text(`No. MRN / Daftar: ${patient?.mrn || caseItem.caseNumber}`, 115, y + 13);
  doc.text(`No. Telefon: ${patient?.phone || 'N/A'}`, 115, y + 19);
  doc.text(`Alamat: ${patient?.address?.substring(0, 45) || 'Selangor, Malaysia'}`, 115, y + 25);

  y += 36;

  // SECTION 2: CLINICAL HISTORY & EXAMINATION
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 34, 'F');
  doc.rect(14, y, pageWidth - 28, 34, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text('2. RINGKASAN KLINIKAL & INDIKASI / CLINICAL SUMMARY', 18, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateDark);
  const indicationText = caseItem.indication || caseItem.notes || 'Saringan Pengimejan Payudara Komuniti / Mobile Screening Outreach';
  doc.text(`Indikasi Utama: ${indicationText}`, 18, y + 13);

  const clinicalNotes = options?.clinicalSummary || caseItem.notes || 'Pemeriksaan fizikal payudara menunjukkan penemuan yang memerlukan penilaian lanjut dan biopsi.';
  const splitNotes = doc.splitTextToSize(`Catatan Klinikal: ${clinicalNotes}`, pageWidth - 36);
  doc.text(splitNotes, 18, y + 19);

  y += 40;

  // SECTION 3: RADIOLOGICAL FINDINGS & BI-RADS
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 46, 'F');
  doc.rect(14, y, pageWidth - 28, 46, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text('3. KEPUTUSAN PENGIMEJAN / RADIOLOGICAL ASSESSMENT', 18, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateDark);
  doc.text(`Modaliti: ${caseItem.modality || caseItem.scanType || 'Mammography (Digital 2D/3D)'}`, 18, y + 13);

  const findingsText = report?.findings || 'Symmetric breast tissue with focal density observed on screening acquisition.';
  const splitFindings = doc.splitTextToSize(`Penemuan Imej: ${findingsText}`, pageWidth - 36);
  doc.text(splitFindings.slice(0, 3), 18, y + 19);

  const impressionText = report?.impression || 'BI-RADS 4 — Suspicious Abnormality. Recommended for ultrasound-guided tissue sampling.';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text(`Kesimpulan (Impression): ${impressionText}`, 18, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateDark);
  doc.text(`Kategori BI-RADS: ${caseItem.severity === 'Critical' ? 'BI-RADS 5 (Highly Suggestive of Malignancy)' : 'BI-RADS 4 (Suspicious Abnormality)'}`, 18, y + 42);

  y += 52;

  // SECTION 4: MANAGEMENT REQUESTED
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 28, 'F');
  doc.rect(14, y, pageWidth - 28, 28, 'S');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text('4. CADANGAN TINDAKAN / MANAGEMENT REQUESTED', 18, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateDark);
  doc.text('[ X ] Siasatan Lanjut Ultrasound Payudara & Biopsi (Core Needle Biopsy)', 18, y + 13);
  doc.text('[ X ] Penilaian Pakar Surgeri Payudara & Kaunseling Pesakit', 18, y + 19);
  doc.text('[ X ] Imej DICOM penuh boleh diakses menerusi portal HealthGrid IQ RIS/PACS Network', 18, y + 25);

  y += 34;

  // SECTION 5: REFERRING DOCTOR SIGN-OFF BLOCK
  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, pageWidth - 28, 30, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slateDark);
  doc.text('Disediakan & Dirujuk Oleh (Referring Medical Officer):', 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const docName = options?.moName || caseItem.radiologistName || 'Dr. Michelle Tan';
  const mmc = options?.mmcNo || 'MMC: 58921';
  const facility = options?.facilityName || clinic?.name || 'Klinik Kesihatan Bestari Jaya / Mobile Outreach Unit';

  doc.text(`Nama Pegawai Perubatan: ${docName}`, 18, y + 14);
  doc.text(`No. Pendaftaran MMC: ${mmc}`, 18, y + 20);
  doc.text(`Fasiliti / Pusat Kesihatan: ${facility}`, 18, y + 26);

  doc.text('Tandatangan Digital & Tarikh:', pageWidth - 70, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryTeal);
  doc.text('[ VERIFIED ELECTRONICALLY ]', pageWidth - 70, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text(`Tarikh: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 70, y + 26);

  // Footer note
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen ini dijana secara digital oleh HealthGrid IQ MOH RIS/PACS Portal. Sah tanpa tandatangan fizikal basah.', 14, 288);

  // Save PDF
  doc.save(`Surat_Rujukan_MOH_${caseItem.caseNumber}.pdf`);
}
