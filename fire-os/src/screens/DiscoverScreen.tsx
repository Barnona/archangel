import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppProfile } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type Props = { onOpen: (id: string) => void };
const categories = ['All', 'Streaming', 'Music', 'Games', 'Utility'];

export default function DiscoverScreen({ onOpen }: Props) {
  const [apps, setApps] = useState<AppProfile[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setApps(await api.apps(query, category)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not reach ARCHANGEL API'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [category]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>DISCOVERY INTELLIGENCE</Text>
      <Text style={styles.title}>Find an App</Text>
      <Text style={styles.sub}>Compare supported experiences instead of guessing.</Text>
      <TextInput value={query} onChangeText={setQuery} onSubmitEditing={load} placeholder="Search apps..." placeholderTextColor="#888888" style={styles.search} />
      <View style={styles.filters}>{categories.map((item) => { const active = (item === 'All' && !category) || item.toLowerCase() === category; return <Pressable key={item} onPress={() => setCategory(item === 'All' ? '' : item.toLowerCase())} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text></Pressable>; })}</View>
      {loading ? <ActivityIndicator size="large" color={colors.red} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && apps.map((app) => <Pressable key={app.id} onPress={() => onOpen(app.id)} style={({ focused }) => [styles.card, focused && styles.cardFocused]}><View style={styles.cardTop}><Text style={styles.appName}>{app.name}</Text><Text style={styles.category}>{app.category}</Text></View><Text style={styles.description} numberOfLines={2}>{app.description}</Text><Text style={styles.meta}>{app.platforms.fireOs ? 'Fire OS ✓' : 'Fire OS —'}   {app.platforms.vega ? 'Vega ✓' : 'Vega ?'}   •   {app.monetization.join(', ')}</Text></Pressable>)}
      {!loading && !error && apps.length === 0 ? <Text style={styles.empty}>No catalog matches yet.</Text> : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg}, content:{padding:48,paddingHorizontal:64,paddingBottom:70},
  kicker:{color:colors.red,fontSize:13,fontWeight:'700',letterSpacing:2}, title:{color:colors.text,fontSize:42,fontWeight:'900',marginTop:6}, sub:{color:colors.muted,fontSize:19,marginTop:5,marginBottom:24},
  search:{width:680,height:58,borderRadius:10,backgroundColor:colors.panel,borderWidth:2,borderColor:colors.line,color:colors.text,fontSize:20,paddingHorizontal:18},
  filters:{flexDirection:'row',marginVertical:18}, filter:{paddingHorizontal:18,paddingVertical:10,borderRadius:8,marginRight:10,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line}, filterActive:{backgroundColor:colors.red,borderColor:colors.red}, filterText:{color:colors.text,fontSize:16,fontWeight:'700'}, filterTextActive:{color:'#FFFFFF'},
  loader:{marginTop:45}, card:{width:820,backgroundColor:colors.panel,borderRadius:12,borderWidth:2,borderColor:colors.line,padding:20,marginBottom:14}, cardFocused:{borderColor:colors.red,backgroundColor:colors.panel2,transform:[{scale:1.015}]},
  cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, appName:{color:colors.text,fontSize:25,fontWeight:'800'}, category:{color:colors.red,fontSize:15,fontWeight:'700'}, description:{color:colors.muted,fontSize:16,lineHeight:23,marginTop:8}, meta:{color:'#555555',fontSize:14,marginTop:12}, error:{color:'#B4232B',fontSize:17,marginTop:25,maxWidth:800}, empty:{color:colors.muted,fontSize:20,marginTop:30},
});