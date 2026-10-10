import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PulseStatus } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

function statusLabel(status: PulseStatus['overall']) {
  if (status === 'healthy') return 'HEALTHY';
  if (status === 'degraded') return 'DEGRADED';
  return 'ATTENTION';
}

function statusStyle(status: PulseStatus['overall']) {
  if (status === 'healthy') return styles.healthy;
  if (status === 'degraded') return styles.degraded;
  return styles.attention;
}

export default function PulseScreen() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<PulseStatus | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setRunning(true); setError('');
    const start = Date.now();
    try { const response = await api.pulse(); setLatency(Date.now() - start); setData(response); }
    catch (e) { setLatency(Date.now() - start); setData(null); setError(e instanceof Error ? e.message : 'Pulse check failed.'); }
    finally { setRunning(false); }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus showsVerticalScrollIndicator={false}>
      <Text style={styles.kicker}>⌁  FIRE TV PULSE</Text>
      <Text style={styles.title}>Fix My TV</Text>
      <Text style={styles.sub}>A transparent experience check — separate system signals from assumptions and report only what ARCHANGEL can observe.</Text>
      <View style={styles.overview}>
        <View style={styles.overviewMain}><Text style={styles.cardTitle}>◉  OVERALL EXPERIENCE</Text><Text style={styles.overall}>{data ? statusLabel(data.overall) : 'NOT CHECKED'}</Text><Text style={styles.meta}>{data ? 'Observed ' + new Date(data.generatedAt).toLocaleTimeString() : 'Run a check to inspect the intelligence layer.'}</Text></View>
        <View style={styles.latencyCard}><Text style={styles.cardTitle}>↔  API LATENCY</Text><Text style={styles.big}>{latency !== null ? latency + ' ms' : '—'}</Text><Text style={styles.meta}>Round-trip from the TV client.</Text></View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data ? <><Text style={styles.section}>◈  SYSTEM SIGNALS</Text>{data.checks.map(check => <View key={check.id} style={styles.checkCard}><View style={styles.checkHead}><View style={styles.checkMain}><Text style={styles.checkLabel}>{check.label}</Text><Text style={styles.checkSummary}>{check.summary}</Text></View><Text style={[styles.status, statusStyle(check.status)]}>{check.status.toUpperCase()}</Text></View><Text style={styles.detail}>{check.detail}</Text></View>)}</> : null}
      {data ? <><Text style={styles.section}>▥  OBSERVED METRICS</Text><View style={styles.metrics}><Metric title="CATALOG RECORDS" value={String(data.metrics.catalogRecords)} /><Metric title="VERIFIED RECORDS" value={String(data.metrics.verifiedCatalogRecords)} /><Metric title="REQUEST SIGNALS" value={String(data.metrics.requestCount)} /><Metric title="ADLENS SNAPSHOTS" value={String(data.metrics.adLensSnapshots)} /></View></> : null}
      <View style={styles.boundary}><Text style={styles.cardTitle}>ⓘ  PULSE BOUNDARY</Text><Text style={styles.boundaryText}>Pulse does not claim access to Fire TV system internals, remote diagnostics, ISP telemetry, or Amazon-private APIs. It diagnoses ARCHANGEL-observable service and data signals.</Text></View>
      <Pressable onPress={run} style={({ focused }) => [styles.button, focused && styles.focus]}>{running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>⟳  RUN FULL CHECK</Text>}</Pressable>
    </ScrollView>
  );
}

function Metric({ title, value }: { title: string; value: string }) { return <View style={styles.metric}><Text numberOfLines={1} style={styles.metricTitle}>{title}</Text><Text style={styles.metricValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg}, content:{padding:48,paddingHorizontal:64,paddingBottom:70}, kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700'}, title:{color:colors.text,fontSize:44,fontWeight:'900',marginTop:6}, sub:{color:colors.muted,fontSize:18,marginTop:6,marginBottom:22,maxWidth:900,lineHeight:26}, overview:{flexDirection:'row',width:774}, overviewMain:{flex:1,backgroundColor:colors.panel,borderRadius:12,borderWidth:1,borderColor:colors.line,padding:22,marginRight:12}, latencyCard:{width:250,backgroundColor:colors.panel,borderRadius:12,borderWidth:1,borderColor:colors.line,padding:22}, cardTitle:{color:colors.red,fontSize:11,letterSpacing:1.7,fontWeight:'900'}, overall:{color:colors.text,fontSize:34,fontWeight:'900',marginTop:8}, big:{color:colors.text,fontSize:34,fontWeight:'900',marginTop:8}, meta:{color:colors.muted,fontSize:14,marginTop:5}, section:{color:colors.red,fontSize:12,fontWeight:'900',letterSpacing:1.8,marginTop:24,marginBottom:10}, checkCard:{width:774,backgroundColor:colors.panel,borderRadius:10,borderWidth:1,borderColor:colors.line,padding:17,marginBottom:9}, checkHead:{flexDirection:'row',alignItems:'center'}, checkMain:{flex:1}, checkLabel:{color:colors.text,fontSize:17,fontWeight:'900',letterSpacing:.5}, checkSummary:{color:colors.muted,fontSize:14,marginTop:4}, status:{fontSize:10,fontWeight:'900',letterSpacing:1,paddingHorizontal:9,paddingVertical:6,borderRadius:6}, healthy:{color:colors.success,backgroundColor:'#EAF6EE'}, degraded:{color:colors.warning,backgroundColor:'#FFF4E5'}, attention:{color:'#B4232B',backgroundColor:'#FDECEC'}, detail:{color:'#555555',fontSize:12,lineHeight:18,marginTop:9}, metrics:{width:774,flexDirection:'row'}, metric:{flex:1,minWidth:0,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:9,padding:15,marginRight:8}, metricTitle:{color:colors.red,fontSize:9,fontWeight:'900',letterSpacing:1}, metricValue:{color:colors.text,fontSize:25,fontWeight:'900',marginTop:6}, boundary:{width:774,backgroundColor:colors.panel2,borderRadius:10,borderWidth:1,borderColor:colors.line,padding:18,marginTop:18}, boundaryText:{color:colors.muted,fontSize:14,lineHeight:21,marginTop:6}, error:{color:'#B4232B',fontSize:15,maxWidth:774,marginTop:14}, button:{marginTop:18,alignSelf:'flex-start',backgroundColor:colors.red,paddingHorizontal:28,paddingVertical:14,borderRadius:8}, focus:{backgroundColor:colors.text}, buttonText:{color:'#fff',fontSize:13,fontWeight:'900',letterSpacing:1}
});