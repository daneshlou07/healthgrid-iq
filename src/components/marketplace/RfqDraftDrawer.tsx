import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../ux/Toast';
import {
  X,
  Trash2,
  Send,
  Building2,
  Stethoscope,
  Plus,
  Minus,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface RfqDraftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RfqDraftDrawer({
  isOpen,
  onClose,
}: RfqDraftDrawerProps) {
  const { currentUser } = useAuth();
  const { rfqDraft, updateRfqDraftItem, removeFromRfqDraft, clearRfqDraft, submitQuotationRequest } = useData();
  const toast = useToast();

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rfqDraft.length === 0) return;
    setIsSubmitting(true);
    try {
      const quotation = await submitQuotationRequest({
        userId: currentUser?.id || 'MP-USER-001',
        userName: currentUser?.name || 'Equipment Marketplace User',
        userRole: currentUser?.role || 'Equipment Marketplace',
        userEmail: currentUser?.email || 'procurement@healthgrid.internal',
        userPhone: '+60 3-8888 9000',
        facilityName: 'HealthGrid IQ Clinical Center',
        deliveryAddress: 'Jalan Pahang, 50586 Kuala Lumpur, Malaysia',
        requiredByDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        urgency: 'STANDARD',
        notes,
        items: rfqDraft.map((d) => ({
          id: 'QI-' + Math.random().toString(36).slice(2, 8),
          equipmentId: d.equipmentId,
          itemName: d.itemName,
          modelNumber: d.modelNumber,
          category: d.category,
          subcategory: d.subcategory,
          manufacturer: d.manufacturer,
          isCustom: Boolean(d.isCustom),
          customSpecifications: d.customSpecifications,
          quantity: d.quantity,
          procurementIntent: d.procurementMode,
          rentalDurationMonths: d.rentalDurationMonths,
        })),
      });
      setSubmittedId(quotation.id);
      toast.success('Quotation request submitted successfully!');
    } catch {
      toast.error('Failed to submit quotation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setSubmittedId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm transition-opacity"
        onClick={submittedId ? handleDone : onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="flex w-screen max-w-md flex-col bg-white shadow-2xl">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-[#112A28]">
                RFQ Quotation Draft
              </h2>
              <p className="text-xs text-[#64748B]">
                {rfqDraft.length} item{rfqDraft.length === 1 ? '' : 's'} in request list
              </p>
            </div>
            <button
              type="button"
              onClick={submittedId ? handleDone : onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6">
            {submittedId ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#112A28]">
                  Quotation Request Submitted
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#64748B]">
                  Your request has been officially recorded. Our institutional procurement team will prepare and issue your formal quotation.
                </p>
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="text-[11px] font-medium text-emerald-800">
                    Reference ID: <span className="font-mono font-bold">{submittedId}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDone}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#0F4C42] py-3 text-xs font-semibold text-white hover:bg-[#0B3831]"
                >
                  Back to Catalogue
                </button>
              </div>
            ) : rfqDraft.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6F3] text-[#0F4C42]">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#112A28]">
                  RFQ Draft is empty
                </h3>
                <p className="mt-1 text-xs text-[#64748B]">
                  Browse the equipment catalogue and add items to your quotation draft.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rfqDraft.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6F3] text-[#0F4C42]">
                          {item.category === 'MEDICAL' ? (
                            <Stethoscope className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold leading-4 text-[#112A28]">
                            {item.itemName}
                          </h4>
                          <p className="text-[11px] text-[#64748B]">
                            {item.manufacturer} • {item.modelNumber}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromRfqDraft(item.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                      <span className="rounded-md border border-[#D8E8E2] bg-[#EFF6F3] px-2 py-0.5 text-[10px] font-semibold text-[#0F4C42]">
                        {item.procurementMode === 'PURCHASE' ? 'Direct Purchase' : 'Rental / Lease'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateRfqDraftItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        >
                          <Minus className="h-3 w-3 text-[#64748B]" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#112A28]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateRfqDraftItem(item.id, { quantity: item.quantity + 1 })}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        >
                          <Plus className="h-3 w-3 text-[#64748B]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* INSTITUTIONAL PROCUREMENT NOTICE */}
                <div className="rounded-xl border border-[#D8E8E2] bg-[#EFF6F3] p-3.5 text-xs text-[#334E49]">
                  <p className="font-semibold text-[#0F4C42]">Healthcare Facility Procurement</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#64748B]">
                    Institutional quotation request under {currentUser?.name || 'Healthcare Center'}.
                  </p>
                </div>

                {/* NOTES */}
                <div>
                  <label className="text-xs font-bold text-[#112A28]">
                    Special Requirements / Sourcing Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., delivery location, specific installation date, warranty extensions..."
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] p-3 text-xs text-[#112A28] outline-none placeholder:text-[#94A3B8] focus:border-[#0F4C42]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          {!submittedId && rfqDraft.length > 0 && (
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C42] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#0B3831] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Submitting Request...' : 'Submit RFQ Quotation Request'}
              </button>

              <button
                type="button"
                onClick={clearRfqDraft}
                className="w-full text-center text-xs font-medium text-[#64748B] hover:text-red-600"
              >
                Clear all draft items
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
