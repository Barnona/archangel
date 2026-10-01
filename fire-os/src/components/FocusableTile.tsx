import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  preferredFocus?: boolean;
};

export default function FocusableTile({ title, subtitle, onPress, preferredFocus }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // @ts-ignore react-native-tvos
      hasTVPreferredFocus={preferredFocus}
      style={[styles.tile, focused && styles.tileFocused]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 350,
    height: 170,
    marginRight: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 18,
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
  },
  tileFocused: {
    borderColor: colors.scarlet,
    backgroundColor: colors.panel2,
    transform: [{ scale: 1.035 }],
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 18, marginTop: 8 },
});
