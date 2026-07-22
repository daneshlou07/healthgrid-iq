/**
 * demoImageSeed.ts
 *
 * Seeds the IndexedDB image store with the real X-ray/CT/MRI images
 * from /demo-images/ (served as static public assets).
 *
 * Each demo report gets its own distinct key that maps to the
 * correct scan image from the sample radiology report dataset.
 *
 * Keys are stable — they must match the imageKeys arrays in mockData.ts.
 */

import { seedDemoImage } from './imageStorage';

// ── Stable key constants ──────────────────────────────────────────────────────
// These must match the imageKeys referenced in mockData.ts reports.
export const DEMO_IMG_KEYS = {
  CT_ABDOMEN_PELVIS: 'demo-img-ct-abdomen-pelvis',   // HG-DEMO-0001 Abdominal Pain
  CT_ABDOMEN_LIVER: 'demo-img-ct-abdomen-liver',    // HG-DEMO-0002 Liver Lesion
  CHEST_XRAY_RIB: 'demo-img-chest-xray-rib',      // HG-DEMO-0003 Rib Fracture
  CT_BRAIN_STROKE: 'demo-img-ct-brain-stroke',     // HG-DEMO-0004 Stroke Follow-Up
  CT_PARANASAL_SINUS: 'demo-img-ct-paranasal-sinus',  // HG-DEMO-0005 Sinus Disease
  SPINE_XRAY_TRAUMA: 'demo-img-spine-xray-trauma',   // HG-DEMO-0006 Foreign Body ENT / X-Ray Neck
  MRI_CERVICAL_SPINE: 'demo-img-mri-cervical-spine',  // HG-DEMO-0007 Cervical Disc Compression
  SPINE_XRAY_TRAUMA_2: 'demo-img-spine-xray-trauma-2', // HG-DEMO-0008 Cervical Spondylosis (same image)
  MRI_SPINAL_STENOSIS: 'demo-img-mri-spinal-stenosis', // HG-DEMO-0009 Degenerative Spine / Spondylosis
} as const;

// ── Fetch a public asset and convert to base64 data URL ───────────────────────
async function fetchAsDataUrl(publicPath: string): Promise<string> {
  const response = await fetch(publicPath);
  if (!response.ok) throw new Error(`Failed to fetch ${publicPath}: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ── Seed all demo images ──────────────────────────────────────────────────────
export async function seedDemoXray(): Promise<void> {
  const seeds: Array<{ key: string; path: string }> = [
    { key: DEMO_IMG_KEYS.CT_ABDOMEN_PELVIS, path: '/demo-images/ct-abdomen-pelvis.png' },
    { key: DEMO_IMG_KEYS.CT_ABDOMEN_LIVER, path: '/demo-images/ct-abdomen-liver.png' },
    { key: DEMO_IMG_KEYS.CHEST_XRAY_RIB, path: '/demo-images/chest-xray-rib-fracture.png' },
    { key: DEMO_IMG_KEYS.CT_BRAIN_STROKE, path: '/demo-images/ct-brain-stroke.png' },
    { key: DEMO_IMG_KEYS.CT_PARANASAL_SINUS, path: '/demo-images/ct-paranasal-sinus.png' },
    { key: DEMO_IMG_KEYS.SPINE_XRAY_TRAUMA, path: '/demo-images/spine-xray-trauma.png' },
    { key: DEMO_IMG_KEYS.MRI_CERVICAL_SPINE, path: '/demo-images/mri-cervical-spine.png' },
    { key: DEMO_IMG_KEYS.SPINE_XRAY_TRAUMA_2, path: '/demo-images/spine-xray-trauma.png' },
    { key: DEMO_IMG_KEYS.MRI_SPINAL_STENOSIS, path: '/demo-images/mri-spinal-stenosis.png' },
  ];

  await Promise.allSettled(
    seeds.map(async ({ key, path }) => {
      try {
        const dataUrl = await fetchAsDataUrl(path);
        await seedDemoImage(key, dataUrl);
      } catch (err) {
        console.warn(`Demo image seed skipped for key "${key}":`, err);
      }
    })
  );
}
