import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/theme';
import { ApkInspection, LocalApk, inspectLocalApk, listLocalApks } from '../lib/apkInspector';

type Props = { onBack: () => void };

type Finding = { level: 'CHECK' | 'CAUTION' | 'INFO'; title: string; detail: string };

function permissionDetails(permission: string): { label: string; detail: string; level: 'INFO' | 'CAUTION' } {
  const rules: Array<[RegExp, string, string, 'INFO' | 'CAUTION']> = [
    [/^android\\.permission\\.INTERNET$/, 'Network access', 'Allows network connections. Check that online access matches the app’s purpose.', 'INFO'],
    [/SYSTEM_ALERT_WINDOW$/, 'Display over other apps', 'May display windows above other apps after the user grants special access. Review why a TV app needs this.', 'CAUTION'],
    [/DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION$/, 'App-defined receiver protection', 'An app-defined permission commonly used to restrict access to internal broadcast receivers. Its presence alone is not evidence of malicious behavior.', 'INFO'],
    [/CAMERA$/, 'Camera', 'Can request camera access if supported and granted by the OS. Confirm this feature is expected.', 'CAUTION'],
    [/RECORD_AUDIO$/, 'Microphone', 'Can request microphone access. Confirm voice or recording features are expected.', 'CAUTION'],
    [/(ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|ACCESS_BACKGROUND_LOCATION)$/, 'Location', 'Can request precise, approximate, or background location access. Check the minimum scope needed.', 'CAUTION'],
    [/(READ_CONTACTS|WRITE_CONTACTS|GET_ACCOUNTS|READ_SMS|RECEIVE_SMS|SEND_SMS|READ_CALL_LOG|WRITE_CALL_LOG)$/, 'Sensitive personal data', 'Review the publisher and feature justification before proceeding.', 'CAUTION'],
    [/REQUEST_INSTALL_PACKAGES$/, 'Package installation requests', 'Can request package-install flows; it does not bypass Android installation controls.', 'CAUTION'],
    [/QUERY_ALL_PACKAGES$/, 'Installed-app visibility', 'Can request broad visibility into installed apps. Check whether this scope is necessary.', 'CAUTION'],
    [/BIND_ACCESSIBILITY_SERVICE$/, 'Accessibility service', 'An enabled accessibility service may observe or act on UI. Treat unexpected declarations as high priority for review.', 'CAUTION'],
    [/(READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE)$/, 'File access', 'May provide access to shared files depending on OS version and grants. Check the intended use.', 'CAUTION'],
  ];
  const match = rules.find(([pattern]) => pattern.test(permission));
  return match
    ? { label: match[1], detail: match[2], level: match[3] }
    : { label: 'Other declared permission', detail: 'This permission is declared in the manifest. Check Android documentation and the app feature that requires it; declaration alone does not mean it is granted or used.', level: 'INFO' };
}

function evaluatePackage(packageId: string, minSdk: string, targetSdk: string, sizeMb: string): Finding[] {
  const findings: Finding[] = [];
  const id = packageId.trim();
  const min = Number(minSdk);
  const target = Number(targetSdk);
  const size = Number(sizeMb);

  if (!id) {
    findings.push({ level: 'CHECK', title: 'Package identifier missing', detail: 'Enter the package name from trusted package metadata, for example com.example.app.' });
  } else if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(id)) {
    findings.push({ level: 'CAUTION', title: 'Identifier format needs review', detail: 'Expected a dot-separated Android application ID. This format check does not prove who published the package.' });
  } else {
    findings.push({ level: 'INFO', title: 'Identifier format looks valid', detail: 'Syntax only; publisher identity and package integrity have not been verified.' });
  }

  if (!minSdkTextValid(minSdk)) {
    findings.push({ level: 'CHECK', title: 'Minimum SDK not provided', detail: 'Enter the minimum Android API level from the package manifest to assess compatibility.' });
  } else if (min < 24) {
    findings.push({ level: 'CAUTION', title: 'Older minimum SDK', detail: 'The package targets an older Android baseline. Confirm compatibility with the target Fire OS device.' });
  } else {
    findings.push({ level: 'INFO', title: 'Minimum SDK recorded', detail: `Min SDK ${min}; this alone cannot establish compatibility with every Fire OS version.` });
  }

  if (!minSdkTextValid(targetSdk)) {
    findings.push({ level: 'CHECK', title: 'Target SDK not provided', detail: 'Enter the target API level from package metadata.' });
  } else if (target < min) {
    findings.push({ level: 'CAUTION', title: 'SDK values conflict', detail: 'Target SDK is lower than minimum SDK. Recheck the metadata values.' });
  } else {
    findings.push({ level: 'INFO', title: 'Target SDK recorded', detail: `Target SDK ${target}; store policy and device behavior may impose additional requirements.` });
  }

  if (!sizeMb.trim() || !Number.isFinite(size) || size <= 0) {
    findings.push({ level: 'CHECK', title: 'Package size missing', detail: 'Enter the APK size in MB. Size alone cannot determine whether a package is safe.' });
  } else if (size > 200) {
    findings.push({ level: 'CAUTION', title: 'Large package', detail: `${size} MB reported. Confirm storage requirements and whether additional asset downloads are expected.` });
  } else {
    findings.push({ level: 'INFO', title: 'Package size recorded', detail: `${size} MB reported; no integrity or malware scan has been performed.` });
  }

  findings.push({ level: 'CHECK', title: 'Verify source and signature separately', detail: 'Use a trusted source and verify the APK signing scheme with Android SDK apksigner. This manual metadata form does not inspect APK bytes or verify a signature.' });
  return findings;
}

function minSdkTextValid(value: string) {
  const n = Number(value);
  return value.trim().length > 0 && Number.isInteger(n) && n > 0;
}

export default function SideloadSentinelScreen({ onBack }: Props) {
  const [packageId, setPackageId] = useState('');
  const [minSdk, setMinSdk] = useState('');
  const [targetSdk, setTargetSdk] = useState('');
  const [sizeMb, setSizeMb] = useState('');
  const [ran, setRan] = useState(false);
  const [backFocused, setBackFocused] = useState(false);
  const [inspection, setInspection] = useState<ApkInspection | null>(null);
  const [inspectionError, setInspectionError] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [availableApks, setAvailableApks] = useState<LocalApk[]>([]);
  const [showApkBrowser, setShowApkBrowser] = useState(false);
  const requestedPermissions = inspection?.requestedPermissions ?? [];
  const findings = useMemo(() => ran ? evaluatePackage(packageId, minSdk, targetSdk, sizeMb) : [], [ran, packageId, minSdk, targetSdk, sizeMb]);
  const cautionCount = findings.filter(f => f.level !== 'INFO').length;
  const declaredPermissionCount = requestedPermissions.length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>PACKAGE READINESS • SENTINEL</Text>
      <Text style={styles.title}>Sideload Sentinel</Text>
      <Text style={styles.intro}>Inspect APK metadata locally, review declared permissions, and assess basic compatibility. APKs are not installed, executed, uploaded, or scanned for malware.</Text>

      <View style={styles.form}>
        <Text style={styles.section}>APK FILE INSPECTION</Text>
        <Pressable
          onPress={async () => {
            setInspecting(true);
            setInspectionError('');
            try {
              const files = await listLocalApks();
              setAvailableApks(files);
              setShowApkBrowser(true);
              if (files.length === 0) {
                setInspectionError("No APKs found in ARCHANGEL's import folder. Copy an APK into Android/data/com.archangelnative/files/Download, then refresh this list.");
              }
            } catch (error) {
              setInspectionError(error instanceof Error ? error.message : String(error));
            } finally {
              setInspecting(false);
            }
          }}
          style={({ focused, pressed }) => [styles.button, (focused || pressed) && styles.buttonFocused]}
        >
          <Text style={styles.buttonText}>{inspecting ? 'LOADING APK LIST…' : '▣  BROWSE IMPORTED APKs'}</Text>
        </Pressable>
        {showApkBrowser ? (
          <View style={styles.apkBrowser}>
            <Text style={styles.section}>LOCAL APK IMPORTS</Text>
            <Text style={styles.findingDetail}>For this TV emulator, ARCHANGEL browses its own import folder. APKs are inspected locally and are not installed or uploaded.</Text>
            <Pressable
              onPress={async () => {
                setInspecting(true);
                setInspectionError('');
                try {
                  setAvailableApks(await listLocalApks());
                } catch (error) {
                  setInspectionError(error instanceof Error ? error.message : String(error));
                } finally {
                  setInspecting(false);
                }
              }}
              style={({ focused, pressed }) => [styles.refreshButton, (focused || pressed) && styles.refreshButtonFocused]}
            >
              <Text style={styles.refreshText}>↻ REFRESH APK LIST</Text>
            </Pressable>
            {availableApks.map((apk) => (
              <Pressable
                key={apk.fileName}
                onPress={async () => {
                  setInspecting(true);
                  setInspectionError('');
                  try {
                    const result = await inspectLocalApk(apk.fileName);
                    setInspection(result);
                    setPackageId(result.packageName);
                    setMinSdk(String(result.minSdk));
                    setTargetSdk(String(result.targetSdk));
                    setSizeMb(result.sizeMb.toFixed(2));
                    setRan(true);
                    setShowApkBrowser(false);
                  } catch (error) {
                    setInspectionError(error instanceof Error ? error.message : String(error));
                  } finally {
                    setInspecting(false);
                  }
                }}
                style={({ focused, pressed }) => [styles.apkRow, (focused || pressed) && styles.apkRowFocused]}
              >
                <Text style={styles.apkName}>{apk.fileName}</Text>
                <Text style={styles.apkSize}>{apk.sizeMb.toFixed(2)} MB</Text>
                <Text style={styles.apkAction}>SELECT TO INSPECT →</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {inspectionError ? <Text style={styles.errorText}>{inspectionError}</Text> : null}
        {inspection ? (
          <View style={styles.inspectionCard}>
            <Text style={styles.section}>EXTRACTED METADATA</Text>
            <Text style={styles.metaName}>{inspection.fileName}</Text>
            <Text style={styles.metaLine}>Package: {inspection.packageName}</Text>
            <Text style={styles.metaLine}>Version: {inspection.versionName} (code {inspection.versionCode})</Text>
            <Text style={styles.metaLine}>Min SDK: {inspection.minSdk}  •  Target SDK: {inspection.targetSdk}</Text>
            <Text style={styles.metaLine}>Device: Android {inspection.deviceRelease} (API {inspection.deviceApi})</Text>
            <Text style={styles.metaLine}>Size: {inspection.sizeMb.toFixed(2)} MB  •  Requested permissions: {inspection.requestedPermissionCount}</Text>
            <Text style={styles.metaLine}>File SHA-256: {inspection.fileSha256}</Text>
            <Text style={styles.metaLine}>Signer certificate SHA-256: {inspection.signerCertificateSha256.length ? inspection.signerCertificateSha256.join('\n') : 'No signer certificate extracted'}</Text>
            <Text style={styles.metaLine}>Signer certificate data: {inspection.signatureStatus.replace(/_/g, ' ')}</Text>
            <Text style={styles.metaNote}>APK SIGNATURE VERIFICATION: NOT PERFORMED IN APP</Text>
            <Text style={styles.metaNote}>PUBLISHER TRUST: NOT CHECKED</Text>
            <Text style={styles.metaNote}>MALWARE SCAN: NOT PERFORMED</Text>
            {inspection.compatibilityWarnings?.map((warning, index) => (
              <Text key={index} style={styles.warningLine}>⚠ {warning}</Text>
            ))}
            <Text style={styles.findingDetail}>A certificate fingerprint is not proof of a valid signature or a trusted publisher. Use scripts/verify-apk.ps1 with Android SDK Build Tools for separate cryptographic signature verification.</Text>
          </View>
        ) : null}
        {inspection ? (
          <View style={styles.permissionCard}>
            <Text style={styles.section}>DECLARED PERMISSIONS ({declaredPermissionCount})</Text>
            <Text style={styles.findingDetail}>These permissions are declared in the manifest. They are not proof that the OS granted them or that the app currently uses them.</Text>
            {requestedPermissions.map(permission => {
              const info = permissionDetails(permission);
              return (
                <View key={permission} style={styles.permissionItem}>
                  <Text style={styles.permissionLabel}>{info.label}</Text>
                  <Text style={styles.permissionLine}>{permission}</Text>
                  <Text style={info.level === 'CAUTION' ? styles.permissionCaution : styles.findingDetail}>{info.detail}</Text>
                </View>
              );
            })}
            {requestedPermissions.length === 0 ? (
              <Text style={styles.findingDetail}>No requested permissions were exposed by the parsed manifest. This does not establish that the APK is safe.</Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.label}>OR ENTER METADATA MANUALLY</Text>
        <Text style={styles.label}>PACKAGE IDENTIFIER</Text>
        <TextInput value={packageId} onChangeText={setPackageId} placeholder="com.example.app" placeholderTextColor={colors.muted} autoCapitalize="none" style={styles.input} />
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>MIN SDK</Text>
            <TextInput value={minSdk} onChangeText={setMinSdk} placeholder="24" placeholderTextColor={colors.muted} keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>TARGET SDK</Text>
            <TextInput value={targetSdk} onChangeText={setTargetSdk} placeholder="35" placeholderTextColor={colors.muted} keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>SIZE (MB)</Text>
            <TextInput value={sizeMb} onChangeText={setSizeMb} placeholder="45" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={styles.input} />
          </View>
        </View>
        <Pressable onPress={() => setRan(true)} style={({ focused, pressed }) => [styles.button, (focused || pressed) && styles.buttonFocused]}>
          <Text style={styles.buttonText}>RUN METADATA CHECK</Text>
        </Pressable>
      </View>

      {ran ? (
        <View style={styles.results}>
          <Text style={styles.section}>REVIEW RESULTS</Text>
          <Text style={styles.resultSummary}>{cautionCount} item(s) need attention or additional verification.</Text>
          {findings.map((finding, index) => (
            <View key={finding.title} style={styles.finding}>
              <Text style={[styles.findingLevel, finding.level === 'INFO' ? styles.info : finding.level === 'CAUTION' ? styles.caution : styles.check]}>{finding.level === 'INFO' ? '✓' : finding.level === 'CAUTION' ? '!' : '○'}  {finding.level}</Text>
              <Text style={styles.findingTitle}>{finding.title}</Text>
              <Text style={styles.findingDetail}>{finding.detail}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable onPress={onBack} onFocus={() => setBackFocused(true)} onBlur={() => setBackFocused(false)} style={[styles.backButton, backFocused && styles.backButtonFocused]}>
        <Text style={[styles.backText, backFocused && styles.backTextFocused]}>← BACK TO HOME</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 54, paddingTop: 34, paddingBottom: 60 },
  eyebrow: { color: colors.red, fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 42, fontWeight: '900', marginTop: 8 },
  intro: { color: colors.muted, fontSize: 18, lineHeight: 26, marginTop: 8, maxWidth: 1050 },
  form: { marginTop: 26, padding: 22, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  label: { color: colors.red, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  input: { color: colors.text, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 14 },
  field: { flex: 1 },
  button: { alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 9, backgroundColor: colors.red, marginTop: 4 },
  buttonFocused: { backgroundColor: '#171717', borderColor: '#171717', borderWidth: 2 },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  results: { marginTop: 26 },
  apkBrowser: { marginTop: 16, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  refreshButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, marginBottom: 12 },
  refreshButtonFocused: { borderColor: colors.red, backgroundColor: colors.paleRed },
  refreshText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  apkRow: { padding: 14, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  apkRowFocused: { borderColor: colors.red, backgroundColor: colors.paleRed },
  apkName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  apkSize: { color: colors.muted, fontSize: 14, marginTop: 4 },
  apkAction: { color: colors.red, fontSize: 12, fontWeight: '900', marginTop: 8 },
  inspectionCard: { marginTop: 18, padding: 18, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  permissionCard: { marginTop: 16, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  permissionItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  permissionLabel: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 3 },
  permissionLine: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  permissionCaution: { color: colors.warning, fontSize: 14, lineHeight: 21, marginTop: 4 },
  warningLine: { color: colors.warning, fontSize: 14, lineHeight: 21, marginTop: 8 },
  metaName: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  metaLine: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  metaNote: { color: colors.warning, fontSize: 13, fontWeight: '900', marginTop: 10 },
  errorText: { color: colors.red, fontSize: 15, marginTop: 10 },
  section: { color: colors.red, fontSize: 15, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  resultSummary: { color: colors.text, fontSize: 18, marginBottom: 12 },
  finding: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 16, marginBottom: 10 },
  findingLevel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  info: { color: colors.success },
  caution: { color: colors.warning },
  check: { color: colors.red },
  findingTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  findingDetail: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 5 },
  backButton: { alignSelf: 'flex-start', marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  backText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  backButtonFocused: { backgroundColor: '#171717', borderColor: '#171717', borderWidth: 2 },
  backTextFocused: { color: '#FFFFFF' },
});
