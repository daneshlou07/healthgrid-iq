import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Case, Patient, Report } from '../../types';

interface Props {
  caseItem: Case;
  patient?: Patient;
  report?: Report;
}

// ─── Inline styles for pixel-perfect A4 printing ─────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '11px',
    color: '#000',
    backgroundColor: '#fff',
    width: '210mm',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  page: {
    width: '210mm',
    minHeight: '290mm',
    padding: '10mm 12mm',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    borderBottom: '2px solid #000',
    paddingBottom: '6px',
    marginBottom: '8px',
    position: 'relative',
  },
  h1: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 2px 0', letterSpacing: '0.5px' },
  h2: { fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0' },
  formRef: { position: 'absolute', top: '0', right: '0', fontSize: '9px', fontWeight: 'bold', textAlign: 'right' },
  clinicRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', marginTop: '4px' },
  
  // Field row with line UNDER the text (no strikethrough!)
  fieldRow: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '4px',
    fontSize: '10.5px',
    lineHeight: '1.3',
  },
  fieldLabel: {
    fontWeight: 'bold',
    whiteSpace: 'nowrap' as const,
    marginRight: '6px',
    fontSize: '10px',
  },
  fieldValue: {
    flex: 1,
    borderBottom: '1px solid #000',
    paddingBottom: '1px',
    minHeight: '13px',
    fontSize: '10.5px',
    paddingLeft: '4px',
  },

  // Boxed sections
  section: {
    border: '1px solid #000',
    padding: '6px 8px',
    marginBottom: '6px',
    boxSizing: 'border-box' as const,
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 'bold',
    backgroundColor: '#e6e6e6',
    padding: '3px 6px',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    border: '1px solid #999',
  },

  // Layout columns
  columns: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
  },
  leftCol: {
    flex: '1 1 62%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  rightCol: {
    flex: '1 1 38%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' },

  // Checkbox / Radio inline row
  checkRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '10px',
    fontSize: '10px',
    lineHeight: '1.6',
  },
  radioItem: {
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '8px',
    fontSize: '10px',
  },
  radioCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '11px',
    height: '11px',
    border: '1px solid #000',
    borderRadius: '50%',
    marginRight: '4px',
    verticalAlign: 'middle',
    boxSizing: 'border-box' as const,
  },
  radioDot: {
    width: '5px',
    height: '5px',
    backgroundColor: '#000',
    borderRadius: '50%',
  },

  // Textarea box
  textareaBox: {
    border: '1px solid #000',
    minHeight: '75px',
    padding: '6px',
    fontSize: '10.5px',
    lineHeight: '1.4',
    whiteSpace: 'pre-line' as const,
    marginBottom: '8px',
    boxSizing: 'border-box' as const,
  },

  // Signatures
  signatureRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: '16px',
    paddingTop: '6px',
    borderTop: '1px solid #000',
    fontSize: '10px',
  },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function FormField({ label, value, labelWidth }: { label: string; value?: string | number | null; labelWidth?: string }) {
  return (
    <div style={styles.fieldRow}>
      <span style={{ ...styles.fieldLabel, width: labelWidth }}>{label}:</span>
      <span style={styles.fieldValue}>{value !== undefined && value !== null && value !== '' ? String(value) : ''}</span>
    </div>
  );
}

function YesNoRadio({ label, value }: { label: string; value?: string }) {
  const isYes = value === 'Yes' || value === 'Ya';
  const isNo = value === 'No' || value === 'Tidak';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: '10px', marginRight: '12px' }}>
      {label && <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{label}:</span>}
      <span style={styles.radioItem}>
        <span style={styles.radioCircle}>
          {isYes && <span style={styles.radioDot} />}
        </span>
        Yes
      </span>
      <span style={styles.radioItem}>
        <span style={styles.radioCircle}>
          {isNo && <span style={styles.radioDot} />}
        </span>
        No
      </span>
    </div>
  );
}

// ─── Main Printable View Component ───────────────────────────────────────────

export function MOHFormPrintView({ caseItem, patient, report }: Props) {
  const examDate = caseItem.officeTarikhPemeriksaan
    ? new Date(caseItem.officeTarikhPemeriksaan).toLocaleDateString('en-GB')
    : caseItem.scannedAt
    ? new Date(caseItem.scannedAt).toLocaleDateString('en-GB')
    : '';

  const modalitiesList = [
    'General X-Ray', 'CT', 'MRI', 'US', 'Fluoro', 'Angio', 'IR', 'MMG', 'BMD', 'Image Media', 'Digitize Image', 'Reporting'
  ];

  return (
    <div style={styles.container}>
      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 1: RADIOLOGY EXAMINATION REQUEST FORM
         ════════════════════════════════════════════════════════════════════════ */}
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.formRef}>MOH PER.SS-RA301<br />(Rev1/2018)</div>
          <div style={styles.h1}>MINISTRY OF HEALTH MALAYSIA</div>
          <div style={styles.h2}>RADIOLOGY EXAMINATION REQUEST FORM</div>
          <div style={styles.clinicRow}>
            <span style={{ fontWeight: 'bold', fontSize: '10.5px' }}>HOSPITAL / CLINIC:</span>
            <span style={{ borderBottom: '1px solid #000', minWidth: '250px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold' }}>
              {caseItem.clinicName || 'HealthGrid IQ Radiology Centre'}
            </span>
          </div>
        </div>

        {/* 2-Column Split: Patient Info (Left) + Office Use (Right) */}
        <div style={styles.columns}>
          {/* LEFT COLUMN: Patient Information */}
          <div style={styles.leftCol}>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Patient Information</div>
              <FormField label="1. Full Name" value={patient?.name ?? caseItem.patientName} />
              <FormField label="2. NRIC / Passport" value={patient?.nric} />
              <FormField label="3. Address" value={patient?.address} />

              <div style={styles.grid3}>
                <FormField label="4. DOB" value={patient?.dob} />
                <FormField label="5. Gender" value={patient?.gender} />
                <FormField label="8. Age" value={patient?.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : ''} />
              </div>

              <div style={styles.grid3}>
                <FormField label="6. Phone" value={patient?.phone} />
                <FormField label="7. Ethnicity" value={patient?.ethnicity} />
                <FormField label="9. MRN" value={patient?.mrn} />
              </div>

              <div style={styles.grid2}>
                <FormField label="10. Ward / Clinic" value={caseItem.clinicName} />
                <FormField label="11. Modality" value={caseItem.modality} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px', marginBottom: '4px' }}>
                <div style={{ flex: '1 1 45%' }}>
                  <FormField label="12. LMP Date" value={caseItem.lmp} />
                </div>
                <div style={{ flex: '1 1 50%' }}>
                  <YesNoRadio label="13. Pregnant" value={caseItem.isPregnant} />
                </div>
              </div>

              <div style={{ marginBottom: '4px' }}>
                <YesNoRadio label="14. Asthma / Allergy / Contrast Reaction" value={caseItem.hasAllergy} />
                {caseItem.allergyDetails && (
                  <span style={{ fontSize: '9.5px', fontStyle: 'italic', marginLeft: '4px' }}>
                    ({caseItem.allergyDetails})
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '4px' }}>
                <YesNoRadio label="15. Mobile Scanning" value={caseItem.hasMobileDevice} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                <YesNoRadio label="16. Citizen" value={caseItem.isWarganegara} />
                <YesNoRadio label="Civil Servant" value={caseItem.isPenjawatAwam} />
                <YesNoRadio label="FPP" value={caseItem.isFpp} />
              </div>

              <FormField label="Payment Category" value={caseItem.paymentCategory} />

              <div style={styles.grid3}>
                <FormField label="17. Renal Test Date" value={caseItem.renalFunctionDate} />
                <FormField label="Creatinine" value={caseItem.creatinine} />
                <FormField label="eGFR" value={caseItem.egfr} />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Office Use & Exposure */}
          <div style={styles.rightCol}>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Administration &amp; Office Use</div>
              <FormField label="Reception Time" value={caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''} />
              <FormField label="Completion Time" value={caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''} />
              <FormField label="Technologist" value={caseItem.officeJuruXRay} />
              <FormField label="Exam Date" value={examDate} />
              <FormField label="Exam Ref No." value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>19. Image Exposure Output</div>
              <FormField label="Film Count" value={caseItem.bilanganFilem} />
              <FormField label="CD / DVD Count" value={caseItem.bilanganCdDvd} />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>20. Radiation Exposure</div>
              <FormField label="kVp" value={caseItem.doseKvp} />
              <FormField label="mAs" value={caseItem.doseMas} />
              <FormField label="Radiation Dose" value={caseItem.dosRadiasi ? `${caseItem.dosRadiasi} mSv` : ''} />
            </div>

            <div style={{ ...styles.section, backgroundColor: '#fcfcfc' }}>
              <div style={styles.sectionTitle}>21. Appointment Details</div>
              <FormField label="Date" value={caseItem.officeTarikhAppointment} />
              <FormField label="Time" value={caseItem.officeMasaAppointment} />
            </div>
          </div>
        </div>

        {/* SECTION 18: Requested Service */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>18. Requested Service</div>
          <div style={styles.checkRow}>
            {modalitiesList.map((m) => {
              const isSelected = caseItem.modality === m || caseItem.scanType?.includes(m);
              return (
                <span key={m} style={styles.radioItem}>
                  <span style={styles.radioCircle}>
                    {isSelected && <span style={styles.radioDot} />}
                  </span>
                  {m}
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: '6px' }}>
            <FormField label="Requested Examinations" value={caseItem.scanType} />
          </div>
        </div>

        {/* SECTION 22: Contrast Media Details (If required) */}
        {caseItem.contrastMediaRequired && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>22. Contrast Media Details</div>
            <div style={styles.grid2}>
              <FormField label="Brand / Name" value={caseItem.contrastMediaName} />
              <FormField label="Volume (ml)" value={caseItem.contrastMediaVolumeMl} />
            </div>
          </div>
        )}

        {/* CLINICAL NOTES */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Clinical Notes</div>
          <div style={styles.textareaBox}>
            {caseItem.ringkasanKlinikal || caseItem.notes || 'No clinical notes provided.'}
          </div>

          <div style={styles.signatureRow}>
            <div style={{ flex: 1, marginRight: '16px' }}>
              <FormField label="Referring Doctor Signature &amp; Stamp" value="" />
            </div>
            <div style={{ width: '220px' }}>
              <FormField label="Date / Time" value={new Date(caseItem.createdAt).toLocaleString('en-GB')} />
            </div>
          </div>
        </div>

        {/* RADIOGRAPHER COMMENTS */}
        {caseItem.komen && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Radiographer Operational Comments</div>
            <p style={{ fontSize: '10px', margin: '2px 0' }}>{caseItem.komen}</p>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 2: RADIOLOGY REPORT (SEPARATE SIBLING DIV)
         ════════════════════════════════════════════════════════════════════════ */}
      <div style={styles.page}>
        <div style={{ ...styles.header, borderBottom: '3px solid #000' }}>
          <div style={styles.formRef}>MOH PER.SS-RA301<br />(Page 2)</div>
          <div style={styles.h1}>MINISTRY OF HEALTH MALAYSIA</div>
          <div style={{ ...styles.h2, fontSize: '13px', letterSpacing: '1px', marginTop: '2px' }}>
            RADIOLOGY REPORT / LAPORAN RADIOLOGI
          </div>
        </div>

        <div style={{ ...styles.section, marginTop: '8px', marginBottom: '12px' }}>
          <div style={styles.grid2}>
            <FormField label="Patient Name" value={patient?.name ?? caseItem.patientName} />
            <FormField label="Exam Ref No." value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
          </div>
          <div style={styles.grid2}>
            <FormField label="Examination Type" value={caseItem.scanType} />
            <FormField label="Examination Date" value={examDate} />
          </div>
        </div>

        <div style={{ ...styles.section, minHeight: '380px' }}>
          <div style={styles.sectionTitle}>Diagnostic Report Findings &amp; Impression</div>
          <div style={{ ...styles.textareaBox, border: 'none', minHeight: '340px', fontSize: '11px', lineHeight: '1.5' }}>
            {report ? (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>FINDINGS:</div>
                <div style={{ marginBottom: '12px' }}>{report.findings}</div>

                <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>IMPRESSION:</div>
                <div style={{ marginBottom: '12px' }}>{report.impression}</div>

                {report.suggestions && (
                  <>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>SUGGESTIONS:</div>
                    <div>{report.suggestions}</div>
                  </>
                )}
              </>
            ) : (
              <span style={{ color: '#666', fontStyle: 'italic' }}>Report pending radiologist interpretation and sign-off.</span>
            )}
          </div>
        </div>

        <div style={{ ...styles.signatureRow, marginTop: '24px' }}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <FormField label="Radiologist Signature &amp; Stamp" value={report?.radiologistName ? `Dr. ${report.radiologistName}` : ''} />
          </div>
          <div style={{ width: '220px' }}>
            <FormField label="Date Signed" value={report?.signedAt ? new Date(report.signedAt).toLocaleDateString('en-GB') : ''} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Download MOH form as PDF using jsPDF + html2canvas */
export default function DownloadMohFormButton({ caseItem, patient, report }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setLoading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`MOH_Radiology_Request_${caseItem.caseNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
        title="Download Radiology Request Form (MOH PER.SS-RA301) as PDF"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {loading ? 'Generating PDF…' : 'Download MOH Form'}
      </button>

      <div
        ref={printRef}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}
        aria-hidden="true"
      >
        <MOHFormPrintView caseItem={caseItem} patient={patient} report={report} />
      </div>
    </>
  );
}
