import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Case, Patient, Report } from '../../types';

interface Props {
  caseItem: Case;
  patient?: Patient;
  report?: Report;
}

// ─── Inline styles for the print layout (matches MOH PER.SS-RA301 structure) ──
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
  smallBox: { display: 'inline-block', border: '1px solid #000', padding: '1px 4px', minWidth: '30px', textAlign: 'center' as const, fontSize: '10px' },
  checkRow: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10px' },
  checkbox: { display: 'inline-block', border: '1px solid #000', width: '12px', height: '12px', marginRight: '3px' },
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

function YaTidak({ label, value }: { label: string; value?: string }) {
  return (
    <div style={styles.checkRow}>
      <span style={{ fontWeight: 'bold', fontSize: '10px', marginRight: '4px' }}>{label}</span>
      <span style={{ ...styles.circle, backgroundColor: value === 'Ya' ? '#000' : 'transparent' }} />Ya
      <span style={{ ...styles.circle, backgroundColor: value === 'Tidak' ? '#000' : 'transparent', marginLeft: '6px' }} />Tidak
    </div>
  );
}

/** Renders a hidden pixel-perfect replica of PER.SS-RA301 for PDF generation */
export function MOHFormPrintView({ caseItem, patient, report }: Props) {
  const examDate = caseItem.officeTarikhPemeriksaan
    ? new Date(caseItem.officeTarikhPemeriksaan).toLocaleDateString('ms-MY')
    : caseItem.scannedAt
    ? new Date(caseItem.scannedAt).toLocaleDateString('ms-MY')
    : '';

  return (
    <div style={styles.page}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.formRef}>PER.SS-RA301<br />(Pind1/2018)</div>
        <div style={styles.h1}>KEMENTERIAN KESIHATAN MALAYSIA</div>
        <div style={styles.h2}>BORANG PERMOHONAN PEMERIKSAAN RADIOLOGI</div>
        <div style={{ ...styles.field, justifyContent: 'center', marginTop: '4px' }}>
          <span style={styles.label}>HOSPITAL / KLINIK:</span>
          <span style={styles.value}>{caseItem.clinicName ?? ''}</span>
        </div>
      </div>

      {/* ── Two-column: Maklumat Pesakit + Kegunaan Pejabat ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px', marginBottom: '4px' }}>
        {/* LEFT: Maklumat Pesakit */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Maklumat Pesakit</div>
          <Field label="1. Nama Penuh" value={patient?.name ?? caseItem.patientName} />
          <Field label="2. No. Kad Pengenalan / Pasport" value={patient?.nric} />
          <Field label="3. Alamat Kediaman" value={patient?.address} />
          <div style={styles.grid3}>
            <div style={styles.field}><span style={styles.label}>4. Tarikh Lahir:</span><span style={styles.value}>{patient?.dob}</span></div>
            <div style={styles.field}><span style={styles.label}>5. Jantina:</span><span style={styles.value}>{patient?.gender === 'Female' ? 'P' : patient?.gender === 'Male' ? 'L' : ''}</span></div>
            <div style={styles.field}><span style={styles.label}>8. Umur:</span><span style={styles.value}>{patient?.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : ''}</span></div>
          </div>
          <div style={styles.grid3}>
            <div style={styles.field}><span style={styles.label}>6. No. Telefon:</span><span style={styles.value}>{patient?.phone}</span></div>
            <div style={styles.field}><span style={styles.label}>7. Etnik:</span><span style={styles.value}>{patient?.ethnicity}</span></div>
            <div style={styles.field}><span style={styles.label}>9. No. Daftar Pesakit:</span><span style={styles.value}>{patient?.mrn}</span></div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.field}><span style={styles.label}>10. Wad/Klinik/A&amp;E/RH:</span><span style={styles.value}>{caseItem.clinicName}</span></div>
            <div style={styles.field}><span style={styles.label}>11. Disiplin:</span><span style={styles.value}>{caseItem.modality}</span></div>
          </div>
          <div style={{ ...styles.field, marginTop: '4px' }}>
            <span style={styles.label}>12. LMP:</span>
            <span style={styles.value}>{caseItem.lmp ?? ''}</span>
            <span style={{ ...styles.label, marginLeft: '8px' }}>*13. Mengandung:</span>
            <YaTidak label="" value={caseItem.isPregnant} />
          </div>
          <div style={{ ...styles.field }}>
            <span style={styles.label}>14. Asma/Alergi/Reaksi Media Kontras:</span>
            <YaTidak label="" value={caseItem.hasAllergy} />
            {caseItem.allergyDetails && <span style={{ fontSize: '10px', marginLeft: '4px' }}>({caseItem.allergyDetails})</span>}
          </div>
          <div style={styles.field}>
            <span style={styles.label}>15. Mobile:</span>
            <YaTidak label="" value={caseItem.hasMobileDevice} />
          </div>
          <div style={{ ...styles.checkRow, gap: '12px', marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px' }}>16. Warganegara:</span>
            <YaTidak label="" value={caseItem.isWarganegara} />
            <span style={{ fontWeight: 'bold', fontSize: '10px', marginLeft: '8px' }}>Penjawat Awam:</span>
            <YaTidak label="" value={caseItem.isPenjawatAwam} />
            <span style={{ fontWeight: 'bold', fontSize: '10px', marginLeft: '8px' }}>FPP:</span>
            <YaTidak label="" value={caseItem.isFpp} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Status Bayaran:</span>
            <span style={styles.value}>{caseItem.paymentCategory ?? ''}</span>
          </div>
          <div style={{ ...styles.field }}>
            <span style={styles.label}>17. Renal Function Tarikh:</span>
            <span style={styles.value}>{caseItem.renalFunctionDate ?? ''}</span>
            <span style={{ ...styles.label, marginLeft: '4px' }}>Creatinine:</span>
            <span style={styles.value}>{caseItem.creatinine ?? ''}</span>
            <span style={{ ...styles.label, marginLeft: '4px' }}>eGFR:</span>
            <span style={styles.value}>{caseItem.egfr ?? ''}</span>
          </div>
        </div>

        {/* RIGHT: Kegunaan Pejabat + Paparan Imej + Faktor Dedahan */}
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Kegunaan Pejabat</div>
            <Field label="Waktu Terima" value={caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : ''} />
            <Field label="Waktu Selesai" value={caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : ''} />
            <Field label="Juru X-Ray" value={caseItem.officeJuruXRay} />
            <Field label="Tarikh Pemeriksaan" value={examDate} />
            <Field label="No. Pemeriksaan" value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>19. Paparan Imej</div>
            <Field label="Bilangan Filem" value={caseItem.bilanganFilem} />
            <Field label="Bilangan CD/DVD" value={caseItem.bilanganCdDvd} />
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>20. Faktor Dedahan</div>
            <Field label="kVp" value={caseItem.doseKvp} />
            <Field label="mAs" value={caseItem.doseMas} />
            <Field label="Dos Radiasi" value={caseItem.dosRadiasi} />
          </div>
          <div style={{ ...styles.section, backgroundColor: '#f8f8f8' }}>
            <div style={styles.sectionTitle}>21. Temujanji Pemeriksaan</div>
            <Field label="Tarikh" value={caseItem.officeTarikhAppointment ?? ''} />
            <Field label="Masa" value={caseItem.officeMasaAppointment ?? ''} />
          </div>
        </div>
      </div>

      {/* ── Section 18: Perkhidmatan ─────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>18. Perkhidmatan</div>
        <div style={styles.checkRow}>
          {['X-Ray Am', 'CT', 'MRI', 'US', 'Fluoro', 'Angio', 'IR', '*MMG', 'BMD', '*Media Imej', '*Digitize Image', '*Pelaporan'].map((m) => (
            <span key={m} style={{ marginRight: '8px', fontSize: '10px' }}>
              <span style={{ ...styles.circle, backgroundColor: caseItem.modality === m || caseItem.scanType?.includes(m) ? '#000' : 'transparent' }} />{m}
            </span>
          ))}
        </div>
        {caseItem.bahagianPemeriksaan && (
          <div style={{ ...styles.field, marginTop: '4px' }}>
            <span style={styles.label}>Bahagian Pemeriksaan:</span>
            <span style={styles.value}>{caseItem.bahagianPemeriksaan}</span>
          </div>
        )}
      </div>

      {/* ── Section 22: Media Kontras ────────────────────────── */}
      {caseItem.contrastMediaRequired && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>*22. Media Kontras (Nyatakan Jika Berkaitan)</div>
          <div style={styles.grid2}>
            <Field label="Jenama" value={caseItem.contrastMediaName} />
            <Field label="Isipadu (ml)" value={caseItem.contrastMediaVolumeMl} />
          </div>
        </div>
      )}

      {/* ── Ringkasan Klinikal ────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Ringkasan Klinikal</div>
        <div style={styles.textarea}>
          {caseItem.ringkasanKlinikal ?? caseItem.notes ?? ''}
        </div>
        <div style={styles.signatureBlock}>
          <div style={styles.grid2}>
            <Field label="Tandatangan dan Cop Pakar / Pegawai Perubatan" value="" />
            <Field label="Tarikh / Masa" value={new Date(caseItem.createdAt).toLocaleString('ms-MY')} />
          </div>
        </div>
      </div>

      {/* ── Komen ──────────────────────────────────────────────── */}
      {caseItem.komen && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Komen</div>
          <p style={{ fontSize: '10px' }}>{caseItem.komen}</p>
        </div>
      )}

      {/* ── PAGE 2: Laporan Radiologi ─────────────────────────── */}
      <div style={styles.pageBreak} />
      <div style={styles.page}>
        <div style={{ ...styles.sectionTitle, fontSize: '13px', textAlign: 'center', backgroundColor: '#000', color: '#fff', padding: '4px' }}>
          LAPORAN RADIOLOGI
        </div>
        <div style={styles.grid2}>
          <Field label="Nama Pesakit" value={patient?.name ?? caseItem.patientName} />
          <Field label="No. Pemeriksaan" value={caseItem.officeNoPemeriksaan ?? caseItem.caseNumber} />
        </div>
        <div style={styles.grid2}>
          <Field label="Jenis Pemeriksaan" value={caseItem.scanType} />
          <Field label="Tarikh Pemeriksaan" value={examDate} />
        </div>
        <div style={{ ...styles.textarea, minHeight: '200px', marginTop: '8px' }}>
          {report ? `FINDINGS:\n${report.findings}\n\nIMPRESSION:\n${report.impression}${report.suggestions ? `\n\nSUGGESTIONS:\n${report.suggestions}` : ''}` : ''}
        </div>
        <div style={styles.signatureBlock}>
          <div style={styles.grid2}>
            <Field label="Tandatangan dan Cop Pakar / Pegawai Perubatan" value="" />
            <Field label="Tarikh" value={report?.signedAt ? new Date(report.signedAt).toLocaleDateString('ms-MY') : ''} />
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

      // Split into A4 pages if content exceeds one page
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

      pdf.save(`MOH_PER-SS-RA301_${caseItem.caseNumber}.pdf`);
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
        title="Download MOH Radiology Form PER.SS-RA301 as PDF"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {loading ? 'Generating PDF…' : 'Download MOH Form'}
      </button>

      {/* Hidden render surface for html2canvas */}
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
