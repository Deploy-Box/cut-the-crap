import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
}

export async function requestTimerNotifications(): Promise<boolean> {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function scheduleTimerNotification(
  title: string,
  seconds: number
): Promise<string | null> {
  if (!Notifications) return null;
  const allowed = await requestTimerNotifications();
  if (!allowed) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Cooking timer finished',
      body: `${title} is ready.`,
      sound: 'default',
    },
    trigger: { seconds: Math.max(1, seconds) } as never,
  });
}

export async function cancelTimerNotification(notificationId: string | null) {
  if (!Notifications || !notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
