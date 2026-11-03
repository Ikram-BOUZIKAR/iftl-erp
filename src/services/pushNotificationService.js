import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export const isPushAvailable = () => Capacitor.isNativePlatform();

export const initPushNotifications = async (userId, onNotification) => {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), { pushToken: token.value });
      } catch {
        // Non-blocking — token storage failure doesn't break the app
      }
    }
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    onNotification?.(notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    onNotification?.(action.notification);
  });
};
