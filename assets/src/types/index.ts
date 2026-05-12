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
  designName: string;           // e.g. "1cm back and forward folds"
  predictedBend: number;        // degrees
  actualBend: number | null;    // degrees
  distance: number;             // cm: 15, 30, or 45
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

export interface Team {
  id: string;
  teamName: string;
  memberNames: string[];
  gradeLevel: string;
  discriminator: string;
}
