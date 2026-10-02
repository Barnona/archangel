import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type PulseResult = {
  latency: number;
  ok: boolean;
  catalogCount?: number;
  requestCount?: number;
  uptimeSeconds?: number;
  timestamp?: string;
};

type CatalogResult = {
  total: number;
  verified: number;
  fireOs: number;
  vega: number;
  coverage: number;
  source: string;
  lastUpdated: string;
};

export default function PulseScreen() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PulseResult | null>(null);
  const [catalog, setCatalog] = useState<CatalogResult | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setCatalog(null);
    const start = Date.now();

    try {
      const [response, catalogResponse] = await Promise.all([api.health(), api.catalogStatus()]);
      setResult({
        latency: Date.now() - start,
        ok: response.ok,
        catalogCount: response.catalogCount,
        requestCount: response.requestCount,
        uptimeSeconds: response.uptimeSeconds,
        timestamp: response.timestamp,
      });
      setCatalog(catalogResponse);
    } catch {
      setResult({ latency: Date.now() - start, ok: false });
    } finally {
      setRunning(false);
    }
  };

  const observedAt = result?.timestamp
    ? new Date(result.timestamp).toLocaleTimeString()
    : null;

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>FIRE TV PULSE</Text>
      <Text style={styles.title}>Fix My TV</Text>
      <Text style={styles.sub}>A transparent experience check — only reports signals ARCHANGEL can actually observe.</Text>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>API LATENCY</Text>
          <Text style={styles.big}>{result ? `${result.latency} ms` : '—'}</Text>
          <Text style={styles.meta}>
            {result ? (result.ok ? 'ARCHANGEL API reachable' : 'Connection failed') : 'Run a check to measure response time.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>CATALOG COVERAGE</Text>
          <Text style={styles.bigSmall}>{catalog ? `${catalog.total} RECORDS` : '—'}</Text>
          <Text style={styles.meta}>
            {catalog ? `${catalog.verified} verified • ${catalog.fireOs} Fire OS • ${catalog.vega} Vega` : 'Catalog status not measured yet.'}
          </Text>
        </View>
      </View>

      <View style={styles.cardWide}>
        <Text style={styles.cardTitle}>DIAGNOSIS</Text>
        <Text style={styles.diag}>
          {result?.ok
            ? catalog
              ? `ARCHANGEL is online with ${catalog.total} catalog records. Current coverage is a curated verified cache, not a claim of the complete Amazon Appstore. The ingestion layer is structured so an authorized Amazon catalog API can replace this source later.`
              : 'The ARCHANGEL service is responding.'
            : result
              ? 'The ARCHANGEL service could not be reached. Check that the backend is running and the TV can reach your development machine.'
              : 'ARCHANGEL only reports measurements it can actually observe.'}
        </Text>
        {catalog ? <Text style={styles.observed}>Source {catalog.source} • updated {catalog.lastUpdated} • verification coverage {catalog.coverage}%</Text> : null}
        {observedAt ? <Text style={styles.observed}>Observed {observedAt} • backend uptime {result?.uptimeSeconds ?? 0}s</Text> : null}
      </View>

      <Pressable onPress={run} style={({ focused }) => [styles.button, focused && styles.focus]}>
        {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>RUN CHECK</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg,padding:64,paddingTop:52},
  kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700'},
  title:{color:colors.text,fontSize:44,fontWeight:'900',marginTop:6},
  sub:{color:colors.muted,fontSize:19,marginBottom:28,maxWidth:900},
  row:{flexDirection:'row',alignItems:'stretch'},
  card:{width:380,backgroundColor:colors.panel,borderRadius:12,borderWidth:1,borderColor:colors.line,padding:22,marginRight:14},
  cardWide:{width:774,backgroundColor:colors.panel,borderRadius:12,borderWidth:1,borderColor:colors.line,padding:22,marginTop:14},
  cardTitle:{color:colors.red,fontSize:12,letterSpacing:2,fontWeight:'800'},
  big:{color:colors.text,fontSize:38,fontWeight:'900',marginTop:10},
  bigSmall:{color:colors.text,fontSize:30,fontWeight:'900',marginTop:16},
  meta:{color:colors.muted,fontSize:15,marginTop:5},
  diag:{color:'#444444',fontSize:17,lineHeight:26,marginTop:10},
  observed:{color:'#777777',fontSize:13,marginTop:12},
  button:{marginTop:18,alignSelf:'flex-start',backgroundColor:colors.red,paddingHorizontal:30,paddingVertical:15,borderRadius:8},
  focus:{backgroundColor:colors.text},
  buttonText:{color:'#fff',fontSize:15,fontWeight:'900',letterSpacing:1}
});
