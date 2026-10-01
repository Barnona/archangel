import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppProfile } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type Props = { id: string; onBack: () => void; onOpen: (id: string) => void };
export default function AppDetailsScreen({ id, onBack, onOpen }: Props) {
  const [app, setApp] = useState<(AppProfile & { alternativeProfiles: AppProfile[] }) | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.app(id).then(setApp).catch(e => setError(e instanceof Error ? e.message : 'Unable to load app')); }, [id]);
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!app) return <View style={styles.center}><ActivityIndicator size="large" color={colors.red} /></View>;
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Pressable onPress={onBack} style={({ focused }) => [styles.back, focused && styles.focus]}><Text style={styles.backText}>‹  Back to Discover</Text></Pressable>
    <Text style={styles.kicker}>APP PROFILE</Text><Text style={styles.title}>{app.name}</Text><Text style={styles.category}>{app.category}</Text><Text style={styles.description}>{app.description}</Text>
    <View style={styles.grid}><Info title="PLATFORM" value={`${app.platforms.fireOs ? 'Fire OS ✓' : 'Fire OS —'}   ${app.platforms.vega ? 'Vega ✓' : 'Vega ?'}`} /><Info title="MONETIZATION" value={app.monetization.join(', ')} /><Info title="AD EXPERIENCE" value={app.adLevel} /><Info title="VERIFICATION" value={app.verified ? `Verified ${app.lastVerified ?? ''}` : 'Not independently verified'} /></View>
    <Text style={styles.source}>Source: {app.source}</Text>
    {app.alternativeProfiles.length > 0 ? <><Text style={styles.section}>ALTERNATIVES</Text>{app.alternativeProfiles.map(x => <Pressable key={x.id} onPress={() => onOpen(x.id)} style={({ focused }) => [styles.alt, focused && styles.focus]}><Text style={styles.altName}>{x.name}</Text><Text style={styles.altMeta}>{x.category} • {x.monetization.join(', ')}</Text></Pressable>)}</> : null}
  </ScrollView>;
}
function Info({ title, value }: { title: string; value: string }) { return <View style={styles.info}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},content:{padding:48,paddingHorizontal:64,paddingBottom:70},back:{alignSelf:'flex-start',padding:10,marginBottom:22},focus:{backgroundColor:colors.panel2,borderRadius:8,borderWidth:2,borderColor:colors.red},backText:{color:colors.red,fontSize:18,fontWeight:'700'},kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700'},title:{color:colors.text,fontSize:44,fontWeight:'900',marginTop:6},category:{color:colors.red,fontSize:18,fontWeight:'700'},description:{color:colors.muted,fontSize:20,lineHeight:29,maxWidth:850,marginTop:18},grid:{flexDirection:'row',flexWrap:'wrap',maxWidth:900,marginTop:25},info:{width:420,backgroundColor:colors.panel,padding:18,marginRight:12,marginBottom:12,borderRadius:10,borderWidth:1,borderColor:colors.line},infoTitle:{color:'#777777',fontSize:12,letterSpacing:1.5,fontWeight:'700'},infoValue:{color:colors.text,fontSize:18,marginTop:7},source:{color:'#777777',fontSize:13,marginTop:8},section:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700',marginTop:30,marginBottom:12},alt:{width:850,padding:16,backgroundColor:colors.panel,borderRadius:10,borderWidth:1,borderColor:colors.line,marginBottom:10},altName:{color:colors.text,fontSize:20,fontWeight:'800'},altMeta:{color:colors.muted,fontSize:15,marginTop:4},center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},error:{color:'#B4232B',fontSize:18}
});