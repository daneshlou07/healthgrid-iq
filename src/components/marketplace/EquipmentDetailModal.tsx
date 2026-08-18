import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../ux/Toast';
import type { EquipmentItem, ProcurementMode } from '../../types/marketplace';
import {
  X,
  Building2,
  Stethoscope,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  Truck,
  Zap,
  Weight,
  Maximize2,
  Settings,
} from 'lucide-react';

interface EquipmentDetailModalProps {
  item?: EquipmentItem | null;
  equipment?: EquipmentItem | null;
  isOpen?: boolean;
  onClose: () => void;
  onOpenAvailabilityModal?: (item: EquipmentItem) => void;
  onOpenDraftDrawer?: () => void;
}

export default function EquipmentDetailModal({
  item,
  equipment,
  isOpen = true,
  onClose,
  onOpenAvailabilityModal,
  onOpenDraftDrawer,
}: EquipmentDetailModalProps) {
  const activeItem = item || equipment;
  const { currentUser, isMasterAdmin } = useAuth();
  const { addToRfqDraft } = useData();
  const toast = useToast();

  if (!isOpen || !activeItem) return null;

  const isSuperOrMaster = isMasterAdmin || currentUser?.role === 'Super Admin';
  const canRequest =
    currentUser?.role === 'Equipment Marketplace' ||
    currentUser?.role === 'Administrator' ||
    currentUser?.role === 'Super Admin';

  const isMedical = activeItem.category === 'MEDICAL';

  const handleAddToRfq = (mode: ProcurementMode) => {
    addToRfqDraft({
      equipmentId: activeItem.id,
      itemName: activeItem.name,
      modelNumber: activeItem.modelNumber,
      category: activeItem.category,
      subcategory: activeItem.subcategory,
      manufacturer: activeItem.manufacturer,
      quantity: 1,
      procurementMode: mode,
      rentalDurationMonths: mode === 'RENTAL' ? activeItem.minRentalPeriodMonths || 12 : undefined,
    });
    toast.success(`Added 1x ${activeItem.name.slice(0, 30)} to RFQ Draft`);
    onClose();
    if (onOpenDraftDrawer) {
      onOpenDraftDrawer();
    }
  };

  const getAvailabilityBadge = () => {
    switch (activeItem.availability) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Available for Procurement
          </span>
        );
      case 'REQUEST_SOURCING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <HelpCircle className="h-3.5 w-3.5" />
            Sourcing Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Currently Unavailable
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* MODAL WINDOW */}
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        {/* TOP BAR */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6F3] text-[#0F4C42]">
              {isMedical ? (
                <Stethoscope className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-[#64748B]">
                {activeItem.manufacturer} • {activeItem.subcategory}
              </p>
              <h2 className="text-lg font-bold tracking-tight text-[#112A28]">
                {activeItem.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#112A28]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* HEADER BADGES */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {getAvailabilityBadge()}
              <span className="font-mono text-xs text-[#64748B] rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1">
                Model: {activeItem.modelNumber}
              </span>
              <span className="text-xs text-[#64748B] rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1">
                Origin: {activeItem.originCountry || 'Malaysia'}
              </span>
            </div>

            {isSuperOrMaster && onOpenAvailabilityModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAvailabilityModal(activeItem);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E8E2] bg-[#EFF6F3] px-3 py-1.5 text-xs font-semibold text-[#0F4C42] hover:bg-[#E5F1ED]"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage Status
              </button>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="mt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Description
            </h4>
            <p className="mt-1 text-sm leading-6 text-[#334E49]">
              {activeItem.description}
            </p>
          </div>

          {/* KEY SPECIFICATIONS */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Key Specifications
            </h4>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {activeItem.keySpecifications.map((spec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs leading-5 text-[#112A28]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F4C42]" />
                  <span>{spec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ATTRIBUTES GRID */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-[#E2E8F0] pt-5">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Clock className="h-4 w-4 text-[#0F4C42]" />
                Lead Time
              </div>
              <p className="mt-1 font-semibold text-[#112A28]">
                {activeItem.leadTimeWeeks} weeks
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <ShieldCheck className="h-4 w-4 text-[#0F4C42]" />
                Warranty
              </div>
              <p className="mt-1 font-semibold text-[#112A28]">
                {activeItem.warrantyYears} years
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Zap className="h-4 w-4 text-[#0F4C42]" />
                Power
              </div>
              <p className="mt-1 font-semibold text-[#112A28] truncate">
                {activeItem.powerRequirements || 'Standard 240V AC'}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Weight className="h-4 w-4 text-[#0F4C42]" />
                Weight
              </div>
              <p className="mt-1 font-semibold text-[#112A28]">
                {activeItem.weightKg ? `${activeItem.weightKg} kg` : 'N/A'}
              </p>
            </div>
          </div>

          {/* PROCUREMENT MODES */}
          <div className="mt-6 rounded-xl border border-[#D8E8E2] bg-[#EAF5F1] p-4">
            <h4 className="text-xs font-bold text-[#0F4C42]">
              Procurement Options Available
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeItem.procurementOptions.map((opt) => (
                <span
                  key={opt}
                  className="rounded-lg border border-[#B9D8CF] bg-white px-3 py-1 text-xs font-semibold text-[#0F4C42]"
                >
                  {opt === 'PURCHASE' ? 'Direct Purchase' : 'Institutional Lease / Rental'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
          >
            Close
          </button>

          {canRequest && activeItem.availability !== 'UNAVAILABLE' && (
            <div className="flex items-center gap-2">
              {activeItem.procurementOptions.includes('RENTAL') && (
                <button
                  type="button"
                  onClick={() => handleAddToRfq('RENTAL')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F4C42] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F4C42] hover:bg-[#EFF6F3]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add for Rental
                </button>
              )}

              {activeItem.procurementOptions.includes('PURCHASE') && (
                <button
                  type="button"
                  onClick={() => handleAddToRfq('PURCHASE')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C42] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0B3831]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to RFQ Draft
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
