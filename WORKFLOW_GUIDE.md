# HealthGrid IQ — Complete Clinical & Operational Workflow Guide

**Platform**: HealthGrid IQ — Clinical Imaging, Teleradiology & Mobile Outreach Platform  
**Target Audience**: Clinical Staff (MO, Radiographers, Radiologists), System Administrators, and Project Teams  
**Design Standard**: Human Clinical Healthcare Architecture  

---

## 1. Master System Flowchart

```mermaid
flowchart TD
    classDef adminStyle fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1
    classDef moStyle fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#15803d
    classDef radStyle fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#b45309
    classDef rologistStyle fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#7e22ce
    classDef driverStyle fill:#ffedd5,stroke:#ea580c,stroke-width:2px,color:#c2410c
    classDef finalStyle fill:#ecfdf5,stroke:#059669,stroke-width:3px,color:#065f46

    subgraph Admin_HQ ["District HQ / Administrator"]
        A1["Admin monitors backlogs & regional queue"]:::adminStyle
        A2["Run AI Scheduler / Dispatch Fleet"]:::adminStyle
        A1 --> A2
    end

    subgraph Dispatch_Navigation ["Field Navigation & Logistics"]
        D1["Share to Driver via WhatsApp"]:::driverStyle
        D2["Driver navigates bus using Waze / Google Maps"]:::driverStyle
        A2 --> D1 --> D2
    end

    subgraph Mobile_Bus_Field ["Mobile Screening Bus / Outreach Site"]
        M1["Villager / Patient Arrival"]
        M2["On-Board MO performs clinical triage & creates Referral"]:::moStyle
        R1["Radiographer performs Mammogram / X-Ray on bus"]:::radStyle
        R2["Radiographer uploads DICOM scan & reviews quality"]:::radStyle
        
        D2 --> M1
        M1 --> M2 --> R1 --> R2
    end

    subgraph Diagnostic_Decision_Engine ["Diagnostic Triage & Reporting Engine"]
        DECISION{"Scan Complexity / Finding"}
        
        ROUTE_MO["Path A: Routine / Normal Scan"]:::moStyle
        ROUTE_ROLOGIST["Path B: Suspicious / Complex Scan"]:::rologistStyle
        
        R2 --> DECISION
        DECISION -- "Normal Parenchyma / Routine" --> ROUTE_MO
        DECISION -- "Dense Tissue / Suspicious Mass" --> ROUTE_ROLOGIST
    end

    subgraph Fast_Track_MO ["On-Board MO Rapid Sign-Off"]
        MO_REVIEW["MO reviews images with AI assistance on tablet"]:::moStyle
        MO_SIGNOFF["MO signs off report immediately"]:::moStyle
        ROUTE_MO --> MO_REVIEW --> MO_SIGNOFF
    end

    subgraph Hospital_Teleradiology ["Central Hospital Teleradiology"]
        RAD_REVIEW["Specialist Radiologist reviews scan remotely"]:::rologistStyle
        RAD_SIGNOFF["Radiologist issues formal diagnostic report"]:::rologistStyle
        ROUTE_ROLOGIST --> RAD_REVIEW --> RAD_SIGNOFF
    end

    subgraph Final_Care ["Patient Delivery & Management"]
        COMPLETE["CASE FINALIZED"]:::finalStyle
        PATIENT_CARE["Patient receives immediate result / hospital referral"]:::finalStyle
        
        MO_SIGNOFF --> COMPLETE
        RAD_SIGNOFF --> COMPLETE
        COMPLETE --> PATIENT_CARE
    end
```

---

## 2. Mobile Screening Bus Outreach Workflow (Step-by-Step)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator (HQ)
    actor Driver as Bus Driver
    actor MO as Medical Officer (On-Board)
    actor Rad as Radiographer (On-Board)
    actor Rologist as Specialist Radiologist (Hospital)
    actor Patient as Patient / Villager

    Note over Admin,Driver: Phase 1: Planning & Dispatch
    Admin->>Admin: Identifies rural underserved area
    Admin->>Rad: Assigns Mobile Bus deployment schedule
    Rad->>Driver: Sends 1-tap WhatsApp GPS link (Waze / Maps)
    Driver->>Rad: Arrives & hooks up bus generator at community hall

    Note over Patient,Rad: Phase 2: On-Site Triage & Scanning
    Patient->>MO: Arrives for health screening
    MO->>MO: Conducts Clinical Breast Exam (CBE) & registers Case
    MO->>Rad: Hands case to Radiographer queue
    Rad->>Patient: Positions patient in lead-lined X-ray room & shoots scan
    Rad->>Rad: Uploads DICOM images to HealthGrid IQ

    alt Path A: Routine / Clear Scan (Fast Track)
        Rad->>MO: Routes scan to "On-Board Medical Officer"
        MO->>MO: Reviews scan on tablet with AI assistance
        MO->>Patient: Signs off report & delivers immediate peace-of-mind
    else Path B: Suspicious Abnormality / Dense Tissue (Teleradiology)
        Rad->>Rologist: Routes scan to "Hospital Specialist Radiologist"
        Rologist->>Rologist: Interprets scan remotely via cloud PACS
        Rologist->>MO: Transmits signed diagnostic report
        MO->>Patient: Counsels patient & arranges secondary hospital care
    end
```

---

## 3. Static Healthcare Facility Workflow (Standard Hospital / Clinic)

```mermaid
flowchart LR
    classDef stepStyle fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#0f172a
    classDef finalStyle fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46

    S1["1. Patient Walk-In<br/>(Clinic Registration)"]:::stepStyle -->
    S2["2. MO Consultation<br/>(Referral Created)"]:::stepStyle -->
    S3["3. AI Scheduler<br/>(Slot Assigned)"]:::stepStyle -->
    S4["4. Imaging Acquisition<br/>(Radiographer Scans)"]:::stepStyle -->
    S5["5. Specialist Interpretation<br/>(Radiologist Signs)"]:::stepStyle -->
    S6["6. Case Finalized<br/>(Patient Management)"]:::finalStyle
```

---

## 4. Operational Roles & Responsibilities

| Role | Primary Location | Key Responsibilities |
| :--- | :--- | :--- |
| **System Administrator (Admin)** | Health District / HQ Office | Fleet dispatching, AI workload balancing, facility profile management, user credentials. |
| **Medical Officer (MO)** | Clinic / On-Board Bus | Patient triage, clinical breast examination (CBE), referral creation, on-board routine scan review and rapid sign-off. |
| **Radiographer (Juru X-Ray)** | Radiology Room / Bus Cabin | Field Equipment Lead. Conducts X-Ray/Mammogram scans, ensures DICOM image quality, uploads to cloud, coordinates bus travel. |
| **Specialist Radiologist (Pakar Radiologi)** | Hospital Reading Room (Remote) | Teleradiology specialist. Receives and interprets complex, abnormal, or dense tissue scans escalated from the field. |
| **Mobile Bus Driver** | Mobile Outreach Van | Heavy vehicle navigation, parking and generator hookup at rural sites. Receives 1-tap dispatch routes via WhatsApp. |

---

## 5. Diagnostic Routing Decision Matrix

```mermaid
flowchart TD
    classDef moBox fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#15803d
    classDef radBox fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#7e22ce
    classDef critBox fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#991b1b

    UPLOAD["Radiographer completes scan in Upload Scans"] --> CHOOSE{"Select Clinical Routing Destination"}

    CHOOSE -- "Routine screening / No obvious lesion" --> OPT_MO["Medical Officer (On-Board / Primary MO)"]:::moBox
    CHOOSE -- "Dense tissue / Suspicious mass / Complex" --> OPT_RAD["Specialist Radiologist (Teleradiology)"]:::radBox

    OPT_MO --> MO_ACTION["MO reviews on tablet & signs off immediately on the bus"]:::moBox
    MO_ACTION -- "If MO encounters unexpected ambiguity" --> ESCALATE["Request 2nd Opinion from Radiologist"]:::critBox

    OPT_RAD --> RAD_ACTION["Hospital Radiologist reads via cloud & issues formal report"]:::radBox
    ESCALATE --> RAD_ACTION
```

---

## 6. GPS Dispatch & Turn-by-Turn Navigation

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

## 7. Case Lifecycle Status Reference

| Status | Meaning | Triggered By | Next Step |
| :--- | :--- | :--- | :--- |
| `CREATED` | Referral created by MO or Reception. | Doctor creates new referral. | Admin runs AI Scheduler. |
| `SCHEDULED` | Time slot, centre, and radiographer assigned. | Admin confirms AI Scheduler. | Radiographer performs scan. |
| `SCANNED` | Imaging completed and DICOM files uploaded. | Radiographer submits scan. | MO or Radiologist review. |
| `FINALIZED` | Diagnostic report reviewed and signed off. | MO or Radiologist signs off. | Dossier printed / patient notified. |
