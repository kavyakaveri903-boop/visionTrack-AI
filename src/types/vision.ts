export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrackedObject {
  id: number;
  displayId: string; // e.g. "01", "07"
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  history: Array<{ x: number; y: number }>;
  velocity: { vx: number; vy: number };
  age: number; // total frames seen
  lost: number; // consecutive frames lost
  inZone: boolean;
  color: string;
  isVehicle: boolean;
  isPerson: boolean;
}

export interface SmartZone {
  x: number;      // percentage (0 to 100)
  y: number;      // percentage (0 to 100)
  width: number;  // percentage (0 to 100)
  height: number; // percentage (0 to 100)
  active: boolean;
  name: string;
}

export interface ZoneStats {
  objectsInside: number;
  objectsEntered: number;
  objectsExited: number;
}

export interface ZoneAlert {
  id: string;
  timestamp: number;
  formattedTime: string;
  message: string;
  objectClass: string;
  trackingId: string;
  type: 'enter' | 'exit';
}

export interface SceneStats {
  totalDetected: number;
  peopleCount: number;
  vehicleCount: number;
  trackingCount: number;
  classCounts: Record<string, number>;
  sceneSummary: string;
}

export interface DetectionSnapshot {
  id: string;
  timestamp: number;
  dateFormatted: string;
  timeFormatted: string;
  imageSrc: string; // snapshot data URL
  totalObjects: number;
  peopleCount: number;
  vehicleCount: number;
  classesDetected: string[];
  classCounts: Record<string, number>;
  trackedObjects: Array<{
    displayId: string;
    class: string;
    score: number;
    bbox: [number, number, number, number];
  }>;
  sceneSummary: string;
}
