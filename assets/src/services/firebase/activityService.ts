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
import { SoundActivityResult, HandFanActivityResult } from '../../types';

// ─── Activity 2: Sound Pollution ───────────────────────────────────────────

export async function saveSoundResult(result: SoundActivityResult): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'sound_results'), {
      ...result,
      createdAt: Timestamp.fromDate(result.createdAt),
      measurements: result.measurements.map(m => ({
        ...m,
        timestamp: Timestamp.fromDate(m.timestamp),
      })),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving sound result:', error);
    throw error;
  }
}

export async function getSoundLeaderboard(): Promise<SoundActivityResult[]> {
  try {
    const q = query(
      collection(db, 'sound_results'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...(doc.data() as SoundActivityResult),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
    }));
  } catch (error) {
    console.error('Error fetching sound leaderboard:', error);
    throw error;
  }
}

// ─── Activity 3: Hand Fan ──────────────────────────────────────────────────

export async function saveHandFanResult(result: HandFanActivityResult): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'handfan_results'), {
      ...result,
      createdAt: Timestamp.fromDate(result.createdAt),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving hand fan result:', error);
    throw error;
  }
}

export async function getHandFanLeaderboard(): Promise<HandFanActivityResult[]> {
  try {
    const q = query(
      collection(db, 'handfan_results'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...(doc.data() as HandFanActivityResult),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
    }));
  } catch (error) {
    console.error('Error fetching hand fan leaderboard:', error);
    throw error;
  }
}
