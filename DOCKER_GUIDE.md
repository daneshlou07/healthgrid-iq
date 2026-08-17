# HealthGrid IQ — Docker & On-Premise Deployment Guide

This guide provides instructions for deploying **HealthGrid IQ** using Docker and Docker Compose for hospital on-premise servers or MIS internal environments.

---

## 1. Architecture Overview

```
+-------------------------------------------------------------+
|                      Hospital Network / VM                  |
|                                                             |
|   +--------------------------+   +----------------------+   |
|   | healthgrid_app           |   | healthgrid_orthanc_  |   |
|   | (Nginx + React SPA)      |   | pacs (Orthanc DICOM) |   |
|   | Port: 3000 -> 80         |   | Ports: 8042 / 4242   |   |
|   +------------+-------------+   +-----------+----------+   |
|                |                             |              |
+----------------|-----------------------------|--------------+
                 |                             |
                 v                             v
           End-User Browser             Hospital Imaging
         (Doctors / Radiographers)    (CT / MRI / X-Ray Machines)
```

### Services Included

| Container Name | Technology | Port | Description |
| :--- | :--- | :--- | :--- |
| **`healthgrid_app`** | Node 20 (Build) + Nginx Alpine (Serve) | `3000` (or `80`) | Main web portal (SPA) with clinical routing and dashboards. |
| **`healthgrid_orthanc_pacs`** | Osimis Orthanc PACS | `8042` (Web/REST), `4242` (DICOM) | DICOM server for receiving and querying medical images. |

---

## 2. Prerequisites

* **Docker Engine** (version 20.10 or newer)
* **Docker Compose** (v2 or newer)
* Git installed on the server

---

## 3. Quick Start (1-Command Launch)

### Step 1: Clone Repository
```bash
git clone https://github.com/YourOrg/healthgrid-iq.git
cd healthgrid-iq
```

### Step 2: Configure Environment Variables (Optional)
If connecting to Firebase cloud services, copy the environment template:
```bash
cp .env.example .env
```
Ensure your Firebase credentials are filled in `.env`.

### Step 3: Build & Start All Services
```bash
docker compose up -d --build
```

### Step 4: Verify Running Services
```bash
docker compose ps
```

---

## 4. Accessing the Services

* **HealthGrid IQ Portal:** `http://<SERVER_IP>:3000`
* **Orthanc PACS Explorer / API:** `http://<SERVER_IP>:8042`
* **DICOM C-STORE Modality Endpoint:** `dicom://<SERVER_IP>:4242` (AET: `ORTHANC`)

---

## 5. Common Maintenance Commands

### View Logs
```bash
# View all logs
docker compose logs -f

# View web app logs only
docker compose logs -f healthgrid-app

# View PACS server logs only
docker compose logs -f orthanc-pacs
```

### Stop Services
```bash
docker compose down
```

### Update to Latest Version
```bash
git pull origin master
docker compose up -d --build
```

### Restart Services
```bash
docker compose restart
```

---

## 6. Port Customization

If port `3000` or `8042` is occupied on the hospital server, edit `docker-compose.yml`:
```yaml
ports:
  - "8080:80"   # Change 3000 to 8080 or any preferred port
```
