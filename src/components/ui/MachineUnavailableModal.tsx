import React, { useState } from 'react';
import type { Case, MachineIssueReason } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../ux/Toast';
import { AlertTriangle, Wrench, Send, X, ShieldAlert, Clock, Building2 } from 'lucide-react';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseItem: Case;
  onSuccess?: () => void;
}

const ISSUE_REASONS: MachineIssueReason[] = [
  'Broken',
  'Unavailable',
  'Maintenance',
  'Calibration',
  'Power Failure',
  'Detector Fault',
  'Other',
];

export default function MachineUnavailableModal({ isOpen, onClose, caseItem, onSuccess }: Props) {
  const { currentUser } = useAuth();
  const { reportMachineUnavailable } = useData();
  const toast = useToast();

  const [reason, setReason] = useState<MachineIssueReason>('Broken');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUser) {
      toast.error('You must be signed in to submit this request.');
      return;
    }

    setSubmitting(true);
    try {
      await reportMachineUnavailable(caseItem.id, {
        reason,
        notes: notes.trim(),
        user: currentUser,
      });

      toast.success('Equipment fault logged and external referral request submitted to BEMS.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit BEMS referral:', err);
      toast.error(err.message || 'Failed to submit external request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Machine Unavailable &amp; Create External Referral">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Banner */}
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-3 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-red-900">Equipment Exception Protocol</span>
            <p className="text-red-700 leading-relaxed text-[11px]">
              Marking this machine unavailable will transition Case <span className="font-mono font-bold">{caseItem.caseNumber}</span> to BEMS (Biomedical Engineering Maintenance Services) review for external hospital imaging.
            </p>
          </div>
        </div>

        {/* Case Info Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Patient:</span>
            <span className="font-bold text-slate-800">{caseItem.patientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Modality / Exam:</span>
            <span className="font-semibold text-slate-800">{caseItem.modality || caseItem.scanType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Originating Facility:</span>
            <span className="text-slate-700">{caseItem.clinicName || 'Local Center'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Primary Case Owner:</span>
            <span className="text-[#0F4C42] font-semibold">{caseItem.initialMoName || caseItem.registeredByName || 'Initial Medical Officer'}</span>
          </div>
        </div>

        {/* Reason Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Equipment Failure / Unavailable Reason <span className="text-red-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as MachineIssueReason)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
            required
          >
            {ISSUE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Technical / Diagnostic Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Technical Details &amp; Equipment Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the machine status, error codes, calibration status, or estimated repair timeline..."
            rows={3}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F4C42]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            {submitting ? 'Submitting to BEMS...' : 'Submit Request to BEMS'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
