// src/services/background/backgroundSync.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import {
  getUnsyncedSoundMeasurements, markSoundMeasurementSynced,
  getUnsyncedFanDesigns, markFanDesignSynced,
  getUnsyncedEarthquakeDesigns, markEarthquakeDesignSynced,
  getUnsyncedStretchAttempts, markStretchAttemptSynced,
  getTeamLocal,
} from '../storage/sqliteService';
import {
  saveSoundResult,
  saveHandFanResult,
  saveEarthquakeResult,
  saveStretchResult,
} from '../firebase/activityService';

const SYNC_TASK_NAME = 'STEMM_BACKGROUND_SYNC';

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const team = getTeamLocal();
    if (!team) return BackgroundFetch.BackgroundFetchResult.NoData;

    let didSync = false;

    // Activity 2 sync
    const unsyncedSound = getUnsyncedSoundMeasurements();
    if (unsyncedSound.length > 0) {
      await saveSoundResult({ teamId: team.id, teamName: team.teamName, measurements: unsyncedSound, createdAt: new Date() });
      unsyncedSound.forEach(m => markSoundMeasurementSynced(m.id));
      didSync = true;
    }

    // Activity 3 sync
    const unsyncedFan = getUnsyncedFanDesigns();
    if (unsyncedFan.length > 0) {
      await saveHandFanResult({ teamId: team.id, teamName: team.teamName, designs: unsyncedFan, createdAt: new Date() });
      unsyncedFan.forEach(d => markFanDesignSynced(d.id));
      didSync = true;
    }

    // Activity 4 sync
    const unsyncedEarthquake = getUnsyncedEarthquakeDesigns();
    if (unsyncedEarthquake.length > 0) {
      await saveEarthquakeResult({ teamId: team.id, teamName: team.teamName, designs: unsyncedEarthquake, createdAt: new Date() });
      unsyncedEarthquake.forEach(d => markEarthquakeDesignSynced(d.id));
      didSync = true;
    }

    // Activity 5 sync
    const unsyncedStretch = getUnsyncedStretchAttempts();
    if (unsyncedStretch.length > 0) {
      await saveStretchResult({ teamId: team.id, teamName: team.teamName, attempts: unsyncedStretch, createdAt: new Date() });
      unsyncedStretch.forEach(a => markStretchAttemptSynced(a.id));
      didSync = true;
    }

    return didSync
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (isRegistered) await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
}
