import { RawDetection } from './detector';
import { TrackedObject, SmartZone, ZoneStats, ZoneAlert } from '../types/vision';

// Vibrant high-contrast cyberpunk / sci-fi neon colors for tracking IDs
const TRACK_COLORS = [
  '#00f0ff', // Electric Cyan
  '#a855f7', // Vivid Violet
  '#3b82f6', // Electric Blue
  '#10b981', // Emerald Neon
  '#f59e0b', // Amber
  '#ec4899', // Hot Pink
  '#06b6d4', // Aqua
  '#8b5cf6', // Indigo Violet
  '#14b8a6', // Teal
  '#f97316', // Neon Orange
  '#6366f1', // Indigo
  '#e11d48', // Crimson Rose
];

export const VEHICLE_CLASSES = new Set([
  'car',
  'truck',
  'bus',
  'motorcycle',
  'bicycle',
  'train',
  'airplane',
  'boat',
]);

/**
 * Calculates Intersection over Union (IoU) between two bounding boxes [x, y, w, h]
 */
export function calculateIoU(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const [ax, ay, aw, ah] = boxA;
  const [bx, by, bw, bh] = boxB;

  const xLeft = Math.max(ax, bx);
  const yTop = Math.max(ay, by);
  const xRight = Math.min(ax + aw, bx + bw);
  const yBottom = Math.min(ay + ah, by + bh);

  if (xRight <= xLeft || yBottom <= yTop) {
    return 0;
  }

  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const areaA = aw * ah;
  const areaB = bw * bh;
  const unionArea = areaA + areaB - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Calculates Euclidean distance between centroids of two boxes
 */
function centroidDistance(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const cAx = boxA[0] + boxA[2] / 2;
  const cAy = boxA[1] + boxA[3] / 2;
  const cBx = boxB[0] + boxB[2] / 2;
  const cBy = boxB[1] + boxB[3] / 2;

  const dx = cAx - cBx;
  const dy = cAy - cBy;
  return Math.sqrt(dx * dx + dy * dy);
}

export class ObjectTracker {
  private nextId = 1;
  private activeTracks: Map<number, TrackedObject> = new Map();
  private maxLostFrames = 18; // Keep tracks alive for ~0.6s of occlusion
  private iouMatchThreshold = 0.20; // IoU threshold for matching
  private maxCentroidDistance = 150; // Fallback distance matching in pixels

  // Smart zone tracking
  private zoneStats: ZoneStats = {
    objectsInside: 0,
    objectsEntered: 0,
    objectsExited: 0,
  };
  private onAlertCallback?: (alert: ZoneAlert) => void;

  constructor(onAlert?: (alert: ZoneAlert) => void) {
    this.onAlertCallback = onAlert;
  }

  public setAlertCallback(callback: (alert: ZoneAlert) => void) {
    this.onAlertCallback = callback;
  }

  public reset() {
    this.nextId = 1;
    this.activeTracks.clear();
    this.zoneStats = {
      objectsInside: 0,
      objectsEntered: 0,
      objectsExited: 0,
    };
  }

  public resetZoneStats() {
    this.zoneStats = {
      objectsInside: 0,
      objectsEntered: 0,
      objectsExited: 0,
    };
    for (const track of this.activeTracks.values()) {
      track.inZone = false;
    }
  }

  public getZoneStats(): ZoneStats {
    return { ...this.zoneStats };
  }

  /**
   * Main tracking update step: Associates new detections with active tracks,
   * generates persistent tracking IDs, updates trajectories and monitors Smart Zone.
   */
  public update(
    detections: RawDetection[],
    zone: SmartZone | null,
    frameWidth: number,
    frameHeight: number
  ): TrackedObject[] {
    const activeList = Array.from(this.activeTracks.values());
    const matchedTrackIds = new Set<number>();
    const matchedDetectionIndices = new Set<number>();

    // 1. Build cost / similarity matrix: IoU prioritized, centroid distance as fallback
    // Matches same class first
    const candidates: Array<{
      trackId: number;
      detIndex: number;
      score: number;
    }> = [];

    for (const track of activeList) {
      // Predict track position using velocity
      const predictedBbox: [number, number, number, number] = [
        track.bbox[0] + track.velocity.vx,
        track.bbox[1] + track.velocity.vy,
        track.bbox[2],
        track.bbox[3],
      ];

      detections.forEach((det, detIdx) => {
        // Must match class
        if (det.class !== track.class) return;

        const iou = calculateIoU(predictedBbox, det.bbox);
        const dist = centroidDistance(predictedBbox, det.bbox);

        // Normalize distance score
        const maxDim = Math.max(frameWidth, frameHeight) || 640;
        const normalizedDist = Math.max(0, 1 - dist / (maxDim * 0.35));

        // Combined score: IoU heavily weighted
        const combinedScore = iou > 0 ? iou * 0.7 + normalizedDist * 0.3 : normalizedDist * 0.4;

        if (iou >= this.iouMatchThreshold || dist <= this.maxCentroidDistance) {
          candidates.push({
            trackId: track.id,
            detIndex: detIdx,
            score: combinedScore,
          });
        }
      });
    }

    // Sort candidate matches by highest similarity score
    candidates.sort((a, b) => b.score - a.score);

    // Greedy assignment
    for (const match of candidates) {
      if (matchedTrackIds.has(match.trackId) || matchedDetectionIndices.has(match.detIndex)) {
        continue;
      }

      matchedTrackIds.add(match.trackId);
      matchedDetectionIndices.add(match.detIndex);

      const track = this.activeTracks.get(match.trackId);
      const det = detections[match.detIndex];

      if (track) {
        // Compute velocity from previous centroid
        const prevCx = track.bbox[0] + track.bbox[2] / 2;
        const prevCy = track.bbox[1] + track.bbox[3] / 2;
        const newCx = det.bbox[0] + det.bbox[2] / 2;
        const newCy = det.bbox[1] + det.bbox[3] / 2;

        const rawVx = newCx - prevCx;
        const rawVy = newCy - prevCy;

        // Smooth velocity (exponential moving average)
        track.velocity = {
          vx: track.velocity.vx * 0.4 + rawVx * 0.6,
          vy: track.velocity.vy * 0.4 + rawVy * 0.6,
        };

        // Smooth bounding box slightly to reduce jitter
        track.bbox = [
          Math.round(track.bbox[0] * 0.25 + det.bbox[0] * 0.75),
          Math.round(track.bbox[1] * 0.25 + det.bbox[1] * 0.75),
          Math.round(track.bbox[2] * 0.25 + det.bbox[2] * 0.75),
          Math.round(track.bbox[3] * 0.25 + det.bbox[3] * 0.75),
        ];

        track.score = det.score;
        track.lost = 0;
        track.age += 1;

        // Add history point for trajectory line
        track.history.push({ x: Math.round(newCx), y: Math.round(newCy) });
        if (track.history.length > 25) {
          track.history.shift();
        }
      }
    }

    // 2. Create new tracks for unmatched detections
    detections.forEach((det, detIdx) => {
      if (!matchedDetectionIndices.has(detIdx)) {
        const id = this.nextId++;
        const color = TRACK_COLORS[(id - 1) % TRACK_COLORS.length];
        const displayId = id.toString().padStart(2, '0');
        const cx = Math.round(det.bbox[0] + det.bbox[2] / 2);
        const cy = Math.round(det.bbox[1] + det.bbox[3] / 2);

        const newTrack: TrackedObject = {
          id,
          displayId,
          class: det.class,
          score: det.score,
          bbox: [...det.bbox],
          history: [{ x: cx, y: cy }],
          velocity: { vx: 0, vy: 0 },
          age: 1,
          lost: 0,
          inZone: false,
          color,
          isVehicle: VEHICLE_CLASSES.has(det.class),
          isPerson: det.class === 'person',
        };

        this.activeTracks.set(id, newTrack);
      }
    });

    // 3. Increment lost counter for unmatched active tracks and prune dead ones
    for (const track of activeList) {
      if (!matchedTrackIds.has(track.id)) {
        track.lost += 1;
        // Extrapolate position with current velocity
        track.bbox = [
          Math.round(track.bbox[0] + track.velocity.vx * 0.6),
          Math.round(track.bbox[1] + track.velocity.vy * 0.6),
          track.bbox[2],
          track.bbox[3],
        ];

        if (track.lost > this.maxLostFrames) {
          // If the object was in zone when lost, record exit
          if (track.inZone) {
            this.zoneStats.objectsExited += 1;
          }
          this.activeTracks.delete(track.id);
        }
      }
    }

    // 4. Update Smart Zone status & triggers
    let currentlyInsideZone = 0;

    for (const track of this.activeTracks.values()) {
      if (track.lost > 3) continue; // Skip stale frames for alerts

      let inside = false;
      if (zone && zone.active && frameWidth > 0 && frameHeight > 0) {
        // Convert zone percentage to pixel coordinates
        const zx = (zone.x / 100) * frameWidth;
        const zy = (zone.y / 100) * frameHeight;
        const zw = (zone.width / 100) * frameWidth;
        const zh = (zone.height / 100) * frameHeight;

        // Check object centroid
        const cx = track.bbox[0] + track.bbox[2] / 2;
        const cy = track.bbox[1] + track.bbox[3] / 2;

        const centroidIn =
          cx >= zx && cx <= zx + zw && cy >= zy && cy <= zy + zh;

        // Also check if bounding box has significant overlap (> 20%) with zone
        const overlapIoU = calculateIoU(track.bbox, [zx, zy, zw, zh]);

        inside = centroidIn || overlapIoU > 0.15;
      }

      // Check transition: Entered Zone
      if (inside && !track.inZone) {
        track.inZone = true;
        this.zoneStats.objectsEntered += 1;

        const now = Date.now();
        const dateObj = new Date(now);
        const formattedTime = dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const alert: ZoneAlert = {
          id: `alert-${track.id}-${now}`,
          timestamp: now,
          formattedTime,
          message: `${track.class.toUpperCase()} ID ${track.displayId} entered the monitored zone`,
          objectClass: track.class,
          trackingId: track.displayId,
          type: 'enter',
        };

        this.onAlertCallback?.(alert);
      } else if (!inside && track.inZone) {
        // Transition: Exited Zone
        track.inZone = false;
        this.zoneStats.objectsExited += 1;

        const now = Date.now();
        const dateObj = new Date(now);
        const formattedTime = dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const alert: ZoneAlert = {
          id: `exit-${track.id}-${now}`,
          timestamp: now,
          formattedTime,
          message: `${track.class.toUpperCase()} ID ${track.displayId} exited the monitored zone`,
          objectClass: track.class,
          trackingId: track.displayId,
          type: 'exit',
        };

        this.onAlertCallback?.(alert);
      }

      if (track.inZone) {
        currentlyInsideZone += 1;
      }
    }

    this.zoneStats.objectsInside = currentlyInsideZone;

    // Return currently visible active tracks (lost <= 3 frames)
    return Array.from(this.activeTracks.values()).filter((t) => t.lost <= 3);
  }
}
