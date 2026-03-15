import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission to send notifications.
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a local notification to fire after `delaySec` seconds.
 * If delaySec is 0, fires immediately via the null trigger.
 */
export async function scheduleNotification(
  title: string,
  body: string,
  delaySec: number = 0,
): Promise<string> {
  const trigger = delaySec > 0 ? { seconds: delaySec } : null;

  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: trigger as any,
  });
}

/**
 * Send a test notification to verify the system works.
 */
export async function sendTestNotification(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await scheduleNotification(
    'tADiHD Notifications Active',
    'You will receive alerts for timers, events, and tasks.',
  );
  return true;
}

/**
 * Schedule a timer completion notification.
 */
export async function scheduleTimerNotification(
  taskTitle: string,
  durationMinutes: number,
): Promise<string> {
  return scheduleNotification(
    'Timer Complete',
    `Your ${durationMinutes}m session for "${taskTitle}" is done!`,
    durationMinutes * 60,
  );
}

/**
 * Schedule a transition warning notification.
 */
export async function scheduleTransitionWarning(
  taskTitle: string,
  warningMinutes: number,
  totalMinutes: number,
): Promise<string> {
  const delaySec = (totalMinutes - warningMinutes) * 60;
  if (delaySec <= 0) return '';

  return scheduleNotification(
    'Transition Warning',
    `${warningMinutes}m left on "${taskTitle}"`,
    delaySec,
  );
}

/**
 * Schedule a task due reminder.
 */
export async function scheduleTaskDueNotification(
  taskTitle: string,
  dueDate: Date,
  minutesBefore: number = 15,
): Promise<string> {
  const fireAt = new Date(dueDate.getTime() - minutesBefore * 60_000);
  const delaySec = Math.max(0, Math.round((fireAt.getTime() - Date.now()) / 1000));
  if (delaySec <= 0) return '';

  return scheduleNotification(
    'Task Due Soon',
    `"${taskTitle}" is due in ${minutesBefore} minutes`,
    delaySec,
  );
}

/**
 * Schedule a calendar event reminder.
 */
export async function scheduleEventNotification(
  eventTitle: string,
  startDate: Date,
  minutesBefore: number = 10,
): Promise<string> {
  const fireAt = new Date(startDate.getTime() - minutesBefore * 60_000);
  const delaySec = Math.max(0, Math.round((fireAt.getTime() - Date.now()) / 1000));
  if (delaySec <= 0) return '';

  return scheduleNotification(
    'Upcoming Event',
    `"${eventTitle}" starts in ${minutesBefore} minutes`,
    delaySec,
  );
}

/**
 * Cancel a scheduled notification by its ID.
 */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
