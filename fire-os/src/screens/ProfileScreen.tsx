import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/theme';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus>
      <Text style={styles.kicker}>ARCHANGEL / PROFILE</Text>
      <Text style={styles.title}>Your control centre.</Text>
      <Text style={styles.subtitle}>A quick overview of your ARCHANGEL experience.</Text>

      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>ARCHANGEL Viewer</Text>
          <Text style={styles.heroSub}>FIRE TV EXPERIENCE</Text>
          <Text style={styles.heroBody}>Discover apps, inspect monetisation signals, and check device experience from one place.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>YOUR MODULES</Text>
      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.cardCode}>01 / DISCOVER</Text><Text style={styles.cardTitle}>App Discovery</Text><Text style={styles.cardBody}>Find apps and explore relevant alternatives through the curated catalogue.</Text></View>
        <View style={styles.card}><Text style={styles.cardCode}>02 / ADLENS</Text><Text style={styles.cardTitle}>Monetisation insights</Text><Text style={styles.cardBody}>Review recorded advertising and subscription signals, with evidence limitations made clear.</Text></View>
        <View style={styles.card}><Text style={styles.cardCode}>03 / PULSE</Text><Text style={styles.cardTitle}>System diagnostics</Text><Text style={styles.cardBody}>Check the diagnostics available to this prototype and inspect service health.</Text></View>
        <View style={styles.card}><Text style={styles.cardCode}>04 / REQUEST</Text><Text style={styles.cardTitle}>Request Network</Text><Text style={styles.cardBody}>Submit interest in an app that is not currently listed.</Text></View>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>PRIVACY & DATA BOUNDARIES</Text>
        <Text style={styles.noteBody}>ARCHANGEL only reports the data its current integrations expose. Catalogue signals are not proof of live app behaviour, and this prototype does not claim system-level ad blocking or malware scanning.</Text>
      </View>
      <Text style={styles.footer}>ARCHANGEL • FIRE TV MVP</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  content:{padding:56,paddingTop:42,paddingBottom:64},
  kicker:{color:colors.red,fontSize:12,fontWeight:'900',letterSpacing:2},
  title:{color:colors.text,fontSize:38,fontWeight:'900',marginTop:9},
  subtitle:{color:colors.muted,fontSize:17,marginTop:5,marginBottom:22},
  hero:{flexDirection:'row',alignItems:'center',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:22,marginBottom:24},
  avatar:{width:68,height:68,borderRadius:12,backgroundColor:colors.red,alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#FFFFFF',fontSize:36,fontWeight:'900'},
  heroCopy:{flex:1,marginLeft:18},
  heroTitle:{color:colors.text,fontSize:23,fontWeight:'900'},
  heroSub:{color:colors.red,fontSize:10,fontWeight:'900',letterSpacing:1.5,marginTop:4},
  heroBody:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:8,maxWidth:700},
  sectionLabel:{color:colors.muted,fontSize:11,fontWeight:'900',letterSpacing:1.8,marginBottom:10},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  card:{width:'48%',minHeight:126,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:16,marginRight:'2%',marginBottom:12},
  cardCode:{color:colors.red,fontSize:10,fontWeight:'900',letterSpacing:1},
  cardTitle:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:8},
  cardBody:{color:colors.muted,fontSize:13,lineHeight:19,marginTop:6},
  note:{backgroundColor:colors.panel2,borderLeftWidth:4,borderLeftColor:colors.red,padding:18,marginTop:4,borderRadius:6},
  noteTitle:{color:colors.red,fontSize:11,fontWeight:'900',letterSpacing:1.2},
  noteBody:{color:colors.text,fontSize:14,lineHeight:21,marginTop:7},
  footer:{color:colors.muted,fontSize:11,letterSpacing:1.4,marginTop:22},
});
