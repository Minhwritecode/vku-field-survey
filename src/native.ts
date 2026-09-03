import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network } from '@capacitor/network';

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
