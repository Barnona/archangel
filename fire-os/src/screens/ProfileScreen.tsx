import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';

type Props = {
  fontSize: 'small' | 'medium' | 'large';
  onFontSizeChange: (size: 'small' | 'medium' | 'large') => void;
  mode: 'light' | 'dark';
  onModeChange: (mode: 'light' | 'dark') => void;
};

export default function ProfileScreen({ fontSize, onFontSizeChange, mode, onModeChange }: Props) {
  const [focusedControl, setFocusedControl] = useState<string | null>(null);
  const fontOptions: Array<{ label: string; value: Props['fontSize'] }> = [
    { label: 'SMALL', value: 'small' }, { label: 'MEDIUM', value: 'medium' }, { label: 'LARGE', value: 'large' },
  ];
  const modeOptions: Array<{ label: string; value: Props['mode'] }> = [
    { label: 'LIGHT', value: 'light' }, { label: 'DARK', value: 'dark' },
  ];
  const scale = fontSize === 'small' ? 0.9 : fontSize === 'large' ? 1.15 : 1;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus>
      <Text style={[styles.kicker, { fontSize: 13 * scale }]}>⚙  PROFILE / PREFERENCES</Text>
      <Text style={[styles.title, { fontSize: 42 * scale }]}>ARCHANGEL Settings</Text>
      <Text style={[styles.sub, { fontSize: 19 * scale }]}>Personalise readability and appearance for this session.</Text>

      <View style={styles.card}>
        <Text style={[styles.rowTitle, { fontSize: 20 * scale }]}>◐  Appearance</Text>
        <Text style={[styles.rowText, { fontSize: 16 * scale }]}>Choose the visual mode.</Text>
        <View style={styles.options}>
          {modeOptions.map(option => {
            const selected = mode === option.value;
            const focused = focusedControl === `mode-${option.value}`;
            return <Pressable key={option.value} onPress={() => onModeChange(option.value)} onFocus={() => setFocusedControl(`mode-${option.value}`)} onBlur={() => setFocusedControl(current => current === `mode-${option.value}` ? null : current)} style={[styles.option, selected && styles.optionSelected, focused && styles.optionFocused]}>
              <Text style={[styles.optionText, selected && styles.optionSelectedText, focused && styles.optionFocusedText]}>{selected ? '✓  ' : ''}{option.label}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={styles.helper}>Mode selection is applied to the app's shared theme.</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.rowTitle, { fontSize: 20 * scale }]}>Aa  Text size</Text>
        <Text style={[styles.rowText, { fontSize: 16 * scale }]}>Adjust text sizing for TV readability.</Text>
        <View style={styles.options}>
          {fontOptions.map(option => {
            const selected = fontSize === option.value;
            const focused = focusedControl === `font-${option.value}`;
            return <Pressable key={option.value} onPress={() => onFontSizeChange(option.value)} onFocus={() => setFocusedControl(`font-${option.value}`)} onBlur={() => setFocusedControl(current => current === `font-${option.value}` ? null : current)} style={[styles.option, selected && styles.optionSelected, focused && styles.optionFocused]}>
              <Text style={[styles.optionText, selected && styles.optionSelectedText, focused && styles.optionFocusedText, { fontSize: (option.value === 'small' ? 12 : option.value === 'large' ? 16 : 14) * scale }]}>{selected ? '✓  ' : ''}{option.label}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={[styles.preview, { fontSize: 16 * scale }]}>Preview: Find apps, understand monetisation, and diagnose your TV.</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.rowTitle, { fontSize: 20 * scale }]}>⌁  Diagnostic data</Text>
        <Text style={[styles.rowText, { fontSize: 16 * scale }]}>Only measurements required for the current session are used in this prototype.</Text>
      </View>
      <View style={styles.card}>
        <Text style={[styles.rowTitle, { fontSize: 20 * scale }]}>◈  Recommendation data</Text>
        <Text style={[styles.rowText, { fontSize: 16 * scale }]}>App requests and preferences are kept separate from system-level Fire TV data.</Text>
      </View>
      <Text style={styles.version}>ARCHANGEL v0.1 • Fire TV MVP</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  content:{padding:64,paddingTop:52,paddingBottom:72},
  kicker:{color:colors.red,letterSpacing:2,fontWeight:'700'},
  title:{color:colors.text,fontWeight:'900',marginTop:6},
  sub:{color:colors.muted,marginBottom:22,marginTop:5},
  card:{width:780,maxWidth:'100%',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,padding:22,borderRadius:10,marginBottom:12},
  rowTitle:{color:colors.text,fontWeight:'800'},
  rowText:{color:colors.muted,lineHeight:24,marginTop:7},
  options:{flexDirection:'row',flexWrap:'wrap',marginTop:14},
  option:{minWidth:112,alignItems:'center',justifyContent:'center',paddingHorizontal:16,paddingVertical:12,borderRadius:8,borderWidth:1,borderColor:colors.line,backgroundColor:colors.panel,marginRight:10,marginBottom:8},
  optionSelected:{backgroundColor:colors.red,borderColor:colors.red},
  optionFocused:{backgroundColor:'#FFFFFF',borderColor:colors.red,borderWidth:2},
  optionText:{color:colors.text,fontWeight:'900',letterSpacing:0.8},
  optionSelectedText:{color:'#FFFFFF'},
  optionFocusedText:{color:colors.red},
  helper:{color:colors.muted,fontSize:12,marginTop:5},
  preview:{color:colors.text,lineHeight:24,marginTop:16},
  version:{color:colors.muted,fontSize:13,marginTop:12}
});
