import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ux/Toast';
import type { UserRole } from '../../types';
import {
  ALL_NAV_MODULES,
  DEFAULT_ROLE_NAV_CONFIG,
  RoleNavigationConfig,
  NavModuleDefinition,
} from '../../services/permissionService';
import {
  Shield,
  CheckCircle2,
  RotateCcw,
  Save,
  Layers,
  House,
  Users,
  UserPlus,
  FilePlus2,
  FolderOpen,
  FileText,
  ClipboardList,
  ArrowRightLeft,
  Upload,
  Calendar,
  ShieldCheck,
  Wrench,
  Building2,
  Sparkles,
  Truck,
  Building,
  ScrollText,
  BarChart3,
  Check,
  Eye,
  Info,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ListOrdered,
  SlidersHorizontal,
  Trash2,
  Stethoscope,
  Package,
  ShoppingBag,
} from 'lucide-react';

const MANAGED_ROLES: UserRole[] = [
  'Medical Officer',
  'Radiographer',
  'Public Hospital Radiographer',
  'Private Hospital Radiographer',
  'Radiologist',
  'BEMZ',
  'Public Hospital Admin',
  'Private Hospital Admin',
  'Administrator',
  'Super Admin',
  'Equipment Marketplace',
];

const CATEGORIES = [
  'Clinical Core',
  'Imaging & Technical',
  'Operations & Fleet',
  'Administration & Governance',
  'Equipment Marketplace',
] as const;

function getModuleIcon(iconName: string) {
  const props = { className: 'w-4 h-4' };

  switch (iconName) {
    case 'House':
      return <House {...props} />;
    case 'Users':
      return <Users {...props} />;
    case 'UserPlus':
      return <UserPlus {...props} />;
    case 'FilePlus2':
      return <FilePlus2 {...props} />;
    case 'FolderOpen':
      return <FolderOpen {...props} />;
    case 'FileText':
      return <FileText {...props} />;
    case 'ClipboardList':
      return <ClipboardList {...props} />;
    case 'ArrowRightLeft':
      return <ArrowRightLeft {...props} />;
    case 'Upload':
      return <Upload {...props} />;
    case 'Calendar':
      return <Calendar {...props} />;
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'Wrench':
      return <Wrench {...props} />;
    case 'Building2':
      return <Building2 {...props} />;
    case 'Sparkles':
      return <Sparkles {...props} />;
    case 'Truck':
      return <Truck {...props} />;
    case 'Building':
      return <Building {...props} />;
    case 'Shield':
      return <Shield {...props} />;
    case 'ScrollText':
      return <ScrollText {...props} />;
    case 'BarChart3':
      return <BarChart3 {...props} />;
    case 'Layers':
      return <Layers {...props} />;
    case 'Trash2':
      return <Trash2 {...props} />;
    case 'Stethoscope':
      return <Stethoscope {...props} />;
    case 'Package':
      return <Package {...props} />;
    case 'ShoppingBag':
      return <ShoppingBag {...props} />;
    default:
      return <Layers {...props} />;
  }
}

export default function RoleNavigationManager() {
  const {
    roleNavigationConfig,
    updateRoleNavigation,
    resetRoleNavigation,
    addAuditLog,
  } = useData();

  const { currentUser } = useAuth();
  const toast = useToast();

  const [selectedRole, setSelectedRole] =
    useState<UserRole>('Medical Officer');

  const [viewMode, setViewMode] = useState<'reorder' | 'catalog'>('reorder');

  const [localDraft, setLocalDraft] =
    useState<RoleNavigationConfig>(() => ({
      ...DEFAULT_ROLE_NAV_CONFIG,
      ...roleNavigationConfig,
    }));

  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const activeKeys = useMemo(() => {
    return localDraft[selectedRole] || [];
  }, [localDraft, selectedRole]);

  const orderedActiveModules = useMemo(() => {
    return activeKeys
      .map((key) => ALL_NAV_MODULES.find((m) => m.id === key))
      .filter((m): m is NavModuleDefinition => Boolean(m));
  }, [activeKeys]);

  const toggleModule = (moduleId: string) => {
    const currentList = localDraft[selectedRole] || [];
    const updatedList = currentList.includes(moduleId)
      ? currentList.filter((id) => id !== moduleId)
      : [...currentList, moduleId];

    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: updatedList,
    }));

    updateRoleNavigation(selectedRole, updatedList);
    setHasChanges(false);
  };

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeKeys.length) return;

    const next = [...activeKeys];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: next,
    }));

    updateRoleNavigation(selectedRole, next);
    setHasChanges(false);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const next = [...activeKeys];
    const [draggedItem] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, draggedItem);

    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: next,
    }));

    updateRoleNavigation(selectedRole, next);
    setHasChanges(false);
    setDraggedIndex(null);
  };

  const handleSelectAllForRole = () => {
    const all = ALL_NAV_MODULES.map((m) => m.id);
    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: all,
    }));

    updateRoleNavigation(selectedRole, all);
    setHasChanges(false);
  };

  const handleDeselectAllForRole = () => {
    const minimal = ['dashboard'];
    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: minimal,
    }));

    updateRoleNavigation(selectedRole, minimal);
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    updateRoleNavigation(selectedRole, activeKeys);
    setHasChanges(false);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SETTINGS_UPDATE',
      target: `rbac/navigation/${selectedRole}`,
      details: `Updated sidebar order & permissions for ${selectedRole} (${activeKeys.length} modules configured).`,
      timestamp: new Date().toISOString(),
    });

    toast.success(
      `Saved sidebar navigation order for ${selectedRole}.`
    );
  };

  const handleResetRole = async () => {
    if (!currentUser) return;

    const defaultList =
      DEFAULT_ROLE_NAV_CONFIG[selectedRole] || [];

    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: defaultList,
    }));

    updateRoleNavigation(selectedRole, defaultList);
    setHasChanges(false);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SETTINGS_UPDATE',
      target: `rbac/navigation/${selectedRole}`,
      details: `Reset sidebar permissions and sequence to factory default for ${selectedRole}.`,
      timestamp: new Date().toISOString(),
    });

    toast.info(
      `Reset ${selectedRole} navigation order to default.`
    );
  };

  const handleResetAll = async () => {
    if (!currentUser) return;

    resetRoleNavigation();
    setLocalDraft({
      ...DEFAULT_ROLE_NAV_CONFIG,
    });

    setHasChanges(false);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SETTINGS_UPDATE',
      target: `rbac/navigation/all`,
      details:
        'Reset all role sidebar permissions and orders to factory defaults.',
      timestamp: new Date().toISOString(),
    });

    toast.info(
      'Reset all roles to default permissions and ordering.'
    );
  };

  const categorizedModules = useMemo(() => {
    const map: Record<string, NavModuleDefinition[]> = {};

    CATEGORIES.forEach((category) => {
      map[category] = ALL_NAV_MODULES.filter(
        (module) => module.category === category
      );
    });

    return map;
  }, []);

  const enabledPercentage =
    ALL_NAV_MODULES.length > 0
      ? Math.round(
        (activeKeys.length /
          ALL_NAV_MODULES.length) *
        100
      )
      : 0;

  return (
    <div className="space-y-4 pb-6">

      {/* =====================================================
          RBAC HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="px-5 py-4">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="min-w-0">

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4C42]">
                  <Shield className="h-4.5 w-4.5" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Role & Access Control (Sidebar Order Manager)
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Rearrange, sort, enable, or hide sidebar navigation items for each role.
                  </p>
                </div>
              </div>

            </div>

            <div className="flex shrink-0 items-center gap-2">

              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                title="Reset all roles to factory default order"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold transition-all ${hasChanges
                    ? 'bg-[#0F4C42] text-white hover:bg-[#0c3c34] shadow-sm'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
              >
                {hasChanges ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}

                {hasChanges
                  ? 'Save Changes'
                  : 'Saved'}
              </button>

            </div>

          </div>

        </div>


        {/* =====================================================
            ROLE SELECTOR
        ====================================================== */}

        <div className="border-t border-slate-100 px-5 py-3">

          <div className="mb-2 flex items-center justify-between">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Role
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500">
                Select a role to configure its navigation order and visibility.
              </p>
            </div>

            <div className="hidden items-center gap-2 text-[10px] text-slate-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F4C42]" />
              {activeKeys.length} items active
            </div>

          </div>


          <div className="relative">

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">

              {MANAGED_ROLES.map((role) => {

                const isSelected =
                  selectedRole === role;

                const count =
                  (localDraft[role] || []).length;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setHasChanges(false);
                    }}
                    className={`group flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all ${isSelected
                        ? 'border-[#0F4C42] bg-[#0F4C42] text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-800'
                      }`}
                  >

                    <span>
                      {role}
                    </span>

                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                    >
                      {count}
                    </span>

                  </button>
                );
              })}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

        {/* ===================================================
            MODULE CONFIGURATION & SORTING
        ==================================================== */}

        <div className="space-y-4 lg:col-span-8">

          {/* Role Controls & View Switcher */}

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="text-xs font-bold text-slate-800">
                    {selectedRole}
                  </span>

                  <span className="h-1 w-1 rounded-full bg-slate-300" />

                  <span className="text-[11px] text-slate-500">
                    {activeKeys.length} of{' '}
                    {ALL_NAV_MODULES.length}{' '}
                    items active
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#0F4C42]">
                    {enabledPercentage}%
                  </span>

                </div>

              </div>


              {/* View Switcher Tabs */}
              <div className="flex shrink-0 items-center gap-1.5">

                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('reorder')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                      viewMode === 'reorder'
                        ? 'bg-white text-[#0F4C42] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListOrdered className="w-3 h-3" />
                    Sort & Reorder
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('catalog')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${
                      viewMode === 'catalog'
                        ? 'bg-white text-[#0F4C42] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Module Catalog
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllForRole}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0F4C42]"
                  title="Enable all modules for this role"
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllForRole}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
                  title="Clear all except Dashboard"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleResetRole}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                  title="Reset this role to factory default order"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>

              </div>

            </div>

          </div>


          {/* =================================================
              VIEW MODE 1: SORT & REORDER LIST
          ================================================== */}

          {viewMode === 'reorder' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[#0F4C42]" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Active Sidebar Sequence (Top to Bottom)
                  </h3>
                </div>

                <span className="text-[10px] text-slate-400 font-medium">
                  Use Up/Down arrows or drag to rearrange
                </span>
              </div>

              {orderedActiveModules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700">No navigation items active</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Switch to the Module Catalog tab or click 'All' to add items.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderedActiveModules.map((module, index) => {
                    const isFirst = index === 0;
                    const isLast = index === orderedActiveModules.length - 1;
                    const isDragging = draggedIndex === index;

                    return (
                      <div
                        key={module.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        className={`group flex items-center justify-between rounded-xl border bg-white p-3 transition-all ${
                          isDragging
                            ? 'border-[#0F4C42] bg-emerald-50/50 shadow-md opacity-60'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Left: Drag Handle, Number Badge, Icon, Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>

                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                            #{index + 1}
                          </div>

                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#0F4C42]">
                            {getModuleIcon(module.iconName)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-bold text-slate-900">
                                {module.label}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 uppercase">
                                {module.category}
                              </span>
                            </div>
                            <p className="line-clamp-1 text-[10px] text-slate-500 mt-0.5">
                              {module.description}
                            </p>
                          </div>
                        </div>

                        {/* Right: Up / Down Controls & Remove */}
                        <div className="flex shrink-0 items-center gap-1 ml-3">
                          <button
                            type="button"
                            onClick={() => moveModule(index, 'up')}
                            disabled={isFirst}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0F4C42] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move item up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => moveModule(index, 'down')}
                            disabled={isLast}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0F4C42] disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move item down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleModule(module.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 ml-1"
                            title="Hide from sidebar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {/* =================================================
              VIEW MODE 2: MODULE CATALOG & VISIBILITY
          ================================================== */}

          {viewMode === 'catalog' && (
            <div className="space-y-4">
              {CATEGORIES.map((category) => {
                const modules = categorizedModules[category] || [];
                if (modules.length === 0) return null;

                const enabledCount = modules.filter((module) =>
                  activeKeys.includes(module.id)
                ).length;

                return (
                  <div key={category} className="space-y-2.5">
                    {/* Category Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-[#0F4C42]" />
                        <h3 className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          {category}
                        </h3>
                      </div>

                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        {enabledCount}/{modules.length}
                      </span>
                    </div>

                    {/* Modules Grid */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {modules.map((module) => {
                        const isEnabled = activeKeys.includes(module.id);
                        const positionIndex = activeKeys.indexOf(module.id);

                        return (
                          <button
                            key={module.id}
                            type="button"
                            onClick={() => toggleModule(module.id)}
                            className={`group w-full rounded-xl border p-3 text-left transition-all cursor-pointer ${
                              isEnabled
                                ? 'border-[#0F4C42]/50 bg-white shadow-sm hover:border-[#0F4C42] hover:shadow-md'
                                : 'border-slate-200 bg-slate-50/60 opacity-70 hover:bg-white hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Status Check */}
                              <div
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all ${
                                  isEnabled
                                    ? 'bg-[#0F4C42] text-white'
                                    : 'border border-slate-300 bg-white text-transparent'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <span
                                      className={
                                        isEnabled
                                          ? 'text-[#0F4C42]'
                                          : 'text-slate-400'
                                      }
                                    >
                                      {getModuleIcon(module.iconName)}
                                    </span>

                                    <span className="truncate text-xs font-bold text-slate-900">
                                      {module.label}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {isEnabled && (
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-700">
                                        #{positionIndex + 1}
                                      </span>
                                    )}

                                    <span
                                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                                        isEnabled
                                          ? 'bg-emerald-50 text-[#0F4C42]'
                                          : 'bg-slate-100 text-slate-400'
                                      }`}
                                    >
                                      {isEnabled ? 'Enabled' : 'Hidden'}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                  <p className="line-clamp-2 text-[10px] leading-4 text-slate-500">
                                    {module.description}
                                  </p>

                                  <span className="hidden shrink-0 font-mono text-[9px] text-slate-300 xl:block">
                                    {module.defaultPath}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>


        {/* ===================================================
            LIVE PREVIEW (SIDEBAR)
        ==================================================== */}

        <div className="lg:col-span-4">

          <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

            {/* Preview Header */}

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">

              <div className="flex items-center gap-2">

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0F4C42]">
                  <Eye className="h-3.5 w-3.5" />
                </div>

                <div>

                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Live Preview
                  </h3>

                  <p className="text-[9px] text-slate-400">
                    Exact sidebar order
                  </p>

                </div>

              </div>

              <span className="max-w-[130px] truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-[#0F4C42]">
                {selectedRole}
              </span>

            </div>


            {/* Preview Description */}

            <div className="mt-3 rounded-lg bg-slate-50 p-3">

              <div className="flex items-center justify-between">

                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Visible Modules
                </span>

                <span className="text-[10px] font-bold text-[#0F4C42]">
                  {activeKeys.length}
                </span>

              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full rounded-full bg-[#0F4C42] transition-all"
                  style={{
                    width: `${enabledPercentage}%`,
                  }}
                />

              </div>

            </div>


            {/* Mock Sidebar */}

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-[#F8FAFC]">

              <div className="border-b border-slate-200 bg-white px-3 py-2.5">

                <div className="flex items-center gap-2">

                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-[#0F4C42]">
                    <Layers className="h-3.5 w-3.5" />
                  </div>

                  <div>

                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Navigation Menu
                    </p>

                    <p className="text-[10px] font-semibold text-slate-700">
                      HealthGrid IQ
                    </p>

                  </div>

                </div>

              </div>


              <div className="max-h-[460px] space-y-1 overflow-y-auto p-2">

                {orderedActiveModules.length === 0 ? (

                  <div className="py-10 text-center">

                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <Layers className="h-4 w-4 text-slate-400" />
                    </div>

                    <p className="text-[10px] font-semibold text-slate-500">
                      No items in sidebar
                    </p>

                    <p className="mt-0.5 text-[9px] text-slate-400">
                      Enable modules on the left.
                    </p>

                  </div>

                ) : (

                  orderedActiveModules.map((module, index) => (

                    <div
                      key={module.id}
                      className="group flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow-sm hover:border-slate-300"
                    >

                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-slate-400 w-3">
                          {index + 1}.
                        </span>

                        <span className="text-[#0F4C42]">
                          {getModuleIcon(module.iconName)}
                        </span>

                        <span className="truncate text-[10px] font-semibold">
                          {module.label}
                        </span>
                      </div>

                      {/* Quick Up/Down in Live Preview */}
                      <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveModule(index, 'up')}
                          disabled={index === 0}
                          className="p-0.5 text-slate-500 hover:text-[#0F4C42] disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveModule(index, 'down')}
                          disabled={index === orderedActiveModules.length - 1}
                          className="p-0.5 text-slate-500 hover:text-[#0F4C42] disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                    </div>

                  ))

                )}

              </div>

            </div>


            {/* Information */}

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">

              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />

              <p className="text-[10px] leading-4 text-blue-800">
                Changes saved here take effect immediately across all browser sessions for this role.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}