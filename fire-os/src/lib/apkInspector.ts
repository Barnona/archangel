import { NativeModules, Platform } from 'react-native';

export type ApkInspection = {
  fileName: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk: number;
  targetSdk: number;
  deviceApi: number;
  deviceRelease: string;
  sizeMb: number;
  sizeBytes: number;
  requestedPermissionCount: number;
  requestedPermissions: string[];
  fileSha256: string;
  signerCertificateSha256: string[];
  signatureStatus: 'CERTIFICATE_EXTRACTED_NOT_VERIFIED' | 'SIGNER_CERTIFICATE_UNAVAILABLE' | string;
  compatibilityWarnings: string[];
  inspectionMethod: string;
  integrityStatus: string;
  cryptographicSignatureVerified: boolean;
  malwareScanPerformed: boolean;
  securityScanStatus: 'NOT_SCANNED' | string;
};

export type LocalApk = { fileName: string; sizeMb: number; sizeBytes?: number };

type ApkInspectorNative = {
  listApks(): Promise<LocalApk[]>;
  inspectLocalApk(fileName: string): Promise<ApkInspection>;
};

function nativeInspector(): ApkInspectorNative {
  if (Platform.OS !== 'android' || !NativeModules.ApkInspector) {
    throw new Error('APK inspection is available in the Android/Fire OS build only.');
  }
  return NativeModules.ApkInspector as ApkInspectorNative;
}

export function listLocalApks(): Promise<LocalApk[]> {
  return nativeInspector().listApks();
}

export function inspectLocalApk(fileName: string): Promise<ApkInspection> {
  return nativeInspector().inspectLocalApk(fileName);
}
