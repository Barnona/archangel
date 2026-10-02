import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import FocusableTile from '../components/FocusableTile';
import { colors } from '../theme/theme';

type Screen = 'Discover' | 'Pulse' | 'AdLens' | 'Request' | 'Profile';
type Props = { navigate: (screen: Screen) => void };

export default function HomeScreen({ navigate }: Props) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      scrollsChildToFocus
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>AUTONOMOUS TV INTELLIGENCE</Text>
      <Text style={styles.brand}>ARCHANGEL</Text>
      <Text style={styles.tagline}>The Intelligent Layer for Fire TV</Text>
      <View style={styles.rule} />
      <View style={styles.grid}>
        <FocusableTile title="Find an App" subtitle="Search, compare, alternatives" onPress={() => navigate('Discover')} preferredFocus />
        <FocusableTile title="AdLens" subtitle="Understand app ads & monetization" onPress={() => navigate('AdLens')} />
        <FocusableTile title="Fix My TV" subtitle="Pulse network & experience check" onPress={() => navigate('Pulse')} />
        <FocusableTile title="Request an App" subtitle="Tell developers what is missing" onPress={() => navigate('Request')} />
        <FocusableTile title="Profile" subtitle="Preferences & privacy" onPress={() => navigate('Profile')} />
      </View>
      <Text style={styles.footer}>DISCOVER • DIAGNOSE • REQUEST • IMPROVE</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 64, paddingTop: 44, paddingBottom: 72, minHeight: '100%' },
  eyebrow: { color: colors.red, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  brand: { color: colors.text, fontSize: 54, fontWeight: '900', letterSpacing: 5, marginTop: 5 },
  tagline: { color: colors.muted, fontSize: 22, marginTop: 4, marginBottom: 18 },
  rule: { height: 2, backgroundColor: colors.line, marginBottom: 28, width: '90%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 760 },
  footer: { color: colors.muted, fontSize: 12, letterSpacing: 2, marginTop: 26 },
});