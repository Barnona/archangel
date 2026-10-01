import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { colors } from '../theme/theme';
export default function PulseScreen() {
  const [running,setRunning]=useState(false); const [result,setResult]=useState<{latency:number;ok:boolean}|null>(null);
  const run=async()=>{setRunning(true);setResult(null);const start=Date.now();try{const response=await api.health();setResult({latency:Date.now()-start,ok:response.ok});}catch{setResult({latency:Date.now()-start,ok:false});}finally{setRunning(false);}};
  return <View style={styles.root}><Text style={styles.kicker}>FIRE TV PULSE</Text><Text style={styles.title}>Fix My TV</Text><Text style={styles.sub}>A transparent experience check — not a fake RAM cleaner.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>CONNECTIVITY</Text><Text style={styles.big}>{result? `${result.latency} ms`:'—'}</Text><Text style={styles.meta}>{result?(result.ok?'ARCHANGEL API reachable':'Connection failed'):'Run a check to measure response time.'}</Text></View>
    <View style={styles.card}><Text style={styles.cardTitle}>DIAGNOSIS</Text><Text style={styles.diag}>{result?.ok?'Your ARCHANGEL connection is responding. If streaming remains slow, compare the affected app and network conditions rather than assuming the TV needs a memory cleaner.':result?'The ARCHANGEL service could not be reached. Check that the backend is running and the TV can reach your development machine.':'ARCHANGEL only reports measurements it can actually observe.'}</Text></View>
    <Pressable onPress={run} style={({focused})=>[styles.button,focused&&styles.focus]}>{running?<ActivityIndicator color="#fff"/>:<Text style={styles.buttonText}>RUN CHECK</Text>}</Pressable>
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg,padding:64,paddingTop:52},kicker:{color:colors.red,fontSize:13,letterSpacing:2,fontWeight:'700'},title:{color:colors.text,fontSize:44,fontWeight:'900',marginTop:6},sub:{color:colors.muted,fontSize:19,marginBottom:28},card:{width:780,backgroundColor:colors.panel,borderRadius:12,borderWidth:1,borderColor:colors.line,padding:22,marginBottom:14},cardTitle:{color:colors.red,fontSize:12,letterSpacing:2,fontWeight:'800'},big:{color:colors.text,fontSize:38,fontWeight:'900',marginTop:10},meta:{color:colors.muted,fontSize:15,marginTop:5},diag:{color:'#444444',fontSize:17,lineHeight:26,marginTop:10},button:{marginTop:10,alignSelf:'flex-start',backgroundColor:colors.red,paddingHorizontal:30,paddingVertical:15,borderRadius:8},focus:{backgroundColor:colors.text},buttonText:{color:'#fff',fontSize:15,fontWeight:'900',letterSpacing:1}});
