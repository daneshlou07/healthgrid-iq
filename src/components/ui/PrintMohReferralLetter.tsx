import React, { useState } from 'react';
import { FileText, Download, Building2, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Case, Patient, Report, Clinic } from '../../types';
import { exportMohReferralLetterPdf, ReferralLetterOptions } from '../../utils/exportMohReferralLetterPdf';
import { useAuth } from '../../context/AuthContext';

interface Props {
  caseItem: Case;
  patient?: Patient;
  report?: Report;
  clinic?: Clinic;
  buttonClassName?: string;
}

export default function PrintMohReferralLetterModal({
  caseItem,
  patient,
  report,
  clinic,
  buttonClassName = 'btn-secondary text-xs flex items-center gap-1.5',
}: Props) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [receivingHospital, setReceivingHospital] = useState('Klinik Pakar Surgeri Payudara, Hospital Sungai Buloh');
  const [specialtyClinic, setSpecialtyClinic] = useState('Klinik Pembedahan Am / Payudara (Breast & Endocrine Surgery)');
  const [referralUrgency, setReferralUrgency] = useState<ReferralLetterOptions['referralUrgency']>('Segera (Urgent < 2 Weeks)');
  const [clinicalNotes, setClinicalNotes] = useState(caseItem.notes || '');

  const handleExport = () => {
    exportMohReferralLetterPdf(caseItem, patient, report, clinic, {
      receivingHospital,
      specialtyClinic,
      referralUrgency,
      clinicalSummary: clinicalNotes,
      moName: currentUser?.name || 'Medical Officer on Duty',
      mmcNo: currentUser?.mmcNumber || 'MMC 58921',
      facilityName: clinic?.name || 'Klinik Kesihatan / Mobile Outreach Unit',
    });
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
        title="Generate Official MOH Hospital Referral Letter (Surat Rujukan)"
      >
        <FileText className="w-3.5 h-3.5 text-red-700" />
        <span>Surat Rujukan MOH</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-surface-200 space-y-4">
            <div className="flex items-start justify-between border-b border-surface-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0F4C42]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-900">
                    Jana Surat Rujukan Hospital (MOH)
                  </h3>
                  <p className="text-xs text-surface-500">
                    Official Clinical Referral Letter &bull; {caseItem.caseNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Patient & Findings Summary Card */}
            <div className="bg-surface-50 p-3 rounded-lg border border-surface-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-surface-500 font-medium">Patient:</span>
                <span className="font-bold text-navy-900">{caseItem.patientName} ({patient?.nric || 'N/A'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500 font-medium">Radiological Findings:</span>
                <span className="font-semibold text-emerald-800 truncate max-w-[240px]">
                  {report?.impression || caseItem.indication || 'Suspicious mass / dense tissue'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Hospital Penerima (Receiving Tertiary Hospital) *
                </label>
                <select
                  value={receivingHospital}
                  onChange={(e) => setReceivingHospital(e.target.value)}
                  className="input-field text-xs bg-white"
                >
                  <option value="Klinik Pakar Surgeri Payudara, Hospital Sungai Buloh">Hospital Sungai Buloh (Pusat Rujukan Utama)</option>
                  <option value="Klinik Pakar Surgeri & Radiologi, Hospital Tanjong Karang">Hospital Tanjong Karang</option>
                  <option value="Klinik Pembedahan Payudara & Endokrin, Hospital Kuala Lumpur (HKL)">Hospital Kuala Lumpur (HKL)</option>
                  <option value="Klinik Surgeri Am & Onkologi, Hospital Selayang">Hospital Selayang</option>
                  <option value="Klinik Pakar Surgeri, Hospital Tengku Ampuan Rahimah (HTAR) Klang">Hospital Tengku Ampuan Rahimah (HTAR) Klang</option>
                  <option value="Klinik Pakar Surgeri & Onkologi, Hospital Sultan Idris Shah Serdang">Hospital Sultan Idris Shah Serdang</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Klinik / Disiplin Pakar (Specialty Clinic)
                </label>
                <input
                  type="text"
                  value={specialtyClinic}
                  onChange={(e) => setSpecialtyClinic(e.target.value)}
                  className="input-field text-xs bg-white"
                  placeholder="e.g. Breast & Endocrine Surgery Clinic"
                />
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Tahap Keterdesakan Rujukan (Referral Urgency)
                </label>
                <select
                  value={referralUrgency}
                  onChange={(e) => setReferralUrgency(e.target.value as any)}
                  className="input-field text-xs bg-white font-medium"
                >
                  <option value="Segera (Urgent < 2 Weeks)">Segera / Urgent (Temu janji dalam 2 minggu)</option>
                  <option value="Kecemasan (Immediate)">Kecemasan / Immediate (Rujuk Hari Ini / Serta Merta)</option>
                  <option value="Rutin (Routine < 1 Month)">Rutin / Routine (Pemeriksaan susulan 1 bulan)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Catatan Tambahan Pegawai Perubatan (CBE / Palpation Notes)
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="input-field text-xs bg-white resize-none"
                  placeholder="Penemuan klinikal tambahan, sejarah keluarga, atau cadangan siasatan lanjut..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-200">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Batal (Cancel)
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 bg-[#0F4C42] hover:bg-[#0c3c34] shadow-sm font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                Muat Turun Surat Rujukan (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
