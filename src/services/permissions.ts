import { Platform, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PermissionKind =
  | 'camera'
  | 'photoLibrary'
  | 'microphone'
  | 'calendar'
  | 'contacts'
  | 'notifications';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'limited';

export interface PermissionResult {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStatus(status: string, canAskAgain = true): PermissionResult {
  const granted = status === 'granted';
  const mapped: PermissionStatus =
    status === 'granted'
      ? 'granted'
      : status === 'undetermined'
        ? 'undetermined'
        : status === 'limited'
          ? 'limited'
          : 'denied';
  return { status: mapped, granted, canAskAgain };
}

function webUnsupported(): PermissionResult {
  return { status: 'denied', granted: false, canAskAgain: false };
}

// ─── Check ───────────────────────────────────────────────────────────────────

async function checkCamera(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return { status: 'granted', granted: true, canAskAgain: false };
  const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function checkPhotoLibrary(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return { status: 'granted', granted: true, canAskAgain: false };
  const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function checkMicrophone(): Promise<PermissionResult> {
  if (Platform.OS === 'web') {
    // Web: can't pre-check, assume undetermined
    return { status: 'undetermined', granted: false, canAskAgain: true };
  }
  const { status, canAskAgain } = await Audio.getPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function checkCalendar(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return webUnsupported();
  const { status, canAskAgain } = await Calendar.getCalendarPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function checkContacts(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return webUnsupported();
  const { status, canAskAgain } = await Contacts.getPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

// ─── Request ─────────────────────────────────────────────────────────────────

async function requestCamera(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return { status: 'granted', granted: true, canAskAgain: false };
  const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function requestPhotoLibrary(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return { status: 'granted', granted: true, canAskAgain: false };
  const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function requestMicrophone(): Promise<PermissionResult> {
  const { status, canAskAgain } = await Audio.requestPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function requestCalendar(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return webUnsupported();
  const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

async function requestContacts(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return webUnsupported();
  const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
  return mapStatus(status, canAskAgain);
}

// ─── Open Settings ───────────────────────────────────────────────────────────

export function openAppSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

// ─── Alert helpers ───────────────────────────────────────────────────────────

export function showPermissionDeniedAlert(feature: string): void {
  Alert.alert(
    'Permission Required',
    `${feature} access was denied. Please enable it in your device settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: openAppSettings },
    ],
  );
}

// ─── Unified API ─────────────────────────────────────────────────────────────

const checkFns: Record<PermissionKind, () => Promise<PermissionResult>> = {
  camera: checkCamera,
  photoLibrary: checkPhotoLibrary,
  microphone: checkMicrophone,
  calendar: checkCalendar,
  contacts: checkContacts,
  notifications: async () => {
    // Notifications handled by existing notifications.ts service
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    return mapStatus(status);
  },
};

const requestFns: Record<PermissionKind, () => Promise<PermissionResult>> = {
  camera: requestCamera,
  photoLibrary: requestPhotoLibrary,
  microphone: requestMicrophone,
  calendar: requestCalendar,
  contacts: requestContacts,
  notifications: async () => {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return mapStatus(status);
  },
};

export const Permissions = {
  check(kind: PermissionKind): Promise<PermissionResult> {
    return checkFns[kind]();
  },

  request(kind: PermissionKind): Promise<PermissionResult> {
    return requestFns[kind]();
  },

  openSettings: openAppSettings,

  /** Check if a feature is available on the current platform */
  isAvailable(kind: PermissionKind): boolean {
    if (Platform.OS === 'web') {
      // Web supports camera/photos via file input, microphone via WebRTC
      return kind === 'camera' || kind === 'photoLibrary' || kind === 'microphone' || kind === 'notifications';
    }
    return true; // All features available on native
  },

  /** Request with automatic denied-alert handling */
  async requestWithAlert(kind: PermissionKind, featureLabel: string): Promise<boolean> {
    const result = await this.request(kind);
    if (!result.granted && !result.canAskAgain) {
      showPermissionDeniedAlert(featureLabel);
    }
    return result.granted;
  },
};
