import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Case, Patient, Report } from '../../types';

interface Props {
  caseItem: Case;
  patient?: Patient;
  report?: Report;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '11px',
    color: '#000',
    backgroundColor: '#fff',
    width: '210mm',
    padding: '12mm',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    borderBottom: '2px solid #000',
    paddingBottom: '8px',
    marginBottom: '8px',
  },
  h1: { fontSize: '13px', fontWeight: 'bold', margin: '0 0 2px 0' },
  h2: { fontSize: '11px', fontWeight: 'bold', margin: '0 0 2px 0' },
  formRef: { fontSize: '10px', textAlign: 'right', float: 'right' as const, marginTop: '-24px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '4px' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', marginBottom: '4px' },
  section: { border: '1px solid #000', padding: '4px 6px', marginBottom: '4px' },
  sectionTitle: { fontSize: '10px', fontWeight: 'bold', backgroundColor: '#e0e0e0', padding: '2px 4px', marginBottom: '4px', textTransform: 'uppercase' as const },
  field: { display: 'flex', gap: '4px', marginBottom: '3px', alignItems: 'flex-start' },
  label: { fontWeight: 'bold', whiteSpace: 'nowrap' as const, fontSize: '10px', minWidth: '90px' },
  value: { borderBottom: '1px solid #555', flex: 1, minHeight: '14px', fontSize: '10px', paddingLeft: '2px' },
  checkRow: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10px' },
  circle: { display: 'inline-block', border: '1px solid #000', borderRadius: '50%', width: '12px', height: '12px', marginRight: '3px', backgroundColor: 'transparent' },
  pageBreak: { pageBreakAfter: 'always' as const },
  signatureBlock: { marginTop: '20px', borderTop: '1px solid #000', paddingTop: '8px' },
  textarea: { border: '1px solid #000', minHeight: '80px', padding: '4px', fontSize: '10px', width: '100%', boxSizing: 'border-box' as const },
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}:</span>
      <span style={styles.value}>{value ?? ''}</span>
    </div>
  );
}

function YesNo({ label, value }: { label: string; value?: string }) {
  const isYes = value === 'Yes' || value === 'Ya';
  const isNo = value === 'No' || value === 'Tidak';

  return (
    <div style={styles.checkRow}>
      <span style={{ fontWeight: 'bold', fontSize: '10px', marginRight: '4px' }}>{label}</span>
      <span style={{ ...styles.circle, backgroundColor: isYes ? '#000' : 'transparent' }} />Yes
      <span style={{ ...styles.circle, backgroundColor: isNo ? '#000' : 'transparent', marginLeft: '6px' }} />No
    </div>
  );
}

/** Renders a hidden pixel-perfect replica of PER.SS-RA301 in English for PDF generation */
export function MOHFormPrintView({ caseItem, patient, report }: Props) {
  const examDate = caseItem.officeTarikhPemeriksaan
    ? new Date(caseItem.officeTarikhPemeriksaan).toLocaleDateString('en-GB')
    : caseItem.scannedAt
    ? new Date(caseItem.scannedAt).toLocaleDateString('en-GB')
    : '';

  return (
    <div style={styles.page}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.formRef}>MOH PER.SS-RA301<br />(Rev1/2018)</div>
        <div style={styles.h1}>MINISTRY OF HEALTH MALAYSIA</div>
        <div style={styles.h2}>RADIOLOGY EXAMINATION REQUEST FORM</div>
        <div style={{ ...styles.field, justifyContent: 'center', marginTop: '4px' }}>
          <span style={styles.label}>HOSPITAL / CLINIC:</span>
          <span style={styles.value}>{caseItem.clinicName ?? ''}</span>
        </div>
      </div>

      {/* ── Two-column: Patient Information + Office Use ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px', marginBottom: '4px' }}>
        {/* LEFT: Patient Information */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Patient Information</div>
          <Field label="1. Full Name" value={patient?.name ?? caseItem.patientName} />
          <Field label="2. NRIC / Passport No." value={patient?.nric} />
          <Field label="3. Residential Address" value={patient?.address} />
          <div style={styles.grid3}>
            <div style={styles.field}><span style={styles.label}>4. DOB:</span><span style={styles.value}>{patient?.dob}</span></div>
            <div style={styles.field}><span style={styles.label}>5. Gender:</span><span style={styles.value}>{patient?.gender}</span></div>
            <div style={styles.field}><span style={styles.label}>8. Age:</span><span style={styles.value}>{patient?.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : ''}</span></div>
          </div>
          <div style={styles.grid3}>
            <div style={styles.field}><span style={styles.label}>6. Phone No.:</span><span style={styles.value}>{patient?.phone}</span></div>
            <div style={styles.field}><span style={styles.label}>7. Ethnicity:</span><span style={styles.value}>{patient?.ethnicity}</span></div>
            <div style={styles.field}><span style={styles.label}>9. Patient MRN:</span><span style={styles.value}>{patient?.mrn}</span></div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}><span style={styles.label}>10. Ward/Clinic:</span><span style={styles.value}>{caseItem.clinicName}</span></div>
            <div style={styles.field}><span style={styles.label}>11. Modality:</span><span style={styles.value}>{caseItem.modality}</span></div>
          </div>
          <div style={{ ...styles.field, marginTop: '4px' }}>
            <span style={styles.label}>12. LMP Date:</span>
            <span style={styles.value}>{caseItem.lmp ?? ''}</span>
            <span style={{ ...styles.label, marginLeft: '8px' }}>13. Pregnant Status:</span>
            <YesNo label="" value={caseItem.isPregnant} />
          </div>
          <div style={{ ...styles.field }}>
            <span style={styles.label}>14. Asthma / Allergy / Reaction:</span>
            <YesNo label="" value={caseItem.hasAllergy} />
            {caseItem.allergyDetails && <span style={{ fontSize: '10px', marginLeft: '4px' }}>({caseItem.allergyDetails})</span>}
          </div>
          <div style={styles.field}>
            <span style={styles.label}>15. Mobile Scanning:</span>
            <YesNo label="" value={caseItem.hasMobileDevice} />
          </div>
          <div style={{ ...styles.checkRow, gap: '12px', marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px' }}>16. Citizen:</span>
            <YesNo label="" value={caseItem.isWarganegara} />
            <span style={{ fontWeight: 'bold', fontSize: '10px', marginLeft: '8px' }}>Civil Servant:</span>
            <YesNo label="" value={caseItem.isPenjawatAwam} />
            <span style={{ fontWeight: 'bold', fontSize: '10px', marginLeft: '8px' }}>FPP:</span>
            <YesNo label="" value={caseItem.isFpp} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Payment Category:</span>
            <span style={styles.value}>{caseItem.paymentCategory ?? ''}</span>
          </div>
          <div style={{ ...styles.field }}>
            <span style={styles.label}>17. Renal Test Date:</span>
            <span style={styles.value}>{caseItem.renalFunctionDate ?? ''}</span>
            <span style={{ ...styles.label, marginLeft: '4px' }}>Creatinine:</span>
            <span style={styles.value}>{caseItem.creatinine ?? ''}</span>
            <span style={{ ...styles.label, marginLeft: '4px' }}>eGFR:</span>
            <span style={styles.value}>{caseItem.egfr ?? ''}</span>
          </div>
        </div>

        {/* RIGHT: Office Use + Image Output + Radiation Exposure */}
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Administration &amp; Office Use</div>
            <Field label="Reception Time" value={caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''} />
            <Field label="Completion Time" value={caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''} />
            <Field label="Technologist" value={caseItem.officeJuruXRay} />
            <Field label="Examination Date" value={examDate} />
            <Field label="Exam Ref No." value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>19. Image Exposure Output</div>
            <Field label="Film Count" value={caseItem.bilanganFilem} />
            <Field label="CD / DVD Count" value={caseItem.bilanganCdDvd} />
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>20. Radiation Exposure</div>
            <Field label="kVp" value={caseItem.doseKvp} />
            <Field label="mAs" value={caseItem.doseMas} />
            <Field label="Radiation Dose" value={caseItem.dosRadiasi ? `${caseItem.dosRadiasi} mSv` : ''} />
          </div>
          <div style={{ ...styles.section, backgroundColor: '#f8f8f8' }}>
            <div style={styles.sectionTitle}>21. Examination Appointment</div>
            <Field label="Date" value={caseItem.officeTarikhAppointment ?? ''} />
            <Field label="Time" value={caseItem.officeMasaAppointment ?? ''} />
          </div>
        </div>
      </div>

      {/* ── Section 18: Requested Service ────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>18. Requested Service</div>
        <div style={styles.checkRow}>
          {['General X-Ray', 'CT', 'MRI', 'US', 'Fluoro', 'Angio', 'IR', 'MMG', 'BMD', 'Image Media', 'Digitize Image', 'Reporting'].map((m) => (
            <span key={m} style={{ marginRight: '8px', fontSize: '10px' }}>
              <span style={{ ...styles.circle, backgroundColor: caseItem.modality === m || caseItem.scanType?.includes(m) ? '#000' : 'transparent' }} />{m}
            </span>
          ))}
        </div>
        <div style={{ ...styles.field, marginTop: '4px' }}>
          <span style={styles.label}>Requested Exams:</span>
          <span style={styles.value}>{caseItem.scanType}</span>
        </div>
      </div>

      {/* ── Section 22: Contrast Media ────────────────────────── */}
      {caseItem.contrastMediaRequired && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>22. Contrast Media Details</div>
          <div style={styles.grid2}>
            <Field label="Brand / Name" value={caseItem.contrastMediaName} />
            <Field label="Volume (ml)" value={caseItem.contrastMediaVolumeMl} />
          </div>
        </div>
      )}

      {/* ── Clinical Notes ────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Clinical Notes</div>
        <div style={styles.textarea}>
          {caseItem.ringkasanKlinikal ?? caseItem.notes ?? ''}
        </div>
        <div style={styles.signatureBlock}>
          <div style={styles.grid2}>
            <Field label="Referring Medical Officer Signature &amp; Stamp" value="" />
            <Field label="Date / Time" value={new Date(caseItem.createdAt).toLocaleString('en-GB')} />
          </div>
        </div>
      </div>

      {/* ── Operational Comments ──────────────────────────────── */}
      {caseItem.komen && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Radiographer Operational Comments</div>
          <p style={{ fontSize: '10px' }}>{caseItem.komen}</p>
        </div>
      )}

      {/* ── PAGE 2: Radiology Report ─────────────────────────── */}
      <div style={styles.pageBreak} />
      <div style={styles.page}>
        <div style={{ ...styles.sectionTitle, fontSize: '13px', textAlign: 'center', backgroundColor: '#000', color: '#fff', padding: '4px' }}>
          RADIOLOGY REPORT
        </div>
        <div style={styles.grid2}>
          <Field label="Patient Name" value={patient?.name ?? caseItem.patientName} />
          <Field label="Exam Ref No." value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
        </div>
        <div style={styles.grid2}>
          <Field label="Examination Type" value={caseItem.scanType} />
          <Field label="Examination Date" value={examDate} />
        </div>
        <div style={{ ...styles.textarea, minHeight: '200px', marginTop: '8px' }}>
          {report ? `FINDINGS:\n${report.findings}\n\nIMPRESSION:\n${report.impression}${report.suggestions ? `\n\nSUGGESTIONS:\n${report.suggestions}` : ''}` : 'Report pending.'}
        </div>
        <div style={styles.signatureBlock}>
          <div style={styles.grid2}>
            <Field label="Radiologist Signature &amp; Stamp" value="" />
            <Field label="Date Signed" value={report?.signedAt ? new Date(report.signedAt).toLocaleDateString('en-GB') : ''} />
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
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
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
