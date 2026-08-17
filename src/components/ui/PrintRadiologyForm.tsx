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
        data-pdf-page="1"
        style={{
          width: '200mm',
          height: '297mm',
          padding: '6mm 8mm 7mm',
          boxSizing: 'border-box',
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* Document Header */}
        <table style={{ width: '100%', marginBottom: '6px', borderCollapse: 'collapse' }}>
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
              <td style={{ width: '65%', verticalAlign: 'top', border: '1px solid #000', padding: '4px', paddingRight: '7px' }}>
                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '6px', border: '1px solid #999' }}>
                  PATIENT INFORMATION
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold' }}>12. LMP Date:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.lmp || '—'}</td>
                      <td style={{ width: '120px', fontWeight: 'bold', paddingLeft: '8px' }}>13. Pregnant Status:</td>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '65px' }}>16. Citizen:</td>
                      <td style={{ width: '70px' }}>{formatCheck(caseItem.isWarganegara)}</td>
                      <td style={{ fontWeight: 'bold', width: '85px', paddingLeft: '6px' }}>Civil Servant:</td>
                      <td style={{ width: '70px' }}>{formatCheck(caseItem.isPenjawatAwam)}</td>
                      <td style={{ fontWeight: 'bold', width: '45px', paddingLeft: '6px' }}>FPP:</td>
                      <td>{formatCheck(caseItem.isFpp)}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '3px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold' }}>Payment Category:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.paymentCategory || 'Standard MOH / Free Screening'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Renal Function */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '110px', fontWeight: 'bold' }}>17. Renal Test Date:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px', width: '90px' }}>{caseItem.renalFunctionDate || '—'}</td>
                      <td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '75px' }}>Creatinine:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px', width: '55px' }}>{caseItem.creatinine || '—'}</td>
                      <td style={{ fontWeight: 'bold', paddingLeft: '6px', width: '50px' }}>eGFR:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.egfr || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* RIGHT COLUMN: Office Use & Radiation Exposure */}
              <td style={{ width: '35%', verticalAlign: 'top', border: '1px solid #000', borderLeft: 'none', padding: '4px', paddingLeft: '8px' }}>
                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '6px', border: '1px solid #999' }}>
                  ADMINISTRATION &amp; OFFICE USE
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '105px', padding: '2px 0' }}>Reception Time:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeWaktuTerima ? new Date(caseItem.officeWaktuTerima).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Completion Time:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeWaktuSelesai ? new Date(caseItem.officeWaktuSelesai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Technologist:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeJuruXRay || caseItem.radiographerName || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Exam Date:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{examDate}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Exam Ref No.:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>{caseItem.caseNumber}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginTop: '8px', marginBottom: '4px', border: '1px solid #999' }}>
                  19. IMAGE EXPOSURE OUTPUT
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '95px', padding: '2px 0' }}>Film Count:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.bilanganFilem ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>CD / DVD Count:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.bilanganCdDvd ?? ''}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginTop: '8px', marginBottom: '4px', border: '1px solid #999' }}>
                  20. RADIATION EXPOSURE
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '95px', padding: '2px 0' }}>kVp:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.doseKvp ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>mAs:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.doseMas ?? ''}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>Radiation Dose:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.dosRadiasi ? `${caseItem.dosRadiasi} mSv` : ''}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '9.5px', padding: '2px 4px', marginTop: '8px', marginBottom: '4px', border: '1px solid #999' }}>
                  21. APPOINTMENT DETAILS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '95px', padding: '2px 0' }}>Date:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeTarikhAppointment || ''}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 0' }}>Time:</td>
                      <td style={{ borderBottom: '1px solid #000', padding: '2px' }}>{caseItem.officeMasaAppointment || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 18. REQUESTED SERVICE */}
        <div style={{ border: '1px solid #000', padding: '4px', marginBottom: '6px' }}>
          <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
            18. REQUESTED SERVICE
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '4px' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '2px' }}>
            <tbody>
              <tr>
                <td style={{ width: '120px', fontWeight: 'bold' }}>Requested Exams:</td>
                <td style={{ borderBottom: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                  {caseItem.scanType || 'Chest X-Ray / Routine Screening'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CLINICAL NOTES */}
        <div style={{ border: '1px solid #000', padding: '4px', marginBottom: '6px' }}>
          <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '10px', padding: '3px 5px', marginBottom: '4px', border: '1px solid #999' }}>
            CLINICAL NOTES
          </div>
          <div style={{ minHeight: '48px', padding: '4px', fontSize: '10px', lineHeight: '1.35', whiteSpace: 'pre-line' }}>
            {caseItem.ringkasanKlinikal || caseItem.notes || caseItem.indication || 'No clinical notes provided.'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginTop: '7px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '220px' }}>Referring Doctor Signature &amp; Stamp:</td>
                <td style={{ borderBottom: '1px solid #000' }}>
                  {caseItem.registeredByName ? `${caseItem.registeredByName} (Medical Officer)` : 'Dr. Medical Officer'}
                </td>
                <td style={{ fontWeight: 'bold', width: '60px', paddingLeft: '8px' }}>Date:</td>
                <td style={{ borderBottom: '1px solid #000', width: '100px' }}>
                  {new Date(caseItem.createdAt).toLocaleDateString('en-GB')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SENARAI DOS BERKESAN TABLE */}
        <div style={{ border: '1px solid #000', padding: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8.5px' }}>
              JADUAL ANGGARAN DOS BERKESAN &amp; SETARA DENGAN SINARAN LATAR BELAKANG
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', lineHeight: '2' }}>
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
          <div style={{ fontSize: '6.5px', color: '#666', marginTop: '2px' }}>
            *13. Mengandung — Sila lengkapkan Borang Keizinan Pesakit Mengandung. *22. Media Kontras — Sila lengkapkan Borang Keizinan Media Kontras.
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PAGE 2: RADIOLOGY REPORT
         ════════════════════════════════════════════════════════════════════════ */}
      <div
        data-pdf-page="2"
        style={{
          width: '200mm',
          height: '297mm',
          padding: '6mm 8mm 7mm',
          boxSizing: 'border-box',
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', borderBottom: '2px solid #000' }}>
          <tbody>
            <tr>
              <td style={{ width: '70%', paddingBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>MINISTRY OF HEALTH MALAYSIA</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>OFFICIAL RADIOLOGY EXAMINATION REPORT</div>
                <div style={{ fontSize: '10px', marginTop: '2px' }}>{caseItem.clinicName || 'Digital PACS/RIS Network'}</div>
              </td>
              <td style={{ width: '30%', textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '6px', fontSize: '9.5px' }}>
                <div><strong>Ref:</strong> {caseItem.caseNumber}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Patient Summary Bar */}
        <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '8px', backgroundColor: '#f9f9f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
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

        <div style={{ border: '1px solid #000', padding: '6px', minHeight: '310px' }}>
          <div style={{ backgroundColor: '#e6e6e6', fontWeight: 'bold', fontSize: '11px', padding: '4px 6px', marginBottom: '8px', border: '1px solid #999' }}>
            DIAGNOSTIC REPORT FINDINGS &amp; IMPRESSION
          </div>
          <div style={{ minHeight: '270px', fontSize: '11px', lineHeight: '1.5', padding: '4px' }}>
            {report ? (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>FINDINGS:</div>
                <div style={{ whiteSpace: 'pre-line', marginBottom: '12px' }}>{report.findings}</div>

                <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>IMPRESSION:</div>
                <div style={{ whiteSpace: 'pre-line', marginBottom: '12px', fontWeight: 'bold' }}>{report.impression}</div>

                {report.suggestions && (
                  <>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>RECOMMENDATIONS / SUGGESTIONS:</div>
                    <div>{report.suggestions}</div>
                  </>
                )}
              </>
            ) : (
              <span style={{ color: '#666', fontStyle: 'italic' }}>Report pending radiologist interpretation and sign-off.</span>
            )}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '16px' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', width: '180px' }}>Radiologist Signature &amp; Stamp:</td>
              <td style={{ borderBottom: '1px solid #000' }}>
                {report?.radiologistName
                  ? /^dr\.\s/i.test(report.radiologistName.trim())
                    ? report.radiologistName
                    : `Dr. ${report.radiologistName}`
                  : ''}
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

        pdf.addImage(
          imgData,
          'PNG',
          0,
          0,
          pdfWidth,
          pdfHeight,
          undefined,
          'FAST',
        );
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
        className="h-9 px-3.5 btn-secondary text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors"
        title="Download Radiology Request Form (MOH PER.SS-RA301) as PDF"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span>{loading ? 'Generating PDF…' : 'Download MOH Form'}</span>
      </button>

      <div
        ref={printRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '200mm',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <MOHFormPrintView caseItem={caseItem} patient={patient} report={report} />
      </div>
    </>
  );
}
