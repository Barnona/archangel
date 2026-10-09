import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AlternativeResult, AppProfile, AdLensHistory } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type Props = { id: string; onBack: () => void; onOpen: (id: string) => void };

export default function AppDetailsScreen({ id, onBack, onOpen }: Props) {
  const [app, setApp] = useState<(AppProfile & { alternativeProfiles: AlternativeResult[] }) | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<AdLensHistory | null>(null);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    setApp(null);
    setError('');
    api.app(id)
      .then(setApp)
      .catch(e => setError(e instanceof Error ? e.message : 'Unable to load app'));
    setHistory(null);
    setHistoryError('');
    api.adLensHistory(id)
      .then(setHistory)
      .catch(e => setHistoryError(e instanceof Error ? e.message : 'History unavailable'));
  }, [id]);

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!app) return <View style={styles.center}><ActivityIndicator size="large" color={colors.red} /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={({ focused }) => [styles.back, focused && styles.focus]}>
        <Text style={styles.backText}>‹  Back to Discover</Text>
      </Pressable>

      <Text style={styles.kicker}>APP PROFILE</Text>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>{app.name}</Text>
          <Text style={styles.category}>{app.category}</Text>
        </View>
        {app.verified ? <Text style={styles.verified}>SOURCE CHECKED</Text> : null}
      </View>

      <Text style={styles.description}>{app.description}</Text>

      <View style={styles.grid}>
        <Info title="PLATFORM" value={`${app.platforms.fireOs ? 'Fire OS ✓' : 'Fire OS —'}   ${app.platforms.vega ? 'Vega ✓' : 'Vega ?'}`} />
        <Info title="MONETIZATION" value={app.monetization.join(', ')} />
        <Info title="AD EXPERIENCE" value={app.adLevel} />
        <Info title="SOURCE CHECK" value={app.verified ? `Checked ${app.lastVerified ?? ''}` : 'Not independently verified'} />
      </View>

      {app.availabilityNote ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>AVAILABILITY NOTE</Text>
          <Text style={styles.noteText}>{app.availabilityNote}</Text>
        </View>
      ) : null}

      <Text style={styles.source}>Source: {app.source}</Text>

      <View style={styles.sectionHeading}><Text style={styles.sectionIcon}>◷</Text><Text style={styles.section}>MONETIZATION HISTORY</Text></View>
      <Text style={styles.historyIntro}>Compare recorded snapshots over time. A signal change does not, by itself, prove that the app changed its actual monetization policy.</Text>
      {history?.summary ? <View style={styles.historyStats}>
        <View style={styles.historyStat}><Text style={styles.statIcon}>▤</Text><Text style={styles.statValue}>{history.summary.snapshotCount}</Text><Text style={styles.statLabel}>SNAPSHOTS</Text></View>
        <View style={styles.historyStat}><Text style={styles.statIcon}>◉</Text><Text style={styles.statValue}>{history.summary.hasBaseline ? 'RECORDED' : 'NONE'}</Text><Text style={styles.statLabel}>BASELINE</Text></View>
        <View style={styles.historyStat}><Text style={styles.statIcon}>↻</Text><Text style={styles.statValue}>{history.summary.latestChangedFields.length}</Text><Text style={styles.statLabel}>LATEST CHANGES</Text></View>
      </View> : null}
      {historyError ? <View style={styles.historyEmpty}><Text style={styles.historyEmptyTitle}>HISTORY UNAVAILABLE</Text><Text style={styles.historyEmptyText}>{historyError}</Text></View> : !history ? <View style={styles.historyEmpty}><ActivityIndicator color={colors.red} /><Text style={styles.historyEmptyText}>Loading recorded history…</Text></View> : history.snapshots.length === 0 ? <View style={styles.historyEmpty}><Text style={styles.historyEmptyTitle}>NO SNAPSHOTS RECORDED</Text><Text style={styles.historyEmptyText}>A historical baseline has not been recorded for this app yet. ARCHANGEL will not invent earlier states.</Text></View> : <>
        {history.changes.length > 0 ? <View style={styles.changeBox}><View style={styles.changeHeading}><Text style={styles.changeIcon}>↕</Text><Text style={styles.changeTitle}>RECORDED SIGNAL CHANGES</Text></View>{history.changes.map((change, index) => <View key={change.field + index} style={styles.changeRow}><Text style={styles.changeField}>{String(change.field || 'unknown').replace(/([A-Z])/g, ' $1').toUpperCase()}</Text><Text style={styles.changeValue}>{change.previous}  →  {change.current}</Text></View>)}<Text style={styles.changeNote}>This is a change in recorded data signals, not independent confirmation of an app policy change.</Text></View> : <Text style={styles.noChange}>No recorded signal changes in the available history.</Text>}
        {history.snapshots.map((snapshot, index) => <View key={snapshot.id || `${snapshot.capturedAt || 'snapshot'}-${index}`} style={styles.timelineRow}><View style={styles.snapshotCard}><View style={styles.snapshotHead}><View style={styles.snapshotDateRow}><Text style={styles.snapshotIcon}>{index === 0 ? '●' : '○'}</Text><Text style={styles.snapshotDate}>{snapshot.capturedAt && Number.isFinite(Date.parse(snapshot.capturedAt)) ? new Date(snapshot.capturedAt).toLocaleString() : 'Unknown date'}{index === 0 ? '  ·  LATEST' : ''}</Text></View><Text style={styles.snapshotVersion}>CATALOG {snapshot.catalogVersion || 'UNKNOWN'}</Text></View><Text style={styles.snapshotSummary}>Ads: {snapshot.adSignal === 'unknown' ? 'Unknown' : snapshot.adLevel}  •  Subscription: {snapshot.subscriptionModel}  •  Ad-free tier: {snapshot.adFreeTierKnown ? snapshot.adFreeTierName || 'Known' : 'Unknown'}</Text><Text style={styles.snapshotMeta}>Monetization: {(snapshot.monetization || []).join(', ') || 'Unknown'}</Text><Text style={styles.snapshotMeta}>Evidence: {String(snapshot.evidence?.status || 'UNKNOWN').replace(/_/g, ' ')} · {Math.round((snapshot.evidence?.confidence ?? 0) * 100)}% confidence</Text></View></View>)}
      </>}

      {app.alternativeProfiles.length > 0 ? (
        <>
          <Text style={styles.section}>ALTERNATIVES</Text>
          {app.alternativeProfiles.map(x => (
            <Pressable key={x.app.id} onPress={() => onOpen(x.app.id)} style={({ focused }) => [styles.alt, focused && styles.focus]}>
              <View style={styles.altRow}>
                <View style={styles.altMain}>
                  <Text style={styles.altName}>{x.app.name}</Text>
                  <Text style={styles.altMeta}>{x.app.category} • {x.app.monetization.join(', ')}</Text>
                </View>
                <Text style={styles.altScore}>{x.score}</Text>
              </View>
              <Text style={styles.altReason}>{x.reasons.join(' • ')}</Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return <View style={styles.info}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  content:{padding:48,paddingHorizontal:64,paddingBottom:70},
  back:{alignSelf:'flex-start',padding:10,marginBottom:22},
  focus:{backgroundColor:colors.panel2,borderRadius:8,borderWidth:2,borderColor:colors.red},
  backText:{color:colors.red,fontSize:18,fontWeight:'700'},
  kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700'},
  titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',maxWidth:900},
  title:{color:colors.text,fontSize:44,fontWeight:'900',marginTop:6},
  category:{color:colors.red,fontSize:18,fontWeight:'700'},
  verified:{color:colors.success,fontSize:11,fontWeight:'900',letterSpacing:1},
  description:{color:colors.muted,fontSize:20,lineHeight:29,maxWidth:850,marginTop:18},
  grid:{flexDirection:'row',flexWrap:'wrap',maxWidth:900,marginTop:25},
  info:{width:420,backgroundColor:colors.panel,padding:18,marginRight:12,marginBottom:12,borderRadius:10,borderWidth:1,borderColor:colors.line},
  infoTitle:{color:'#777777',fontSize:12,letterSpacing:1.5,fontWeight:'700'},
  infoValue:{color:colors.text,fontSize:18,marginTop:7},
  note:{width:850,backgroundColor:colors.panel2,padding:18,borderRadius:10,borderWidth:1,borderColor:colors.line,marginTop:4},
  noteTitle:{color:colors.red,fontSize:11,letterSpacing:1.5,fontWeight:'900'},
  noteText:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:5},
  source:{color:'#777777',fontSize:13,marginTop:12},
  historyIntro:{color:colors.muted,fontSize:15,lineHeight:22,maxWidth:850,marginBottom:14},
  sectionHeading:{flexDirection:'row',alignItems:'center',marginTop:30,marginBottom:12},
  sectionIcon:{color:colors.red,fontSize:25,fontWeight:'900',marginRight:10},
  historyStats:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:16,maxWidth:850},
  historyStat:{width:190,minHeight:95,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:12},
  statIcon:{color:colors.red,fontSize:20,fontWeight:'900'},
  statValue:{color:colors.text,fontSize:17,fontWeight:'900',marginTop:4},
  statLabel:{color:colors.muted,fontSize:10,fontWeight:'900',letterSpacing:1,marginTop:3},
  historyEmpty:{width:850,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:18,marginBottom:12},
  historyEmptyTitle:{color:colors.red,fontSize:12,fontWeight:'900',letterSpacing:1.2},
  historyEmptyText:{color:colors.muted,fontSize:14,lineHeight:21,marginTop:6},
  noChange:{color:colors.success,fontSize:13,fontWeight:'700',marginBottom:12},
  changeBox:{width:850,backgroundColor:'#FFF4E5',borderWidth:1,borderColor:'#F1D5A8',borderRadius:10,padding:16,marginBottom:14},
  changeHeading:{flexDirection:'row',alignItems:'center',marginBottom:8},
  changeIcon:{color:'#B45309',fontSize:20,fontWeight:'900',marginRight:8},
  changeTitle:{color:'#B45309',fontSize:12,fontWeight:'900',letterSpacing:1.2},
  changeRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:5},
  changeField:{color:colors.text,fontSize:11,fontWeight:'800'},
  changeValue:{color:colors.text,fontSize:12,fontWeight:'700',maxWidth:480},
  changeNote:{color:'#79521B',fontSize:11,lineHeight:16,marginTop:8},
  timelineRow:{width:850,minHeight:105},
  snapshotCard:{width:'100%',backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:9,padding:14,marginBottom:10},
  snapshotHead:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap'},
  snapshotDateRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap'},
  snapshotIcon:{color:colors.red,fontSize:13,marginRight:7},
  snapshotDate:{color:colors.text,fontSize:14,fontWeight:'800'},
  snapshotVersion:{color:colors.muted,fontSize:11},
  snapshotSummary:{color:colors.text,fontSize:13,lineHeight:20,marginTop:9},
  snapshotMeta:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:4},
  section:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700',marginTop:30,marginBottom:12},
  alt:{width:850,padding:16,backgroundColor:colors.panel,borderRadius:10,borderWidth:1,borderColor:colors.line,marginBottom:10},
  altName:{color:colors.text,fontSize:20,fontWeight:'800'},
  altMeta:{color:colors.muted,fontSize:15,marginTop:4},
  altRow:{flexDirection:'row',alignItems:'center'},
  altMain:{flex:1},
  altScore:{color:colors.red,fontSize:16,fontWeight:'900'},
  altReason:{color:colors.muted,fontSize:13,marginTop:8},
  center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
  error:{color:'#B4232B',fontSize:18}
});