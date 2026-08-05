# HealthGrid IQ — Healthcare DICOM & Modality Hardware Simulation Guide

This guide details how to simulate physical medical imaging equipment (**X-Ray, CT Scans, MRI, and Ultrasound**) sending DICOM studies over DICOM C-STORE (`port 4242`) or DICOMweb REST API (`port 8042`) into **Orthanc PACS** and viewing them inside **HealthGrid IQ** across all 4 clinical roles (**Medical Officer, Radiographer, Radiologist, Administrator**).

---

## 1. Quick Start Setup

### Step 1: Start HealthGrid IQ Frontend
```bash
npm run dev
```
App is running at: `http://localhost:5173`

### Step 2: Start PACS Gateway (Choose Method A or Method B)

#### Method A: Real Orthanc PACS Container (Recommended - Docker Desktop)
Start the official Orthanc PACS container:
```bash
cd scripts/orthanc
docker compose up -d
```
* **DICOM C-STORE Port**: `4242`
* **Orthanc Web UI & REST API**: `http://localhost:8042`
* **DICOMweb Endpoint**: `http://localhost:8042/dicom-web/`
* **Registered Modality AE Titles**: `XRAY_ROOM1`, `CT_SCANNER1`, `MRI_SUITE1`, `ULTRASOUND_MOBILE1`

#### Method B: Zero-Install Standalone PACS Server (No Docker Required)
```bash
node scripts/mock_pacs_server.mjs
```
* **PACS Server URL**: `http://localhost:8042`

---

## 2. Hardware Modality DICOM Transmit Simulation (No Real Hardware Required)

You can simulate scanner hardware sending DICOM studies to HealthGrid IQ using **Method 1 (CLI Simulator)** or **Method 2 (In-App 1-Click Push)**:

### Method 1: Command Line Hardware Scanner Simulator
Run the modality transmit script in a terminal window:

```bash
# Simulate X-Ray Radiograph Transmit
node scripts/simulate_modality_send.mjs XRAY CASE-2026-089

# Simulate 24-Slice CT Scan Stack Transmit
node scripts/simulate_modality_send.mjs CT CASE-2026-089

# Simulate Multi-Sequence MRI Series (T1/T2/FLAIR)
node scripts/simulate_modality_send.mjs MRI CASE-2026-089

# Simulate Dynamic Ultrasound Cine Loop Transmit
node scripts/simulate_modality_send.mjs US CASE-2026-089
```

### Method 2: In-App 1-Click Hardware Scan Push
1. Log in as **Administrator** (`admin@healthgrid.com`) or **Radiographer** (`radiographer@healthgrid.com`).
2. Go to **System Infrastructure** (Admin) or **Upload Scans** (Radiographer).
3. Click **Simulate Modality Scan Push** for X-Ray, CT, MRI, or Ultrasound.

---

## 3. End-to-End Clinical Lifecycle Across 4 Core Roles

### Stage 1: Doctor Referral (Medical Officer / MO)
1. Log in as **Medical Officer** (`doctor@healthgrid.com`).
2. Click **New Referral**:
   * Patient: *Ahmad Razak*.
   * Modality: `CT Scan` or `X-Ray` or `MRI` or `Ultrasound`.
   * Body Region: `Chest / Abdomen`
   * Urgency: `Severe`
3. Submit referral. Case status transitions to **`CREATED`** (e.g. `CASE-2026-089`).

### Stage 2: AI Scheduler Mobile PACS Van Dispatch
1. Log in as **Department Coordinator / Admin** (`admin@healthgrid.com`).
2. Open **AI Scheduler Map**.
3. Confirm schedule for `CASE-2026-089`. Case status transitions to **`SCHEDULED`**.

### Stage 3: Scanner Hardware Acquisition & PACS Transmission
Run the CLI hardware simulator or click **Simulate Modality Scan Push** in the Radiographer portal.

### Stage 4: Radiologist Multi-Modality PACS Workstation Review
1. Log in as **Radiologist** (`radiologist@healthgrid.com`).
2. Open **Review Queue** → Select `CASE-2026-089`.
3. Interact with the multi-modality PACS workstation:
   * **CT Scans**: Use mouse wheel / slider for axial slice stack scrolling; toggle Hounsfield Unit presets (**Lung**, **Bone**, **Soft Tissue**, **Brain**).
   * **MRI**: Switch sequence tabs (**T1**, **T2**, **FLAIR**, **DWI**).
   * **Ultrasound**: Control dynamic motion cine loop playback (**Play**, **Pause**, **1x/2x Speed**).
   * **X-Ray**: Adjust zoom, pan, brightness, contrast, inversion, and linear distance measurement.
4. Run **Multimodal Vision AI Pixel Scan**.
5. Input findings and click **Sign Off & Finalize Report**. Case transitions to **`FINALIZED`**.

### Stage 5: Doctor Retrieval & Diagnostic Summary
1. Log in as **Medical Officer** (`doctor@healthgrid.com`).
2. Open **My Cases** → Select `CASE-2026-089`.
3. View the finalized diagnostic report, radiologist signature badge, printable radiology worksheet, and full PACS DICOM scan.
