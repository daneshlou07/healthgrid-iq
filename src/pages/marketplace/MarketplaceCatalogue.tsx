import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type {
  EquipmentItem,
  EquipmentAvailability,
  ProcurementMode,
} from '../../types/marketplace';

import EquipmentDetailModal from '../../components/marketplace/EquipmentDetailModal';
import ManageAvailabilityModal from '../../components/marketplace/ManageAvailabilityModal';
import RfqDraftDrawer from '../../components/marketplace/RfqDraftDrawer';
import MarketplaceHeader from './MarketplaceHeader';

import {
  Search,
  Stethoscope,
  Building2,
  Package,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Eye,
  Layers,
  Plus,
  RotateCcw,
  Truck,
  Settings,
} from 'lucide-react';

export default function MarketplaceCatalogue() {
  const navigate = useNavigate();
  const { currentUser, isMasterAdmin } = useAuth();
  const { equipmentCatalog, rfqDraft, addToRfqDraft } = useData();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'MEDICAL' | 'NON_MEDICAL'>('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<'ALL' | EquipmentAvailability>('ALL');
  const [selectedProcurementMode, setSelectedProcurementMode] = useState<'ALL' | ProcurementMode>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'manufacturer' | 'leadTime'>('default');

  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [manageAvailItem, setManageAvailItem] = useState<EquipmentItem | null>(null);
  const [isDraftDrawerOpen, setIsDraftDrawerOpen] = useState(false);

  const isSuperOrMaster = isMasterAdmin || currentUser?.role === 'Super Admin';
  const isEquipmentMarketplaceUser = currentUser?.role === 'Equipment Marketplace';
  const isLegacyHealthcareCenterAdmin = currentUser?.role === 'Administrator';
  const canRequestQuotation = isEquipmentMarketplaceUser || isLegacyHealthcareCenterAdmin || isSuperOrMaster;

  const medicalCount = useMemo(
    () => equipmentCatalog.filter((item) => item.category === 'MEDICAL').length,
    [equipmentCatalog]
  );

  const nonMedicalCount = useMemo(
    () => equipmentCatalog.filter((item) => item.category === 'NON_MEDICAL').length,
    [equipmentCatalog]
  );

  const availableCount = useMemo(
    () => equipmentCatalog.filter((item) => item.availability === 'AVAILABLE').length,
    [equipmentCatalog]
  );

  const sourcingCount = useMemo(
    () => equipmentCatalog.filter((item) => item.availability === 'REQUEST_SOURCING').length,
    [equipmentCatalog]
  );

  const filteredEquipment = useMemo(() => {
    const list = equipmentCatalog.filter((item) => {
      if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) {
        return false;
      }
      if (selectedAvailability !== 'ALL' && item.availability !== selectedAvailability) {
        return false;
      }
      if (selectedProcurementMode !== 'ALL' && !item.procurementOptions.includes(selectedProcurementMode)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesModel = item.modelNumber.toLowerCase().includes(q);
        const matchesManufacturer = item.manufacturer.toLowerCase().includes(q);
        const matchesSubcategory = item.subcategory.toLowerCase().includes(q);
        const matchesSpecs = item.keySpecifications.some((spec) => spec.toLowerCase().includes(q));
        if (!matchesName && !matchesModel && !matchesManufacturer && !matchesSubcategory && !matchesSpecs) {
          return false;
        }
      }
      return true;
    });

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'manufacturer') {
      list.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
    } else if (sortBy === 'leadTime') {
      list.sort((a, b) => a.leadTimeWeeks - b.leadTimeWeeks);
    }

    return list;
  }, [equipmentCatalog, selectedCategoryFilter, selectedAvailability, selectedProcurementMode, searchQuery, sortBy]);

  const handleQuickRequest = (item: EquipmentItem) => {
    const defaultMode: ProcurementMode = item.procurementOptions.includes('PURCHASE')
      ? 'PURCHASE'
      : 'RENTAL';

    addToRfqDraft({
      equipmentId: item.id,
      itemName: item.name,
      modelNumber: item.modelNumber,
      category: item.category,
      subcategory: item.subcategory,
      manufacturer: item.manufacturer,
      quantity: 1,
      procurementMode: defaultMode,
      rentalDurationMonths: defaultMode === 'RENTAL' ? item.minRentalPeriodMonths || 12 : undefined,
    });

    toast.success(`Added 1x ${item.name.slice(0, 28)} to RFQ Draft`);
    setIsDraftDrawerOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('ALL');
    setSelectedAvailability('ALL');
    setSelectedProcurementMode('ALL');
    setSortBy('default');
  };

  const getAvailabilityBadge = (availability: EquipmentAvailability) => {
    switch (availability) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Available
          </span>
        );
      case 'REQUEST_SOURCING':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            <HelpCircle className="h-3 w-3" />
            Sourcing Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            <AlertTriangle className="h-3 w-3" />
            Unavailable
          </span>
        );
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategoryFilter !== 'ALL' ||
    selectedAvailability !== 'ALL' ||
    selectedProcurementMode !== 'ALL';

  const EquipmentCard = ({ item }: { item: EquipmentItem }) => {
    const isMedical = item.category === 'MEDICAL';
    const isAvailableForRfq = item.availability !== 'UNAVAILABLE';

    return (
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C7DDD7] hover:shadow-md">
        {/* PREVIEW HEADER */}
        <div className="relative flex h-44 w-full items-center justify-center border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#D8E8E2] bg-white text-[#0F4C42] shadow-sm transition-transform duration-200 group-hover:scale-105">
            {isMedical ? (
              <Stethoscope className="h-9 w-9 text-[#0F4C42]" />
            ) : item.subcategory?.toLowerCase().includes('vehicle') || item.subcategory?.toLowerCase().includes('mobile') ? (
              <Truck className="h-9 w-9 text-[#245B70]" />
            ) : (
              <Building2 className="h-9 w-9 text-[#245B70]" />
            )}
          </div>

          <div className="absolute left-3 top-3">
            <span
              className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isMedical
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-sky-200 bg-sky-50 text-sky-700'
                }`}
            >
              {isMedical ? 'Medical' : 'Non-Medical'}
            </span>
          </div>

          <div className="absolute right-3 top-3">
            {getAvailabilityBadge(item.availability)}
          </div>

          <div className="absolute bottom-3 left-3">
            <span className="rounded border border-[#E2E8F0] bg-white px-2 py-0.5 font-mono text-[10px] text-[#64748B]">
              {item.modelNumber}
            </span>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 flex-col p-4">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${isMedical ? 'text-[#0F4C42]' : 'text-[#245B70]'}`}>
            {item.manufacturer}
          </p>

          <button
            type="button"
            onClick={() => setSelectedItem(item)}
            className="mt-1 text-left"
          >
            <h3 className="line-clamp-2 min-h-[38px] text-sm font-bold leading-5 text-[#112A28]">
              {item.name}
            </h3>
          </button>

          <p className="mt-0.5 text-xs text-[#64748B]">
            {item.subcategory}
          </p>

          {/* KEY SPECS */}
          <div className="mt-3 min-h-[42px] space-y-1">
            {item.keySpecifications.slice(0, 2).map((spec, index) => (
              <div
                key={index}
                className="flex items-start gap-1.5 text-[11px] leading-4 text-[#45645E]"
              >
                <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${isMedical ? 'bg-[#0F4C42]' : 'bg-[#245B70]'}`} />
                <span className="line-clamp-2">{spec}</span>
              </div>
            ))}
          </div>

          {/* META */}
          <div className="mt-3 flex items-center justify-between border-t border-[#F1F5F9] pt-2.5 text-[10px] text-[#64748B]">
            <div className="flex flex-wrap gap-1">
              {item.procurementOptions.map((option) => (
                <span
                  key={option}
                  className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 font-medium text-[#45645E]"
                >
                  {option === 'PURCHASE' ? 'Purchase' : 'Rental'}
                </span>
              ))}
            </div>

            <span className="flex items-center gap-1 font-medium">
              <Clock3 className="h-3 w-3 text-[#0F4C42]" />
              {item.leadTimeWeeks}w Lead Time
            </span>
          </div>

          {/* ACTIONS */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedItem(item)}
              className="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2 text-xs font-semibold text-[#45645E] transition-colors hover:border-[#B9D2CA] hover:bg-[#F8FAFC] hover:text-[#0F4C42]"
            >
              <Eye className="h-3.5 w-3.5" />
              Details
            </button>

            {canRequestQuotation && (
              isAvailableForRfq ? (
                <button
                  type="button"
                  onClick={() => handleQuickRequest(item)}
                  className={`flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold text-white transition-colors ${isMedical ? 'bg-[#0F4C42] hover:bg-[#0B3831]' : 'bg-[#245B70] hover:bg-[#1C485A]'
                    }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Request RFQ
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 h-8 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-2 text-xs font-semibold text-[#94A3B8]"
                >
                  Unavailable
                </button>
              )
            )}

            {isSuperOrMaster && (
              <button
                type="button"
                onClick={() => setManageAvailItem(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8E8E2] bg-[#EFF6F3] text-[#0F4C42] hover:bg-[#E5F1ED]"
                title="Manage Availability"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 1. TOP GLOBAL HEADER */}
      <MarketplaceHeader onOpenDraftDrawer={() => setIsDraftDrawerOpen(true)} />

      {/* 2. MUDAH.MY STYLE SEARCH HERO SECTION */}
      <section className="border-b border-[#E2E8F0] bg-[#E8F3F1] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1500px]">
          {/* SEARCH BOX CONTAINER */}
          <div className="rounded-xl border border-[#D5E3DE] bg-white p-2 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              {/* CATEGORY SELECTOR */}
              <div className="w-full md:w-[240px]">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-bold text-[#112A28] outline-none focus:border-[#0F4C42] focus:bg-white"
                >
                  <option value="ALL">All Categories ({equipmentCatalog.length})</option>
                  <option value="MEDICAL">Medical Equipment ({medicalCount})</option>
                  <option value="NON_MEDICAL">Non-Medical Equipment ({nonMedicalCount})</option>
                </select>
              </div>

              {/* SEARCH TEXT INPUT */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all equipment, devices, infrastructure, model, manufacturer..."
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white pl-10 pr-4 text-xs text-[#112A28] outline-none placeholder:text-[#94A3B8] focus:border-[#0F4C42]"
                />
              </div>

              {/* AVAILABILITY SELECTOR */}
              <div className="w-full md:w-[200px]">
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value as 'ALL' | EquipmentAvailability)}
                  className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#112A28] outline-none focus:border-[#0F4C42] focus:bg-white"
                >
                  <option value="ALL">All Availability</option>
                  <option value="AVAILABLE">Available Immediately</option>
                  <option value="REQUEST_SOURCING">Sourcing Required</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>

              {/* SEARCH BUTTON */}
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0F4C42] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#0B3831]"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
            </div>

            {/* QUICK FILTERS ROW UNDER SEARCH */}
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-2">
              <select
                value={selectedProcurementMode}
                onChange={(e) => setSelectedProcurementMode(e.target.value as 'ALL' | ProcurementMode)}
                className="h-8 rounded-md border border-[#E2E8F0] bg-white px-2.5 text-[11px] font-medium text-[#45645E] outline-none focus:border-[#0F4C42]"
              >
                <option value="ALL">Procurement Mode: All</option>
                <option value="PURCHASE">Direct Purchase Only</option>
                <option value="RENTAL">Rental / Lease Only</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D8E8E2] bg-[#EFF6F3] px-2.5 text-[11px] font-semibold text-[#0F4C42] hover:bg-[#E5F1ED]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Filters
                </button>
              )}

              {isSuperOrMaster && (
                <button
                  type="button"
                  onClick={() => toast.info('Catalogue management is active')}
                  className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D8E8E2] bg-white px-2.5 text-[11px] font-medium text-[#45645E] hover:bg-[#F8FAFC]"
                >
                  <Settings className="h-3 w-3 text-[#0F4C42]" />
                  Catalogue Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT BODY: ALL EQUIPMENT IN ONE CATALOGUE */}
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        {/* RESULTS HEADER (MUDAH.MY STYLE) */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#112A28]">
              All Healthcare & Facility Equipment with Total{' '}
              <span className="font-extrabold text-[#0F4C42]">{equipmentCatalog.length}</span> Available
            </h1>
            <p className="text-xs text-[#64748B]">
              Institutional procurement catalogue for clinical devices and facility infrastructure.
            </p>
          </div>

          {/* SORT DROPDOWN */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#112A28] outline-none focus:border-[#0F4C42]"
            >
              <option value="default">Default Relevance</option>
              <option value="name">Name (A to Z)</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="leadTime">Shortest Lead Time</option>
            </select>
          </div>
        </div>

        {/* STATUS & CATEGORY PILLS (MUDAH.MY STYLE) */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {/* ALL CATEGORIES */}
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${selectedCategoryFilter === 'ALL'
                ? 'border border-[#0F4C42] bg-[#0F4C42] text-white'
                : 'border border-[#E2E8F0] bg-white text-[#45645E] hover:bg-[#F8FAFC]'
              }`}
          >
            All Equipment ({equipmentCatalog.length})
          </button>

          {/* MEDICAL ONLY */}
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('MEDICAL')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${selectedCategoryFilter === 'MEDICAL'
                ? 'border border-[#0F4C42] bg-[#0F4C42] text-white'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
              }`}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            Medical Equipment ({medicalCount})
          </button>

          {/* NON-MEDICAL ONLY */}
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('NON_MEDICAL')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${selectedCategoryFilter === 'NON_MEDICAL'
                ? 'border border-[#245B70] bg-[#245B70] text-white'
                : 'border border-sky-200 bg-sky-50 text-[#245B70] hover:bg-sky-100/70'
              }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Non-Medical Equipment ({nonMedicalCount})
          </button>

          {/* AVAILABLE IMMEDIATELY */}
          <button
            type="button"
            onClick={() => setSelectedAvailability(selectedAvailability === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${selectedAvailability === 'AVAILABLE'
                ? 'border border-emerald-600 bg-emerald-600 text-white'
                : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
          >
            Available Immediately ({availableCount})
          </button>

          {/* SOURCING REQUIRED */}
          <button
            type="button"
            onClick={() => setSelectedAvailability(selectedAvailability === 'REQUEST_SOURCING' ? 'ALL' : 'REQUEST_SOURCING')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${selectedAvailability === 'REQUEST_SOURCING'
                ? 'border border-amber-600 bg-amber-600 text-white'
                : 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
              }`}
          >
            Sourcing Required ({sourcingCount})
          </button>
        </div>

        {/* ALL EQUIPMENT GRID */}
        {filteredEquipment.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6F3] text-[#0F4C42]">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#112A28]">No equipment found</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#64748B]">
              Try adjusting your search query or removing some of your filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F4C42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B3831]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEquipment.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* MODALS */}
      <EquipmentDetailModal
        equipment={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        onOpenAvailabilityModal={(equipment) => setManageAvailItem(equipment)}
        onOpenDraftDrawer={() => setIsDraftDrawerOpen(true)}
      />

      <ManageAvailabilityModal
        equipment={manageAvailItem}
        isOpen={Boolean(manageAvailItem)}
        onClose={() => setManageAvailItem(null)}
      />

      {canRequestQuotation && (
        <RfqDraftDrawer
          isOpen={isDraftDrawerOpen}
          onClose={() => setIsDraftDrawerOpen(false)}
        />
      )}
    </div>
  );
}
