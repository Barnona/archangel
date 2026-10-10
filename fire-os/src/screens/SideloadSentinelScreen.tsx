import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/theme';

type Props = { onBack: () => void };

type Finding = { level: 'CHECK' | 'CAUTION' | 'INFO'; title: string; detail: string };

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

  findings.push({ level: 'CHECK', title: 'Verify source and signature separately', detail: 'Use a trusted publisher/source and verify the package signature with an appropriate development tool. This screen does not inspect APK bytes.' });
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
  const findings = useMemo(() => ran ? evaluatePackage(packageId, minSdk, targetSdk, sizeMb) : [], [ran, packageId, minSdk, targetSdk, sizeMb]);
  const cautionCount = findings.filter(f => f.level !== 'INFO').length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>PACKAGE READINESS • SENTINEL</Text>
      <Text style={styles.title}>Sideload Sentinel</Text>
      <Text style={styles.intro}>A preliminary metadata review for Android package compatibility. No APK is uploaded, installed, or executed.</Text>

      <View style={styles.form}>
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

      <View style={styles.boundary}>
        <Text style={styles.section}>SCOPE & LIMITATIONS</Text>
        <Text style={styles.boundaryText}>This is a metadata checklist, not a malware scanner or a guarantee that an APK will install. It does not bypass platform security, install packages, verify signatures, or access private Fire TV APIs. Only analyze packages you are authorized to inspect.</Text>
      </View>
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
  section: { color: colors.red, fontSize: 15, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  resultSummary: { color: colors.text, fontSize: 18, marginBottom: 12 },
  finding: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 16, marginBottom: 10 },
  findingLevel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  info: { color: colors.success },
  caution: { color: colors.warning },
  check: { color: colors.red },
  findingTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  findingDetail: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 5 },
  boundary: { marginTop: 22, padding: 20, backgroundColor: colors.panel2, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  boundaryText: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  backButton: { alignSelf: 'flex-start', marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  backText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  backButtonFocused: { backgroundColor: '#171717', borderColor: '#171717', borderWidth: 2 },
  backTextFocused: { color: '#FFFFFF' },
});
