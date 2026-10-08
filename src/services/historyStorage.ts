import { DetectionSnapshot } from '../types/vision';

const STORAGE_KEY = 'visiontrack_detection_history_v1';

export function getSnapshots(): DetectionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Error reading snapshots from localStorage:', err);
    return [];
  }
}

export function saveSnapshot(snapshot: DetectionSnapshot): void {
  try {
    const current = getSnapshots();
    // Keep up to 50 snapshots
    const updated = [snapshot, ...current].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving snapshot to localStorage:', err);
  }
}

export function deleteSnapshot(id: string): void {
  try {
    const current = getSnapshots();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting snapshot:', err);
  }
}

export function clearSnapshots(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing snapshots:', err);
  }
}
