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
    case 'House': return <House {...props} />;
    case 'Users': return <Users {...props} />;
    case 'UserPlus': return <UserPlus {...props} />;
    case 'FilePlus2': return <FilePlus2 {...props} />;
    case 'FolderOpen': return <FolderOpen {...props} />;
    case 'FileText': return <FileText {...props} />;
    case 'ClipboardList': return <ClipboardList {...props} />;
    case 'ArrowRightLeft': return <ArrowRightLeft {...props} />;
    case 'Upload': return <Upload {...props} />;
    case 'Calendar': return <Calendar {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'Wrench': return <Wrench {...props} />;
    case 'Building2': return <Building2 {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Truck': return <Truck {...props} />;
    case 'Building': return <Building {...props} />;
    case 'Shield': return <Shield {...props} />;
    case 'ScrollText': return <ScrollText {...props} />;
    case 'BarChart3': return <BarChart3 {...props} />;
    case 'Layers': return <Layers {...props} />;
    default: return <Layers {...props} />;
  }
}

export default function RoleNavigationManager() {
  const { roleNavigationConfig, updateRoleNavigation, resetRoleNavigation, addAuditLog } = useData();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>('Medical Officer');
  const [localDraft, setLocalDraft] = useState<RoleNavigationConfig>(() => ({
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
      toast.info('Super Admin retains full system visibility across all modules.');
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
    setLocalDraft((prev) => {
      setHasChanges(true);
      return {
        ...prev,
        [selectedRole]: ALL_NAV_MODULES.map((m) => m.id),
      };
    });
  };

  const handleDeselectAllForRole = () => {
    if (selectedRole === 'Super Admin') return;
    setLocalDraft((prev) => {
      setHasChanges(true);
      return {
        ...prev,
        [selectedRole]: ['dashboard'], // keep dashboard
      };
    });
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

    toast.success(`Saved sidebar navigation permissions for ${selectedRole}.`);
  };

  const handleResetRole = async () => {
    if (!currentUser) return;
    const defaultList = DEFAULT_ROLE_NAV_CONFIG[selectedRole] || [];
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

    toast.info(`Reset ${selectedRole} navigation to default.`);
  };

  const handleResetAll = async () => {
    if (!currentUser) return;
    resetRoleNavigation();
    setLocalDraft({ ...DEFAULT_ROLE_NAV_CONFIG });
    setHasChanges(false);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'SETTINGS_UPDATE',
      target: `rbac/navigation/all`,
      details: `Reset all role sidebar permissions to factory defaults.`,
      timestamp: new Date().toISOString(),
    });

    toast.info('Reset all roles to default permissions.');
  };

  // Group modules by category
  const categorizedModules = useMemo(() => {
    const map: Record<string, NavModuleDefinition[]> = {};
    CATEGORIES.forEach((c) => {
      map[c] = ALL_NAV_MODULES.filter((m) => m.category === c);
    });
    return map;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="card p-5 bg-white border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0F4C42]" />
              <span>Role-Based Navigation &amp; Sidebar Access Control (RBAC)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control exactly which operational modules, diagnostic workspaces, and pages appear in the sidebar for each clinical role.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="btn-secondary text-xs text-slate-600 border-slate-300 hover:bg-slate-100"
              title="Reset all roles to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Roles</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges}
              className={`btn-primary text-xs flex items-center gap-1.5 px-4 py-2 ${
                hasChanges ? 'bg-[#0F4C42] hover:bg-[#0c3c34]' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{hasChanges ? 'Save Changes' : 'Saved'}</span>
            </button>
          </div>
        </div>

        {/* Role Selector Strip */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Target Role:
          </span>
          {MANAGED_ROLES.map((role) => {
            const isSelected = selectedRole === role;
            const count = (localDraft[role] || []).length;
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setSelectedRole(role);
                  setHasChanges(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F4C42] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{role}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Modules on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module Configuration List (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Controls Bar for Selected Role */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                Active Role: <span className="text-[#0F4C42]">{selectedRole}</span>
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600">
                <strong>{activeKeys.length}</strong> of {ALL_NAV_MODULES.length} modules visible
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllForRole}
                className="text-[11px] font-semibold text-[#0F4C42] hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleDeselectAllForRole}
                className="text-[11px] font-semibold text-slate-600 hover:underline"
              >
                Clear All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleResetRole}
                className="text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Categorized Module Cards */}
          {CATEGORIES.map((category) => {
            const modules = categorizedModules[category] || [];
            if (modules.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#0F4C42]" />
                  <span>{category}</span>
                  <span className="text-slate-400 text-[11px] font-normal">
                    ({modules.filter((m) => activeKeys.includes(m.id)).length} / {modules.length} enabled)
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modules.map((mod) => {
                    const isEnabled = activeKeys.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isEnabled
                            ? 'bg-white border-[#0F4C42] ring-1 ring-[#0F4C42]/20 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100 hover:bg-white'
                        }`}
                      >
                        {/* Checkbox Icon */}
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isEnabled ? 'bg-[#0F4C42] text-white' : 'border border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* Details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-600">{getModuleIcon(mod.iconName)}</span>
                              <span className="font-bold text-xs text-slate-900 truncate">{mod.label}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">{mod.defaultPath}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Sidebar Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-4 bg-white border border-slate-200 rounded-xl space-y-3 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#0F4C42]" />
                <span>Live Sidebar Preview</span>
              </h3>
              <span className="text-[11px] font-semibold text-[#0F4C42] bg-emerald-50 px-2 py-0.5 rounded">
                {selectedRole}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              This preview shows exactly how the navigation menu appears for users signed in as <strong>{selectedRole}</strong>.
            </p>

            {/* Mock Sidebar Canvas */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 space-y-1 max-h-[500px] overflow-y-auto">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Navigation Menu
              </div>

              {activeKeys.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No modules enabled for this role.
                </div>
              ) : (
                ALL_NAV_MODULES.filter((m) => activeKeys.includes(m.id)).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white border border-slate-100 text-xs font-medium text-slate-800 shadow-2xs"
                  >
                    <span className="text-[#0F4C42]">{getModuleIcon(m.iconName)}</span>
                    <span className="truncate">{m.label}</span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Changes saved here take effect immediately across all active browser sessions and tabs for this role.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
