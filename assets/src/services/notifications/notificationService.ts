// src/services/notifications/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configure how notifications appear ───────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Request permissions ───────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stemm-challenges', {
      name: 'STEMM Challenges',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0052CC',
    });
  }

  return finalStatus === 'granted';
}

// ─── Schedule timed challenge notification ─────────────────────────────────
export async function scheduleActivityReminder(
  activityName: string,
  secondsFromNow: number
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏱️ STEMM Challenge Reminder',
      body: `Time is running out for ${activityName}! Submit your results.`,
      sound: true,
      data: { activityName },
    },
    trigger: {
      seconds: secondsFromNow,
      channelId: 'stemm-challenges',
    } as any,
  });
  return id;
}

// ─── Schedule 20-minute engineering challenge timer ────────────────────────
export async function scheduleEngineeringTimer(activityName: string): Promise<void> {
  // Warning at 15 minutes
  await scheduleActivityReminder(`${activityName} — 5 minutes left!`, 15 * 60);
  // Final at 20 minutes
  await scheduleActivityReminder(`${activityName} — Time's up! Submit now.`, 20 * 60);
}

// ─── Cancel all notifications ──────────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Send immediate notification ──────────────────────────────────────────
export async function sendImmediateNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // immediate
  });
}
