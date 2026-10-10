import { NativeModules, Platform } from 'react-native';

export type ApkInspection = {
  fileName: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk: number;
  targetSdk: number;
  sizeMb: number;
  requestedPermissionCount: number;
  inspectionMethod: string;
  signatureVerified: boolean;
};

type ApkInspectorNative = {
  pickAndInspect(): Promise<ApkInspection>;
};

export async function pickAndInspectApk(): Promise<ApkInspection> {
  if (Platform.OS !== 'android' || !NativeModules.ApkInspector) {
    throw new Error('APK inspection is available in the Android/Fire OS build only.');
  }
  return (NativeModules.ApkInspector as ApkInspectorNative).pickAndInspect();
}
