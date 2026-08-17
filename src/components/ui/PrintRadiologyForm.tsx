import React, { useRef, useState } from 'react';
import { Download, Loader2, Printer, X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import type { Case, Patient, Report } from '../../types';

interface Props {
  caseItem: Case;
  patient?: Patient;
  report?: Report;
  pageFilter?: 1 | 2;
  buttonClassName?: string;
}

/**
 * Bulletproof Table-Based HTML View for MOH PER.SS-RA301 Radiology Form.
 * Uses pure HTML tables with robust styling for on-screen preview,
 * pixel-perfect html2canvas rendering, and 100% vector @media print output.
 */
export function MOHFormPrintView({ caseItem, patient, report, pageFilter }: Props) {
  const examDate = caseItem.officeTarikhPemeriksaan
    ? new Date(caseItem.officeTarikhPemeriksaan).toLocaleDateString('en-GB')
    : caseItem.scannedAt
      ? new Date(caseItem.scannedAt).toLocaleDateString('en-GB')
      : '';

  const isYes = (val?: string) => val === 'Yes' || val === 'Ya';
  const isNo = (val?: string) => val === 'No' || val === 'Tidak';

  const formatCheck = (val?: string) =>
    isYes(val) ? '[ X ] Yes   [   ] No' : isNo(val) ? '[   ] Yes   [ X ] No' : '[   ] Yes   [   ] No';

  const modalitiesList = [
    'General X-Ray', 'CT', 'MRI', 'US', 'Fluoro', 'Angio', 'IR', 'MMG', 'BMD', 'Image Media', 'Digitize Image', 'Reporting'
  ];

  return (
    <div
      id="moh-printable-document"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10.5px',
        color: '#000',
        backgroundColor: '#fff',
        width: '210mm',
        margin: '0 auto',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 1: RADIOLOGY REQUEST FORM
         ════════════════════════════════════════════════════════════════════════ */}
      {(!pageFilter || pageFilter === 1) && (
        <div
          data-pdf-page="1"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm 12mm 8mm',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            pageBreakAfter: 'always',
          }}
        >
          {/* Document Header */}
          <table style={{ width: '100%', marginBottom: '8px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', width: '80%' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>MINISTRY OF HEALTH MALAYSIA</div>
                  <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '2px' }}>RADIOLOGY EXAMINATION REQUEST FORM</div>
                  <div style={{ fontSize: '10.5px', marginTop: '4px' }}>
                    <strong>HOSPITAL / CLINIC:</strong>{' '}
                    <span style={{ borderBottom: '1.5px solid #000', padding: '0 8px 1px', fontWeight: 'bold', display: 'inline-block' }}>
                      {caseItem.clinicName || 'HealthGrid IQ Radiology Centre'}
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', width: '20%', fontSize: '8.5px', fontWeight: 'bold' }}>
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
                <td style={{ width: '65%', verticalAlign: 'top', border: '1px solid #000', padding: '4px 6px' }}>
                  <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginBottom: '4px', border: '1px solid #999' }}>
                    PATIENT INFORMATION
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '105px', fontWeight: 'bold', padding: '2px 0' }}>1. Full Name:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '2px 4px 1px', fontWeight: 'bold' }}>{patient?.name ?? caseItem.patientName}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '2px 0' }}>2. NRIC / Passport:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '2px 4px 1px' }}>{patient?.nric || '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '2px 0' }}>3. Address:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '2px 4px 1px' }}>{patient?.address || '—'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Sub-grid: DOB, Gender, Age */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '2px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '16%', fontWeight: 'bold' }}>4. DOB:</td>
                        <td style={{ width: '26%', borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{patient?.dob || '—'}</td>
                        <td style={{ width: '18%', fontWeight: 'bold', paddingLeft: '4px' }}>5. Gender:</td>
                        <td style={{ width: '18%', borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{patient?.gender || '—'}</td>
                        <td style={{ width: '12%', fontWeight: 'bold', paddingLeft: '4px' }}>8. Age:</td>
                        <td style={{ width: '10%', borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{patient?.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : '—'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Sub-grid: Phone, Ethnicity, MRN */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '3px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '16%', fontWeight: 'bold' }}>6. Phone:</td>
                        <td style={{ width: '26%', borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{patient?.phone || '—'}</td>
                        <td style={{ width: '18%', fontWeight: 'bold', paddingLeft: '4px' }}>7. Ethnicity:</td>
                        <td style={{ width: '18%', borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{patient?.ethnicity || '—'}</td>
                        <td style={{ width: '12%', fontWeight: 'bold', paddingLeft: '4px' }}>9. MRN:</td>
                        <td style={{ width: '10%', borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{patient?.mrn || '—'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Ward & Modality */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '3px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '105px', fontWeight: 'bold' }}>10. Ward / Clinic:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '2px 2px 1px' }}>{caseItem.clinicName || '—'}</td>
                        <td style={{ width: '75px', fontWeight: 'bold', paddingLeft: '6px' }}>11. Modality:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '2px 2px 1px', fontWeight: 'bold' }}>{caseItem.modality}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Screening questions */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '3px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '105px', fontWeight: 'bold' }}>12. LMP Date:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.lmp || '—'}</td>
                        <td style={{ width: '110px', fontWeight: 'bold', paddingLeft: '6px' }}>13. Pregnant Status:</td>
                        <td>{formatCheck(caseItem.isPregnant)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ fontWeight: 'bold', paddingTop: '3px' }}>14. Asthma / Allergy / Reaction:</td>
                        <td colSpan={2} style={{ paddingTop: '3px' }}>
                          {formatCheck(caseItem.hasAllergy)}
                          {caseItem.allergyDetails && <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>({caseItem.allergyDetails})</span>}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ fontWeight: 'bold', paddingTop: '3px' }}>15. Mobile Scanning:</td>
                        <td colSpan={2} style={{ paddingTop: '3px' }}>{formatCheck(caseItem.hasMobileDevice)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Citizenship / FPP / Payment */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '3px' }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 'bold', width: '60px' }}>16. Citizen:</td>
                        <td style={{ width: '65px' }}>{formatCheck(caseItem.isWarganegara)}</td>
                        <td style={{ fontWeight: 'bold', width: '80px', paddingLeft: '4px' }}>Civil Servant:</td>
                        <td style={{ width: '65px' }}>{formatCheck(caseItem.isPenjawatAwam)}</td>
                        <td style={{ fontWeight: 'bold', width: '40px', paddingLeft: '4px' }}>FPP:</td>
                        <td>{formatCheck(caseItem.isFpp)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '2px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '110px', fontWeight: 'bold' }}>Payment Category:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.paymentCategory || 'Standard MOH / Free Screening'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Renal Function */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '3px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '110px', fontWeight: 'bold' }}>17. Renal Test Date:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px', width: '80px' }}>{caseItem.renalFunctionDate || '—'}</td>
                        <td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '70px' }}>Creatinine:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px', width: '50px' }}>{caseItem.creatinine || '—'}</td>
                        <td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '45px' }}>eGFR:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.egfr || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>

                {/* RIGHT COLUMN: Office Use & Radiation Exposure */}
                <td style={{ width: '35%', verticalAlign: 'top', border: '1px solid #000', borderLeft: 'none', padding: '4px 6px' }}>
                  <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginBottom: '4px', border: '1px solid #999' }}>
                    ADMINISTRATION &amp; OFFICE USE
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 'bold', width: '100px', padding: '2px 0' }}>Reception Time:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', width: '100px', padding: '2px 0' }}>Completion Time:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Technologist:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.officeJuruXRay || caseItem.radiographerName || ''}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Exam Date:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{examDate}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Exam Ref No.:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px', fontWeight: 'bold' }}>{caseItem.caseNumber}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9px', padding: '2px 4px', marginTop: '6px', marginBottom: '3px', border: '1px solid #999' }}>
                    19. IMAGE EXPOSURE OUTPUT
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '90px', padding: '2px 0' }}>Film Count:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.bilanganFilem ?? ''}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0' }}>CD / DVD Count:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.bilanganCdDvd ?? ''}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9px', padding: '2px 4px', marginTop: '6px', marginBottom: '3px', border: '1px solid #999' }}>
                    20. RADIATION EXPOSURE
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '90px', padding: '2px 0' }}>kVp:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.doseKvp ?? ''}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0' }}>mAs:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.doseMas ?? ''}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0' }}>Radiation Dose:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.dosRadiasi ? `${caseItem.dosRadiasi} mSv` : ''}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9px', padding: '2px 4px', marginTop: '6px', marginBottom: '3px', border: '1px solid #999' }}>
                    21. APPOINTMENT DETAILS
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '90px', padding: '2px 0' }}>Date:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.officeTarikhAppointment || ''}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0' }}>Time:</td>
                        <td style={{ borderBottom: '1px solid #000', padding: '1px 2px' }}>{caseItem.officeMasaAppointment || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 18. REQUESTED SERVICE */}
          <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginBottom: '4px', border: '1px solid #999' }}>
              18. REQUESTED SERVICE
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '4px' }}>
              <tbody>
                <tr>
                  {modalitiesList.slice(0, 6).map((m) => (
                    <td key={m} style={{ padding: '1px 2px' }}>
                      {caseItem.modality === m || caseItem.scanType?.includes(m) ? `[ X ] ${m}` : `[   ] ${m}`}
                    </td>
                  ))}
                </tr>
                <tr>
                  {modalitiesList.slice(6).map((m) => (
                    <td key={m} style={{ padding: '1px 2px' }}>
                      {caseItem.modality === m || caseItem.scanType?.includes(m) ? `[ X ] ${m}` : `[   ] ${m}`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '2px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '115px', fontWeight: 'bold' }}>Requested Exams:</td>
                  <td style={{ borderBottom: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                    {caseItem.scanType || 'Chest X-Ray / Routine Screening'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CLINICAL NOTES */}
          <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginBottom: '4px', border: '1px solid #999' }}>
              CLINICAL NOTES &amp; INDICATION
            </div>
            <div style={{ minHeight: '36px', padding: '2px 4px', fontSize: '9.5px', lineHeight: '1.35', whiteSpace: 'pre-line' }}>
              {caseItem.ringkasanKlinikal || caseItem.notes || caseItem.indication || 'No clinical notes provided.'}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginTop: '6px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '200px' }}>Referring Doctor Signature &amp; Stamp:</td>
                  <td style={{ borderBottom: '1px solid #000' }}>
                    {caseItem.registeredByName ? `${caseItem.registeredByName} (Medical Officer)` : 'Dr. Medical Officer'}
                  </td>
                  <td style={{ fontWeight: 'bold', width: '60px', paddingLeft: '8px' }}>Date:</td>
                  <td style={{ borderBottom: '1px solid #000', width: '90px' }}>
                    {new Date(caseItem.createdAt).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SENARAI DOS BERKESAN TABLE */}
          <div style={{ border: '1px solid #000', padding: '3px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '8px' }}>
                JADUAL ANGGARAN DOS BERKESAN &amp; SETARA DENGAN SINARAN LATAR BELAKANG
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', lineHeight: '1.3' }}>
              <thead>
                <tr style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', textAlign: 'center' }}>
                  <th style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Pemeriksaan</th>
                  <th style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Dos (mSv)</th>
                  <th style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Setara</th>
                  <th style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Pemeriksaan</th>
                  <th style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Dos (mSv)</th>
                  <th style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Setara</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Anggota Atas &amp; Bawah</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>&lt; 0.01</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>&lt; 1.5 hari</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Dada (PA)</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>0.02</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>3 hari</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px' }}>Mamogram</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>0.4</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>2 bulan</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px' }}>CT Otak</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>2.0</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 2px', textAlign: 'center' }}>10 bulan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 2: RADIOLOGY REPORT
         ════════════════════════════════════════════════════════════════════════ */}
      {(!pageFilter || pageFilter === 2) && (
        <div
          data-pdf-page="2"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm 12mm 8mm',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
          }}
        >
          <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', borderBottom: '2px solid #000' }}>
            <tbody>
              <tr>
                <td style={{ width: '70%', paddingBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>MINISTRY OF HEALTH MALAYSIA</div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>OFFICIAL RADIOLOGY EXAMINATION REPORT</div>
                  <div style={{ fontSize: '9.5px', marginTop: '2px' }}>{caseItem.clinicName || 'Digital PACS/RIS Network'}</div>
                </td>
                <td style={{ width: '30%', textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '6px', fontSize: '9px' }}>
                  <div><strong>Ref:</strong> {caseItem.caseNumber}</div>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Patient Summary Bar */}
          <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '8px', backgroundColor: '#f9f9f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '90px' }}>Patient Name:</td>
                  <td style={{ fontWeight: 'bold' }}>{caseItem.patientName}</td>
                  <td style={{ fontWeight: 'bold', width: '50px' }}>NRIC:</td>
                  <td>{patient?.nric || '—'}</td>
                  <td style={{ fontWeight: 'bold', width: '50px' }}>Gender:</td>
                  <td>{patient?.gender || '—'}</td>
                  <td style={{ fontWeight: 'bold', width: '40px' }}>Age:</td>
                  <td>{patient?.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : '—'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Modality / Exam:</td>
                  <td colSpan={3}>{caseItem.scanType || caseItem.modality}</td>
                  <td style={{ fontWeight: 'bold' }}>Date:</td>
                  <td colSpan={3}>{examDate || new Date(caseItem.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #000', padding: '6px', minHeight: '380px' }}>
            <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 6px', marginBottom: '6px', border: '1px solid #999' }}>
              DIAGNOSTIC REPORT FINDINGS &amp; IMPRESSION
            </div>
            <div style={{ minHeight: '320px', fontSize: '10.5px', lineHeight: '1.45', padding: '4px' }}>
              {report ? (
                <>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', textDecoration: 'underline' }}>FINDINGS:</div>
                  <div style={{ whiteSpace: 'pre-line', marginBottom: '10px' }}>{report.findings}</div>

                  <div style={{ fontWeight: 'bold', marginBottom: '3px', textDecoration: 'underline' }}>IMPRESSION:</div>
                  <div style={{ whiteSpace: 'pre-line', marginBottom: '10px', fontWeight: 'bold' }}>{report.impression}</div>

                  {report.suggestions && (
                    <>
                      <div style={{ fontWeight: 'bold', marginBottom: '3px', textDecoration: 'underline' }}>RECOMMENDATIONS / SUGGESTIONS:</div>
                      <div style={{ whiteSpace: 'pre-line' }}>{report.suggestions}</div>
                    </>
                  )}
                </>
              ) : (
                <span style={{ color: '#666', fontStyle: 'italic' }}>Report pending radiologist interpretation and sign-off.</span>
              )}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '14px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '180px' }}>Radiologist Signature &amp; Stamp:</td>
                <td style={{ borderBottom: '1px solid #000' }}>
                  {report?.radiologistName
                    ? /^dr\.\s/i.test(report.radiologistName.trim())
                      ? report.radiologistName
                      : `Dr. ${report.radiologistName}`
                    : 'Dr. Radiologist on Duty'}
                </td>
                <td style={{ fontWeight: 'bold', width: '80px', paddingLeft: '12px' }}>Date Signed:</td>
                <td style={{ borderBottom: '1px solid #000', width: '120px' }}>
                  {report?.signedAt ? new Date(report.signedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Global CSS Print Media Query Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #moh-printable-document, #moh-printable-document * {
            visibility: visible !important;
          }
          #moh-printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

/** 
 * Interactive Clinical Modal providing a live visual preview of the A4 document,
 * page toggles, zoom controls, direct browser vector print, and PDF file export.
 */
export default function DownloadMohFormButton({
  caseItem,
  patient,
  report,
  buttonClassName = 'h-9 px-3.5 btn-secondary text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors',
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    setLoading(true);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const pages = Array.from(
        printRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]'),
      );

      if (pages.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: page.offsetWidth,
          height: page.offsetHeight,
        });

        const imgData = canvas.toDataURL('image/png');

        if (index > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
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
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
        title="Preview and Print MOH PER.SS-RA301 Radiology Form"
      >
        <FileText className="w-3.5 h-3.5 text-[#0F4C42]" />
        <span>MOH Form &amp; Print Preview</span>
      </button>

      {/* ── MODAL: Full Document Preview & Print Hub ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] border border-slate-700 overflow-hidden">
            
            {/* Modal Header & Actions Bar */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">
                    MOH PER.SS-RA301 Document Preview &amp; Print
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {caseItem.caseNumber} &bull; {caseItem.patientName} &bull; {caseItem.clinicName}
                  </p>
                </div>
              </div>

              {/* Page & Zoom Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${
                      currentPage === 1 ? 'bg-[#0F4C42] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Page 1: Request Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(2)}
                    className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${
                      currentPage === 2 ? 'bg-[#0F4C42] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Page 2: Official Report
                  </button>
                </div>

                <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.1))}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] px-1.5 font-mono text-slate-300">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.min(1.3, z + 0.1))}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(0.85)}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-600 transition-colors shadow-xs"
                  title="Direct browser vector print (Print / Save as PDF with 100% vector quality)"
                >
                  <Printer className="w-3.5 h-3.5 text-teal-400" />
                  <span>Direct Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  title="Download as PDF file"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{loading ? 'Saving...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Canvas Preview Area */}
            <div className="flex-1 overflow-auto bg-slate-900/90 p-4 sm:p-8 flex justify-center items-start">
              <div
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="bg-white shadow-2xl rounded-xs border border-slate-300"
              >
                {/* Active Page View */}
                <MOHFormPrintView
                  caseItem={caseItem}
                  patient={patient}
                  report={report}
                  pageFilter={currentPage}
                />
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Showing Page {currentPage} of 2 (Kementerian Kesihatan Malaysia Format)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-0.5 bg-slate-800 disabled:opacity-30 rounded text-[10px] text-white flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev Page
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  disabled={currentPage === 2}
                  className="px-2 py-0.5 bg-slate-800 disabled:opacity-30 rounded text-[10px] text-white flex items-center gap-1"
                >
                  Next Page <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Full Two-Page DOM for html2canvas Export */}
      <div
        ref={printRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '210mm',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <MOHFormPrintView caseItem={caseItem} patient={patient} report={report} />
      </div>
    </>
  );
}
