import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AdLensHistory, AdLensProfile } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type Detail = AdLensProfile & { category: string; description: string };

export default function AdLensDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [backFocused, setBackFocused] = useState(false);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<AdLensHistory | null>(null);
  useEffect(() => {
    Promise.all([api.adLensApp(id), api.adLensHistory(id)])
      .then(([profile, timeline]) => { setData(profile); setHistory(timeline); })
      .catch(e => setError(e instanceof Error ? e.message : 'Unable to load AdLens profile'));
  }, [id]);

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable onPress={onBack} style={styles.button}><Text style={styles.buttonText}>BACK</Text></Pressable></View>;
  if (!data) return <View style={styles.center}><ActivityIndicator size="large" color={colors.red} /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} scrollsChildToFocus showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} onFocus={() => setBackFocused(true)} onBlur={() => setBackFocused(false)} style={[styles.back, backFocused && styles.focused]}><Text style={[styles.backText, backFocused && styles.backTextFocused]}>← ADLENS</Text></Pressable>
      <Text style={styles.kicker}>ADLENS / APP PROFILE</Text>
      <Text style={styles.title}>{data.appName}</Text>
      <Text style={styles.sub}>{data.description}</Text>

      <View style={styles.grid}>
        <Info title="CATEGORY" value={data.category} />
        <Info title="MONETIZATION" value={data.monetization.join(' • ')} />
        <Info title="AD SIGNAL" value={data.adSignal.toUpperCase()} />
        <Info title="AD LEVEL" value={data.adLevel.toUpperCase()} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>SUBSCRIPTION INTELLIGENCE</Text>
        <Text style={styles.value}>
          {data.subscription.model === 'subscription' ? 'SUBSCRIPTION MODEL DETECTED' : 'NO VERIFIED SUBSCRIPTION SIGNAL'}
        </Text>
        <View style={styles.verificationGrid}>
          <VerificationItem title="AD-FREE TIER" value={data.subscription.adFreeTierKnown ? (data.subscription.adFreeTierName ?? 'KNOWN') : 'UNKNOWN'} />
          <VerificationItem title="OFFER STATUS" value={data.subscription.offerStatus.toUpperCase()} />
          <VerificationItem title="AD-FREE VERIFIED" value={data.subscription.adFreeTierVerified ? 'VERIFIED' : 'NOT VERIFIED'} />
          <VerificationItem title="EVIDENCE" value={data.subscription.evidence.verificationMethod === 'curated-catalog' ? 'ARCHANGEL CURATED VERIFIED CATALOG' : data.subscription.evidence.verificationMethod.toUpperCase()} />
        </View>
        <Text style={styles.body}>{data.subscription.explanation}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>WHY THIS SIGNAL?</Text>
        <Text style={styles.value}>{data.adSignal === 'known' ? 'SIGNAL: ' + data.adSignal.toUpperCase() : 'SIGNAL: UNKNOWN'}</Text>
        <Text style={styles.body}>{data.explanation}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>EVIDENCE</Text>
        <Text style={styles.value}>{data.evidence.source}</Text>
        <Text style={styles.body}>Verification method: {data.evidence.verificationMethod === 'curated-catalog' ? 'ARCHANGEL curated verified catalog' : data.evidence.verificationMethod}</Text>
        <Text style={styles.meta}>CATALOG VERSION • {data.evidence.catalogVersion}</Text>
        {data.evidence.lastVerified ? <Text style={styles.meta}>LAST VERIFIED • {data.evidence.lastVerified}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>VERIFICATION</Text>
        <Text style={styles.value}>{data.transparency === 'verified' ? 'VERIFIED' : 'LIMITED SIGNAL'}</Text>
        <View style={styles.verificationGrid}>
          <VerificationItem title="STATUS" value={data.verified ? 'VERIFIED' : 'NOT VERIFIED'} />
          <VerificationItem title="SOURCE" value="ARCHANGEL CURATED VERIFIED CATALOG" />
          <VerificationItem title="CATALOG VERSION" value={data.evidence.catalogVersion} />
          <VerificationItem title="VERIFICATION METHOD" value={data.evidence.verificationMethod === 'curated-catalog' ? 'CURATED CATALOG REVIEW' : data.evidence.verificationMethod.toUpperCase()} />
          <VerificationItem title="LAST VERIFIED" value={data.evidence.lastVerified ?? 'NOT RECORDED'} />
        </View>
        <Text style={styles.body}>{data.verified ? 'This profile is marked verified in the current ARCHANGEL catalog.' : 'This profile is not currently marked as verified.'}</Text>
      </View>


      <View style={styles.card}>
        <Text style={styles.label}>MONETIZATION HISTORY</Text>
        <Text style={styles.value}>{history?.snapshots.length ? `${history.snapshots.length} SNAPSHOT${history.snapshots.length === 1 ? '' : 'S'} RECORDED` : 'NO HISTORY RECORDED'}</Text>
        {history?.snapshots.length === 1 ? (
          <Text style={styles.body}>Initial baseline captured from the current ARCHANGEL catalog. No earlier state is being claimed.</Text>
        ) : null}
        {history?.snapshots.slice().reverse().map(snapshot => (
          <View key={snapshot.id} style={styles.historyRow}>
            <Text style={styles.meta}>{snapshot.capturedAt}</Text>
            <Text style={styles.historyTitle}>{snapshot.adLevel.toUpperCase()} • {snapshot.subscriptionModel.toUpperCase()}</Text>
            <Text style={styles.body}>{snapshot.monetization.join(' • ')}</Text>
          </View>
        ))}
        {history?.changes.length ? (
          <View style={styles.changeBox}>
            <Text style={styles.meta}>RECORDED DATA SIGNAL CHANGES</Text>
            {history.changes.slice().reverse().map((change, index) => (
              <Text key={`${change.field}-${index}`} style={styles.body}>
                {change.field.toUpperCase()} • {change.previous} → {change.current}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>No monetization-state change has been observed in the recorded snapshots.</Text>
        )}
      </View>
      <View style={styles.warning}>
        <Text style={styles.label}>FIRE TV SYSTEM ADS</Text>
        <Text style={styles.value}>CONTROL NOT AVAILABLE</Text>
        <Text style={styles.body}>{data.systemAds.note}</Text>
      </View>
    </ScrollView>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return <View style={styles.info}><Text style={styles.label}>{title}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function VerificationItem({ title, value }: { title: string; value: string }) {
  return <View style={styles.verificationItem}><Text style={styles.meta}>{title}</Text><Text style={styles.verificationValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  content:{padding:48,paddingHorizontal:64,paddingBottom:70},
  kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'800',marginTop:18},
  title:{color:colors.text,fontSize:44,fontWeight:'900',marginTop:6},
  sub:{color:colors.muted,fontSize:17,maxWidth:820,lineHeight:25,marginTop:7,marginBottom:24},
  back:{alignSelf:'flex-start',paddingHorizontal:15,paddingVertical:9,borderRadius:8,borderWidth:1,borderColor:colors.line,backgroundColor:colors.panel},
  focused:{backgroundColor:colors.text,borderColor:colors.text},
  backText:{color:colors.text,fontSize:12,fontWeight:'900',letterSpacing:1},
  backTextFocused:{color:'#FFFFFF'},
  grid:{flexDirection:'row',flexWrap:'wrap',maxWidth:800},
  info:{width:245,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:17,marginRight:12,marginBottom:12},
  label:{color:colors.red,fontSize:11,fontWeight:'900',letterSpacing:1.4},
  infoValue:{color:colors.text,fontSize:17,fontWeight:'800',marginTop:7},
  card:{width:760,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:20,marginTop:2,marginBottom:12},
  value:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:6},
  body:{color:colors.muted,fontSize:15,lineHeight:23,marginTop:7},
  verificationGrid:{marginTop:14},
  verificationItem:{borderTopWidth:1,borderTopColor:colors.line,paddingVertical:10},
  verificationValue:{color:colors.text,fontSize:14,fontWeight:'800',marginTop:4},
  meta:{color:'#777777',fontSize:11,letterSpacing:1,marginTop:12},
  historyRow:{borderTopWidth:1,borderTopColor:colors.line,paddingVertical:11,marginTop:10},
  historyTitle:{color:colors.text,fontSize:15,fontWeight:'900',marginTop:4},
  changeBox:{marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:colors.line},
  warning:{width:760,backgroundColor:colors.panel2,borderWidth:1,borderColor:colors.line,borderRadius:10,padding:20,marginTop:2},
  button:{marginTop:16,backgroundColor:colors.red,paddingHorizontal:20,paddingVertical:12,borderRadius:8},
  buttonText:{color:'#fff',fontWeight:'900'},
  center:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},
  error:{color:'#B4232B',fontSize:18}
});
