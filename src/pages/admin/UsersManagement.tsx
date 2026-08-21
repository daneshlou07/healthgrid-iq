import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { User, UserRole, HealthcareOrganizationType, Clinic } from '../../types';
import Modal from '../../components/ui/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Radio,
  Stethoscope,
  FileText,
  Sparkles,
  Building2,
  UserCheck,
  Users,
  Wrench,
  Layers,
  Hospital,
} from 'lucide-react';
import { saveUser, sanitizeUserRole } from '../../services/dataService';
import RoleNavigationManager from '../../components/admin/RoleNavigationManager';

const ROLES: UserRole[] = [
  'Medical Officer',
  'Radiographer',
  'Radiologist',
  'Administrator',
  'BEMS Officer',
  'Super Admin',
];

const ORGANIZATION_TYPES: HealthcareOrganizationType[] = [
  'Klinik Kesihatan',
  'Public Hospital',
  'Private Hospital',
];

type AccountStatusFilter = 'all' | 'active' | 'inactive' | 'deleted';

interface TrackedAccount extends User {
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  trashItemId?: string;
}

export default function UsersManagement() {
  const { currentUser, impersonateUser } = useAuth();
  const {
    users,
    setUsers,
    clinics,
    trash,
    softDelete,
    restoreFromTrash,
    addAuditLog,
  } = useData();

  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    organizationType?: HealthcareOrganizationType;
    healthcareCenterId: string;
    specialty: string;
    shift: string;
    password?: string;
  }>({
    name: '',
    email: '',
    role: 'Medical Officer',
    organizationType: 'Klinik Kesihatan',
    healthcareCenterId: '',
    specialty: '',
    shift: 'Day',
    password: 'Password123!',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
    role: string;
    orgType?: string;
    center?: string;
  } | null>(null);

  const isMasterAdmin =
    currentUser?.email === 'daneshlou05@gmail.com' ||
    currentUser?.role === 'Super Admin';

  const isSuperOrMaster =
    currentUser?.role === 'Super Admin' || isMasterAdmin;

  const allowedCreationRoles: UserRole[] = isSuperOrMaster
    ? [
      'Medical Officer',
      'Radiographer',
      'Radiologist',
      'Administrator',
      'BEMS Officer',
      'Super Admin',
    ]
    : [
      'Medical Officer',
      'Radiographer',
      'Radiologist',
      'Administrator',
    ];

  // =========================================================
  // ACCOUNT REGISTRY
  // =========================================================

  const deletedAccounts: TrackedAccount[] = useMemo(() => {
    const seen = new Set<string>();
    const list: TrackedAccount[] = [];
    (trash || [])
      .filter((item) => item.type === 'user' && item.data)
      .forEach((item) => {
        const uid = item.data.id || item.data.email;
        if (!seen.has(uid)) {
          seen.add(uid);
          const sanitized = sanitizeUserRole(item.data);
          list.push({
            ...sanitized,
            isDeleted: true,
            deletedAt: item.deletedAt,
            deletedBy: item.deletedBy,
            trashItemId: item.id,
            status: 'inactive' as const,
          });
        }
      });
    return list;
  }, [trash]);

  const deletedUserIds = useMemo(
    () => new Set(deletedAccounts.map((a) => a.id)),
    [deletedAccounts]
  );

  const activeAndInactiveAccounts: TrackedAccount[] = useMemo(() => {
    return (users || [])
      .filter((u) => !deletedUserIds.has(u.id))
      .map((u) => ({
        ...sanitizeUserRole(u),
        isDeleted: false,
      }));
  }, [users, deletedUserIds]);

  const allAccounts: TrackedAccount[] = useMemo(() => [
    ...activeAndInactiveAccounts,
    ...deletedAccounts,
  ], [activeAndInactiveAccounts, deletedAccounts]);

  // =========================================================
  // VISIBILITY / PERMISSIONS
  // =========================================================

  const visibleAccounts = allAccounts.filter((u) => {
    // Master Admin root system account is always hidden from User Management list
    if (
      u.email === 'daneshlou05@gmail.com' ||
      u.id === 'admin-master'
    ) {
      return false;
    }

    // Standard Administrators cannot see Super Admin
    if (!isSuperOrMaster && u.role === 'Super Admin') {
      return false;
    }

    return true;
  });

  // =========================================================
  // FILTERING
  // =========================================================

  const filteredAccounts = visibleAccounts.filter((u) => {
    // Status
    if (statusFilter === 'deleted') {
      if (!u.isDeleted) return false;
    } else {
      if (u.isDeleted) return false;
      if (statusFilter === 'active' && u.status !== 'active') return false;
      if (statusFilter === 'inactive' && u.status !== 'inactive') return false;
    }

    // Role
    if (roleFilter !== 'all') {
      if (u.role !== roleFilter) return false;
    }

    // Organization Type
    if (orgTypeFilter !== 'all') {
      if (u.organizationType !== orgTypeFilter) return false;
    }

    // Healthcare Center
    if (centerFilter !== 'all') {
      const uCenter = u.healthcareCenterId || u.deploymentLocationId;
      if (uCenter !== centerFilter) return false;
    }

    // Shift
    if (shiftFilter !== 'all') {
      const accShift = u.shift || (u.role === 'Super Admin' || u.role === 'BEMS Officer' ? '' : 'Day');
      if (accShift !== shiftFilter) return false;
    }

    // Search
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const centerName = clinics.find((c) => c.id === (u.healthcareCenterId || u.deploymentLocationId))?.name || '';

    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.organizationType && u.organizationType.toLowerCase().includes(q)) ||
      centerName.toLowerCase().includes(q) ||
      (u.specialty && u.specialty.toLowerCase().includes(q))
    );
  });

  // =========================================================
  // STATISTICS & DYNAMIC ROLE COUNTS
  // =========================================================

  const trackedAccountsForStats = visibleAccounts;

  const totalAccountsEver = trackedAccountsForStats.length;

  const activeCount = trackedAccountsForStats.filter(
    (u) => !u.isDeleted && u.status === 'active'
  ).length;

  const inactiveCount = trackedAccountsForStats.filter(
    (u) => !u.isDeleted && u.status === 'inactive'
  ).length;

  const deletedCount = trackedAccountsForStats.filter((u) => u.isDeleted).length;

  // Accounts filtered by current status tab for real-time synchronized card counts
  const accountsForRoleCounts = useMemo(() => {
    return visibleAccounts.filter((u) => {
      if (statusFilter === 'active') return !u.isDeleted && u.status === 'active';
      if (statusFilter === 'inactive') return !u.isDeleted && u.status === 'inactive';
      if (statusFilter === 'deleted') return u.isDeleted;
      return !u.isDeleted;
    });
  }, [visibleAccounts, statusFilter]);

  const countForRole = (roleKey: UserRole) => {
    return accountsForRoleCounts.filter((u) => u.role === roleKey).length;
  };

  // =========================================================
  // CREATE
  // =========================================================

  const openCreate = () => {
    setEditingUser(null);
    const initialOrgType: HealthcareOrganizationType = 'Klinik Kesihatan';
    const defaultCenter = clinics.find((c) => resolveClinicOrgType(c) === initialOrgType);
    setForm({
      name: '',
      email: '',
      role: 'Medical Officer',
      organizationType: initialOrgType,
      healthcareCenterId: defaultCenter?.id || clinics[0]?.id || '',
      specialty: '',
      shift: 'Day',
      password: 'Password123!',
    });
    setShowModal(true);
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let res = 'Pass!';
    for (let i = 0; i < 5; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({
      ...prev,
      password: res,
    }));
  };

  // =========================================================
  // EDIT
  // =========================================================

  const openEdit = (user: User) => {
    if (!isSuperOrMaster && user.role === 'Super Admin') {
      toast.error('Administrators cannot modify Super Admin accounts.');
      return;
    }

    setEditingUser(user);

    const userCenterId = user.healthcareCenterId || user.deploymentLocationId || '';
    const center = clinics.find((c) => c.id === userCenterId);
    const resolvedOrgType = user.organizationType || (center ? resolveClinicOrgType(center) : undefined);
    const sanitized = sanitizeUserRole(user);

    setForm({
      name: user.name,
      email: user.email,
      role: sanitized.role,
      organizationType: resolvedOrgType,
      healthcareCenterId: userCenterId,
      specialty: user.specialty || '',
      shift: user.shift || 'Day',
      password: user.password || 'Password123!',
    });

    setShowModal(true);
  };

  // =========================================================
  // SAVE USER
  // =========================================================

  const handleSave = async () => {
    if (!currentUser) return;

    if (!allowedCreationRoles.includes(form.role)) {
      toast.error('You do not have permission to create or assign this role.');
      return;
    }

    const selectedCenter = clinics.find((c) => c.id === form.healthcareCenterId);
    const resolvedCenterName = selectedCenter ? selectedCenter.name : undefined;
    const resolvedOrgType = (form.role === 'Super Admin' || form.role === 'BEMS Officer')
      ? undefined
      : (form.organizationType || (selectedCenter ? resolveClinicOrgType(selectedCenter) : undefined));

    // EDIT
    if (editingUser) {
      const idx = users.findIndex((u) => u.id === editingUser.id);
      const baseUser = idx !== -1 ? users[idx] : editingUser;

      const updated: User = {
        ...baseUser,
        name: form.name,
        email: form.email,
        role: form.role,
        organizationType: resolvedOrgType,
        healthcareCenterId: form.healthcareCenterId || undefined,
        healthcareCenterName: resolvedCenterName,
        deploymentLocationId: form.healthcareCenterId || undefined,
        password: form.password,
        specialty: form.specialty || undefined,
        shift: form.shift || undefined,
      };

      if (idx !== -1) {
        const next = [...users];
        next[idx] = updated;
        setUsers(next);
      } else {
        setUsers([updated, ...users]);
      }

      await saveUser(updated);

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'UPDATE_USER',
        target: `users/${updated.id}`,
        details: `Updated account ${updated.name} (${updated.role}) - ${updated.organizationType || 'Platform'} / ${updated.healthcareCenterName || 'Central'}`,
        timestamp: new Date().toISOString(),
      });

      toast.success(`Account ${updated.name} updated successfully.`);
      setShowModal(false);
      return;
    }

    // CREATE
    const rolePrefix =
      form.role === 'Medical Officer'
        ? 'mo'
        : form.role === 'Radiographer'
          ? 'rad'
          : form.role === 'Radiologist'
            ? 'radlog'
            : form.role === 'BEMS Officer'
              ? 'bems'
              : form.role === 'Super Admin'
                ? 'superadmin'
                : 'admin';

    const newUser: User = {
      id: `${rolePrefix}-${Date.now().toString().slice(-4)}`,
      name: form.name,
      email: form.email,
      role: form.role,
      organizationType: resolvedOrgType,
      healthcareCenterId: form.healthcareCenterId || undefined,
      healthcareCenterName: resolvedCenterName,
      deploymentLocationId: form.healthcareCenterId || undefined,
      specialty: form.specialty || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      shift: form.shift || 'Day',
      leaveStatus: 'Active',
      password: form.password,
    };

    setUsers([newUser, ...users]);
    await saveUser(newUser);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CREATE_USER',
      target: `users/${newUser.id}`,
      details: `Provisioned new ${newUser.role} account for ${newUser.name} at ${newUser.organizationType || 'Platform'} (${newUser.healthcareCenterName || 'Central'})`,
      timestamp: new Date().toISOString(),
    });

    setCreatedCredentials({
      name: newUser.name,
      email: newUser.email,
      pass: form.password || 'Password123!',
      role: newUser.role,
      orgType: newUser.organizationType,
      center: newUser.healthcareCenterName,
    });

    // Automatically focus directory on the newly created role and clear conflicting filters
    setStatusFilter('all');
    setRoleFilter(newUser.role);
    setOrgTypeFilter('all');
    setCenterFilter('all');
    setShiftFilter('all');
    setSearch('');

    toast.success(`New ${newUser.role} account created.`);
    setShowModal(false);
  };

  // =========================================================
  // TOGGLE STATUS
  // =========================================================

  const toggleStatus = async (user: User) => {
    if (!currentUser) return;

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const updated = { ...user, status: nextStatus as 'active' | 'inactive' };

    setUsers(users.map((u) => (u.id === user.id ? updated : u)));
    await saveUser(updated);

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'UPDATE_USER_STATUS',
      target: `users/${user.id}`,
      details: `Changed status of ${user.name} to ${nextStatus}`,
      timestamp: new Date().toISOString(),
    });

    toast.info(`Account status updated to ${nextStatus}.`);
  };

  // =========================================================
  // DELETE (SOFT DELETE TO TRASH)
  // =========================================================

  const handleDelete = async (user: User) => {
    if (!currentUser) return;

    if (user.id === currentUser.id) {
      toast.error('You cannot delete your own logged-in account.');
      return;
    }

    if (user.email === 'daneshlou05@gmail.com' || user.id === 'admin-master') {
      toast.error('Master Admin account is protected and cannot be deleted.');
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to archive / delete account "${user.name}" (${user.role})?\n\nThis account will be moved to the Recycle Bin and can be restored.`
    );
    if (!ok) return;

    softDelete('user', user.id, currentUser.name);
    setUsers(users.filter((u) => u.id !== user.id));

    toast.success(`Account ${user.name} moved to Recycle Bin.`);
  };

  // =========================================================
  // RESTORE ACCOUNT
  // =========================================================

  const handleRestore = async (account: TrackedAccount) => {
    if (!account.trashItemId) {
      toast.error('Could not locate trash item record to restore.');
      return;
    }

    try {
      await restoreFromTrash(account.trashItemId);
      toast.success(`Account ${account.name} restored successfully.`);
    } catch {
      toast.error('Failed to restore account from trash.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
    setOrgTypeFilter('all');
    setCenterFilter('all');
    setShiftFilter('all');
  };

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'all' ||
    roleFilter !== 'all' ||
    orgTypeFilter !== 'all' ||
    centerFilter !== 'all' ||
    shiftFilter !== 'all';

  const resolveClinicOrgType = (c: Clinic): HealthcareOrganizationType => {
    if (c.organizationType) return c.organizationType;
    const lower = (c.name || '').toLowerCase();
    if (lower.includes('kpj') || lower.includes('sunway') || lower.includes('private') || lower.includes('specialist')) return 'Private Hospital';
    if (lower.includes('hospital') || lower.includes('hkl')) return 'Public Hospital';
    return 'Klinik Kesihatan';
  };

  // Clinics filtered strictly by current form organizationType in modal
  const formEligibleClinics = useMemo(() => {
    if (!form.organizationType) return clinics;
    return clinics.filter((c) => resolveClinicOrgType(c) === form.organizationType);
  }, [clinics, form.organizationType]);

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER & ACTIONS
      ====================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            User Management & Access Governance
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Manage system roles, organization types, and healthcare center affiliations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* =====================================================
          TABS: DIRECTORY VS PERMISSION MATRIX
      ====================================================== */}
      <div className="flex border-b border-surface-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'accounts'
            ? 'border-[#0F4C42] text-[#0F4C42]'
            : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
        >
          <Users className="w-4 h-4" />
          User Directory ({visibleAccounts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'permissions'
            ? 'border-[#0F4C42] text-[#0F4C42]'
            : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
        >
          <Layers className="w-4 h-4" />
          Role Permission Matrix
        </button>
      </div>

      {activeTab === 'permissions' ? (
        <RoleNavigationManager />
      ) : (
        <>
          {/* =====================================================
              CREDENTIAL NOTIFICATION BANNER
          ====================================================== */}
          {createdCredentials && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm">
                    Account Created: {createdCredentials.name}
                  </span>
                  <span className="badge-info text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                    {createdCredentials.role}
                  </span>
                  {createdCredentials.orgType && (
                    <span className="badge-neutral text-xs">
                      {createdCredentials.orgType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-800">
                  Email: <span className="font-mono font-semibold">{createdCredentials.email}</span> |
                  Healthcare Center: <span className="font-semibold">{createdCredentials.center || 'Platform / Central'}</span> |
                  Temp Password: <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold">{createdCredentials.pass}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* =====================================================
              TOP QUICK ROLE CARDS (6 ROLES ONLY)
          ====================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Medical Officer */}
            <button
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Medical Officer' ? 'all' : 'Medical Officer')}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Medical Officer'
                ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-600 truncate">Medical Officer</p>
                <p className="text-lg font-bold text-emerald-700">{countForRole('Medical Officer')}</p>
              </div>
            </button>

            {/* Radiographer */}
            <button
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Radiographer' ? 'all' : 'Radiographer')}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Radiographer'
                ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-600 truncate">Radiographer</p>
                <p className="text-lg font-bold text-sky-700">{countForRole('Radiographer')}</p>
              </div>
            </button>

            {/* Radiologist */}
            <button
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Radiologist' ? 'all' : 'Radiologist')}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Radiologist'
                ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-600 truncate">Radiologist</p>
                <p className="text-lg font-bold text-purple-700">{countForRole('Radiologist')}</p>
              </div>
            </button>

            {/* Administrator */}
            <button
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Administrator' ? 'all' : 'Administrator')}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Administrator'
                ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-600 truncate">Administrator</p>
                <p className="text-lg font-bold text-amber-700">{countForRole('Administrator')}</p>
              </div>
            </button>

            {/* BEMS Officer */}
            <button
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'BEMS Officer' ? 'all' : 'BEMS Officer')}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'BEMS Officer'
                ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-600 truncate">BEMS Officer</p>
                <p className="text-lg font-bold text-orange-700">{countForRole('BEMS Officer')}</p>
              </div>
            </button>

            {/* Super Admin */}
            <button
              type="button"
              onClick={() => setRoleFilter(roleFilter === 'Super Admin' ? 'all' : 'Super Admin')}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Super Admin'
                ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-surface-600 truncate">Super Admin</p>
                <p className="text-lg font-bold text-blue-700">{countForRole('Super Admin')}</p>
              </div>
            </button>
          </div>

          {/* =====================================================
              FILTER PANEL
          ====================================================== */}
          <div className="card p-4 space-y-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  Status
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'all'
                    ? 'bg-[#0F4C42] text-white'
                    : 'text-surface-600 hover:bg-surface-100'
                    }`}
                >
                  All ({totalAccountsEver})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-surface-600 hover:bg-surface-100'
                    }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'inactive'
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-surface-600 hover:bg-surface-100'
                    }`}
                >
                  Inactive ({inactiveCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('deleted')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'deleted'
                    ? 'bg-red-100 text-red-800'
                    : 'text-surface-600 hover:bg-surface-100'
                    }`}
                >
                  Archived / Deleted ({deletedCount})
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs font-semibold text-surface-500 hover:text-navy-700 hover:bg-surface-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Dropdown Filters & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users, email, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="all">All Roles</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r} ({countForRole(r)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Organization Type Filter */}
              <div>
                <select
                  value={orgTypeFilter}
                  onChange={(e) => {
                    setOrgTypeFilter(e.target.value);
                    if (e.target.value !== 'all' && centerFilter !== 'all') {
                      const c = clinics.find((cl) => cl.id === centerFilter);
                      if (c && c.organizationType !== e.target.value) {
                        setCenterFilter('all');
                      }
                    }
                  }}
                  className="select-field text-xs"
                >
                  <option value="all">All Organization Types</option>
                  {ORGANIZATION_TYPES.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              {/* Healthcare Center Filter */}
              <div>
                <select
                  value={centerFilter}
                  onChange={(e) => setCenterFilter(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="all">All Healthcare Centers</option>
                  {clinics
                    .filter((c) => orgTypeFilter === 'all' || c.organizationType === orgTypeFilter)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Shift Filter */}
              <div>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="select-field text-xs"
                >
                  <option value="all">All Shifts</option>
                  <option value="Day">Day / Standard (08:00 – 17:00)</option>
                  <option value="Morning">Morning Shift (07:30 – 14:30)</option>
                  <option value="Evening">Evening Shift (14:00 – 21:30)</option>
                  <option value="Night">Night Shift / On-Call (21:00 – 08:00)</option>
                  <option value="Extended">Extended Hours (08:00 – 21:30)</option>
                </select>
              </div>
            </div>
          </div>

          {/* =====================================================
              ACCOUNT TABLE & MOBILE CARD LIST
          ====================================================== */}
          {/* Mobile Card List (< md screens) */}
          <div className="block md:hidden space-y-3">
            {filteredAccounts.length === 0 ? (
              <div className="card p-8 text-center text-surface-400 text-xs">
                No accounts match the selected criteria.
              </div>
            ) : (
              filteredAccounts.map((account) => {
                const clinic = clinics.find(
                  (c) => c.id === (account.healthcareCenterId || account.deploymentLocationId)
                );
                const displayOrgType = account.organizationType || clinic?.organizationType || (
                  account.role === 'Super Admin' || account.role === 'BEMS Officer' ? 'Central / Platform' : '—'
                );
                const displayCenter = clinic ? clinic.name : (
                  account.healthcareCenterName || (account.role === 'Super Admin' || account.role === 'BEMS Officer' ? 'Platform / Central' : '—')
                );

                return (
                  <div key={account.id} className="card p-4 space-y-3 border-surface-200">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-surface-900 text-xs">{account.name}</p>
                        <p className="text-[11px] text-surface-500 font-mono">{account.email}</p>
                        <p className="text-[10px] font-mono text-surface-400 mt-0.5">ID: {account.id}</p>
                      </div>
                      <span
                        className={`badge-info text-[10px] font-semibold shrink-0 ${
                          account.role === 'Super Admin'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : account.role === 'Administrator'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : account.role === 'Radiologist'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : account.role === 'Medical Officer'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : account.role === 'BEMS Officer'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {account.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-100">
                      <div>
                        <span className="text-[10px] text-surface-400 block">Organization</span>
                        <span className="font-medium text-surface-700">{displayOrgType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-surface-400 block">Facility / Center</span>
                        <span className="font-medium text-surface-700 truncate block">{displayCenter}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-surface-400 block">Shift</span>
                        <span className="font-medium text-surface-700">{account.shift || 'Day (08:00–17:00)'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-surface-400 block">Status</span>
                        {account.isDeleted ? (
                          <span className="badge-error text-[10px]">Archived</span>
                        ) : (
                          <span className={account.status === 'active' ? 'badge-success text-[10px]' : 'badge-warning text-[10px]'}>
                            {account.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-surface-100 flex items-center justify-end gap-1.5">
                      {!account.isDeleted ? (
                        <>
                          {isSuperOrMaster && account.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                impersonateUser(account.id, account);
                                toast.success(`Switched account view to ${account.name} (${account.role})`);
                              }}
                              className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 rounded text-xs font-semibold flex items-center gap-1 border border-emerald-200"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Switch View</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            className="p-1.5 text-surface-500 hover:bg-slate-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(account)}
                            className="p-1.5 text-surface-500 hover:bg-slate-100 rounded"
                            title="Toggle Status"
                          >
                            {account.status === 'active' ? (
                              <ShieldOff className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(account)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(account)}
                          className="btn-secondary text-xs py-1 px-3 flex items-center gap-1 text-emerald-700 border-emerald-200"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Table (md+ screens) */}
          <div className="hidden md:block card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <th className="table-header">Account ID</th>
                    <th className="table-header">Name &amp; Email</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Organization Type</th>
                    <th className="table-header">Healthcare Center</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Shift</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-surface-200">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-surface-400 text-sm">
                        No accounts match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => {
                      const clinic = clinics.find(
                        (c) => c.id === (account.healthcareCenterId || account.deploymentLocationId)
                      );
                      const displayOrgType = account.organizationType || clinic?.organizationType || (
                        account.role === 'Super Admin' || account.role === 'BEMS Officer' ? 'Central / Platform' : '—'
                      );
                      const displayCenter = clinic ? clinic.name : (
                        account.healthcareCenterName || (account.role === 'Super Admin' || account.role === 'BEMS Officer' ? 'Platform / Central' : '—')
                      );

                      return (
                        <tr
                          key={account.id}
                          className={`hover:bg-surface-100 transition-colors ${account.isDeleted ? 'bg-red-50/20' : ''
                            }`}
                        >
                          {/* Account ID */}
                          <td className="table-cell font-mono text-[11px] font-bold text-surface-600 whitespace-nowrap">
                            {account.id}
                          </td>

                          {/* Name & Email */}
                          <td className="table-cell">
                            <div>
                              <p className="font-semibold text-surface-800 text-xs">
                                {account.name}
                              </p>
                              <p className="text-[11px] text-surface-500 font-mono">
                                {account.email}
                              </p>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="table-cell">
                            <span
                              className={`badge-info text-[10px] font-semibold ${account.role === 'Super Admin'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : account.role === 'Administrator'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : account.role === 'Radiologist'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : account.role === 'Medical Officer'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : account.role === 'BEMS Officer'
                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                }`}
                            >
                              {account.role}
                            </span>
                          </td>

                          {/* Organization Type */}
                          <td className="table-cell">
                            <span
                              className={`badge-neutral text-[10px] font-medium ${displayOrgType === 'Klinik Kesihatan'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : displayOrgType === 'Public Hospital'
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : displayOrgType === 'Private Hospital'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                            >
                              {displayOrgType}
                            </span>
                          </td>

                          {/* Healthcare Center */}
                          <td className="table-cell text-xs text-surface-700 font-medium">
                            {displayCenter}
                          </td>

                          {/* Status */}
                          <td className="table-cell">
                            {account.isDeleted ? (
                              <div className="flex flex-col">
                                <span className="badge-error text-[10px] w-fit">
                                  Archived / Deleted
                                </span>
                                {account.deletedAt && (
                                  <span className="text-[9px] text-surface-400 mt-0.5">
                                    {new Date(account.deletedAt).toLocaleDateString()} ({account.deletedBy || 'System'})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span
                                className={
                                  account.status === 'active'
                                    ? 'badge-success text-[10px]'
                                    : 'badge-warning text-[10px]'
                                }
                              >
                                {account.status}
                              </span>
                            )}
                          </td>

                          {/* Shift */}
                          <td className="table-cell text-xs text-surface-600 whitespace-nowrap">
                            {account.role === 'Super Admin' || account.role === 'BEMS Officer' ? (
                              <span className="text-surface-400">—</span>
                            ) : account.shift === 'Morning' ? (
                              'Morning (07:30–14:30)'
                            ) : account.shift === 'Evening' ? (
                              'Evening (14:00–21:30)'
                            ) : account.shift === 'Night' ? (
                              'Night (21:00–08:00)'
                            ) : account.shift === 'Extended' ? (
                              'Extended (08:00–21:30)'
                            ) : (
                              'Day (08:00–17:00)'
                            )}
                          </td>

                          {/* Actions */}
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!account.isDeleted ? (
                                <>
                                  {isSuperOrMaster && account.id !== currentUser?.id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        impersonateUser(account.id, account);
                                        toast.success(`Switched account view to ${account.name} (${account.role})`);
                                      }}
                                      className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
                                      title={`Switch view to this account: ${account.name}`}
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openEdit(account)}
                                    className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors"
                                    title="Edit Account"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleStatus(account)}
                                    className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors"
                                    title={`Mark as ${account.status === 'active' ? 'Inactive' : 'Active'}`}
                                  >
                                    {account.status === 'active' ? (
                                      <ShieldOff className="w-3.5 h-3.5 text-amber-500" />
                                    ) : (
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(account)}
                                    className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Archive / Delete Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(account)}
                                  className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                                  title="Restore Account"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =====================================================
          CREATE / EDIT MODAL
      ====================================================== */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User Account' : 'Create New Account'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Full Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="e.g. Dr. Aisyah Rahim"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="user@healthgrid.my"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => {
                  const nextRole = e.target.value as UserRole;
                  setForm({
                    ...form,
                    role: nextRole,
                    // If switching to platform roles, reset center
                    healthcareCenterId: (nextRole === 'Super Admin' || nextRole === 'BEMS Officer') ? '' : form.healthcareCenterId,
                  });
                }}
                className="select-field"
              >
                {allowedCreationRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization Type (Visible for center-level roles) */}
            {form.role !== 'Super Admin' && form.role !== 'BEMS Officer' && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Organization Type *
                </label>
                <select
                  value={form.organizationType || 'Klinik Kesihatan'}
                  onChange={(e) => {
                    const newOrgType = e.target.value as HealthcareOrganizationType;
                    // Auto-select first center matching this org type
                    const firstMatchingCenter = clinics.find((c) => resolveClinicOrgType(c) === newOrgType);
                    let nextShift = form.shift;
                    if (newOrgType === 'Klinik Kesihatan') {
                      if (nextShift !== 'Day' && nextShift !== 'Extended') {
                        nextShift = 'Day';
                      }
                    } else {
                      if (nextShift === 'Extended') {
                        nextShift = 'Morning';
                      }
                    }
                    setForm({
                      ...form,
                      organizationType: newOrgType,
                      healthcareCenterId: firstMatchingCenter?.id || '',
                      shift: nextShift,
                    });
                  }}
                  className="select-field"
                >
                  {ORGANIZATION_TYPES.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Healthcare Center (Cascading strictly based on Organization Type) */}
            {form.role !== 'Super Admin' && form.role !== 'BEMS Officer' && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Healthcare Center *
                </label>
                <select
                  value={form.healthcareCenterId}
                  onChange={(e) => {
                    const centerId = e.target.value;
                    const c = clinics.find((item) => item.id === centerId);
                    setForm({
                      ...form,
                      healthcareCenterId: centerId,
                      organizationType: c ? resolveClinicOrgType(c) : form.organizationType,
                    });
                  }}
                  className="select-field"
                >
                  <option value="">
                    {formEligibleClinics.length > 0
                      ? `Select ${form.organizationType || 'Healthcare Center'}...`
                      : `No ${form.organizationType || 'Centers'} Registered`}
                  </option>
                  {formEligibleClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {formEligibleClinics.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    No healthcare center classified as "{form.organizationType}" is registered yet. Add one in Healthcare Management first.
                  </p>
                )}
              </div>
            )}

            {/* Shift (Context-Aware based on Facility & Organization Type) */}
            {form.role !== 'Super Admin' && form.role !== 'BEMS Officer' && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Shift / Duty Roster
                </label>
                <select
                  value={form.shift || 'Day'}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  className="select-field"
                >
                  {form.organizationType === 'Klinik Kesihatan' ? (
                    <>
                      <option value="Day">Day / Standard Hours (08:00 – 17:00)</option>
                      <option value="Extended">Extended Hours (08:00 – 21:30)</option>
                    </>
                  ) : (
                    <>
                      <option value="Morning">Morning Shift (07:30 – 14:30)</option>
                      <option value="Evening">Evening Shift (14:00 – 21:30)</option>
                      <option value="Night">Night Shift / On-Call (21:00 – 08:00)</option>
                      <option value="Day">Day / General (08:00 – 17:00)</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Specialty */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Specialty / Department
              </label>
              <input
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="input-field"
                placeholder="e.g., Diagnostic Radiology, Family Medicine, Emergency"
              />
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Initial Account Password *
              </label>
              <div className="flex items-center gap-2">
                <input
                  required
                  value={form.password || ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field font-mono"
                  placeholder="Account password"
                />
                <button
                  type="button"
                  onClick={generateTempPassword}
                  className="btn-secondary whitespace-nowrap text-xs"
                >
                  Generate Temp
                </button>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                !form.name ||
                !form.email ||
                !form.password ||
                (form.role !== 'Super Admin' && form.role !== 'BEMS Officer' && !form.healthcareCenterId)
              }
              className="btn-primary disabled:opacity-50"
            >
              {editingUser ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}