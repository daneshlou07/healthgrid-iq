import React, { useState } from 'react';
import type { Case, Patient } from '../../types';
import {
  Smartphone,
  Send,
  CheckCircle2,
  X,
  QrCode,
  Link2,
  Copy,
  Check,
  MessageSquare,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { generateReportToken, buildPatientReportUrl } from '../../utils/reportToken';

interface Props {
  caseItem: Case;
  patient?: Patient;
  /** If true, opens on the Report Access tab (when a report is finalized) */
  defaultTab?: 'appointment' | 'report';
  onClose: () => void;
}

type Channel = 'SMS' | 'WhatsApp';
type Tab = 'appointment' | 'report';

export default function PatientSmsModal({ caseItem, patient, defaultTab = 'appointment', onClose }: Props) {
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState<Channel>('SMS');
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [linkCopied, setLinkCopied] = useState(false);

  const appointmentDate = caseItem.officeTarikhAppointment || caseItem.scheduledAt || 'Pending Schedule';
  const appointmentTime = caseItem.officeMasaAppointment || '09:00 AM';
  const clinicName = caseItem.clinicName || 'HealthGrid IQ Radiology';
  const patientPhone = patient?.phone || '+601X-XXXXXXX';

  const getPrepNotes = () => {
    const mod = caseItem.modality || '';
    const scan = caseItem.scanType || '';
    if (mod === 'Ultrasound' || scan.toLowerCase().includes('abdomen')) {
      return 'Fasting required 6 hours. Drink 500ml water 1h prior.';
    }
    if (mod === 'CT' || scan.toLowerCase().includes('contrast')) {
      return 'Fasting 4 hours. Bring latest Serum Creatinine / eGFR lab report.';
    }
    if (mod === 'MRI') {
      return 'Remove all metallic objects. Notify staff of pacemaker or implants.';
    }
    return 'Arrive 15 minutes early. Bring MyKad and referral slip.';
  };

  // Report access link & QR
  const reportToken = generateReportToken(caseItem.id);
  const reportUrl = buildPatientReportUrl(caseItem.id, reportToken);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reportUrl)}&color=1e3a5f&bgcolor=f8fafc`;

  const apptSmsText = `[HealthGrid IQ] Reminder: Appt for ${caseItem.patientName} (${caseItem.scanType}) on ${appointmentDate} at ${appointmentTime} @ ${clinicName}. Prep: ${getPrepNotes()} Ref: ${caseItem.caseNumber}`;

  const reportSmsText = `[HealthGrid IQ] Your radiology report for ${caseItem.scanType} (${caseItem.caseNumber}) is ready. View securely: ${reportUrl}`;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => onClose(), 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reportUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Patient Communication</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs">
          <button
            onClick={() => { setTab('appointment'); setSent(false); }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'appointment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Appointment Alert
          </button>
          <button
            onClick={() => { setTab('report'); setSent(false); }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'report' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Report Access
          </button>
        </div>

        {/* ── APPOINTMENT TAB ── */}
        {tab === 'appointment' && (
          <>
            {/* Channel selector */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => setChannel('SMS')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  channel === 'SMS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Automated SMS
              </button>
              <button
                onClick={() => setChannel('WhatsApp')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  channel === 'WhatsApp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                WhatsApp Alert
              </button>
            </div>

            {/* Phone mockup */}
            <div className="bg-slate-900 rounded-2xl p-4 border-4 border-slate-800 shadow-inner space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                <span>{patientPhone}</span>
                <span>{channel} Gateway</span>
              </div>
              <div className="bg-slate-800 text-slate-100 p-3 rounded-xl text-xs space-y-1 font-mono leading-relaxed border border-slate-700">
                <p className="text-blue-300 font-bold">RM0.00 HealthGrid IQ Alert:</p>
                <p className="whitespace-pre-line">{apptSmsText}</p>
              </div>
            </div>

            {sent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Notification dispatched to {patientPhone}!
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                <button
                  onClick={handleSend}
                  className={`text-xs px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-md transition-all ${
                    channel === 'WhatsApp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Send {channel} Alert
                </button>
              </div>
            )}
          </>
        )}

        {/* ── REPORT ACCESS TAB ── */}
        {tab === 'report' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-800">
                <ShieldCheck className="w-4 h-4" />
                <p className="text-xs font-bold">Secure Patient Report Link</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Share this link or QR code with <strong>{caseItem.patientName}</strong> to give them access to their finalized radiology report.
                No login required. The link is specific to this patient and case.
              </p>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-sm">
                  <img
                    src={qrApiUrl}
                    alt="Patient Report QR Code"
                    className="w-44 h-44 object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Patient scans this QR code with their phone camera
                </p>
              </div>

              {/* Copyable Link */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-[10px] text-slate-600 font-mono truncate flex-1">{reportUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors"
                  title="Copy link"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* SMS preview with link */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => setChannel('SMS')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  channel === 'SMS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Send via SMS
              </button>
              <button
                onClick={() => setChannel('WhatsApp')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  channel === 'WhatsApp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Send via WhatsApp
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-[10px] text-slate-400 mb-1 font-mono">{patientPhone} &middot; {channel}</p>
              <p className="text-xs text-slate-100 font-mono leading-relaxed whitespace-pre-line">{reportSmsText}</p>
            </div>

            {sent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Report link sent to {patientPhone}!
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Close</button>
                <button
                  onClick={handleSend}
                  className={`text-xs px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-md transition-all ${
                    channel === 'WhatsApp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Report Link
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
