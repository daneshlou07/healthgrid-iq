import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Case, Patient, Report } from '../../types';

interface Props {
  caseItem: Case;
  patient?: Patient;
  report?: Report;
}

/**
 * Bulletproof Table-Based HTML View for html2canvas PDF Export.
 * Uses pure <table>, <tr>, <td> with border-collapse and system Arial fonts.
 * Guarantees ZERO strikethroughs, PERFECT line alignments, and NO blank page spilling.
 */
export function MOHFormPrintView({ caseItem, patient, report }: Props) {
  const examDate = caseItem.officeTarikhPemeriksaan
    ? new Date(caseItem.officeTarikhPemeriksaan).toLocaleDateString('en-GB')
    : caseItem.scannedAt
    ? new Date(caseItem.scannedAt).toLocaleDateString('en-GB')
    : '';

  const isYes = (val?: string) => val === 'Yes' || val === 'Ya';
  const isNo = (val?: string) => val === 'No' || val === 'Tidak';

  const formatCheck = (val?: string) => (isYes(val) ? '[ X ] Yes   [   ] No' : isNo(val) ? '[   ] Yes   [ X ] No' : '[   ] Yes   [   ] No');

  const modalitiesList = [
    'General X-Ray', 'CT', 'MRI', 'US', 'Fluoro', 'Angio', 'IR', 'MMG', 'BMD', 'Image Media', 'Digitize Image', 'Reporting'
  ];

  return (
    <div
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#000',
        backgroundColor: '#fff',
        width: '200mm',
        margin: '0 auto',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 1: RADIOLOGY REQUEST FORM
         ════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: '200mm',
          padding: '8mm',
          boxSizing: 'border-box',
          backgroundColor: '#fff',
        }}
      >
        {/* Document Header */}
        <table style={{ width: '100%', marginBottom: '8px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', width: '80%' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' }}>MINISTRY OF HEALTH MALAYSIA</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>RADIOLOGY EXAMINATION REQUEST FORM</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>
                  <strong>HOSPITAL / CLINIC:</strong>{' '}
                  <span style={{ borderBottom: '1px solid #000', padding: '0 10px', fontWeight: 'bold' }}>
                    {caseItem.clinicName || 'HealthGrid IQ Radiology Centre'}
                  </span>
                </div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', width: '20%', fontSize: '9px', fontWeight: 'bold' }}>
                MOH PER.SS-RA301<br />(Rev1/2018)
              </td>
            </tr>
          </tbody>
        </table>

        {/* Outer Split Table: Patient Info (Left 65%) | Office Use (Right 35%) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
          <tbody>
            <tr>
              {/* LEFT COLUMN: Patient Info */}
              <td style={{ width: '65%', verticalAlign: 'top', border: '1px solid #000', padding: '4px', paddingRight: '8px' }}>
                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '6px', border: '1px solid #999' }}>
                  PATIENT INFORMATION
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold', padding: '3px 0' }}>1. Full Name:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{patient?.name ?? caseItem.patientName}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>2. NRIC / Passport:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '3px 4px' }}>{patient?.nric || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '3px 0' }}>3. Address:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '3px 4px' }}>{patient?.address || '—'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Sub-grid: DOB, Gender, Age */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '2px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '18%', fontWeight: 'bold' }}>4. DOB:</td>
                      <td style={{ width: '25%', borderBottom: '1px solid #000', padding: '2px' }}>{patient?.dob || '—'}</td>
                      <td style={{ width: '18%', fontWeight: 'bold', paddingLeft: '6px' }}>5. Gender:</td>
                      <td style={{ width: '18%', borderBottom: '1px solid #000', padding: '2px' }}>{patient?.gender || '—'}</td>
                      <td style={{ width: '12%', fontWeight: 'bold', paddingLeft: '6px' }}>8. Age:</td>
                      <td style={{ width: '9%', borderBottom: '1px solid #000', padding: '2px' }}>{patient?.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : '—'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Sub-grid: Phone, Ethnicity, MRN */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '18%', fontWeight: 'bold' }}>6. Phone:</td>
                      <td style={{ width: '25%', borderBottom: '1px solid #000', padding: '2px' }}>{patient?.phone || '—'}</td>
                      <td style={{ width: '18%', fontWeight: 'bold', paddingLeft: '6px' }}>7. Ethnicity:</td>
                      <td style={{ width: '18%', borderBottom: '1px solid #000', padding: '2px' }}>{patient?.ethnicity || '—'}</td>
                      <td style={{ width: '12%', fontWeight: 'bold', paddingLeft: '6px' }}>9. MRN:</td>
                      <td style={{ width: '9%', borderBottom: '1px solid #000', padding: '2px' }}>{patient?.mrn || '—'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Ward & Modality */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold' }}>10. Ward / Clinic:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.clinicName || '—'}</td>
                      <td style={{ width: '80px', fontWeight: 'bold', paddingLeft: '8px' }}>11. Modality:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>{caseItem.modality}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Screening questions */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold' }}>12. LMP Date:</td>
                      <td style={{ borderBottom: '1px solid #000', width: '90px' }}>{caseItem.lmp || '—'}</td>
                      <td style={{ fontWeight: 'bold', paddingLeft: '8px' }}>13. Pregnant Status:</td>
                      <td>{formatCheck(caseItem.isPregnant)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 'bold', paddingTop: '4px' }}>14. Asthma / Allergy / Reaction:</td>
                      <td colSpan={2} style={{ paddingTop: '4px' }}>
                        {formatCheck(caseItem.hasAllergy)}
                        {caseItem.allergyDetails && <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>({caseItem.allergyDetails})</span>}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 'bold', paddingTop: '4px' }}>15. Mobile Scanning:</td>
                      <td colSpan={2} style={{ paddingTop: '4px' }}>{formatCheck(caseItem.hasMobileDevice)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Classification Toggles */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '70px' }}>16. Citizen:</td>
                      <td style={{ width: '90px' }}>{isYes(caseItem.isWarganegara) ? '[ X ] Yes' : '[   ] Yes'}</td>
                      <td style={{ fontWeight: 'bold', width: '80px' }}>Civil Servant:</td>
                      <td style={{ width: '90px' }}>{isYes(caseItem.isPenjawatAwam) ? '[ X ] Yes' : '[   ] Yes'}</td>
                      <td style={{ fontWeight: 'bold', width: '40px' }}>FPP:</td>
                      <td>{isYes(caseItem.isFpp) ? '[ X ] Yes' : '[   ] Yes'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Payment Category & Renal */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold' }}>Payment Category:</td>
                      <td style={{ borderBottom: '1px solid #000' }}>{caseItem.paymentCategory || '—'}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '110px' }}>17. Renal Test Date:</td>
                      <td style={{ borderBottom: '1px solid #000', width: '70px' }}>{caseItem.renalFunctionDate || '—'}</td>
                      <td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '60px' }}>Creatinine:</td>
                      <td style={{ borderBottom: '1px solid #000', width: '50px' }}>{caseItem.creatinine || '—'}</td>
                      <td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '40px' }}>eGFR:</td>
                      <td style={{ borderBottom: '1px solid #000' }}>{caseItem.egfr || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* RIGHT COLUMN: Office Use & Technical Data */}
              <td style={{ width: '35%', verticalAlign: 'top', border: '1px solid #000', borderLeft: 'none', padding: '4px' }}>
                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '6px', border: '1px solid #999' }}>
                  ADMINISTRATION &amp; OFFICE USE
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>Reception Time:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Completion Time:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Technologist:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeJuruXRay || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Exam Date:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{examDate}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Exam Ref No.:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>{caseItem.officeNoPemeriksaan ?? caseItem.caseNumber}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
                  19. IMAGE EXPOSURE OUTPUT
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>Film Count:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.bilanganFilem ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>CD / DVD Count:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.bilanganCdDvd ?? ''}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
                  20. RADIATION EXPOSURE
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>kVp:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.doseKvp ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>mAs:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.doseMas ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Radiation Dose:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.dosRadiasi ? `${caseItem.dosRadiasi} mSv` : ''}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
                  21. APPOINTMENT DETAILS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '50px', padding: '2px 0' }}>Date:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeTarikhAppointment || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Time:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeMasaAppointment || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 18: REQUESTED SERVICE */}
        <div style={{ border: '1px solid #000', padding: '4px', marginBottom: '6px' }}>
          <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
            18. REQUESTED SERVICE
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '4px' }}>
            <tbody>
              <tr>
                {modalitiesList.slice(0, 6).map((m) => {
                  const isSelected = caseItem.modality === m || caseItem.scanType?.includes(m);
                  return (
                    <td key={m} style={{ padding: '2px 4px' }}>
                      {isSelected ? '[ X ]' : '[   ]'} {m}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {modalitiesList.slice(6, 12).map((m) => {
                  const isSelected = caseItem.modality === m || caseItem.scanType?.includes(m);
                  return (
                    <td key={m} style={{ padding: '2px 4px' }}>
                      {isSelected ? '[ X ]' : '[   ]'} {m}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <tbody>
              <tr>
                <td style={{ width: '130px', fontWeight: 'bold' }}>Requested Exams:</td>
                <td style={{ borderBottom: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>{caseItem.scanType}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 22: CONTRAST MEDIA DETAILS (If active) */}
        {caseItem.contrastMediaRequired && (
          <div style={{ border: '1px solid #000', padding: '4px', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
              22. CONTRAST MEDIA DETAILS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '100px', fontWeight: 'bold' }}>Brand / Name:</td>
                  <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.contrastMediaName}</td>
                  <td style={{ width: '90px', fontWeight: 'bold', paddingLeft: '10px' }}>Volume (ml):</td>
                  <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.contrastMediaVolumeMl}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* CLINICAL NOTES */}
        <div style={{ border: '1px solid #000', padding: '4px', marginBottom: '6px' }}>
          <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
            CLINICAL NOTES
          </div>
          <div style={{ minHeight: '65px', padding: '4px', fontSize: '10.5px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
            {caseItem.ringkasanKlinikal || caseItem.notes || 'No clinical notes provided.'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '10px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '220px' }}>Referring Doctor Signature &amp; Stamp:</td>
                <td style={{ borderBottom: '1px solid #000' }}>&nbsp;</td>
                <td style={{ fontWeight: 'bold', width: '80px', paddingLeft: '12px' }}>Date / Time:</td>
                <td style={{ borderBottom: '1px solid #000', width: '130px' }}>{new Date(caseItem.createdAt).toLocaleString('en-GB')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RADIOGRAPHER COMMENTS */}
        {caseItem.komen && (
          <div style={{ border: '1px solid #000', padding: '4px' }}>
            <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '2px', border: '1px solid #999' }}>
              RADIOGRAPHER OPERATIONAL COMMENTS
            </div>
            <div style={{ fontSize: '10px', padding: '2px 4px' }}>{caseItem.komen}</div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 2: RADIOLOGY REPORT
         ════════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: '200mm',
          padding: '8mm',
          boxSizing: 'border-box',
          backgroundColor: '#fff',
        }}
      >
        <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', borderBottom: '2px solid #000' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', width: '80%', paddingBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>MINISTRY OF HEALTH MALAYSIA</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', marginTop: '2px' }}>
                  RADIOLOGY REPORT / LAPORAN RADIOLOGI
                </div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', width: '20%', fontSize: '9px', fontWeight: 'bold' }}>
                MOH PER.SS-RA301<br />(Page 2)
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ width: '100px', fontWeight: 'bold', padding: '3px 0' }}>Patient Name:</td>
                <td style={{ borderBottom: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{patient?.name ?? caseItem.patientName}</td>
                <td style={{ width: '100px', fontWeight: 'bold', paddingLeft: '12px' }}>Exam Ref No.:</td>
                <td style={{ borderBottom: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{caseItem.officeNoPemeriksaan ?? caseItem.caseNumber}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '3px 0' }}>Examination:</td>
                <td style={{ borderBottom: '1px solid #000', padding: '3px' }}>{caseItem.scanType}</td>
                <td style={{ fontWeight: 'bold', paddingLeft: '12px' }}>Exam Date:</td>
                <td style={{ borderBottom: '1px solid #000', padding: '3px' }}>{examDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ border: '1px solid #000', padding: '6px', minHeight: '380px' }}>
          <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '11px', padding: '4px 6px', marginBottom: '8px', border: '1px solid #999' }}>
            DIAGNOSTIC REPORT FINDINGS &amp; IMPRESSION
          </div>
          <div style={{ minHeight: '340px', fontSize: '11px', lineHeight: '1.5', padding: '4px' }}>
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

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '24px' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', width: '180px' }}>Radiologist Signature &amp; Stamp:</td>
              <td style={{ borderBottom: '1px solid #000' }}>
                {report?.radiologistName ? `Dr. ${report.radiologistName}` : '&nbsp;'}
              </td>
              <td style={{ fontWeight: 'bold', width: '90px', paddingLeft: '16px' }}>Date Signed:</td>
              <td style={{ borderBottom: '1px solid #000', width: '130px' }}>
                {report?.signedAt ? new Date(report.signedAt).toLocaleDateString('en-GB') : ''}
              </td>
            </tr>
          </tbody>
        </table>
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
