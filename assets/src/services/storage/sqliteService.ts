// src/services/storage/sqliteService.ts
import * as SQLite from 'expo-sqlite';
import {
  Team,
  SoundMeasurement,
  FanDesign,
  EarthquakeDesign,
  StretchAttempt,
} from '../../types';

const db = SQLite.openDatabaseSync('stemmlab.db');

// ─── Initialize all tables ─────────────────────────────────────────────────
export function initDatabase(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      teamName TEXT NOT NULL,
      memberNames TEXT NOT NULL,
      gradeLevel TEXT NOT NULL,
      discriminator TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sound_measurements (
      id TEXT PRIMARY KEY,
      teamId TEXT NOT NULL,
      action TEXT NOT NULL,
      prediction TEXT,
      decibels REAL NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp TEXT NOT NULL,
      wasRight INTEGER,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS fan_designs (
      id TEXT PRIMARY KEY,
      teamId TEXT NOT NULL,
      designName TEXT NOT NULL,
      predictedBend REAL NOT NULL,
      actualBend REAL,
      distance REAL NOT NULL,
      material TEXT NOT NULL,
      notes TEXT,
      wasRight INTEGER,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS earthquake_designs (
      id TEXT PRIMARY KEY,
      teamId TEXT NOT NULL,
      designName TEXT NOT NULL,
      foldCount INTEGER NOT NULL,
      pillarCount INTEGER NOT NULL,
      predictedMovement TEXT NOT NULL,
      peakMagnitude REAL,
      notes TEXT,
      wasRight INTEGER,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stretch_attempts (
      id TEXT PRIMARY KEY,
      teamId TEXT NOT NULL,
      memberName TEXT NOT NULL,
      movementType TEXT NOT NULL,
      durationSeconds INTEGER NOT NULL,
      peakRotationRate REAL NOT NULL,
      averageSmoothness REAL NOT NULL,
      predictedVibration TEXT NOT NULL,
      notes TEXT,
      timestamp TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);
}

// ─── Team ──────────────────────────────────────────────────────────────────
export function saveTeamLocal(team: Team): void {
  db.runSync(
    `INSERT OR REPLACE INTO teams
      (id, teamName, memberNames, gradeLevel, discriminator, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      team.id,
      team.teamName,
      JSON.stringify(team.memberNames),
      team.gradeLevel,
      team.discriminator,
      new Date().toISOString(),
    ]
  );
}

export function getTeamLocal(): Team | null {
  const row = db.getFirstSync<any>(
    `SELECT * FROM teams ORDER BY createdAt DESC LIMIT 1`
  );
  if (!row) return null;
  return { ...row, memberNames: JSON.parse(row.memberNames) };
}

// ─── Activity 2: Sound ─────────────────────────────────────────────────────
export function saveSoundMeasurementLocal(teamId: string, m: SoundMeasurement): void {
  db.runSync(
    `INSERT OR REPLACE INTO sound_measurements
      (id, teamId, action, prediction, decibels, latitude, longitude, timestamp, wasRight, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      m.id, teamId, m.action, m.prediction ?? '',
      m.decibels, m.latitude, m.longitude,
      m.timestamp.toISOString(),
      m.wasRight === null ? null : m.wasRight ? 1 : 0,
    ]
  );
}

export function getSoundMeasurementsLocal(teamId: string): SoundMeasurement[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM sound_measurements WHERE teamId = ? ORDER BY timestamp DESC`,
    [teamId]
  );
  return rows.map(r => ({
    ...r,
    timestamp: new Date(r.timestamp),
    wasRight: r.wasRight === null ? null : r.wasRight === 1,
  }));
}

export function getUnsyncedSoundMeasurements(): SoundMeasurement[] {
  const rows = db.getAllSync<any>(`SELECT * FROM sound_measurements WHERE synced = 0`);
  return rows.map(r => ({
    ...r,
    timestamp: new Date(r.timestamp),
    wasRight: r.wasRight === null ? null : r.wasRight === 1,
  }));
}

export function markSoundMeasurementSynced(id: string): void {
  db.runSync(`UPDATE sound_measurements SET synced = 1 WHERE id = ?`, [id]);
}

// ─── Activity 3: Hand Fan ──────────────────────────────────────────────────
export function saveFanDesignLocal(teamId: string, d: FanDesign): void {
  db.runSync(
    `INSERT OR REPLACE INTO fan_designs
      (id, teamId, designName, predictedBend, actualBend, distance, material, notes, wasRight, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      d.id, teamId, d.designName, d.predictedBend,
      d.actualBend ?? null, d.distance, d.material, d.notes ?? '',
      d.wasRight === null ? null : d.wasRight ? 1 : 0,
    ]
  );
}

export function getFanDesignsLocal(teamId: string): FanDesign[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM fan_designs WHERE teamId = ? ORDER BY rowid ASC`,
    [teamId]
  );
  return rows.map(r => ({
    ...r,
    wasRight: r.wasRight === null ? null : r.wasRight === 1,
  }));
}

export function getUnsyncedFanDesigns(): FanDesign[] {
  const rows = db.getAllSync<any>(`SELECT * FROM fan_designs WHERE synced = 0`);
  return rows.map(r => ({
    ...r,
    wasRight: r.wasRight === null ? null : r.wasRight === 1,
  }));
}

export function markFanDesignSynced(id: string): void {
  db.runSync(`UPDATE fan_designs SET synced = 1 WHERE id = ?`, [id]);
}

// ─── Activity 4: Earthquake ────────────────────────────────────────────────
export function saveEarthquakeDesignLocal(teamId: string, d: EarthquakeDesign): void {
  db.runSync(
    `INSERT OR REPLACE INTO earthquake_designs
      (id, teamId, designName, foldCount, pillarCount, predictedMovement, peakMagnitude, notes, wasRight, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      d.id, teamId, d.designName, d.foldCount, d.pillarCount,
      d.predictedMovement, d.peakMagnitude ?? null, d.notes ?? '',
      d.wasRight === null ? null : d.wasRight ? 1 : 0,
    ]
  );
}

export function getEarthquakeDesignsLocal(teamId: string): EarthquakeDesign[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM earthquake_designs WHERE teamId = ? ORDER BY rowid ASC`,
    [teamId]
  );
  return rows.map(r => ({
    ...r,
    wasRight: r.wasRight === null ? null : r.wasRight === 1,
  }));
}

export function getUnsyncedEarthquakeDesigns(): EarthquakeDesign[] {
  const rows = db.getAllSync<any>(`SELECT * FROM earthquake_designs WHERE synced = 0`);
  return rows.map(r => ({
    ...r,
    wasRight: r.wasRight === null ? null : r.wasRight === 1,
  }));
}

export function markEarthquakeDesignSynced(id: string): void {
  db.runSync(`UPDATE earthquake_designs SET synced = 1 WHERE id = ?`, [id]);
}

// ─── Activity 5: Stretch ───────────────────────────────────────────────────
export function saveStretchAttemptLocal(teamId: string, a: StretchAttempt): void {
  db.runSync(
    `INSERT OR REPLACE INTO stretch_attempts
      (id, teamId, memberName, movementType, durationSeconds, peakRotationRate,
       averageSmoothness, predictedVibration, notes, timestamp, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      a.id, teamId, a.memberName, a.movementType,
      a.durationSeconds, a.peakRotationRate, a.averageSmoothness,
      a.predictedVibration, a.notes ?? '',
      a.timestamp.toISOString(),
    ]
  );
}

export function getStretchAttemptsLocal(teamId: string): StretchAttempt[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM stretch_attempts WHERE teamId = ? ORDER BY timestamp ASC`,
    [teamId]
  );
  return rows.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
}

export function getUnsyncedStretchAttempts(): StretchAttempt[] {
  const rows = db.getAllSync<any>(`SELECT * FROM stretch_attempts WHERE synced = 0`);
  return rows.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
}

export function markStretchAttemptSynced(id: string): void {
  db.runSync(`UPDATE stretch_attempts SET synced = 1 WHERE id = ?`, [id]);
}
