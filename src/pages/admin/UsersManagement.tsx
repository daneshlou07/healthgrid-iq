import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ux/Toast';
import type { User, UserRole } from '../../types';
import Modal from '../../components/ui/Modal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Download,
  RefreshCw,
  Radio,
  Stethoscope,
  FileText,
  Sparkles,
  Building2,
  UserCheck,
  Users,
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { saveUser } from '../../services/dataService';
import RoleNavigationManager from '../../components/admin/RoleNavigationManager';

const ROLES: UserRole[] = [
  'Medical Officer',
  'Radiographer',
  'Radiologist',
  'Administrator',
  'Super Admin',
  'BEMZ',
  'Private Hospital Admin',
  'Public Hospital Radiographer',
  'Private Hospital Radiographer',
  'Equipment Marketplace',
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
  const [statusFilter, setStatusFilter] =
    useState<AccountStatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [form, setForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    specialty: string;
    shift: string;
    deploymentLocationId: string;
    password?: string;
  }>({
    name: '',
    email: '',
    role: 'Medical Officer' as UserRole,
    specialty: '',
    shift: '',
    deploymentLocationId: '',
    password: 'Password123!',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
    role: string;
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
      'BEMZ',
      'Private Hospital Admin',
      'Public Hospital Radiographer',
      'Private Hospital Radiographer',
      'Equipment Marketplace',
      'Super Admin',
    ]
    : [
      'Medical Officer',
      'Radiographer',
      'Radiologist',
      'BEMZ',
      'Private Hospital Admin',
      'Public Hospital Radiographer',
      'Private Hospital Radiographer',
      'Administrator',
    ];

  // =========================================================
  // ACCOUNT REGISTRY
  // =========================================================

  const activeAndInactiveAccounts: TrackedAccount[] =
    users.map((u) => ({
      ...u,
      isDeleted: false,
    }));

  const deletedAccounts: TrackedAccount[] = trash
    .filter((item) => item.type === 'user' && item.data)
    .map((item) => ({
      ...item.data,
      isDeleted: true,
      deletedAt: item.deletedAt,
      deletedBy: item.deletedBy,
      trashItemId: item.id,
      status: 'inactive' as const,
    }));

  const allAccounts: TrackedAccount[] = [
    ...activeAndInactiveAccounts,
    ...deletedAccounts,
  ];

  // =========================================================
  // VISIBILITY / PERMISSIONS
  // =========================================================

  const visibleAccounts = allAccounts.filter((u) => {
    // Master Admin is hidden from non-master users
    if (
      !isMasterAdmin &&
      (u.email === 'daneshlou05@gmail.com' ||
        u.id === 'admin-002')
    ) {
      return false;
    }

    // Standard Administrators cannot see Admin / Super Admin
    if (
      !isSuperOrMaster &&
      (u.role === 'Administrator' ||
        u.role === 'Super Admin')
    ) {
      return false;
    }

    return true;
  });

  // =========================================================
  // FILTERING
  // =========================================================

  const filteredAccounts = visibleAccounts.filter((u) => {
    // Status
    if (
      statusFilter === 'active' &&
      (u.isDeleted || u.status !== 'active')
    ) {
      return false;
    }

    if (
      statusFilter === 'inactive' &&
      (u.isDeleted || u.status !== 'inactive')
    ) {
      return false;
    }

    if (
      statusFilter === 'deleted' &&
      !u.isDeleted
    ) {
      return false;
    }

    // Role
    if (
      roleFilter !== 'all' &&
      u.role !== roleFilter
    ) {
      return false;
    }

    // Shift
    if (
      shiftFilter !== 'all' &&
      u.shift !== shiftFilter
    ) {
      return false;
    }

    // Search
    const q = search.toLowerCase().trim();

    if (!q) return true;

    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // =========================================================
  // STATISTICS
  // =========================================================

  const trackedAccountsForStats = visibleAccounts;

  const totalAccountsEver =
    trackedAccountsForStats.length;

  const activeCount =
    trackedAccountsForStats.filter(
      (u) =>
        !u.isDeleted &&
        u.status === 'active'
    ).length;

  const inactiveCount =
    trackedAccountsForStats.filter(
      (u) =>
        !u.isDeleted &&
        u.status === 'inactive'
    ).length;

  const deletedCount =
    trackedAccountsForStats.filter(
      (u) => u.isDeleted
    ).length;

  const radiographerCount =
    trackedAccountsForStats.filter(
      (u) => u.role === 'Radiographer'
    ).length;

  const moCount =
    trackedAccountsForStats.filter(
      (u) => u.role === 'Medical Officer'
    ).length;

  const radiologistCount =
    trackedAccountsForStats.filter(
      (u) => u.role === 'Radiologist'
    ).length;

  const adminCount =
    trackedAccountsForStats.filter(
      (u) => u.role === 'Administrator'
    ).length;

  const superAdminCount =
    trackedAccountsForStats.filter(
      (u) => u.role === 'Super Admin'
    ).length;

  // =========================================================
  // EXPORT
  // =========================================================

  const handleExport = () => {
    exportToCSV(
      filteredAccounts.map((u) => ({
        AccountID: u.id,
        Name: u.name,
        Email: u.email,
        Role: u.role,
        LifecycleStatus: u.isDeleted
          ? 'Archived / Deleted'
          : u.status,
        Location:
          clinics.find((c) => c.id === u.deploymentLocationId)?.name ||
          u.deploymentLocationId ||
          'Unassigned',
        Shift: u.shift || '',
        Specialty: u.specialty || '',
        CreatedAt: u.createdAt
          ? new Date(u.createdAt).toLocaleString()
          : '',
        DeletedAt: u.deletedAt
          ? new Date(u.deletedAt).toLocaleString()
          : 'N/A',
        DeletedBy: u.deletedBy || 'N/A',
      })),
      'HealthGrid_Account_Registry_Tracking'
    );

    toast.success(
      'Historical account registry exported to CSV'
    );
  };

  // =========================================================
  // CREATE
  // =========================================================

  const openCreate = () => {
    setEditingUser(null);

    setForm({
      name: '',
      email: '',
      role: 'Medical Officer',
      specialty: '',
      shift: '',
      deploymentLocationId: '',
      password: 'Password123!',
    });

    setShowModal(true);
  };

  const generateTempPassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

    let res = 'Pass!';

    for (let i = 0; i < 5; i++) {
      res += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
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
    if (
      !isSuperOrMaster &&
      (user.role === 'Administrator' ||
        user.role === 'Super Admin')
    ) {
      toast.error(
        'Administrators can only manage Medical Officer, Radiographer, and Radiologist accounts.'
      );

      return;
    }

    setEditingUser(user);

    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      specialty: user.specialty || '',
      shift: user.shift || '',
      deploymentLocationId: user.deploymentLocationId || '',
      password:
        user.password || 'Password123!',
    });

    setShowModal(true);
  };

  // =========================================================
  // SAVE USER
  // =========================================================

  const handleSave = async () => {
    if (!currentUser) return;

    if (!allowedCreationRoles.includes(form.role)) {
      toast.error(
        'Administrators can only provision Medical Officer, Radiographer, and Radiologist accounts.'
      );

      return;
    }

    // EDIT
    if (editingUser) {
      const idx = users.findIndex(
        (u) => u.id === editingUser.id
      );

      if (idx !== -1) {
        const updated = {
          ...users[idx],
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password,
          deploymentLocationId:
            form.deploymentLocationId || undefined,
          specialty:
            form.specialty || undefined,
          shift:
            form.shift || undefined,
        };

        const next = [...users];

        next[idx] = updated;

        setUsers(next);

        await saveUser(updated);

        await addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'USER_UPDATED',
          target: `users/${editingUser.id}`,
          details: `Updated user profile & password: ${form.name} (${form.role})`,
          timestamp:
            new Date().toISOString(),
        });

        toast.success(
          `${form.name} updated and saved to database`
        );
      }
    }

    // CREATE
    else {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: form.name,
        email: form.email,
        role: form.role,
        password:
          form.password || 'Password123!',
        deploymentLocationId:
          form.deploymentLocationId || undefined,
        specialty:
          form.specialty || undefined,
        shift:
          form.shift || undefined,
        status: 'active',
        createdAt:
          new Date().toISOString(),
      };

      const nextUsers = [
        ...users,
        newUser,
      ];

      setUsers(nextUsers);

      await saveUser(newUser);

      await addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'USER_CREATED',
        target: `users/${newUser.id}`,
        details: `Created user account: ${form.name} (${form.role})`,
        timestamp:
          new Date().toISOString(),
      });

      toast.success(
        `${form.name} created successfully`
      );

      setCreatedCredentials({
        name: form.name,
        email: form.email,
        pass:
          form.password ||
          'Password123!',
        role: form.role,
      });
    }

    setShowModal(false);
  };

  // =========================================================
  // ACTIVATE / DEACTIVATE
  // =========================================================

  const toggleStatus = async (user: User) => {
    if (!currentUser) return;

    const newStatus =
      user.status === 'active'
        ? 'inactive'
        : 'active';

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
            ...u,
            status: newStatus,
          }
          : u
      )
    );

    await saveUser({
      ...user,
      status: newStatus,
    });

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action:
        newStatus === 'active'
          ? 'USER_ACTIVATED'
          : 'USER_DEACTIVATED',
      target: `users/${user.id}`,
      details: `${newStatus === 'active'
        ? 'Activated'
        : 'Deactivated'
        } user: ${user.name}`,
      timestamp:
        new Date().toISOString(),
    });

    toast.info(
      `${user.name} ${newStatus === 'active'
        ? 'activated'
        : 'deactivated'
      }`
    );
  };

  // =========================================================
  // ARCHIVE
  // =========================================================

  const deleteUser = async (user: User) => {
    if (!currentUser) return;

    softDelete(
      'user',
      user.id,
      currentUser.name
    );

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'USER_DELETED',
      target: `users/${user.id}`,
      details: `Archived user account: ${user.name}`,
      timestamp:
        new Date().toISOString(),
    });

    toast.success(
      `${user.name} moved to historical account archive`
    );
  };

  // =========================================================
  // RESTORE
  // =========================================================

  const handleRestore = async (
    account: TrackedAccount
  ) => {
    if (
      !currentUser ||
      !account.trashItemId
    ) {
      return;
    }

    restoreFromTrash(
      account.trashItemId
    );

    await addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'USER_RESTORED',
      target: `users/${account.id}`,
      details: `Restored user account from archive: ${account.name}`,
      timestamp:
        new Date().toISOString(),
    });

    toast.success(
      `${account.name} restored to active account registry`
    );
  };

  // =========================================================
  // RESET FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setShiftFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters =
    search !== '' ||
    roleFilter !== 'all' ||
    shiftFilter !== 'all' ||
    statusFilter !== 'all';

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-5">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h1 className="page-title">
            User Management
          </h1>

          <p className="page-subtitle">
            Manage system accounts, roles, access and account status.
          </p>
        </div>

        {activeTab === 'accounts' && (
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Account
            </button>
          </div>
        )}
      </div>

      {/* =====================================================
          ACCOUNT DIRECTORY / ROLE NAVIGATION
      ====================================================== */}

      <div className="space-y-4">

        {/* Workspace Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'accounts'
                ? 'bg-[#0F4C42] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              Staff Accounts
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === 'accounts'
                  ? 'bg-white/15 text-white'
                  : 'bg-slate-100 text-slate-500'
                  }`}
              >
                {filteredAccounts.length}
              </span>
            </button>

            {isSuperOrMaster && (
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === 'permissions'
                  ? 'bg-[#0F4C42] text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Role & Access Control
              </button>
            )}
          </div>

          {activeTab === 'accounts' && (
            <div className="hidden text-[11px] text-slate-400 sm:block">
              {filteredAccounts.length} accounts
            </div>
          )}
        </div>

        {activeTab === 'permissions' ? (
          <RoleNavigationManager />
        ) : (
          <>

            {/* =====================================================
          ROLE DIRECTORY
      ====================================================== */}

            <div className="card p-4">

              <div className="flex flex-col gap-1 mb-4">
                <h2 className="text-sm font-bold text-surface-800">
                  Staff Roles
                </h2>

                <p className="text-[11px] text-surface-500">
                  Select a role to filter the staff directory.
                </p>
              </div>


              {/* ROLE GRID */}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">

                {/* Medical Officer */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'Medical Officer'
                        ? 'all'
                        : 'Medical Officer'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Medical Officer'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Medical Officer
                    </p>

                    <p className="text-lg font-bold text-emerald-700">
                      {moCount}
                    </p>
                  </div>

                </button>


                {/* Radiographer */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'Radiographer'
                        ? 'all'
                        : 'Radiographer'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Radiographer'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Radiographer
                    </p>

                    <p className="text-lg font-bold text-sky-700">
                      {radiographerCount}
                    </p>
                  </div>

                </button>


                {/* Radiologist */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'Radiologist'
                        ? 'all'
                        : 'Radiologist'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Radiologist'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Radiologist
                    </p>

                    <p className="text-lg font-bold text-purple-700">
                      {radiologistCount}
                    </p>
                  </div>

                </button>


                {/* Administrator */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'Administrator'
                        ? 'all'
                        : 'Administrator'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Administrator'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Administrator
                    </p>

                    <p className="text-lg font-bold text-amber-700">
                      {adminCount}
                    </p>
                  </div>

                </button>


                {/* Super Admin */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'Super Admin'
                        ? 'all'
                        : 'Super Admin'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Super Admin'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Super Admin
                    </p>

                    <p className="text-lg font-bold text-blue-700">
                      {superAdminCount}
                    </p>
                  </div>

                </button>


                {/* BEMS */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'BEMZ'
                        ? 'all'
                        : 'BEMZ'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'BEMZ'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      BEMS Officer
                    </p>

                    <p className="text-lg font-bold text-orange-700">
                      {
                        visibleAccounts.filter(
                          (u) => u.role === 'BEMZ'
                        ).length
                      }
                    </p>
                  </div>

                </button>


                {/* Private Hospital Admin */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter === 'Private Hospital Admin'
                        ? 'all'
                        : 'Private Hospital Admin'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter === 'Private Hospital Admin'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Private Hospital Admin
                    </p>

                    <p className="text-lg font-bold text-rose-700">
                      {
                        visibleAccounts.filter(
                          (u) =>
                            u.role ===
                            'Private Hospital Admin'
                        ).length
                      }
                    </p>
                  </div>

                </button>


                {/* Public Hospital Radiographer */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter ===
                        'Public Hospital Radiographer'
                        ? 'all'
                        : 'Public Hospital Radiographer'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter ===
                    'Public Hospital Radiographer'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Public Hospital Radiographer
                    </p>

                    <p className="text-lg font-bold text-cyan-700">
                      {
                        visibleAccounts.filter(
                          (u) =>
                            u.role ===
                            'Public Hospital Radiographer'
                        ).length
                      }
                    </p>
                  </div>

                </button>


                {/* Private Hospital Radiographer */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter ===
                        'Private Hospital Radiographer'
                        ? 'all'
                        : 'Private Hospital Radiographer'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter ===
                    'Private Hospital Radiographer'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Private Hospital Radiographer
                    </p>

                    <p className="text-lg font-bold text-indigo-700">
                      {
                        visibleAccounts.filter(
                          (u) =>
                            u.role ===
                            'Private Hospital Radiographer'
                        ).length
                      }
                    </p>
                  </div>

                </button>


                {/* Equipment Marketplace */}

                <button
                  type="button"
                  onClick={() =>
                    setRoleFilter(
                      roleFilter ===
                        'Equipment Marketplace'
                        ? 'all'
                        : 'Equipment Marketplace'
                    )
                  }
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${roleFilter ===
                    'Equipment Marketplace'
                    ? 'border-[#0F4C42] bg-emerald-50/50 ring-1 ring-[#0F4C42]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >

                  <div className="w-9 h-9 shrink-0 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-surface-600 truncate">
                      Equipment Marketplace
                    </p>

                    <p className="text-lg font-bold text-teal-700">
                      {
                        visibleAccounts.filter(
                          (u) =>
                            u.role ===
                            'Equipment Marketplace'
                        ).length
                      }
                    </p>
                  </div>

                </button>

              </div>


            </div>

            {/* =====================================================
          FILTER PANEL
      ====================================================== */}

            <div className="card p-4">

              {/* Status */}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex flex-wrap items-center gap-1.5">

                  <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Status
                  </span>

                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'all'
                      ? 'bg-[#0F4C42] text-white'
                      : 'text-surface-600 hover:bg-surface-100'
                      }`}
                  >
                    All ({totalAccountsEver})
                  </button>

                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-surface-600 hover:bg-surface-100'
                      }`}
                  >
                    Active ({activeCount})
                  </button>

                  <button
                    onClick={() => setStatusFilter('inactive')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'inactive'
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-surface-600 hover:bg-surface-100'
                      }`}
                  >
                    Inactive ({inactiveCount})
                  </button>

                  <button
                    onClick={() => setStatusFilter('deleted')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === 'deleted'
                      ? 'bg-red-100 text-red-800'
                      : 'text-surface-600 hover:bg-surface-100'
                      }`}
                  >
                    Archived ({deletedCount})
                  </button>

                </div>


                <div className="text-[11px] text-surface-500">
                  Showing{' '}
                  <span className="font-bold text-surface-700">
                    {filteredAccounts.length}
                  </span>{' '}
                  of {visibleAccounts.length} accounts
                </div>

              </div>


              <div className="my-3 border-t border-surface-100" />


              {/* Search / Filters */}

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_150px_auto] gap-2.5">

                <div className="relative min-w-0">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />

                  <input
                    type="text"
                    placeholder="Search by name, email, account ID..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className="input-field !w-full pl-9 pr-9 text-xs py-2.5"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700"
                    >
                      ×
                    </button>
                  )}

                </div>


                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(e.target.value)
                  }
                  className="select-field !w-full text-xs py-2.5 focus:outline-none focus:ring-[#0F4C42]/15 focus:border-[#0F4C42]"
                >
                  <option value="all">
                    All Roles
                  </option>

                  {ROLES.map((role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  ))}

                  <option value="BEMZ">
                    BEMS Officer
                  </option>

                  <option value="Private Hospital Admin">
                    Private Hospital Admin
                  </option>

                  <option value="Public Hospital Radiographer">
                    Public Hospital Radiographer
                  </option>

                  <option value="Private Hospital Radiographer">
                    Private Hospital Radiographer
                  </option>

                </select>


                <select
                  value={shiftFilter}
                  onChange={(e) =>
                    setShiftFilter(e.target.value)
                  }
                  className="select-field !w-full text-xs py-2.5 focus:outline-none focus:ring-[#0F4C42]/15 focus:border-[#0F4C42]"
                >
                  <option value="all">
                    All Shifts
                  </option>

                  <option value="Morning">
                    Morning
                  </option>

                  <option value="Day">
                    Day
                  </option>

                  <option value="Evening">
                    Evening
                  </option>

                  <option value="Night">
                    Night
                  </option>

                </select>


                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-2.5 text-xs font-semibold text-surface-500 hover:text-navy-700 hover:bg-surface-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* =====================================================
          ACCOUNT TABLE
      ====================================================== */}

            <div className="card p-0 overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-surface-200 bg-surface-50">

                      <th className="table-header">
                        Account ID
                      </th>

                      <th className="table-header">
                        Name & Email
                      </th>

                      <th className="table-header">
                        Role
                      </th>

                      <th className="table-header">
                        Status
                      </th>

                      <th className="table-header">
                        Location
                      </th>

                      <th className="table-header">
                        Shift
                      </th>

                      <th className="table-header">
                        Specialty
                      </th>

                      <th className="table-header text-right">
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-surface-200">

                    {filteredAccounts.map(
                      (account) => (

                        <tr
                          key={account.id}
                          className={`hover:bg-surface-100 transition-colors ${account.isDeleted
                            ? 'bg-red-50/20'
                            : ''
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
                                      : 'bg-navy-50 text-navy-700 border-navy-200'
                                }`}
                            >
                              {account.role}
                            </span>

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
                                    {new Date(
                                      account.deletedAt
                                    ).toLocaleDateString()}{' '}
                                    (
                                    {account.deletedBy ||
                                      'System'}
                                    )
                                  </span>
                                )}

                              </div>

                            ) : (

                              <span
                                className={
                                  account.status ===
                                    'active'
                                    ? 'badge-success text-[10px]'
                                    : 'badge-warning text-[10px]'
                                }
                              >
                                {account.status}
                              </span>

                            )}

                          </td>


                          {/* Location */}

                          <td className="table-cell text-xs text-surface-700 font-medium">

                            {(() => {
                              const clinic = clinics.find(
                                (c) => c.id === account.deploymentLocationId
                              );
                              if (clinic) return clinic.name;
                              if (account.deploymentLocationId)
                                return account.deploymentLocationId;
                              return '—';
                            })()}

                          </td>


                          {/* Shift */}

                          <td className="table-cell text-xs text-surface-600 whitespace-nowrap">

                            {account.shift || '—'}

                          </td>


                          {/* Specialty */}

                          <td className="table-cell text-xs text-surface-600">

                            {account.specialty || '—'}

                          </td>


                          {/* Actions */}

                          <td className="table-cell text-right">

                            <div className="flex items-center justify-end gap-1">

                              {!account.isDeleted ? (
                                <>
                                  {isSuperOrMaster && account.id !== currentUser?.id && (
                                    <button
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
                                    onClick={() =>
                                      openEdit(account)
                                    }
                                    className="p-1.5 text-surface-400 hover:text-navy-600 hover:bg-navy-50 rounded transition-colors"
                                    title="Edit Account"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>


                                  <button
                                    onClick={() =>
                                      toggleStatus(
                                        account
                                      )
                                    }
                                    className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                    title={
                                      account.status ===
                                        'active'
                                        ? 'Deactivate'
                                        : 'Activate'
                                    }
                                  >

                                    {account.status ===
                                      'active' ? (
                                      <ShieldOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    )}

                                  </button>


                                  <button
                                    onClick={() =>
                                      deleteUser(
                                        account
                                      )
                                    }
                                    className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Archive / Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                </>

                              ) : (

                                <button
                                  onClick={() =>
                                    handleRestore(
                                      account
                                    )
                                  }
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors flex items-center gap-1 text-xs font-semibold"
                                  title="Restore Account"
                                >

                                  <RefreshCw className="w-3.5 h-3.5" />

                                  <span>
                                    Restore
                                  </span>

                                </button>

                              )}

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>


                {/* Empty State */}

                {filteredAccounts.length === 0 && (

                  <div className="text-center py-12">

                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-surface-100 flex items-center justify-center">
                      <Search className="w-4 h-4 text-surface-400" />
                    </div>

                    <p className="text-sm font-semibold text-surface-600">
                      No accounts found
                    </p>

                    <p className="text-xs text-surface-400 mt-1">
                      Try adjusting your search or filters.
                    </p>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-xs font-semibold text-[#0F4C42] hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}

                  </div>

                )}

              </div>

            </div>

          </>
        )}

      </div>


      {/* =====================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      <Modal
        isOpen={showModal}
        onClose={() =>
          setShowModal(false)
        }
        title={
          editingUser
            ? 'Edit User Account'
            : 'Create New Account'
        }
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="input-field"
                placeholder="User full name"
              />

            </div>


            {/* Email */}

            <div>

              <label className="block text-sm font-medium text-surface-700 mb-1">
                Email *
              </label>

              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as UserRole,
                  })
                }
                className="select-field"
              >

                {allowedCreationRoles.map(
                  (r) => (
                    <option
                      key={r}
                      value={r}
                    >
                      {r}
                    </option>
                  )
                )}

              </select>

              {!isSuperOrMaster && (
                <p className="text-[10px] text-surface-500 mt-1">
                  Administrators may provision Medical Officer, Radiographer, and Radiologist accounts.
                </p>
              )}

            </div>


            {/* Shift */}

            <div>

              <label className="block text-sm font-medium text-surface-700 mb-1">
                Shift
              </label>

              <select
                value={form.shift}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shift: e.target.value,
                  })
                }
                className="select-field"
              >

                <option value="">
                  None
                </option>

                <option value="Morning">
                  Morning
                </option>

                <option value="Day">
                  Day
                </option>

                <option value="Evening">
                  Evening
                </option>

                <option value="Night">
                  Night
                </option>

              </select>

            </div>


            {/* Location (Healthcare Center / Clinic) */}

            <div className="md:col-span-2">

              <label className="block text-sm font-medium text-surface-700 mb-1">
                Healthcare Center / Clinic (Location)
              </label>

              <select
                value={form.deploymentLocationId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deploymentLocationId: e.target.value,
                  })
                }
                className="select-field"
              >

                <option value="">
                  None / Unassigned
                </option>

                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}

              </select>

            </div>


            {/* Specialty */}

            <div className="md:col-span-2">

              <label className="block text-sm font-medium text-surface-700 mb-1">
                Specialty
              </label>

              <input
                value={form.specialty}
                onChange={(e) =>
                  setForm({
                    ...form,
                    specialty: e.target.value,
                  })
                }
                className="input-field"
                placeholder="e.g., Diagnostic Radiology"
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
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  className="input-field font-mono"
                  placeholder="Account password"
                />

                <button
                  type="button"
                  onClick={
                    generateTempPassword
                  }
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
              onClick={() =>
                setShowModal(false)
              }
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={
                !form.name ||
                !form.email ||
                !form.password
              }
              className="btn-primary disabled:opacity-50"
            >
              {editingUser
                ? 'Save Changes'
                : 'Create Account'}
            </button>

          </div>

        </div>

      </Modal>


      {/* =====================================================
          CREATED CREDENTIALS MODAL
      ====================================================== */}

      {
        createdCredentials && (

          <Modal
            isOpen={!!createdCredentials}
            onClose={() =>
              setCreatedCredentials(null)
            }
            title="Account Provisioned Successfully"
          >

            <div className="space-y-4">

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">

                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">

                  <ShieldCheck className="w-5 h-5 text-emerald-600" />

                  Account Created & Logged

                </div>

                <p className="text-xs text-emerald-900">
                  Send these login details to{' '}
                  <strong>
                    {createdCredentials.name}
                  </strong>{' '}
                  so they can access HealthGrid IQ.
                </p>


                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1 text-xs font-mono">

                  <div>
                    <span className="font-bold text-slate-600 font-sans">
                      Role:
                    </span>{' '}
                    {createdCredentials.role}
                  </div>

                  <div>
                    <span className="font-bold text-slate-600 font-sans">
                      Login Email:
                    </span>{' '}
                    {createdCredentials.email}
                  </div>

                  <div>
                    <span className="font-bold text-slate-600 font-sans">
                      Password:
                    </span>{' '}

                    <span className="text-navy-900 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {createdCredentials.pass}
                    </span>
                  </div>

                </div>

              </div>


              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `HealthGrid IQ Account Created\nRole: ${createdCredentials.role}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`
                    );

                    toast.success(
                      'Login details copied to clipboard!'
                    );
                  }}
                  className="btn-secondary text-xs"
                >
                  Copy Credentials
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCreatedCredentials(null)
                  }
                  className="btn-primary text-xs"
                >
                  Done
                </button>

              </div>

            </div>

          </Modal>

        )
      }

    </div >
  );
}