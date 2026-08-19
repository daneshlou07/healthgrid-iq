import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import ManageAvailabilityModal from '../../components/marketplace/ManageAvailabilityModal';
import EquipmentDetailModal from '../../components/marketplace/EquipmentDetailModal';
import Modal from '../../components/ui/Modal';
import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentAvailability,
  ProcurementMode,
} from '../../types/marketplace';

import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Eye,
  Settings,
  Stethoscope,
  Building2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Boxes,
} from 'lucide-react';

interface EquipmentFormData {
  name: string;
  modelNumber: string;
  category: EquipmentCategory;
  subcategory: string;
  manufacturer: string;
  originCountry: string;
  description: string;
  keySpecifications: string;
  complianceStandards: string;
  procurementOptions: ProcurementMode[];
  minRentalPeriodMonths: number;
  leadTimeWeeks: number;
  warrantyYears: number;
  powerRequirements: string;
  dimensions: string;
  weightKg: number;
  availability: EquipmentAvailability;
  imageUrl: string;
}

const INITIAL_FORM: EquipmentFormData = {
  name: '',
  modelNumber: '',
  category: 'MEDICAL',
  subcategory: 'Diagnostic Imaging',
  manufacturer: '',
  originCountry: 'Malaysia',
  description: '',
  keySpecifications: '',
  complianceStandards: 'MDA Class B Registered, CE Certified',
  procurementOptions: ['PURCHASE', 'RENTAL'],
  minRentalPeriodMonths: 6,
  leadTimeWeeks: 2,
  warrantyYears: 2,
  powerRequirements: '220-240V AC, 50/60Hz',
  dimensions: '',
  weightKg: 10,
  availability: 'AVAILABLE',
  imageUrl: '',
};

export default function EquipmentManagementPage() {
  const navigate = useNavigate();
  const { currentUser, isMasterAdmin } = useAuth();
  const { equipmentCatalog, addEquipmentItem, updateEquipmentItem, deleteEquipmentItem } = useData();
  const toast = useToast();

  const isSuperOrMaster = isMasterAdmin || currentUser?.role === 'Super Admin';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EquipmentCategory>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | EquipmentAvailability>('ALL');
  const [procurementFilter, setProcurementFilter] = useState<'ALL' | ProcurementMode>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'manufacturer' | 'leadTime' | 'category'>('name');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null);
  const [availabilityItem, setAvailabilityItem] = useState<EquipmentItem | null>(null);
  const [detailItem, setDetailItem] = useState<EquipmentItem | null>(null);

  // Form state
  const [formData, setFormData] = useState<EquipmentFormData>(INITIAL_FORM);

  // Stat metrics
  const totalCount = equipmentCatalog.length;
  const medicalCount = useMemo(() => equipmentCatalog.filter((i) => i.category === 'MEDICAL').length, [equipmentCatalog]);
  const nonMedicalCount = useMemo(() => equipmentCatalog.filter((i) => i.category === 'NON_MEDICAL').length, [equipmentCatalog]);
  const availableCount = useMemo(() => equipmentCatalog.filter((i) => i.availability === 'AVAILABLE').length, [equipmentCatalog]);
  const sourcingCount = useMemo(() => equipmentCatalog.filter((i) => i.availability === 'REQUEST_SOURCING').length, [equipmentCatalog]);

  // Filtered catalogue
  const filteredEquipment = useMemo(() => {
    return equipmentCatalog
      .filter((item) => {
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
        if (availabilityFilter !== 'ALL' && item.availability !== availabilityFilter) return false;
        if (procurementFilter !== 'ALL' && !item.procurementOptions.includes(procurementFilter)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesModel = item.modelNumber.toLowerCase().includes(q);
          const matchesManufacturer = item.manufacturer.toLowerCase().includes(q);
          const matchesSub = item.subcategory?.toLowerCase().includes(q);
          if (!matchesName && !matchesModel && !matchesManufacturer && !matchesSub) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'manufacturer') return a.manufacturer.localeCompare(b.manufacturer);
        if (sortBy === 'leadTime') return a.leadTimeWeeks - b.leadTimeWeeks;
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        return 0;
      });
  }, [equipmentCatalog, categoryFilter, availabilityFilter, procurementFilter, searchQuery, sortBy]);

  const handleOpenCreate = () => {
    setFormData(INITIAL_FORM);
    setEditingItem(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      modelNumber: item.modelNumber,
      category: item.category,
      subcategory: item.subcategory,
      manufacturer: item.manufacturer,
      originCountry: item.originCountry || 'Malaysia',
      description: item.description || '',
      keySpecifications: item.keySpecifications.join('\n'),
      complianceStandards: item.complianceStandards?.join(', ') || '',
      procurementOptions: item.procurementOptions,
      minRentalPeriodMonths: item.minRentalPeriodMonths || 6,
      leadTimeWeeks: item.leadTimeWeeks,
      warrantyYears: item.warrantyYears,
      powerRequirements: item.powerRequirements || '',
      dimensions: item.dimensions || '',
      weightKg: item.weightKg || 0,
      availability: item.availability,
      imageUrl: item.imageUrl || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.modelNumber.trim() || !formData.manufacturer.trim()) {
      toast.error('Please fill in all mandatory equipment details (Name, Model, Manufacturer).');
      return;
    }

    const specsArray = formData.keySpecifications
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const complianceArray = formData.complianceStandards
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name.trim(),
      modelNumber: formData.modelNumber.trim().toUpperCase(),
      category: formData.category,
      subcategory: formData.subcategory.trim() || (formData.category === 'MEDICAL' ? 'General Medical' : 'General Facility'),
      manufacturer: formData.manufacturer.trim(),
      originCountry: formData.originCountry.trim() || 'Malaysia',
      description: formData.description.trim(),
      keySpecifications: specsArray.length > 0 ? specsArray : ['Standard Clinical Specification Compliant'],
      complianceStandards: complianceArray,
      procurementOptions: formData.procurementOptions.length > 0 ? formData.procurementOptions : (['PURCHASE'] as ProcurementMode[]),
      minRentalPeriodMonths: Number(formData.minRentalPeriodMonths) || 1,
      leadTimeWeeks: Number(formData.leadTimeWeeks) || 2,
      warrantyYears: Number(formData.warrantyYears) || 1,
      powerRequirements: formData.powerRequirements.trim(),
      dimensions: formData.dimensions.trim(),
      weightKg: Number(formData.weightKg) || 0,
      availability: formData.availability,
      imageUrl: formData.imageUrl.trim() || undefined,
    };

    if (editingItem) {
      updateEquipmentItem(editingItem.id, payload);
      toast.success(`Updated item "${payload.name.slice(0, 30)}" successfully.`);
    } else {
      addEquipmentItem(payload);
      toast.success(`Created new equipment item "${payload.name.slice(0, 30)}".`);
    }

    setIsCreateModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    deleteEquipmentItem(itemToDelete.id);
    toast.success(`Deleted item "${itemToDelete.name.slice(0, 30)}".`);
    setItemToDelete(null);
  };

  const toggleProcurementOption = (mode: ProcurementMode) => {
    setFormData((prev) => {
      const exists = prev.procurementOptions.includes(mode);
      if (exists) {
        if (prev.procurementOptions.length === 1) {
          toast.info('At least one procurement option (Purchase or Rental) is required.');
          return prev;
        }
        return { ...prev, procurementOptions: prev.procurementOptions.filter((m) => m !== mode) };
      }
      return { ...prev, procurementOptions: [...prev.procurementOptions, mode] };
    });
  };

  const getAvailabilityBadge = (status: EquipmentAvailability) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Available
          </span>
        );
      case 'REQUEST_SOURCING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <HelpCircle className="h-3 w-3" />
            Sourcing Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            <AlertTriangle className="h-3 w-3" />
            Unavailable
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* SUPER ADMIN NOTICE & HERO */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#CDE1DA] bg-[#EFF6F3] p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F4C42] text-white">
                <Package className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#112A28]">
                Equipment Inventory & Catalogue Management
              </h1>
            </div>
            <p className="mt-1 text-xs text-[#45645E]">
              Super Admin master controls: Add, edit, classify, and update availability for both Medical and Non-Medical equipment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/marketplace/orders')}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#B9D2CA] bg-white px-4 text-xs font-bold text-[#0F4C42] shadow-sm transition-all hover:bg-[#F8FAFC]"
            >
              View Incoming Orders
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F4C42] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0B3831]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Equipment Item</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Total Items</p>
            <p className="mt-1 text-2xl font-bold text-[#112A28]">{totalCount}</p>
            <p className="mt-0.5 text-[10px] text-[#45645E]">In active catalogue</p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0F4C42]">Medical Items</p>
            <p className="mt-1 text-2xl font-bold text-[#0F4C42]">{medicalCount}</p>
            <p className="mt-0.5 text-[10px] text-[#45645E]">Clinical & imaging devices</p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#245B70]">Non-Medical Items</p>
            <p className="mt-1 text-2xl font-bold text-[#245B70]">{nonMedicalCount}</p>
            <p className="mt-0.5 text-[10px] text-[#45645E]">Facility & furniture units</p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">In-Stock / Available</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{availableCount}</p>
            <p className="mt-0.5 text-[10px] text-[#64748B]">{sourcingCount} sourcing required</p>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by equipment name, model number, manufacturer, or subcategory..."
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-xs text-[#112A28] outline-none placeholder:text-[#94A3B8] focus:border-[#0F4C42] focus:bg-white"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-[180px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#112A28] outline-none focus:border-[#0F4C42]"
              >
                <option value="ALL">All Categories</option>
                <option value="MEDICAL">Medical Equipment</option>
                <option value="NON_MEDICAL">Non-Medical Equipment</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div className="w-full sm:w-[180px]">
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#112A28] outline-none focus:border-[#0F4C42]"
              >
                <option value="ALL">All Availabilities</option>
                <option value="AVAILABLE">Available</option>
                <option value="REQUEST_SOURCING">Sourcing Required</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="w-full sm:w-[160px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#112A28] outline-none focus:border-[#0F4C42]"
              >
                <option value="name">Sort by Name</option>
                <option value="manufacturer">Sort by Brand</option>
                <option value="leadTime">Sort by Lead Time</option>
                <option value="category">Sort by Category</option>
              </select>
            </div>
          </div>
        </div>

        {/* EQUIPMENT TABLE */}
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="px-4 py-3.5">Equipment Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Manufacturer</th>
                  <th className="px-4 py-3.5">Procurement Options</th>
                  <th className="px-4 py-3.5">Lead Time</th>
                  <th className="px-4 py-3.5">Availability</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold">No equipment items found</p>
                      <p className="mt-1 text-xs">Try adjusting your search criteria or add a new equipment item.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((item) => {
                    const isMed = item.category === 'MEDICAL';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Equipment Name & Model */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-500">
                              {isMed ? <Stethoscope className="h-5 w-5 text-[#0F4C42]" /> : <Building2 className="h-5 w-5 text-[#245B70]" />}
                            </div>
                            <div>
                              <p className="font-bold text-[#112A28]">{item.name}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-[10px] text-[#64748B]">{item.modelNumber}</span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] text-[#64748B]">{item.subcategory}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isMed ? 'bg-emerald-50 text-[#0F4C42] border border-emerald-200' : 'bg-sky-50 text-[#245B70] border border-sky-200'
                            }`}
                          >
                            {isMed ? 'Medical' : 'Non-Medical'}
                          </span>
                        </td>

                        {/* Manufacturer */}
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-[#112A28]">{item.manufacturer}</p>
                          <p className="text-[10px] text-[#64748B]">{item.originCountry || 'Malaysia'}</p>
                        </td>

                        {/* Procurement Options */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {item.procurementOptions.map((opt) => (
                              <span
                                key={opt}
                                className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 font-medium text-[10px] text-[#45645E]"
                              >
                                {opt === 'PURCHASE' ? 'Purchase' : 'Rental'}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Lead Time */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {item.leadTimeWeeks}w Lead
                          </span>
                        </td>

                        {/* Availability */}
                        <td className="px-4 py-3.5">
                          {getAvailabilityBadge(item.availability)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailItem(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0F4C42]"
                              title="View Specifications"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setAvailabilityItem(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                              title="Change Availability"
                            >
                              <Settings className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              title="Edit Equipment"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              title="Delete Equipment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
            Showing <strong className="text-[#112A28]">{filteredEquipment.length}</strong> of {totalCount} total items in system catalogue
          </div>
        </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingItem ? `Edit Equipment: ${editingItem.name}` : 'Add New Equipment Item'}
        size="lg"
      >
        <form onSubmit={handleSaveEquipment} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Category */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as EquipmentCategory })}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              >
                <option value="MEDICAL">Medical Equipment</option>
                <option value="NON_MEDICAL">Non-Medical Equipment</option>
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Subcategory *</label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g. Diagnostic Imaging, Ward Furniture, Power & HVAC"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
                required
              />
            </div>

            {/* Name */}
            <div className="sm:col-span-2">
              <label className="mb-1 block font-bold text-slate-700">Equipment Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Voluson E10 High-End 4D Ultrasound System"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
                required
              />
            </div>

            {/* Model Number */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Model Number / SKU *</label>
              <input
                type="text"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="e.g. VOLUSON-E10-BT22"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs font-mono"
                required
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Manufacturer / Brand *</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g. GE HealthCare, Siemens, Philips"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
                required
              />
            </div>

            {/* Origin Country */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Country of Origin</label>
              <input
                type="text"
                value={formData.originCountry}
                onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                placeholder="e.g. Germany, Japan, Malaysia, USA"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>

            {/* Availability Status */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Availability Status *</label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value as EquipmentAvailability })}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs font-semibold"
              >
                <option value="AVAILABLE">Available (In Stock / Ready to Procure)</option>
                <option value="REQUEST_SOURCING">Request Sourcing (Custom Sourcing Needed)</option>
                <option value="UNAVAILABLE">Unavailable / Discontinued</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block font-bold text-slate-700">Description / Clinical Purpose</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Brief description of application in clinic wards, diagnostic suites, or triage..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
            />
          </div>

          {/* Key Specifications */}
          <div>
            <label className="mb-1 block font-bold text-slate-700">Key Specifications (One specification per line)</label>
            <textarea
              value={formData.keySpecifications}
              onChange={(e) => setFormData({ ...formData, keySpecifications: e.target.value })}
              rows={3}
              placeholder="e.g.&#10;HDLive 4D rendering technology&#10;23-inch OLED multi-touch monitor&#10;Integrated DICOM 3.0 PACS gateway"
              className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs"
            />
          </div>

          {/* Compliance & Procurement Modes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-slate-700">Compliance & Registrations (Comma separated)</label>
              <input
                type="text"
                value={formData.complianceStandards}
                onChange={(e) => setFormData({ ...formData, complianceStandards: e.target.value })}
                placeholder="e.g. MDA Class B, CE Certified, ISO 13485"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Procurement Modes Available</label>
              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={formData.procurementOptions.includes('PURCHASE')}
                    onChange={() => toggleProcurementOption('PURCHASE')}
                    className="accent-[#0F4C42]"
                  />
                  Direct Purchase
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={formData.procurementOptions.includes('RENTAL')}
                    onChange={() => toggleProcurementOption('RENTAL')}
                    className="accent-[#0F4C42]"
                  />
                  Institutional Lease / Rental
                </label>
              </div>
            </div>

            {/* Technical Specs: Lead Time, Warranty, Power, Weight */}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Estimated Lead Time (Weeks)</label>
              <input
                type="number"
                min={1}
                max={52}
                value={formData.leadTimeWeeks}
                onChange={(e) => setFormData({ ...formData, leadTimeWeeks: Number(e.target.value) })}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Warranty Period (Years)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={formData.warrantyYears}
                onChange={(e) => setFormData({ ...formData, warrantyYears: Number(e.target.value) })}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Power Requirements</label>
              <input
                type="text"
                value={formData.powerRequirements}
                onChange={(e) => setFormData({ ...formData, powerRequirements: e.target.value })}
                placeholder="e.g. 220-240V AC, 50Hz, 13A"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Weight (kg)</label>
              <input
                type="number"
                min={0}
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                placeholder="e.g. 85"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#0F4C42] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0B3831]"
            >
              {editingItem ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Confirm Equipment Deletion"
        size="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Are you sure you want to permanently remove <strong className="text-[#112A28]">{itemToDelete?.name}</strong> from the institutional catalogue?
          </p>
          <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
            This action cannot be undone. Users will no longer be able to view or request quotations for this model.
          </p>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setItemToDelete(null)}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Delete Item
            </button>
          </div>
        </div>
      </Modal>

      {/* AVAILABILITY QUICK MODAL */}
      <ManageAvailabilityModal
        equipment={availabilityItem}
        isOpen={Boolean(availabilityItem)}
        onClose={() => setAvailabilityItem(null)}
      />

      {/* DETAIL MODAL */}
      <EquipmentDetailModal
        item={detailItem}
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
