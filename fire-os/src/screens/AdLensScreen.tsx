import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AdLensSummary } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type Filter = 'all' | 'ad-supported' | 'subscription' | 'no-known-ads' | 'unknown';

export default function AdLensScreen({ onOpenApp }: { onOpenApp: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [focusedFilter, setFocusedFilter] = useState<Filter | null>(null);
  const [data, setData] = useState<AdLensSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.adLens().then(setData).catch(e => setError(e instanceof Error ? e.message : 'Unable to load AdLens')); }, []);
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!data) return <View style={styles.center}><ActivityIndicator size="large" color={colors.red} /></View>;
  const filtered = data.profiles.filter(profile => {
    if (filter === 'ad-supported') return profile.monetization.includes('ad-supported');
    if (filter === 'subscription') return profile.subscription.model === 'subscription';
    if (filter === 'no-known-ads') return profile.adSignal === 'known' && profile.adLevel === 'none';
    if (filter === 'unknown') return profile.adSignal === 'unknown';
    return true;
  });
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'ALL', count: data.totalApps },
    { key: 'ad-supported', label: 'AD-SUPPORTED', count: data.adSupported },
    { key: 'subscription', label: 'SUBSCRIPTION', count: data.profiles.filter(p => p.subscription.model === 'subscription').length },
    { key: 'no-known-ads', label: 'NO KNOWN ADS', count: data.profiles.filter(p => p.adSignal === 'known' && p.adLevel === 'none').length },
    { key: 'unknown', label: 'UNKNOWN', count: data.unknownAdLevels },
  ];
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>ADLENS</Text>
      <Text style={styles.title}>Ad Experience Intelligence</Text>
      <Text style={styles.sub}>Understand how apps are monetized and what ARCHANGEL can actually observe.</Text>
      <View style={styles.row}><Metric title="CATALOG APPS" value={String(data.totalApps)} /><Metric title="AD-SUPPORTED" value={String(data.adSupported)} /><Metric title="KNOWN AD SIGNALS" value={String(data.knownAdLevels)} /><Metric title="SUBSCRIPTION APPS" value={String(data.profiles.filter(p => p.subscription.model === 'subscription').length)} /></View>
      <View style={styles.notice}><Text style={styles.noticeTitle}>SYSTEM AD CONTROL</Text><Text style={styles.noticeValue}>NOT AVAILABLE</Text><Text style={styles.noticeText}>{data.systemAdControl.note}</Text></View>
      <Text style={styles.section}>APP AD PROFILES</Text>
      <View style={styles.filters}>{filters.map(item => <Pressable key={item.key} onPress={() => setFilter(item.key)} onFocus={() => setFocusedFilter(item.key)} onBlur={() => setFocusedFilter(null)} style={[styles.filter, filter === item.key && styles.filterActive, focusedFilter === item.key && styles.filterFocused]}><Text style={[styles.filterText, (filter === item.key || focusedFilter === item.key) && styles.filterTextActive]}>{item.label} • {item.count}</Text></Pressable>)}</View>
      {filtered.map(profile => <Pressable key={profile.appId} onPress={() => onOpenApp(profile.appId)} style={({ focused }) => [styles.card, focused && styles.cardFocused]}><View style={styles.cardHead}><View style={styles.main}><Text style={styles.appName}>{profile.appName}</Text><Text style={styles.meta}>{profile.monetization.join(' • ')}</Text></View><Text style={[styles.badge, profile.adSignal === 'known' ? styles.known : styles.unknown]}>{profile.adSignal === 'known' ? profile.adLevel.toUpperCase() : 'UNKNOWN'}</Text></View><Text style={styles.explanation}>{profile.explanation}</Text><Text style={styles.source}>{profile.transparency === 'verified' ? 'SOURCE-CHECKED' : 'LIMITED SIGNAL'}{profile.lastVerified ? ` • verified ${profile.lastVerified}` : ''}{profile.subscription.model === 'subscription' ? ` • SUBSCRIPTION${profile.subscription.adFreeTierVerified ? ' • AD-FREE VERIFIED' : ' • AD-FREE UNKNOWN'}` : ''}</Text></Pressable>)}
      <View style={styles.footerCard}><Text style={styles.noticeTitle}>WHAT ADLENS DOES</Text><Text style={styles.footerText}>AdLens provides transparency about catalogued app monetization and known advertising signals. It does not intercept, suppress, or modify advertising traffic, and it does not claim control over Fire TV system advertising.</Text></View>
    </ScrollView>
  );
}
function Metric({ title, value }: { title: string; value: string }) { return <View style={styles.metric}><Text numberOfLines={1} style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg}, content:{padding:48,paddingHorizontal:64,paddingBottom:70}, kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'800'}, title:{color:colors.text,fontSize:42,fontWeight:'900',marginTop:6}, sub:{color:colors.muted,fontSize:18,maxWidth:850,marginTop:8,marginBottom:24}, row:{flexDirection:'row',width:'100%'}, metric:{flex:1,minWidth:0,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:18,marginRight:8}, metricTitle:{color:colors.red,fontSize:10,fontWeight:'800',letterSpacing:1.05}, metricValue:{color:colors.text,fontSize:30,fontWeight:'900',marginTop:7}, notice:{width:760,backgroundColor:colors.panel2,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:20,marginTop:14}, noticeTitle:{color:colors.red,fontSize:11,fontWeight:'900',letterSpacing:1.5}, noticeValue:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:5}, noticeText:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:5}, section:{color:colors.red,fontSize:13,fontWeight:'800',letterSpacing:2,marginTop:28,marginBottom:12}, filters:{flexDirection:'row',flexWrap:'wrap',marginBottom:14}, filter:{backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:8,paddingHorizontal:13,paddingVertical:9,marginRight:8,marginBottom:8}, filterActive:{backgroundColor:colors.red,borderColor:colors.red}, filterFocused:{backgroundColor:colors.text,borderColor:colors.text}, filterText:{color:colors.text,fontSize:11,fontWeight:'900',letterSpacing:1}, filterTextActive:{color:'#FFFFFF'}, card:{width:760,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:18,marginBottom:10}, cardHead:{flexDirection:'row',alignItems:'center'}, main:{flex:1}, appName:{color:colors.text,fontSize:21,fontWeight:'800'}, meta:{color:colors.muted,fontSize:14,marginTop:4}, badge:{fontSize:11,fontWeight:'900',letterSpacing:1,paddingHorizontal:10,paddingVertical:6,borderRadius:6}, known:{color:colors.success,backgroundColor:'#EAF6EE'}, unknown:{color:colors.warning,backgroundColor:'#FFF4E5'}, explanation:{color:'#444444',fontSize:15,lineHeight:22,marginTop:12}, cardFocused:{borderColor:colors.text,borderWidth:2}, source:{color:'#777777',fontSize:11,letterSpacing:1,marginTop:10}, footerCard:{width:760,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:20,marginTop:6}, footerText:{color:colors.muted,fontSize:15,lineHeight:23,marginTop:7}, center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'}, error:{color:'#B4232B',fontSize:18}
});