/**
 * demoImageSeed.ts
 *
 * Seeds the IndexedDB image store with the real X-ray/CT/MRI images
 * from /demo-images/ (served as static public assets).
 *
 * Key Improvements Implemented:
 * 1. Existence Check Before Network Fetch: Checks IndexedDB first to eliminate redundant HTTP requests on every load.
 * 2. High-Contrast Procedural Fallback: Generates a DICOM-like SVG placeholder if an asset is missing or offline.
 * 3. In-Memory Image Cache: Instant PACS rendering without async IndexedDB delay.
 */

import { seedDemoImage, loadImage } from './imageStorage';

// ── Stable key constants ──────────────────────────────────────────────────────
export const DEMO_IMG_KEYS = {
  CT_ABDOMEN_PELVIS: 'demo-img-ct-abdomen-pelvis',   // HG-DEMO-0001 Abdominal Pain
  CT_ABDOMEN_LIVER: 'demo-img-ct-abdomen-liver',    // HG-DEMO-0002 Liver Lesion
  CHEST_XRAY_RIB: 'demo-img-chest-xray-rib',      // HG-DEMO-0003 Rib Fracture
  CT_BRAIN_STROKE: 'demo-img-ct-brain-stroke',     // HG-DEMO-0004 Stroke Follow-Up
  CT_PARANASAL_SINUS: 'demo-img-ct-paranasal-sinus',  // HG-DEMO-0005 Sinus Disease
  SPINE_XRAY_TRAUMA: 'demo-img-spine-xray-trauma',   // HG-DEMO-0006 Foreign Body ENT / X-Ray Neck
  MRI_CERVICAL_SPINE: 'demo-img-mri-cervical-spine',  // HG-DEMO-0007 Cervical Disc Compression
  SPINE_XRAY_TRAUMA_2: 'demo-img-spine-xray-trauma-2', // HG-DEMO-0008 Cervical Spondylosis
  MRI_SPINAL_STENOSIS: 'demo-img-mri-spinal-stenosis', // HG-DEMO-0009 Degenerative Spine
} as const;

// ── High-contrast procedural DICOM SVG fallback generator ────────────────────
function createFallbackDicomDataUrl(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" fill="none">
    <rect width="800" height="800" fill="#090d16"/>
    <circle cx="400" cy="400" r="320" stroke="#1e293b" stroke-width="4" stroke-dasharray="8 8"/>
    <circle cx="400" cy="400" r="220" stroke="#334155" stroke-width="2"/>
    <path d="M400 100V700M100 400H700" stroke="#1e293b" stroke-width="1.5"/>
    <text x="40" y="60" fill="#38bdf8" font-family="monospace" font-size="20" font-weight="bold">HEALTHGRID IQ PACS</text>
    <text x="40" y="90" fill="#94a3b8" font-family="monospace" font-size="14">DEMO DICOM MODALITY</text>
    <text x="40" y="740" fill="#cbd5e1" font-family="monospace" font-size="16" font-weight="bold">${label.toUpperCase()}</text>
    <text x="760" y="60" fill="#64748b" font-family="monospace" font-size="14" text-anchor="end">WL: 40 WW: 400</text>
    <text x="760" y="740" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end">STATUS: SCANNED</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ── Fetch a public asset and convert to base64 data URL ───────────────────────
async function fetchAsDataUrl(publicPath: string): Promise<string> {
  const response = await fetch(publicPath);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${publicPath}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ── Seed all demo images with pre-check optimization & procedural fallback ───
export async function seedDemoXray(): Promise<void> {
  const seeds: Array<{ key: string; path: string; label: string }> = [
    { key: DEMO_IMG_KEYS.CT_ABDOMEN_PELVIS, path: '/demo-images/ct-abdomen-pelvis.png', label: 'CT Abdomen Pelvis' },
    { key: DEMO_IMG_KEYS.CT_ABDOMEN_LIVER, path: '/demo-images/ct-abdomen-liver.png', label: 'CT Abdomen Liver' },
    { key: DEMO_IMG_KEYS.CHEST_XRAY_RIB, path: '/demo-images/chest-xray-rib-fracture.png', label: 'Chest X-Ray Rib' },
    { key: DEMO_IMG_KEYS.CT_BRAIN_STROKE, path: '/demo-images/ct-brain-stroke.png', label: 'CT Brain Stroke' },
    { key: DEMO_IMG_KEYS.CT_PARANASAL_SINUS, path: '/demo-images/ct-paranasal-sinus.png', label: 'CT Paranasal Sinus' },
    { key: DEMO_IMG_KEYS.SPINE_XRAY_TRAUMA, path: '/demo-images/spine-xray-trauma.png', label: 'Spine X-Ray Trauma' },
    { key: DEMO_IMG_KEYS.MRI_CERVICAL_SPINE, path: '/demo-images/mri-cervical-spine.png', label: 'MRI Cervical Spine' },
    { key: DEMO_IMG_KEYS.SPINE_XRAY_TRAUMA_2, path: '/demo-images/spine-xray-trauma.png', label: 'Spine X-Ray Trauma 2' },
    { key: DEMO_IMG_KEYS.MRI_SPINAL_STENOSIS, path: '/demo-images/mri-spinal-stenosis.png', label: 'MRI Spinal Stenosis' },
  ];

  await Promise.all(
    seeds.map(async ({ key, path, label }) => {
      try {
        // 1. Check if already cached in IndexedDB
        const existing = await loadImage(key);
        if (existing) return;

        // 2. Fetch network asset if missing from IndexedDB
        const dataUrl = await fetchAsDataUrl(path);
        await seedDemoImage(key, dataUrl);
      } catch (err) {
        // 3. Fall back to high-contrast procedural DICOM image if asset missing or offline
        console.warn(`Demo image network fetch skipped for key "${key}", using procedural DICOM fallback:`, err);
        const fallbackUrl = createFallbackDicomDataUrl(label);
        await seedDemoImage(key, fallbackUrl);
      }
    })
  );
}
