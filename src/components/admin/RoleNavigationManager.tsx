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
  ChevronRight,
} from 'lucide-react';

const MANAGED_ROLES: UserRole[] = [
  'Medical Officer',
  'Radiographer',
  'Public Hospital Radiographer',
  'Private Hospital Radiographer',
  'Radiologist',
  'BEMZ',
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

  const [localDraft, setLocalDraft] =
    useState<RoleNavigationConfig>(() => ({
      ...DEFAULT_ROLE_NAV_CONFIG,
      ...roleNavigationConfig,
    }));

  const [hasChanges, setHasChanges] = useState(false);

  // Sync draft if external config updates
  React.useEffect(() => {
    setLocalDraft((prev) => ({
      ...prev,
      ...roleNavigationConfig,
    }));
  }, [roleNavigationConfig]);

  const activeKeys = localDraft[selectedRole] || [];

  const toggleModule = (moduleId: string) => {
    if (selectedRole === 'Super Admin') {
      toast.info(
        'Super Admin retains full system visibility across all modules.'
      );
      return;
    }

    setLocalDraft((prev) => {
      const currentList = prev[selectedRole] || [];

      const updatedList = currentList.includes(moduleId)
        ? currentList.filter((id) => id !== moduleId)
        : [...currentList, moduleId];

      setHasChanges(true);

      return {
        ...prev,
        [selectedRole]: updatedList,
      };
    });
  };

  const handleSelectAllForRole = () => {
    if (selectedRole === 'Super Admin') {
      toast.info(
        'Super Admin already has full system visibility.'
      );
      return;
    }

    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: ALL_NAV_MODULES.map((m) => m.id),
    }));

    setHasChanges(true);
  };

  const handleDeselectAllForRole = () => {
    if (selectedRole === 'Super Admin') {
      toast.info(
        'Super Admin must retain full system visibility.'
      );
      return;
    }

    setLocalDraft((prev) => ({
      ...prev,
      [selectedRole]: ['dashboard'],
    }));

    setHasChanges(true);
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
      details: `Updated sidebar permissions for ${selectedRole} (${activeKeys.length} modules enabled).`,
      timestamp: new Date().toISOString(),
    });

    toast.success(
      `Saved sidebar navigation permissions for ${selectedRole}.`
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
      details: `Reset sidebar permissions to default for ${selectedRole}.`,
      timestamp: new Date().toISOString(),
    });

    toast.info(
      `Reset ${selectedRole} navigation to default.`
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
        'Reset all role sidebar permissions to factory defaults.',
      timestamp: new Date().toISOString(),
    });

    toast.info(
      'Reset all roles to default permissions.'
    );
  };

  const categorizedModules = useMemo(() => {
    const map: Record<
      string,
      NavModuleDefinition[]
    > = {};

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
                    Role & Access Control
                  </h2>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Control which modules and workspaces are visible to each role.
                  </p>
                </div>
              </div>

            </div>

            <div className="flex shrink-0 items-center gap-2">

              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                title="Reset all roles to factory defaults"
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
                Select a role to configure its navigation.
              </p>
            </div>

            <div className="hidden items-center gap-2 text-[10px] text-slate-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F4C42]" />
              {activeKeys.length} modules enabled
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
            MODULE CONFIGURATION
        ==================================================== */}

        <div className="space-y-4 lg:col-span-8">

          {/* Role Controls */}

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
                    modules visible
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#0F4C42]">
                    {enabledPercentage}%
                  </span>

                </div>

              </div>


              <div className="flex shrink-0 items-center gap-1.5">

                <button
                  type="button"
                  onClick={handleSelectAllForRole}
                  disabled={
                    selectedRole === 'Super Admin'
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0F4C42] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllForRole}
                  disabled={
                    selectedRole === 'Super Admin'
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleResetRole}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>

              </div>

            </div>

          </div>


          {/* =================================================
              MODULE CATEGORIES
          ================================================== */}

          {CATEGORIES.map((category) => {

            const modules =
              categorizedModules[category] || [];

            if (modules.length === 0) {
              return null;
            }

            const enabledCount =
              modules.filter((module) =>
                activeKeys.includes(module.id)
              ).length;

            return (
              <div
                key={category}
                className="space-y-2.5"
              >

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


                {/* Modules */}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">

                  {modules.map((module) => {

                    const isEnabled =
                      activeKeys.includes(
                        module.id
                      );

                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() =>
                          toggleModule(module.id)
                        }
                        disabled={
                          selectedRole ===
                          'Super Admin'
                        }
                        className={`group w-full rounded-xl border p-3 text-left transition-all ${isEnabled
                            ? 'border-[#0F4C42]/50 bg-white shadow-sm hover:border-[#0F4C42] hover:shadow-md'
                            : 'border-slate-200 bg-slate-50/60 opacity-70 hover:bg-white hover:opacity-100'
                          } ${selectedRole ===
                            'Super Admin'
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer'
                          }`}
                      >

                        <div className="flex items-start gap-3">

                          {/* Status */}

                          <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all ${isEnabled
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
                                  {getModuleIcon(
                                    module.iconName
                                  )}
                                </span>

                                <span className="truncate text-xs font-bold text-slate-900">
                                  {module.label}
                                </span>

                              </div>

                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${isEnabled
                                    ? 'bg-emerald-50 text-[#0F4C42]'
                                    : 'bg-slate-100 text-slate-400'
                                  }`}
                              >
                                {isEnabled
                                  ? 'Enabled'
                                  : 'Hidden'}
                              </span>

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


        {/* ===================================================
            LIVE PREVIEW
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
                    Sidebar navigation
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

                {activeKeys.length === 0 ? (

                  <div className="py-10 text-center">

                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <Layers className="h-4 w-4 text-slate-400" />
                    </div>

                    <p className="text-[10px] font-semibold text-slate-500">
                      No modules enabled
                    </p>

                    <p className="mt-0.5 text-[9px] text-slate-400">
                      Select modules on the left.
                    </p>

                  </div>

                ) : (

                  ALL_NAV_MODULES
                    .filter((module) =>
                      activeKeys.includes(
                        module.id
                      )
                    )
                    .map((module) => (

                      <div
                        key={module.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[10px] font-medium text-slate-700 shadow-sm"
                      >

                        <span className="text-[#0F4C42]">
                          {getModuleIcon(
                            module.iconName
                          )}
                        </span>

                        <span className="truncate">
                          {module.label}
                        </span>

                      </div>

                    ))

                )}

              </div>

            </div>


            {/* Information */}

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">

              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />

              <p className="text-[10px] leading-4 text-blue-800">
                Changes saved here take effect immediately across active browser sessions for this role.
              </p>

            </div>


            {/* Super Admin Notice */}

            {selectedRole === 'Super Admin' && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">

                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />

                <p className="text-[10px] leading-4 text-amber-800">
                  Super Admin has full system visibility and cannot have modules manually disabled.
                </p>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}