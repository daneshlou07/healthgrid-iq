import React, { useState } from 'react';
import type { Case, Patient } from '../../types';
import { Smartphone, Send, CheckCircle2, ShieldCheck, Calendar, MapPin, AlertCircle } from 'lucide-react';

interface Props {
  caseItem: Case;
  patient?: Patient;
  onClose: () => void;
}

export default function PatientSmsModal({ caseItem, patient, onClose }: Props) {
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState<'SMS' | 'WhatsApp'>('SMS');

  const appointmentDate = caseItem.officeTarikhAppointment || caseItem.scheduledAt || 'Pending Schedule';
  const appointmentTime = caseItem.officeMasaAppointment || '09:00 AM';
  const clinicName = caseItem.clinicName || 'HealthGrid IQ Central Radiology';

  // Build prep instructions based on scan type & modality
  const getPrepNotes = () => {
    const mod = caseItem.modality || '';
    const scan = caseItem.scanType || '';
    if (mod === 'Ultrasound' || scan.toLowerCase().includes('abdomen')) {
      return '• Fasting required 6 hours before scan.\n• Drink 500ml water 1h prior for full bladder.';
    }
    if (mod === 'CT' || scan.toLowerCase().includes('contrast')) {
      return '• Fasting 4 hours before exam.\n• Bring latest Serum Creatinine / eGFR lab report.';
    }
    if (mod === 'MRI') {
      return '• Remove all metallic objects, jewelry, & cards.\n• Notify staff if you have a pacemaker or metallic implant.';
    }
    return '• Please arrive 15 minutes before your scheduled appointment time.\n• Bring original MyKad / Passport and referral slip.';
  };

  const prepNotes = getPrepNotes();

  const smsText = `[HealthGrid IQ] Reminder: Appt for ${caseItem.patientName} (${caseItem.scanType}) on ${appointmentDate} at ${appointmentTime} @ ${clinicName}. Prep Notes:\n${prepNotes}\nRef: ${caseItem.caseNumber}`;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">Patient Reminder Simulator</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {/* Channel selector */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs">
          <button
            onClick={() => setChannel('SMS')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              channel === 'SMS' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📱 Automated SMS
          </button>
          <button
            onClick={() => setChannel('WhatsApp')}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${
              channel === 'WhatsApp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💬 WhatsApp Alert
          </button>
        </div>

        {/* Mobile Phone Mockup View */}
        <div className="bg-slate-900 rounded-2xl p-4 border-4 border-slate-800 shadow-inner space-y-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
            <span>{patient?.phone || '+6012-3456789'}</span>
            <span>{channel} Gateway</span>
          </div>

          <div className="bg-slate-800 text-slate-100 p-3 rounded-xl text-xs space-y-2 font-mono leading-relaxed border border-slate-700">
            <p className="text-purple-300 font-bold">RM0.00 HealthGrid IQ Alert:</p>
            <p className="whitespace-pre-line">{smsText}</p>
          </div>
        </div>

        {sent ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Notification dispatched to {patient?.phone || 'patient mobile'}!
          </div>
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cancel</button>
            <button
              onClick={handleSend}
              className={`text-xs px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-1.5 shadow-md transition-all ${
                channel === 'WhatsApp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-700 hover:bg-purple-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Send {channel} Alert Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
