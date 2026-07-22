/**
 * imageStorage.ts
 * Persists image blobs in IndexedDB so they survive page refreshes
 * without hitting the ~5 MB localStorage quota.
 *
 * Keys are arbitrary strings (e.g. "img-<timestamp>-<random>").
 * Values are the raw data-URL strings produced by FileReader.
 */

const DB_NAME = 'healthgrid_images';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(dataUrl: string): Promise<string> {
  const key = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(dataUrl, key);
    req.onsuccess = () => resolve(key);
    req.onerror = () => reject(req.error);
  });
}

export async function loadImage(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function loadImages(keys: string[]): Promise<string[]> {
  if (!keys || keys.length === 0) return [];
  const results = await Promise.all(keys.map((k) => loadImage(k)));
  return results.filter((r): r is string => r !== null);
}

export async function deleteImage(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Pre-seed a demo image under a fixed key so it's always available. */
export async function seedDemoImage(key: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    // Only write if the key doesn't already exist
    const getReq = tx.objectStore(STORE_NAME).get(key);
    getReq.onsuccess = () => {
      if (!getReq.result) {
        tx.objectStore(STORE_NAME).put(dataUrl, key);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
