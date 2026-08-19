import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import { exportQuotationPdf } from '../../utils/exportQuotationPdf';
import Modal from '../../components/ui/Modal';
import type {
  QuotationRequest,
  QuotationStatus,
  QuotationItem,
  QuotationNegotiationMessage,
} from '../../types/marketplace';

import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  FileText,
  Download,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Percent,
  Calculator,
  Trash2,
  MessageSquare,
} from 'lucide-react';

export default function OrdersManagementPage() {
  const navigate = useNavigate();
  const { currentUser, isMasterAdmin } = useAuth();
  const { quotationRequests, issueAdminQuotation, updateQuotationStatus, deleteQuotationRequest, submitQuotationNegotiation } = useData();
  const toast = useToast();

  const isSuperOrMaster = isMasterAdmin || currentUser?.role === 'Super Admin';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QuotationStatus>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'STANDARD' | 'URGENT' | 'CRITICAL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'totalAmount' | 'urgency'>('newest');

  // Selected Order for Review Drawer / Modal
  const [selectedOrder, setSelectedOrder] = useState<QuotationRequest | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<QuotationRequest | null>(null);

  // Pricing & Quotation Form State
  const [pricingItems, setPricingItems] = useState<{ [itemId: string]: number }>({});
  const [discountPercent, setDiscountPercent] = useState<number>(5);
  const [taxPercent, setTaxPercent] = useState<number>(6); // 6% SST
  const [validDays, setValidDays] = useState<number>(30);
  const [paymentTerms, setPaymentTerms] = useState('30 Days Net upon MoH Asset Commissioning');
  const [warrantyTerms, setWarrantyTerms] = useState('2 Years Comprehensive Parts & Labour');
  const [leadTimeWeeks, setLeadTimeWeeks] = useState<number>(3);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [negotiationMessage, setNegotiationMessage] = useState('');

  // Statistics calculation
  const totalOrders = quotationRequests.length;
  const submittedCount = useMemo(() => quotationRequests.filter((q) => q.status === 'SUBMITTED').length, [quotationRequests]);
  const issuedCount = useMemo(() => quotationRequests.filter((q) => q.status === 'QUOTATION_ISSUED').length, [quotationRequests]);
  const negotiationCount = useMemo(() => quotationRequests.filter((q) => q.status === 'NEGOTIATION_IN_PROGRESS').length, [quotationRequests]);
  const acceptedCount = useMemo(() => quotationRequests.filter((q) => q.status === 'ACCEPTED').length, [quotationRequests]);

  const totalQuotedValue = useMemo(() => {
    return quotationRequests.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  }, [quotationRequests]);

  // Sync pricing state when an order is opened
  const handleOpenOrder = (order: QuotationRequest) => {
    setSelectedOrder(order);
    const initialPrices: { [id: string]: number } = {};
    order.items.forEach((item) => {
      initialPrices[item.id] = item.unitPrice || (item.procurementIntent === 'RENTAL' ? 12000 : 45000);
    });
    setPricingItems(initialPrices);
    setPaymentTerms(order.paymentTerms || '30 Days Net upon MoH Asset Commissioning');
    setWarrantyTerms(order.warrantyTerms || '2 Years Comprehensive Parts & Labour with 24/7 On-Site SLA');
    setLeadTimeWeeks(order.deliveryLeadTimeWeeks || 3);
    setAdminRemarks(order.adminRemarks || 'Official MoH vendor package discount applied. Certified MDA compliant.');
  };

  // Calculations for current pricing form
  const computedSubtotal = useMemo(() => {
    if (!selectedOrder) return 0;
    return selectedOrder.items.reduce((acc, item) => {
      const price = pricingItems[item.id] || 0;
      return acc + price * item.quantity;
    }, 0);
  }, [selectedOrder, pricingItems]);

  const computedDiscountAmount = useMemo(() => {
    return (computedSubtotal * discountPercent) / 100;
  }, [computedSubtotal, discountPercent]);

  const computedTaxAmount = useMemo(() => {
    const afterDiscount = computedSubtotal - computedDiscountAmount;
    return (afterDiscount * taxPercent) / 100;
  }, [computedSubtotal, computedDiscountAmount, taxPercent]);

  const computedTotalAmount = useMemo(() => {
    return computedSubtotal - computedDiscountAmount + computedTaxAmount;
  }, [computedSubtotal, computedDiscountAmount, computedTaxAmount]);

  // Issue Official Quotation Action
  const handleIssueQuotation = async () => {
    if (!selectedOrder) return;
    try {
      const validUntil = new Date(Date.now() + validDays * 86400000).toISOString().split('T')[0];
      const itemsWithPrices: QuotationItem[] = selectedOrder.items.map((item) => {
        const unit = pricingItems[item.id] || 0;
        return {
          ...item,
          unitPrice: unit,
          subtotal: unit * item.quantity,
        };
      });

      await issueAdminQuotation(selectedOrder.id, {
        validUntil,
        items: itemsWithPrices,
        subtotalAmount: computedSubtotal,
        discountAmount: computedDiscountAmount,
        sstTaxAmount: computedTaxAmount,
        totalAmount: computedTotalAmount,
        paymentTerms,
        warrantyTerms,
        deliveryLeadTimeWeeks: leadTimeWeeks,
        adminRemarks,
        reviewedByAdminId: currentUser?.id || 'superadmin_1',
        reviewedByAdminName: currentUser?.name || 'Super Admin Procurement Office',
        initialMessage: `Quotation issued with ${discountPercent}% institutional discount. Total amount: RM ${computedTotalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}.`,
      });

      toast.success(`Official quotation issued for RFQ ${selectedOrder.id}!`);

      // Refresh selected order state
      const updated = quotationRequests.find((q) => q.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder({
          ...updated,
          status: 'QUOTATION_ISSUED',
          totalAmount: computedTotalAmount,
          subtotalAmount: computedSubtotal,
        });
      }
    } catch {
      toast.error('Failed to issue quotation.');
    }
  };

  // Status transition action
  const handleUpdateStatus = (newStatus: QuotationStatus) => {
    if (!selectedOrder) return;
    updateQuotationStatus(selectedOrder.id, newStatus);
    toast.success(`Updated RFQ ${selectedOrder.id} status to ${newStatus}.`);
    setSelectedOrder({ ...selectedOrder, status: newStatus });
  };

  // Send message in negotiation thread
  const handleSendMessage = async () => {
    if (!selectedOrder || !negotiationMessage.trim()) return;
    try {
      await submitQuotationNegotiation(
        selectedOrder.id,
        negotiationMessage.trim(),
        discountPercent,
        {
          id: currentUser?.id || 'superadmin_1',
          name: currentUser?.name || 'Super Admin Office',
          role: 'Super Admin',
        }
      );
      toast.success('Negotiation message posted.');
      setNegotiationMessage('');
      const updated = quotationRequests.find((q) => q.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } catch {
      toast.error('Failed to send negotiation message.');
    }
  };

  // Delete Order Confirmation
  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    deleteQuotationRequest(orderToDelete.id);
    toast.success(`Deleted order request ${orderToDelete.id}.`);
    setOrderToDelete(null);
    if (selectedOrder?.id === orderToDelete.id) {
      setSelectedOrder(null);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return quotationRequests
      .filter((q) => {
        if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
        if (urgencyFilter !== 'ALL' && q.urgency !== urgencyFilter) return false;
        if (searchQuery.trim()) {
          const s = searchQuery.toLowerCase();
          const matchesId = q.id.toLowerCase().includes(s);
          const matchesQuo = q.quotationNumber?.toLowerCase().includes(s);
          const matchesFacility = q.facilityName.toLowerCase().includes(s);
          const matchesUser = q.userName.toLowerCase().includes(s);
          const matchesItem = q.items.some((i) => i.itemName.toLowerCase().includes(s));
          if (!matchesId && !matchesQuo && !matchesFacility && !matchesUser && !matchesItem) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'totalAmount') return (b.totalAmount || 0) - (a.totalAmount || 0);
        return 0;
      });
  }, [quotationRequests, statusFilter, urgencyFilter, searchQuery, sortBy]);

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            <Clock className="h-3 w-3" />
            Pending Review
          </span>
        );
      case 'QUOTATION_ISSUED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
            <FileText className="h-3 w-3" />
            Quotation Issued
          </span>
        );
      case 'NEGOTIATION_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
            <MessageSquare className="h-3 w-3" />
            Negotiating
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Order Confirmed
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
            <XCircle className="h-3 w-3" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* SUPER ADMIN TITLE BANNER */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#CDE1DA] bg-[#EFF6F3] p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F4C42] text-white">
                <ClipboardList className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#112A28]">
                Institutional Orders & Quotations Management
              </h1>
            </div>
            <p className="mt-1 text-xs text-[#45645E]">
              Super Admin command center: Review clinic RFQ requests, price items, calculate SST & bulk discounts, issue official quotations, and generate PDF agreements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/marketplace/manage-items')}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#B9D2CA] bg-white px-4 text-xs font-bold text-[#0F4C42] shadow-sm transition-all hover:bg-[#F8FAFC]"
            >
              <Package className="h-4 w-4" />
              <span>Manage Equipment</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F4C42] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0B3831]"
            >
              Browse Catalogue
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:gap-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Total Orders</p>
            <p className="mt-1 text-2xl font-bold text-[#112A28]">{totalOrders}</p>
            <p className="mt-0.5 text-[10px] text-[#45645E]">All RFQs submitted</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{submittedCount}</p>
            <p className="mt-0.5 text-[10px] text-amber-800">Requires pricing</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Quotations Issued</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{issuedCount}</p>
            <p className="mt-0.5 text-[10px] text-blue-800">{negotiationCount} negotiating</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Confirmed Orders</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{acceptedCount}</p>
            <p className="mt-0.5 text-[10px] text-emerald-800">Signed & approved</p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0F4C42]">Pipeline Value</p>
            <p className="mt-1 text-xl font-bold text-[#0F4C42]">
              RM {totalQuotedValue.toLocaleString('en-MY', { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-0.5 text-[10px] text-[#64748B]">Quoted procurement sum</p>
          </div>
        </div>

        {/* SEARCH & STATUS FILTER TABS */}
        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by RFQ ID, quotation number, hospital/clinic name, requester, or equipment name..."
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-xs text-[#112A28] outline-none placeholder:text-[#94A3B8] focus:border-[#0F4C42] focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-[200px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#112A28] outline-none focus:border-[#0F4C42]"
              >
                <option value="ALL">All Statuses ({totalOrders})</option>
                <option value="SUBMITTED">Pending Review ({submittedCount})</option>
                <option value="QUOTATION_ISSUED">Quotation Issued ({issuedCount})</option>
                <option value="NEGOTIATION_IN_PROGRESS">Negotiation ({negotiationCount})</option>
                <option value="ACCEPTED">Confirmed / Accepted ({acceptedCount})</option>
                <option value="DECLINED">Declined</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div className="w-full sm:w-[160px]">
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#112A28] outline-none focus:border-[#0F4C42]"
              >
                <option value="ALL">All Urgencies</option>
                <option value="STANDARD">Standard</option>
                <option value="URGENT">Urgent</option>
                <option value="CRITICAL">Critical Priority</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="w-full sm:w-[160px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#112A28] outline-none focus:border-[#0F4C42]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="totalAmount">Highest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* ORDERS LIST */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-6 py-16 text-center text-slate-400">
              <ClipboardList className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <h3 className="text-base font-bold text-[#112A28]">No procurement orders found</h3>
              <p className="mt-1 text-xs text-slate-500">No requests match your current filters. Clear the search or switch status tabs.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isPending = order.status === 'SUBMITTED';
              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-[#0F4C42]/40 sm:flex-row sm:items-center ${
                    isPending ? 'border-amber-300 bg-amber-50/10' : 'border-[#E2E8F0]'
                  }`}
                >
                  {/* Left: Order Details & Requester */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0F4C42]">{order.id}</span>
                      {order.quotationNumber && (
                        <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                          {order.quotationNumber}
                        </span>
                      )}
                      {getStatusBadge(order.status)}
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          order.urgency === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : order.urgency === 'URGENT'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.urgency}
                      </span>
                    </div>

                    {/* Facility & Requester info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-bold text-[#112A28]">
                        <Building2 className="h-3.5 w-3.5 text-[#0F4C42]" />
                        {order.facilityName}
                      </span>

                      <span className="flex items-center gap-1 text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        {order.userName} ({order.userRole})
                      </span>

                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        Req by: {order.requiredByDate}
                      </span>
                    </div>

                    {/* Items requested summary */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-700">
                        {order.items.length} Item{order.items.length === 1 ? '' : 's'}:
                      </span>
                      {order.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded bg-[#EFF6F3] px-2 py-0.5 text-[11px] font-medium text-[#0F4C42]"
                        >
                          {item.quantity}x {item.itemName.slice(0, 30)}
                          <span className="font-mono text-[9px] text-[#45645E]">({item.procurementIntent})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Pricing & Actions */}
                  <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      {order.totalAmount ? (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Quoted Total</p>
                          <p className="text-base font-bold text-[#0F4C42]">
                            RM {order.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                          </p>
                        </>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                          Awaiting Pricing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenOrder(order)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm transition-all ${
                          isPending
                            ? 'bg-[#0F4C42] text-white hover:bg-[#0B3831]'
                            : 'border border-slate-200 bg-white text-[#0F4C42] hover:bg-slate-50'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{isPending ? 'Review & Price' : 'Manage'}</span>
                      </button>

                      {order.status !== 'SUBMITTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            exportQuotationPdf(order);
                            toast.success(`Exported Quotation PDF for ${order.id}`);
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-[#0F4C42]"
                          title="Download Official Quotation PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="inline-flex h-9 items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete Order Record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      {/* DETAILED ORDER REVIEW & PRICING MODAL */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order Review & Pricing Engine — ${selectedOrder.id}` : ''}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            {/* Header facility details */}
            <div className="rounded-xl border border-[#CDE1DA] bg-[#EFF6F3] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#45645E]">Healthcare Facility</p>
                  <p className="font-bold text-[#112A28]">{selectedOrder.facilityName}</p>
                  <p className="text-[11px] text-slate-500">{selectedOrder.deliveryAddress}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-[#45645E]">Requested By</p>
                  <p className="font-bold text-[#112A28]">{selectedOrder.userName}</p>
                  <p className="text-[11px] text-slate-500">{selectedOrder.userEmail}</p>
                  <p className="text-[11px] text-slate-500">{selectedOrder.userPhone}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-[#45645E]">Required Date & Urgency</p>
                  <p className="font-bold text-[#112A28]">{selectedOrder.requiredByDate}</p>
                  <span className="rounded bg-white px-2 py-0.5 font-bold text-[#0F4C42] border border-[#CDE1DA]">
                    Urgency: {selectedOrder.urgency}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-[#45645E]">Current Status</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="mt-3 border-t border-[#CDE1DA] pt-2 text-[11px] text-[#45645E]">
                  <strong className="text-[#112A28]">Client Notes:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>

            {/* Requested Items & Unit Pricing Editor */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-[#112A28]">Itemized Procurement Pricing</h3>
                <span className="text-[11px] text-slate-500">Enter unit rates in MYR (Ringgit Malaysia)</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5">Item & Model</th>
                      <th className="px-3.5 py-2.5">Category</th>
                      <th className="px-3.5 py-2.5">Mode</th>
                      <th className="px-3.5 py-2.5">Qty</th>
                      <th className="px-3.5 py-2.5">Unit Price (RM)</th>
                      <th className="px-3.5 py-2.5 text-right">Subtotal (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item) => {
                      const unit = pricingItems[item.id] || 0;
                      const sub = unit * item.quantity;
                      return (
                        <tr key={item.id}>
                          <td className="px-3.5 py-3">
                            <p className="font-bold text-slate-800">{item.itemName}</p>
                            <span className="font-mono text-[10px] text-slate-500">{item.modelNumber || 'CUSTOM-SKU'}</span>
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="text-[10px] font-semibold text-slate-600">{item.category}</span>
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {item.procurementIntent}
                              {item.procurementIntent === 'RENTAL' && ` (${item.rentalDurationMonths || 12}m)`}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 font-bold text-slate-800">{item.quantity}</td>
                          <td className="px-3.5 py-3">
                            <div className="relative w-36">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">RM</span>
                              <input
                                type="number"
                                min={0}
                                value={unit}
                                onChange={(e) =>
                                  setPricingItems({ ...pricingItems, [item.id]: Number(e.target.value) })
                                }
                                className="h-8 w-full rounded-lg border border-slate-300 pl-9 pr-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#0F4C42]"
                              />
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-right font-mono font-bold text-[#0F4C42]">
                            {sub.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & Discounts */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Institutional Bulk Discount (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="h-8 w-24 rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                    <span className="text-xs text-slate-500 font-mono">
                      = -RM {computedDiscountAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700">Sales & Services Tax (SST %)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="h-8 w-24 rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                    <span className="text-xs text-slate-500 font-mono">
                      = +RM {computedTaxAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700">Quotation Validity (Days)</label>
                  <input
                    type="number"
                    min={7}
                    max={120}
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="h-8 w-24 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Summary Box */}
              <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 font-mono text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>RM {computedSubtotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Institutional Discount ({discountPercent}%):</span>
                    <span>- RM {computedDiscountAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SST Tax ({taxPercent}%):</span>
                    <span>RM {computedTaxAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold text-[#0F4C42]">
                  <span>Total Quoted Amount:</span>
                  <span>RM {computedTotalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Terms, Warranty, and Lead Times */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Warranty SLA</label>
                <input
                  type="text"
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Delivery Lead Time (Weeks)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={leadTimeWeeks}
                  onChange={(e) => setLeadTimeWeeks(Number(e.target.value))}
                  className="h-8 w-full rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Super Admin Provisioning Remarks</label>
                <input
                  type="text"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>
            </div>

            {/* Negotiation & Communications Thread */}
            {selectedOrder.negotiationHistory && selectedOrder.negotiationHistory.length > 0 && (
              <div>
                <h4 className="mb-2 font-bold text-slate-800">Negotiation & History Log</h4>
                <div className="max-h-36 overflow-y-auto space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px]">
                  {selectedOrder.negotiationHistory.map((n) => (
                    <div key={n.id} className="rounded bg-white p-2 border border-slate-200">
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <strong>{n.senderName} ({n.senderRole})</strong>
                        <span>{new Date(n.timestamp).toLocaleString('en-GB')}</span>
                      </div>
                      <p className="mt-1 text-slate-800">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick message composer */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Type note or revised quotation reply to client..."
                className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-xs"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-900"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Post Note</span>
              </button>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              {/* Status transition dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Change Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as QuotationStatus)}
                  className="h-8 rounded-lg border border-slate-300 px-2 text-xs font-semibold text-slate-800"
                >
                  <option value="SUBMITTED">Pending Review</option>
                  <option value="QUOTATION_ISSUED">Quotation Issued</option>
                  <option value="NEGOTIATION_IN_PROGRESS">Negotiation in Progress</option>
                  <option value="ACCEPTED">Order Confirmed / Accepted</option>
                  <option value="DECLINED">Declined</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportQuotationPdf({
                      ...selectedOrder,
                      subtotalAmount: computedSubtotal,
                      discountAmount: computedDiscountAmount,
                      sstTaxAmount: computedTaxAmount,
                      totalAmount: computedTotalAmount,
                      paymentTerms,
                      warrantyTerms,
                      deliveryLeadTimeWeeks: leadTimeWeeks,
                      adminRemarks,
                    });
                    toast.success('Downloaded quotation PDF!');
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleIssueQuotation}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F4C42] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#0B3831]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Issue Official Quotation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE ORDER MODAL */}
      <Modal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        title="Confirm Order Request Deletion"
        size="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Are you sure you want to delete order record <strong className="text-[#112A28]">{orderToDelete?.id}</strong> from {orderToDelete?.facilityName}?
          </p>
          <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
            This will permanently remove this order request and all associated pricing and negotiation history.
          </p>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setOrderToDelete(null)}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteOrder}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Delete Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
