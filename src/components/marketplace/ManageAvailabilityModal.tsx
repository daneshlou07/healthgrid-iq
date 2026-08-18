import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../ux/Toast';
import type { EquipmentItem, EquipmentAvailability } from '../../types/marketplace';
import { X, CheckCircle2, HelpCircle, AlertTriangle } from 'lucide-react';

interface ManageAvailabilityModalProps {
  equipment: EquipmentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageAvailabilityModal({
  equipment,
  isOpen,
  onClose,
}: ManageAvailabilityModalProps) {
  const { updateEquipmentAvailability } = useData();
  const toast = useToast();
  const [selectedStatus, setSelectedStatus] = useState<EquipmentAvailability>('AVAILABLE');

  useEffect(() => {
    if (equipment) {
      setSelectedStatus(equipment.availability);
    }
  }, [equipment]);

  if (!isOpen || !equipment) return null;

  const handleSave = () => {
    updateEquipmentAvailability(equipment.id, selectedStatus);
    toast.success(`Updated status of "${equipment.name}" to ${selectedStatus}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[#112A28]">
              Manage Equipment Availability
            </h3>
            <p className="text-xs text-[#64748B]">{equipment.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <label
            onClick={() => setSelectedStatus('AVAILABLE')}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
              selectedStatus === 'AVAILABLE'
                ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-[#112A28]">Available</p>
                <p className="text-[11px] text-[#64748B]">Immediate procurement & fast delivery</p>
              </div>
            </div>
            <input
              type="radio"
              name="availStatus"
              checked={selectedStatus === 'AVAILABLE'}
              onChange={() => setSelectedStatus('AVAILABLE')}
              className="accent-emerald-600"
            />
          </label>

          <label
            onClick={() => setSelectedStatus('REQUEST_SOURCING')}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
              selectedStatus === 'REQUEST_SOURCING'
                ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs font-bold text-[#112A28]">Request Sourcing</p>
                <p className="text-[11px] text-[#64748B]">Custom quote and lead-time required</p>
              </div>
            </div>
            <input
              type="radio"
              name="availStatus"
              checked={selectedStatus === 'REQUEST_SOURCING'}
              onChange={() => setSelectedStatus('REQUEST_SOURCING')}
              className="accent-amber-600"
            />
          </label>

          <label
            onClick={() => setSelectedStatus('UNAVAILABLE')}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
              selectedStatus === 'UNAVAILABLE'
                ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-400/20'
                : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-[#112A28]">Unavailable</p>
                <p className="text-[11px] text-[#64748B]">Discontinued or out of catalog</p>
              </div>
            </div>
            <input
              type="radio"
              name="availStatus"
              checked={selectedStatus === 'UNAVAILABLE'}
              onChange={() => setSelectedStatus('UNAVAILABLE')}
              className="accent-slate-600"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[#0F4C42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3831]"
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
}
