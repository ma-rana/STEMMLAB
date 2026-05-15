// src/services/firebase/activityService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  SoundActivityResult,
  HandFanActivityResult,
  EarthquakeActivityResult,
  StretchActivityResult,
} from '../../types';

// ─── Activity 2: Sound Pollution ───────────────────────────────────────────
export async function saveSoundResult(result: SoundActivityResult): Promise<string> {
  const docRef = await addDoc(collection(db, 'sound_results'), {
    ...result,
    createdAt: Timestamp.fromDate(result.createdAt),
    measurements: result.measurements.map(m => ({
      ...m,
      timestamp: Timestamp.fromDate(m.timestamp),
    })),
  });
  return docRef.id;
}

export async function getSoundLeaderboard(): Promise<SoundActivityResult[]> {
  const q = query(collection(db, 'sound_results'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...(doc.data() as SoundActivityResult),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
  }));
}

// ─── Activity 3: Hand Fan ──────────────────────────────────────────────────
export async function saveHandFanResult(result: HandFanActivityResult): Promise<string> {
  const docRef = await addDoc(collection(db, 'handfan_results'), {
    ...result,
    createdAt: Timestamp.fromDate(result.createdAt),
  });
  return docRef.id;
}

export async function getHandFanLeaderboard(): Promise<HandFanActivityResult[]> {
  const q = query(collection(db, 'handfan_results'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...(doc.data() as HandFanActivityResult),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
  }));
}

// ─── Activity 4: Earthquake ────────────────────────────────────────────────
export async function saveEarthquakeResult(result: EarthquakeActivityResult): Promise<string> {
  const docRef = await addDoc(collection(db, 'earthquake_results'), {
    ...result,
    createdAt: Timestamp.fromDate(result.createdAt),
  });
  return docRef.id;
}

export async function getEarthquakeLeaderboard(): Promise<EarthquakeActivityResult[]> {
  const q = query(collection(db, 'earthquake_results'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...(doc.data() as EarthquakeActivityResult),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
  }));
}

// ─── Activity 5: Stretch ───────────────────────────────────────────────────
export async function saveStretchResult(result: StretchActivityResult): Promise<string> {
  const docRef = await addDoc(collection(db, 'stretch_results'), {
    ...result,
    createdAt: Timestamp.fromDate(result.createdAt),
    attempts: result.attempts.map(a => ({
      ...a,
      timestamp: Timestamp.fromDate(a.timestamp),
    })),
  });
  return docRef.id;
}

export async function getStretchLeaderboard(): Promise<StretchActivityResult[]> {
  const q = query(collection(db, 'stretch_results'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...(doc.data() as StretchActivityResult),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
  }));
}
