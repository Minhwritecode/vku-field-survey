import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';

let nextNotificationId = Math.max(1, Math.floor(Date.now() / 1000) % 2147483647);

export async function capturePhoto(): Promise<string | undefined> {
  try {
    const image = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    return `data:image/jpeg;base64,${image.base64String}`;
  } catch (error) {
    console.warn('Camera cancel or fallback:', error);
    return undefined;
  }
}

export function listenNetworkStatus(onChange: (isOnline: boolean) => void) {
  Network.addListener('networkStatusChange', (status) => {
    onChange(status.connected);
  });
}

export async function isOnline(): Promise<boolean> {
  const status = await Network.getStatus();
  return status.connected;
}

/**
 * Get a one-time native GPS position for the survey record.
 * Works seamlessly on both Android Native (Capacitor) and Web Browsers.
 */
export async function getCurrentGPS(): Promise<
  { lat: number; lng: number; accuracy?: number } | null
> {
  try {
    if (Capacitor.isNativePlatform()) {
      let permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        permission = await Geolocation.requestPermissions({ permissions: ['location'] });
      }

      if (permission.location !== 'granted') {
        console.warn('Location permission was not granted on device.');
        return null;
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (error) {
    console.warn('Không lấy được GPS:', error);
    return null;
  }
}

/**
 * Show system notification after queued records are synced to the cloud.
 * Works on Android Status Bar via LocalNotifications, with Web Notification fallback.
 */
export async function sendSyncNotification(count: number): Promise<void> {
  if (count <= 0) {
    return;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }

      if (permission.display === 'granted') {
        const id = nextNotificationId++ % 2147483647 || 1;
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: 'VKU Survey - Đồng bộ thành công! 🎉',
              body: `Đã tự động gửi thành công ${count} bản ghi lên máy chủ.`,
              schedule: { at: new Date(Date.now() + 1000) },
            },
          ],
        });
      }
    } else {
      // Browser Web Notification support when testing on desktop / laptop
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission === 'granted') {
          new Notification('VKU Survey - Đồng bộ thành công! 🎉', {
            body: `Đã tự động gửi thành công ${count} bản ghi lên máy chủ.`,
            icon: '/icon.jpg'
          });
        }
      }
    }
  } catch (err) {
    console.warn('Không thể gửi thông báo:', err);
  }
}
