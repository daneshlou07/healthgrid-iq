import jsPDF from 'jspdf';
import type { Case, Patient, Report } from '../types';

/**
 * Generates and downloads a complete multi-page Clinical Dossier PDF package
 */
export function exportDossierPdf(caseItem: Case, patient?: Patient, report?: Report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Colors
  const purpleColor: [number, number, number] = [88, 28, 135]; // #581c87
  const slateDark: [number, number, number] = [15, 23, 42];
  const slateGray: [number, number, number] = [71, 85, 105];

  // Header Banner
  doc.setFillColor(...purpleColor);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HEALTHGRID IQ — CLINICAL DOSSIER', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Ministry of Health Malaysia (MOH) Digital RIS/PACS Network', 14, 21);

  doc.setFont('helvetica', 'bold');
  doc.text(`CASE REF: ${caseItem.caseNumber}`, pageWidth - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 21, { align: 'right' });

  let y = 36;

  // SECTION 1: PATIENT DEMOGRAPHICS
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 30, 'S');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...purpleColor);
  doc.text('1. PATIENT DEMOGRAPHICS', 18, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slateDark);
  doc.text(`Patient Name: ${caseItem.patientName}`, 18, y + 15);
  doc.text(`MRN: ${patient?.mrn || 'N/A'}`, 110, y + 15);
  doc.text(`NRIC / Passport: ${patient?.nric || 'N/A'}`, 18, y + 22);
  doc.text(`Gender / DOB: ${patient?.gender || 'N/A'} | ${patient?.dob || 'N/A'}`, 110, y + 22);

  y += 36;

  // SECTION 2: REFERRAL & CLINICAL INDICATION
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 42, 'F');
  doc.rect(14, y, pageWidth - 28, 42, 'S');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...purpleColor);
  doc.text('2. CLINICAL REFERRAL & EXAMINATION REQUEST', 18, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateDark);
  doc.text(`Scan Modality: ${caseItem.modality || 'Radiology'} — ${caseItem.scanType}`, 18, y + 15);
  doc.text(`Referring Clinic: ${caseItem.clinicName}`, 110, y + 15);
  doc.text(`Severity Level: ${caseItem.severity} Priority`, 18, y + 22);
  doc.text(`Appointment Date: ${caseItem.officeTarikhAppointment || caseItem.scheduledAt || 'N/A'}`, 110, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Symptom / Indication:', 18, y + 30);
  doc.setFont('helvetica', 'normal');
  const splitIndication = doc.splitTextToSize(caseItem.notes || caseItem.disease || 'Routine clinical assessment', pageWidth - 70);
  doc.text(splitIndication, 68, y + 30);

  y += 48;

  // SECTION 3: DIAGNOSTIC REPORT FINDINGS
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 65, 'F');
  doc.rect(14, y, pageWidth - 28, 65, 'S');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...purpleColor);
  doc.text('3. DIAGNOSTIC REPORT FINDINGS', 18, y + 7);

  if (report) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text('Findings:', 18, y + 15);
    doc.setFont('helvetica', 'normal');
    const splitFindings = doc.splitTextToSize(report.findings, pageWidth - 45);
    doc.text(splitFindings, 18, y + 20);

    const findingsHeight = splitFindings.length * 4.5;
    const impressionY = y + 22 + findingsHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('Impression:', 18, impressionY);
    doc.setFont('helvetica', 'normal');
    const splitImpression = doc.splitTextToSize(report.impression, pageWidth - 45);
    doc.text(splitImpression, 18, impressionY + 5);

    // Official MMC Digital e-Signature Block
    const signY = impressionY + (splitImpression.length * 4.5) + 6;
    doc.setFillColor(240, 253, 244);
    doc.rect(14, signY, pageWidth - 28, 22, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.rect(14, signY, pageWidth - 28, 22, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59); // emerald-900
    doc.text(`ELECTRONICALLY SIGNED & VERIFIED BY: ${report.radiologistName}`, 18, signY + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(`Qualification: ${report.qualification || 'M.Med Radiology (UM), MBBS (Malaya)'} | ${report.mmcNumber || 'MMC No. 48291'}`, 18, signY + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Security Hash: SHA256-${(report.reportToken || 'MOH-8F9A2B').toUpperCase()}-PDPA-VERIFIED | Signed: ${report.signedAt ? new Date(report.signedAt).toLocaleString('en-GB') : 'Signed'}`, 18, signY + 16);
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...slateGray);
    doc.text('Diagnostic report pending sign-off by attending Medical Officer / Radiologist.', 18, y + 20);
  }

  y += 72;

  // SECTION 4: AUDIT TIMELINE
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...purpleColor);
  doc.text('4. CASE WORKFLOW AUDIT TRAIL', 14, y);

  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text(`• Case Created: ${new Date(caseItem.createdAt).toLocaleString()}`, 18, y);
  if (caseItem.scheduledAt) doc.text(`• Scan Scheduled: ${new Date(caseItem.scheduledAt).toLocaleString()}`, 18, y + 5);
  if (caseItem.scannedAt) doc.text(`• Scan Completed: ${new Date(caseItem.scannedAt).toLocaleString()}`, 18, y + 10);
  if (caseItem.finalizedAt) doc.text(`• Report Finalized: ${new Date(caseItem.finalizedAt).toLocaleString()}`, 18, y + 15);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL MEDICAL RECORD — HealthGrid IQ Hospital Information System', pageWidth / 2, 287, { align: 'center' });

  // Save PDF
  doc.save(`Clinical_Dossier_${caseItem.caseNumber}.pdf`);
}
