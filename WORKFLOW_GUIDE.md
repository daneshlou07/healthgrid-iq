# HealthGrid IQ — Complete Clinical & Operational Workflow Guide

**Platform**: HealthGrid IQ — Clinical Imaging, Teleradiology & Mobile Outreach Platform  
**Target Audience**: Clinical Staff (MO, Radiographers, Radiologists), System Administrators, and Project Teams  
**Design Standard**: Human Clinical Healthcare Architecture  

---

## 1. Executive Summary & Core Philosophy

HealthGrid IQ is designed to solve two fundamental challenges in diagnostic imaging across Malaysia:
1. **Specialist Radiologist Bottleneck**: Radiologists are expensive and scarce. Routine, normal screening scans create massive waiting queues if forced through hospital-only reporting channels.
2. **Rural & Underserved Geographic Barriers**: Communities located far from district hospitals lack mammography and X-ray facilities.

HealthGrid IQ unifies **Static Healthcare Facilities** and **Mobile Screening Buses** under one cloud-synchronized diagnostic network.

---

## 2. The 5 Operational Roles

| Role | Primary Location | Key Responsibilities |
| :--- | :--- | :--- |
| **System Administrator (Admin)** | Health District / HQ Office | Fleet dispatching, AI workload balancing, facility profile management, user credentials. |
| **Medical Officer (MO)** | Clinic / On-Board Bus | Patient triage, clinical breast examination (CBE), referral creation, on-board routine scan review and rapid sign-off. |
| **Radiographer (Juru X-Ray)** | Radiology Room / Bus Cabin | Field Equipment Lead. Conducts X-Ray/Mammogram scans, ensures DICOM image quality, uploads to cloud, coordinates bus travel. |
| **Specialist Radiologist (Pakar Radiologi)** | Hospital Reading Room (Remote) | Teleradiology specialist. Receives and interprets complex, abnormal, or dense tissue scans escalated from the field. |
| **Mobile Bus Driver** | Mobile Outreach Van | Heavy vehicle navigation, parking and generator hookup at rural sites. Receives 1-tap dispatch routes via WhatsApp. |

---

## 3. Operational Mode 1: Static Healthcare Facility (Standard Clinic / Hospital)

This is the routine procedure when a patient walks into a fixed healthcare center (e.g., Klinik Kesihatan Bestari Jaya or Hospital Tanjong Karang).

```
+-----------------------------------------------------------------------------------+
|                        STATIC CLINIC WORKFLOW                                     |
+-----------------------------------------------------------------------------------+

  [ 1. PATIENT REGISTRATION ]
         │
         ▼
  [ 2. CLINICAL CONSULTATION (MO) ]
         │  • MO performs clinical examination.
         │  • MO creates Imaging Case in HealthGrid IQ.
         │  • Status: CREATED
         ▼
  [ 3. AI SCHEDULER (ADMIN) ]
         │  • AI evaluates machine capacity, radiographer shifts, and queue volume.
         │  • Case is assigned to radiographer and time slot.
         │  • Status: SCHEDULED
         ▼
  [ 4. IMAGING ACQUISITION (RADIOGRAPHER) ]
         │  • Radiographer conducts X-Ray / Mammogram.
         │  • Radiographer uploads DICOM scans + technical exposure notes.
         │  • Status: SCANNED
         ▼
  [ 5. DIAGNOSTIC INTERPRETATION ]
         ├────────────────────────────────────────┬────────────────────────────────────────┐
         ▼                                        ▼                                        ▼
    [ ROUTE TO MO ]                          [ ROUTE TO RADIOLOGIST ]                 [ ESCALATION ]
    Routine / clear scans                    Complex / ambiguous scans                MO requests 2nd opinion
    MO reviews on dashboard                  Hospital Radiologist reads               from remote Radiologist.
    and signs off.                           and signs off formal report.             
         │                                        │                                        │
         └────────────────────────────────────────┴────────────────────────────────────────┘
                                                  │
                                                  ▼
                                      [ 6. CASE FINALIZED ]
                                      Status: FINALIZED
                                      Referring MO reviews final
                                      dossier & manages patient.
```

---

## 4. Operational Mode 2: Mobile Screening Outreach Bus

This mode is used when dispatching a mobile van to rural villages (e.g., Klinik Desa, Balai Raya, Felda settlements) or to relieve overloaded district hospitals.

```
+-----------------------------------------------------------------------------------+
|                     MOBILE SCREENING BUS OUTREACH WORKFLOW                        |
+-----------------------------------------------------------------------------------+

  [ 1. DISPATCH & SCHEDULING (ADMIN) ]
         │  • Admin identifies rural backlog or underserved area.
         │  • Admin assigns Mobile Bus, Radiographer, and on-board MO.
         ▼
  [ 2. BUS NAVIGATION & DEPLOYMENT (FIELD CREW + DRIVER) ]
         │  • Radiographer or MO taps "Share to Driver" on dashboard.
         │  • Driver receives Waze / Google Maps GPS pin via WhatsApp.
         │  • Bus deploys to community site.
         ▼
  [ 3. FIELD REGISTRATION & TRIAGE (ON-BOARD MO) ]
         │  • Villagers registered on-site in Patient Registry.
         │  • On-board MO conducts clinical palpation / examination.
         │  • Referral created on-the-spot.
         ▼
  [ 4. ON-BOARD IMAGING (RADIOGRAPHER) ]
         │  • Radiographer conducts mammogram / X-ray in bus lead-lined room.
         │  • Scans uploaded via 4G/5G mobile connection or stored for auto-sync.
         ▼
  [ 5. ON-BOARD DIAGNOSTIC TRIAGE (THE FAST-TRACK ENGINE) ]
         ├──────────────────────────────────────────────────┬──────────────────────────────────────────────────┐
         ▼                                                  ▼                                                  ▼
    [ PATH A: NORMAL / ROUTINE SCAN ]                  [ PATH B: SUSPICIOUS / ABNORMAL SCAN ]             [ TELERADIOLOGY BACKUP ]
    • Radiographer routes to "On-Board MO".            • Radiographer routes to "Specialist Radiologist". • Cloud sends DICOM to
    • MO on bus opens tablet review queue.             • Cloud transmits DICOM to hospital reading room.  hospital specialist.
    • MO reviews scan with AI assistance.              • Specialist signs formal diagnostic report.       • Report synced back to bus
    • MO signs off immediately.                        • MO receives alert & counsels patient for         within minutes.
    • Patient leaves bus with cleared results!           urgent hospital referral / biopsy.               
```

---

## 5. Why MO + Radiographer Duo on the Bus?

### The Problem with Stationing Radiologists on Buses
* **High Cost**: Radiologists are top-tier medical specialists.
* **Specialist Shortage**: There are not enough Radiologists in Malaysia to sit full-time in mobile vans.
* **Limited Field Scope**: Radiologists specialize in reading scans, not physical triage or clinical breast exams.

### The HealthGrid IQ Solution
1. **On-Board MO**: Examines patients, orders scans, and directly reviews and signs off **routine, clear screening scans** using AI-assisted diagnostic tools on their tablet.
2. **On-Board Radiographer**: Focuses entirely on machine operation, image quality, and patient positioning.
3. **Cloud-Connected Specialist Radiologist**: Remains in the hospital reading room. They only receive **suspicious, high-risk, or complex cases** via teleradiology. This maximizes specialist efficiency by 10x.

---

## 6. Diagnostic Routing Decision Matrix

When the Radiographer uploads completed scans in `Upload Scans`, they select the routing destination:

| Destination Option | Clinical Indication | Reviewer | Outcome |
| :--- | :--- | :--- | :--- |
| **Medical Officer (On-Board / Primary MO)** | Routine screening, no obvious mass, normal parenchyma, clear lung fields. | Medical Officer | Rapid sign-off on-site. Patient leaves with cleared report immediately. |
| **Specialist Radiologist (Teleradiology)** | Dense tissue, microcalcifications, suspected mass, architectural distortion, complex trauma. | Specialist Radiologist | Formal diagnostic report generated remotely from hospital. |
| **Second Opinion Request** | MO reviews scan on-site but finds an ambiguous lesion. MO taps "Request 2nd Opinion". | Specialist Radiologist | Escalated to Radiologist with specific clinical inquiry notes from the MO. |

---

## 7. GPS Dispatch & Turn-by-Turn Navigation

HealthGrid IQ includes zero-cost navigation utilities integrated across all mobile team views:

```
[ Assigned Clinic / Outreach Facility Banner ]
  ├── [ Navigate with Waze ]      -> Direct turn-by-turn navigation deep link.
  ├── [ Google Maps ]            -> Route overview and live traffic via Google Maps.
  └── [ Share to Driver ]         -> 1-tap WhatsApp dispatch pre-formatting destination,
                                     address, and both navigation links for the driver.
```

### Access Matrix by Role

| Screen / View | MO | Radiographer | Radiologist | Admin | Purpose |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Radiographer Dashboard** | — | Yes | — | — | Mobile van operator daily dispatch navigation & driver share. |
| **MO Department Dashboard** | Yes | — | — | — | Field doctor traveling to assigned clinic/community hall. |
| **Scan Queue** | — | Yes | — | — | Quick route check per patient appointment. |
| **Case Detail** | Yes | Yes | — | Yes | Reference destination coordinates for any case. |
| **Radiologist Dashboard** | — | — | — | — | *Hidden* (Radiologists work remotely in hospital reading rooms). |

---

## 8. Case Lifecycle Status Reference

| Status | Meaning | Triggered By | Next Step |
| :--- | :--- | :--- | :--- |
| `CREATED` | Referral created by MO or Reception. | Doctor creates new referral. | Admin runs AI Scheduler. |
| `SCHEDULED` | Time slot, centre, and radiographer assigned. | Admin confirms AI Scheduler. | Radiographer performs scan. |
| `SCANNED` | Imaging completed and DICOM files uploaded. | Radiographer submits scan. | MO or Radiologist review. |
| `FINALIZED` | Diagnostic report reviewed and signed off. | MO or Radiologist signs off. | Dossier printed / patient notified. |

---

## 9. Summary Cheatsheet

* **Static Clinic**: Patient walks in $\rightarrow$ MO orders scan $\rightarrow$ Admin schedules $\rightarrow$ Radiographer scans $\rightarrow$ Radiologist/MO reports $\rightarrow$ Case finalized.
* **Mobile Outreach**: Admin dispatches bus $\rightarrow$ Crew navigates via Waze/WhatsApp $\rightarrow$ MO triages villagers $\rightarrow$ Radiographer scans on bus $\rightarrow$ MO signs routine cases on-site $\rightarrow$ Complex cases sent to remote Radiologist via cloud teleradiology.
