# HealthGrid IQ — System User Accounts & Access Credentials

> **Document Type**: System User Registry & Authentication Guide  
> **Last Updated**: August 2026  
> **Security Notice**: Internal deployment credential reference for authorized clinical staff and system administrators.

---

## 🔑 Universal Password
For all registered clinical and administrative accounts listed in this directory, the standard access password is:
```text
password123
```
*(Alternative accepted format: `Password123!`)*

---

## 📋 System Account Registry

### 1. Radiologist Accounts
Radiologists have full diagnostic review authority, case interpretation, and report signing access.

| Name | Role / Specialty | Email Identifier | User ID | Password |
|---|---|---|---|---|
| **Dr. Priya Nair** | Diagnostic Radiology (MMC 48291) | `priya.nair@healthgrid.my` | `rologist-001` | `password123` |

---

### 2. Medical Officer Accounts
Medical Officers create patient cases, submit imaging orders, and review preliminary findings.

| Name | Role / Specialty | Email Identifier | User ID | Password |
|---|---|---|---|---|
| **Dr. Ahmad Razali** | General Medicine (MMC 59302) | `mo@healthgrid.com` | `mo-001` | `password123` |
| **Nurul Aisyah** | Medical Officer | `nurul.aisyah@healthgrid.my` | `dept-001` | `password123` |

---

### 3. Radiographer Accounts
Radiographers operate PACS mobile units, upload DICOM scans, and manage patient positioning schedules.

| Name | Assigned Clinic / Van | Email Identifier | User ID | Password |
|---|---|---|---|---|
| **Ahmad Razak** | KK Putrajaya (Van 001) | `ahmad.razak@healthgrid.my` | `rad-001` | `password123` |
| **Lim Mei Ling** | KK Cyberjaya | `meiling.lim@healthgrid.my` | `rad-002` | `password123` |
| **Kumaran Pillai** | KK Bangi | `kumaran.pillai@healthgrid.my` | `rad-003` | `password123` |
| **Farah Hanim** | KK Putrajaya | `farah.hanim@healthgrid.my` | `rad-004` | `password123` |
| **Wong Jia Hao** | KK Cyberjaya | `jiahao.wong@healthgrid.my` | `rad-005` | `password123` |
| **Zainal Abidin** | Hospital Tanjong Karang | `zainal.abidin@healthgrid.my` | `rad-006` | `password123` |
| **Norhaslina Yusoff** | Hospital Tanjong Karang | `norhaslina.yusoff@healthgrid.my` | `rad-007` | `password123` |
| **Syed Farid Hassan** | KK Kuala Selangor | `syed.farid@healthgrid.my` | `rad-008` | `password123` |
| **Tan Li Wen** | KK Sabak Bernam | `liwen.tan@healthgrid.my` | `rad-009` | `password123` |
| **Anis Farhanah** | KK Banting | `anis.farhanah@healthgrid.my` | `rad-010` | `password123` |

---

### 4. System Administrator Accounts
Administrators manage system configuration, fleet dispatch, user account creation, and audit logging.

| Name | Role | Email Identifier | User ID | Password |
|---|---|---|---|---|
| **Tan Wei Ming** | Administrator | `weiming.tan@healthgrid.my` | `admin-001` | `password123` |

---

## ⚡ Quick Sign-In Instructions
1. Open the HealthGrid IQ Sign-In page.
2. Enter the **Email Identifier** or **User ID** (e.g., `mo@healthgrid.com` or `mo-001`).
3. Enter `password123`.
4. Click **Sign In** to access the role dashboard.
