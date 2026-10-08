import { DetectionSnapshot } from '../types/vision';

const STORAGE_KEY = 'visiontrack_detection_history_v1';
const DB_NAME = 'visiontrack_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

// In-memory cache for synchronous access
let memoryCache: DetectionSnapshot[] = [];
let isDbInitialized = false;

// Open or create IndexedDB
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result as IDBDatabase);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Initialize storage: loads from IndexedDB, migrating from localStorage if needed
 */
export async function initStorage(): Promise<DetectionSnapshot[]> {
  // 1. Try to load from IndexedDB
  try {
    const db = await openDatabase();
    const items = await new Promise<DetectionSnapshot[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as DetectionSnapshot[];
        // Sort descending by timestamp
        result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    if (items && items.length > 0) {
      memoryCache = items;
      isDbInitialized = true;
      return memoryCache;
    }
  } catch (err) {
    console.warn('IndexedDB unavailable or empty, falling back to localStorage:', err);
  }

  // 2. Fallback to localStorage and migrate
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache = parsed;
        // Try migrating to IndexedDB in background
        openDatabase()
          .then((db) => {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            for (const item of memoryCache) {
              store.put(item);
            }
          })
          .catch(() => {});
        return memoryCache;
      }
    }
  } catch (err) {
    console.warn('Failed to parse localStorage:', err);
  }

  isDbInitialized = true;
  return memoryCache;
}

/**
 * Synchronous getter returning cached snapshots
 */
export function getSnapshots(): DetectionSnapshot[] {
  if (memoryCache.length > 0 || isDbInitialized) {
    return [...memoryCache];
  }

  // Initial fallback before async init completes
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryCache = parsed;
        return [...memoryCache];
      }
    }
  } catch {
    // Ignore
  }

  return [];
}

/**
 * Save snapshot to IndexedDB and memoryCache, with safe localStorage quota handling
 */
export async function saveSnapshot(snapshot: DetectionSnapshot): Promise<void> {
  // Update memory cache
  memoryCache = [snapshot, ...memoryCache.filter((s) => s.id !== snapshot.id)].slice(0, 50);

  // 1. Save to IndexedDB (virtually unlimited quota for images/blobs)
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB put failed, falling back to localStorage:', err);
  }

  // 2. Safe localStorage backup (with quota protection)
  try {
    // Keep only latest 10 in localStorage to prevent quota exhaustion
    const trimmed = memoryCache.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // QuotaExceededError is safely caught and handled here:
    // Try saving only the top 3, or clear localStorage backup since IndexedDB holds the primary data
    try {
      const minimal = memoryCache.slice(0, 3);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // If still full, remove the key from localStorage so it doesn't cause errors
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Delete a snapshot by ID
 */
export async function deleteSnapshot(id: string): Promise<void> {
  memoryCache = memoryCache.filter((s) => s.id !== id);

  // Remove from IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  }

  // Update localStorage backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache.slice(0, 10)));
  } catch {
    // Ignore
  }
}

/**
 * Clear all snapshots
 */
export async function clearSnapshots(): Promise<void> {
  memoryCache = [];

  // Clear IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear failed:', err);
  }

  // Clear localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
