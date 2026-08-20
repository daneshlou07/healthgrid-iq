# Phase 1 Foundation Architecture Implementation Plan (Revised)

This implementation plan incorporates the corrected foundational architectural model from [`docs/HEALTHGRID_ARCHITECTURE.md`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/docs/HEALTHGRID_ARCHITECTURE.md):
1. **Separation of Organization and Healthcare Center / Facility**
2. **Healthcare Center as Single Source of Truth for Organization Type** (no redundant/conflicting fields on `User`)
3. **Strictly Functional User Roles** (`Super Admin`, `BEMS Officer`, `Administrator`, `Medical Officer`, `Radiographer`, `Radiologist` — excluding Marketplace from actor roles)
4. **Originating Healthcare Center Case Ownership & Multi-Organization Access Isolation**
5. **Clear Transitional Status for Legacy Aliases** (`clinicId`, `deploymentLocationId`)

---

## 1. Revised Data Model Architecture

```text
Organization (e.g. MOH Selangor, KPJ Healthcare Group)
  └── Healthcare Center / Facility (e.g. KK Bestari Jaya, KPJ Damansara)
        ├── Organization Type: 'Klinik Kesihatan' | 'Public Hospital' | 'Private Hospital'
        ├── Users (linked via healthcareCenterId)
        ├── Cases (owned via originatingCenterId)
        └── Equipment (deployed at center)
```

### 1.1 Organization & Healthcare Center Entities
In [`src/types/index.ts`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/types/index.ts):

```typescript
export type HealthcareOrganizationType = 
  | 'Klinik Kesihatan' 
  | 'Public Hospital' 
  | 'Private Hospital';

export interface HealthcareOrganization {
  id: string; // e.g. "org-moh-selangor", "org-kpj-group", "org-sunway-group"
  name: string; // e.g. "Kementerian Kesihatan Malaysia (Selangor)", "KPJ Healthcare Berhad"
  type: HealthcareOrganizationType;
  status: EntityStatus;
  createdAt: string;
}

export interface HealthcareCenter {
  id: string; // e.g. "clinic-001", "clinic-002", "clinic-005"
  organizationId: string; // Links to HealthcareOrganization.id
  organizationType: HealthcareOrganizationType; // Source of truth for facility classification
  name: string; // e.g. "Klinik Kesihatan Bestari Jaya", "KPJ Damansara Specialist Hospital"
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  fax?: string;
  email: string;
  operatingHours?: string;
  status: EntityStatus;
  googlePlaceId?: string;
  supportedModalities: string[]; // e.g. ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mobile PACS']
  maxDailyCapacity?: number;
}

/** @deprecated Transitional backward-compatibility alias for HealthcareCenter */
export type Clinic = HealthcareCenter;
```

### 1.2 Normalized User Model
In [`src/types/index.ts`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/types/index.ts):

```typescript
export type UserRole = 
  | 'Super Admin'
  | 'BEMS Officer'
  | 'Administrator'
  | 'Medical Officer'
  | 'Radiographer'
  | 'Radiologist';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  specialty?: string;
  status: EntityStatus;
  createdAt: string;
  
  /** 
   * Organizational Affiliation (Source of Truth).
   * Undefined for platform-level roles (Super Admin, BEMS Officer).
   */
  healthcareCenterId?: string; // Links to HealthcareCenter.id

  /** @deprecated Transitional backward-compatibility alias for healthcareCenterId. */
  deploymentLocationId?: string;

  shift?: string;
  shiftStatus?: 'ACTIVE' | 'COMPLETED' | 'STANDBY';
  shiftCompletedAt?: string;
  leaveStatus?: LeaveStatus;
  mobilePacsAssignment?: string;
  supportedModalities?: string[];
  profilePicture?: string;
  mmcNumber?: string;
  qualification?: string;
  phone?: string;
}
```

> [!NOTE]
> `User` does **not** store `organizationType`. A user's organization type is always derived directly from their assigned `HealthcareCenter`.

### 1.3 Case Ownership Entity
In [`src/types/index.ts`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/types/index.ts):

```typescript
export interface Case {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  
  // Originating Healthcare Center Ownership
  originatingCenterId: string; // Links to HealthcareCenter.id (e.g. "clinic-001")
  originatingOrganizationId?: string; // Links to HealthcareOrganization.id

  /** @deprecated Transitional backward-compatibility alias for originatingCenterId. */
  clinicId?: string;
  /** @deprecated Transitional backward-compatibility alias. */
  clinicName?: string;

  // Clinical & Modality Fields
  scanType: string;
  modality?: string;
  requestedExaminations?: ExaminationRequest[];
  indication?: string;
  bodyRegion?: string;
  severity?: SeverityLevel;
  status: CaseStatus;
  createdAt: string;
  images?: string[];

  // Clinical Attributions
  registeredById?: string;
  registeredByName?: string;
  initialMoId?: string;
  initialMoName?: string;
  radiographerId?: string;
  radiographerName?: string;
  radiologistId?: string;
  radiologistName?: string;

  // Cross-Organization Referral Tracking (Dispatched via BEMS)
  externalReferralId?: string;
  externalReferral?: ExternalImagingRequest;
  externalFacilityId?: string;
  externalFacilityName?: string;
  externalRadiographerId?: string;
  externalRadiographerName?: string;
  externalAdminId?: string;
  externalAdminName?: string;
}
```

---

## 2. Seed & Mock Data Migration

### 2.1 Organizations Registry (`mockOrganizations` in `src/services/mockData.ts`)
| Organization ID | Organization Name | Organization Type |
| :--- | :--- | :--- |
| `org-moh-selangor` | **Kementerian Kesihatan Malaysia (Selangor)** | `Klinik Kesihatan` |
| `org-moh-tertiary` | **Jabatan Kesihatan Negeri (Hospital Awam)** | `Public Hospital` |
| `org-kpj-group` | **KPJ Healthcare Berhad** | `Private Hospital` |
| `org-sunway-group` | **Sunway Healthcare Group** | `Private Hospital` |

### 2.2 Healthcare Centers Registry (`mockClinics` in `src/services/mockData.ts`)
| Center ID | Center Name | Parent Organization | Organization Type | Supported Modalities | Daily Cap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `clinic-001` | **Klinik Kesihatan Bestari Jaya** | `org-moh-selangor` | `Klinik Kesihatan` | `['X-Ray', 'Ultrasound', 'Mobile PACS']` | 40 |
| `clinic-002` | **Hospital Tanjong Karang** | `org-moh-tertiary` | `Public Hospital` | `['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Fluoroscopy']` | 120 |
| `clinic-003` | **Klinik Kesihatan Ijok** | `org-moh-selangor` | `Klinik Kesihatan` | `['X-Ray', 'Ultrasound']` | 35 |
| `clinic-004` | **Hospital Kuala Lumpur (HKL)** | `org-moh-tertiary` | `Public Hospital` | `['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy']` | 300 |
| `clinic-005` | **KPJ Damansara Specialist Hospital** | `org-kpj-group` | `Private Hospital` | `['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography']` | 150 |
| `clinic-006` | **Sunway Medical Centre** | `org-sunway-group` | `Private Hospital` | `['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'PET-CT']` | 200 |

### 2.3 Normalized User Account Registry (`mockUsers` in `src/services/mockData.ts`)
| User ID | Name | Role | Healthcare Center | Organization Type (Derived) |
| :--- | :--- | :--- | :--- | :--- |
| `admin-master` | Master Admin (`daneshlou05@gmail.com`) | `Super Admin` | *None (Platform)* | *Platform* |
| `superadmin-001` | Theta Edge Berhad | `Super Admin` | *None (Platform)* | *Platform* |
| `bemz-001` | Ir. Khairul Azman | `BEMS Officer` | *None (Central BEMS)* | *Central Service* |
| `mo-001` | Dr. Michelle Tan | `Medical Officer` | KK Bestari Jaya (`clinic-001`) | `Klinik Kesihatan` |
| `admin-001` | Noraishah Daud | `Administrator` | KK Bestari Jaya (`clinic-001`) | `Klinik Kesihatan` |
| `rad-001` | Ahmad Razak | `Radiographer` | KK Bestari Jaya (`clinic-001`) | `Klinik Kesihatan` |
| `mo-002` | Dr. Zulkifli Rahman | `Medical Officer` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |
| `admin-002` | Hamidah Ibrahim | `Administrator` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |
| `rad-002` | Zainal Abidin | `Radiographer` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |
| `mo-003` | Dr. Faizah Ismail | `Medical Officer` | KK Ijok (`clinic-003`) | `Klinik Kesihatan` |
| `admin-003` | Razi Shafie | `Administrator` | KK Ijok (`clinic-003`) | `Klinik Kesihatan` |
| `rad-003` | Syed Farid Hassan | `Radiographer` | KK Ijok (`clinic-003`) | `Klinik Kesihatan` |
| `pub-admin-001` | Pn. Maznah Othman | `Administrator` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |
| `pub-rad-001` | Muhammad Alif | `Radiographer` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |
| `priv-admin-001` | Karen Tan | `Administrator` | KPJ Damansara (`clinic-005`) | `Private Hospital` |
| `priv-rad-001` | Daniel Lee | `Radiographer` | KPJ Damansara (`clinic-005`) | `Private Hospital` |
| `priv-admin-002` | Jason Wong | `Administrator` | Sunway Medical Centre (`clinic-006`) | `Private Hospital` |
| `priv-rad-002` | Rachel Lim | `Radiographer` | Sunway Medical Centre (`clinic-006`) | `Private Hospital` |
| `rologist-001` | Dr. Amira Latiff | `Radiologist` | Hospital Kuala Lumpur (`clinic-004`) | `Public Hospital` |
| `rologist-002` | Dr. Chong Wei Kiat | `Radiologist` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |
| `rologist-003` | Dr. Suresh Kumar | `Radiologist` | KK Ijok / Regional (`clinic-003`) | `Klinik Kesihatan` |
| `marketplace-001` | Farid Zakaria | `Administrator` | KK Bestari Jaya (`clinic-001`) | `Klinik Kesihatan` |
| `marketplace-002` | Norhayati Ahmad | `Administrator` | Hospital Tanjong Karang (`clinic-002`) | `Public Hospital` |

### 2.4 Case Originating Center Migration (`mockCases` in `src/services/mockData.ts`)
- Every mock case will have explicit `originatingCenterId` and `originatingOrganizationId`:
  - `case-001`, `case-002`, `case-005` -> Origin: `clinic-001` (KK Bestari Jaya)
  - `case-003`, `case-007`, `case-008` -> Origin: `clinic-002` (Hospital Tanjong Karang)
  - `case-004`, `case-006`, `case-009` -> Origin: `clinic-003` (KK Ijok)

---

## 3. Multi-Organization Case Access Isolation

In [`src/context/DataContext.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/context/DataContext.tsx), implement the scoped access filtering:

```typescript
export function getScopedCasesForUser(user: User | null, allCases: Case[]): Case[] {
  if (!user) return [];

  // 1. Platform Governance & Cross-Organization Services (Super Admin, BEMS Officer)
  if (user.role === 'Super Admin' || user.role === 'BEMS Officer') {
    return allCases;
  }

  const userCenterId = user.healthcareCenterId || user.deploymentLocationId;
  if (!userCenterId) return [];

  // 2. Medical Officers & Administrators: Strict originating center isolation
  if (user.role === 'Medical Officer' || user.role === 'Administrator') {
    return allCases.filter((c) => {
      const isOriginatingCenter = (c.originatingCenterId || c.clinicId) === userCenterId;
      return isOriginatingCenter;
    });
  }

  // 3. Radiographers: Local center cases + explicitly assigned/referred external cases
  if (user.role === 'Radiographer') {
    return allCases.filter((c) => {
      const isLocalCenter = (c.originatingCenterId || c.clinicId) === userCenterId;
      const isDirectlyAssigned = c.radiographerId === user.id || c.externalRadiographerId === user.id;
      const isReferredToCenter = c.externalFacilityId === userCenterId;
      return isLocalCenter || isDirectlyAssigned || isReferredToCenter;
    });
  }

  // 4. Radiologists: Local center cases + assigned or escalated specialist cases
  if (user.role === 'Radiologist') {
    return allCases.filter((c) => {
      const isLocalCenter = (c.originatingCenterId || c.clinicId) === userCenterId;
      const isAssignedRadiologist = c.radiologistId === user.id;
      const isEscalatedOrSecondOpinion = c.isEscalated || c.routedToRole === 'Radiologist' || c.secondOpinionRequested;
      return isLocalCenter || isAssignedRadiologist || isEscalatedOrSecondOpinion;
    });
  }

  return allCases.filter((c) => (c.originatingCenterId || c.clinicId) === userCenterId);
}
```

---

## 4. Specific Files to Modify

| File | Exact Scope of Changes |
| :--- | :--- |
| [`src/types/index.ts`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/types/index.ts) | Add `HealthcareOrganization`, `HealthcareCenter`, normalized `UserRole` (no Marketplace actor role), `User.healthcareCenterId`, `Case.originatingCenterId`. Deprecate transitional aliases. |
| [`src/services/mockData.ts`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/services/mockData.ts) | Add `mockOrganizations`; update `mockClinics` with `organizationId` and `organizationType`; normalize all `mockUsers` and `mockCases`. |
| [`src/services/permissionService.ts`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/services/permissionService.ts) | Update `DEFAULT_ROLE_NAV_CONFIG` for normalized functional roles (`Super Admin`, `BEMS Officer`, `Administrator`, `Medical Officer`, `Radiographer`, `Radiologist`). |
| [`src/context/DataContext.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/context/DataContext.tsx) | Provide `organizations`, `healthcareCenters`, implement `getScopedCasesForUser`, bump `STORAGE_VERSION = '14'`. Tag newly created cases with `originatingCenterId`. |
| [`src/context/AuthContext.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/context/AuthContext.tsx) | Update role typing and map user `healthcareCenterId`. |
| [`src/components/common/ImpersonationBanner.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/components/common/ImpersonationBanner.tsx) | Group user dropdown by organization tier (`Klinik Kesihatan`, `Public Hospital`, `Private Hospital`, `Platform`) using normalized roles and center names. |
| [`src/pages/DashboardRouter.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/pages/DashboardRouter.tsx) | Clean up router logic to route on normalized roles without redundant role branches. |
| [`src/pages/mo/NewCaseRegistration.tsx`](file:///c:/Users/Danesh%20Lou/Downloads/Rebuild/src/pages/mo/NewCaseRegistration.tsx) | Set `originatingCenterId: currentUser.healthcareCenterId` upon case creation. |

---

## 5. Verification Plan

### Automated Verification
- Run `npm run build` (`tsc -b && vite build`) to confirm zero compilation errors.

### Manual Verification
1. **Multi-Organization Case Isolation**:
   - Impersonate `Dr. Michelle Tan` (KK Bestari Jaya): Verify `All Cases` displays **only** cases originating from KK Bestari Jaya.
   - Impersonate `Dr. Faizah Ismail` (KK Ijok): Verify cases from KK Bestari Jaya are invisible.
   - Impersonate `Master Admin` (Super Admin): Verify all platform cases across all centers are visible.
2. **Normalized Role Hierarchy**:
   - Verify `Hamidah Ibrahim` (Hospital Tanjong Karang) and `Karen Tan` (KPJ Damansara) both show role `Administrator` scoped to their respective public/private healthcare centers.
   - Verify `Ir. Khairul Azman` has functional role `BEMS Officer`.
3. **Case Creation Scoping**:
   - Create a new case under KK Bestari Jaya -> Confirm it is automatically scoped to `originatingCenterId: 'clinic-001'` and invisible to KK Ijok staff.
