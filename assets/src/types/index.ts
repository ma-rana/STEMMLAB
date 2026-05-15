// src/types/index.ts

export interface SoundMeasurement {
  id: string;
  action: string;
  prediction: string;
  decibels: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
  wasRight: boolean | null;
}

export interface SoundActivityResult {
  teamId: string;
  teamName: string;
  measurements: SoundMeasurement[];
  createdAt: Date;
}

export interface FanDesign {
  id: string;
  designName: string;
  predictedBend: number;
  actualBend: number | null;
  distance: number;
  material: 'paper' | 'cardboard';
  notes: string;
  wasRight: boolean | null;
}

export interface HandFanActivityResult {
  teamId: string;
  teamName: string;
  designs: FanDesign[];
  createdAt: Date;
}

// ─── Activity 4: Earthquake ────────────────────────────────────────────────
export interface EarthquakeDesign {
  id: string;
  designName: string;        // e.g. "4 folds + 4 pillars"
  foldCount: number;
  pillarCount: number;
  predictedMovement: string; // e.g. "+/- 1cm"
  peakMagnitude: number | null;
  notes: string;
  wasRight: boolean | null;
}

export interface EarthquakeActivityResult {
  teamId: string;
  teamName: string;
  designs: EarthquakeDesign[];
  createdAt: Date;
}

// ─── Activity 5: Stretch Speed & Gracefulness ──────────────────────────────
export interface StretchAttempt {
  id: string;
  memberName: string;
  movementType: string;          // e.g. "Movement 1 – Arm raise"
  durationSeconds: number;
  peakRotationRate: number;      // rad/s
  averageSmoothness: number;     // 0–100
  predictedVibration: string;    // e.g. "+/- 1cm"
  notes: string;
  timestamp: Date;
}

export interface StretchActivityResult {
  teamId: string;
  teamName: string;
  attempts: StretchAttempt[];
  createdAt: Date;
}

export interface Team {
  id: string;
  teamName: string;
  memberNames: string[];
  gradeLevel: string;
  discriminator: string;
}
