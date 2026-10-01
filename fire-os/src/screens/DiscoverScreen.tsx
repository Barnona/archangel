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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setApps(await api.apps(query, category));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach ARCHANGEL API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const clearSearch = () => {
    setQuery('');
    setCategory('');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>DISCOVERY INTELLIGENCE</Text>
      <Text style={styles.title}>Find an App</Text>
      <Text style={styles.sub}>Search the ARCHANGEL catalog, compare alternatives, and inspect source status.</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={load}
          placeholder="Search apps..."
          placeholderTextColor="#888888"
          returnKeyType="search"
          style={styles.search}
        />
        <Pressable onPress={load} style={({ focused }) => [styles.searchButton, focused && styles.focusButton]}>
          <Text style={styles.searchButtonText}>SEARCH</Text>
        </Pressable>
        {(query || category) ? (
          <Pressable onPress={clearSearch} style={({ focused }) => [styles.clearButton, focused && styles.focusOutline]}>
            <Text style={styles.clearText}>CLEAR</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        {categories.map((item) => {
          const active = (item === 'All' && !category) || item.toLowerCase() === category;
          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item === 'All' ? '' : item.toLowerCase())}
              style={({ focused }) => [styles.filter, active && styles.filterActive, focused && styles.filterFocused]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.resultBar}>
        <Text style={styles.resultCount}>{loading ? 'SEARCHING CATALOG...' : `${apps.length} RESULT${apps.length === 1 ? '' : 'S'}`}</Text>
        <Text style={styles.snapshot}>SOURCE SNAPSHOT • 2026-10-01</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.red} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && apps.map((app) => (
        <Pressable key={app.id} onPress={() => onOpen(app.id)} style={({ focused }) => [styles.card, focused && styles.cardFocused]}>
          <View style={styles.cardTop}>
            <View style={styles.nameWrap}>
              <Text style={styles.appName}>{app.name}</Text>
              {app.verified ? <Text style={styles.verified}>SOURCE CHECKED</Text> : null}
            </View>
            <Text style={styles.category}>{app.category}</Text>
          </View>
          <Text style={styles.description} numberOfLines={2}>{app.description}</Text>
          <Text style={styles.meta}>
            {app.platforms.fireOs ? 'Fire OS ✓' : 'Fire OS —'}   {app.platforms.vega ? 'Vega ✓' : 'Vega ?'}   •   {app.monetization.join(', ')}
          </Text>
        </Pressable>
      ))}

      {!loading && !error && apps.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No catalog match</Text>
          <Text style={styles.empty}>Try another search or clear the filters. If the app is missing, use Request an App to send a developer-demand signal.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  content:{padding:48,paddingHorizontal:64,paddingBottom:70},
  kicker:{color:colors.red,fontSize:13,fontWeight:'700',letterSpacing:2},
  title:{color:colors.text,fontSize:42,fontWeight:'900',marginTop:6},
  sub:{color:colors.muted,fontSize:19,marginTop:5,marginBottom:20,maxWidth:900},
  searchRow:{flexDirection:'row',alignItems:'center'},
  search:{width:590,height:58,borderRadius:10,backgroundColor:colors.panel,borderWidth:2,borderColor:colors.line,color:colors.text,fontSize:20,paddingHorizontal:18},
  searchButton:{marginLeft:10,height:58,paddingHorizontal:24,borderRadius:10,backgroundColor:colors.red,alignItems:'center',justifyContent:'center'},
  searchButtonText:{color:'#fff',fontSize:14,fontWeight:'900',letterSpacing:1},
  clearButton:{marginLeft:8,height:58,paddingHorizontal:18,borderRadius:10,borderWidth:1,borderColor:colors.line,backgroundColor:colors.panel,alignItems:'center',justifyContent:'center'},
  clearText:{color:colors.text,fontSize:13,fontWeight:'800',letterSpacing:1},
  focusButton:{backgroundColor:colors.text},
  focusOutline:{borderColor:colors.red,backgroundColor:colors.panel2},
  filters:{flexDirection:'row',marginVertical:18},
  filter:{paddingHorizontal:18,paddingVertical:10,borderRadius:8,marginRight:10,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line},
  filterActive:{backgroundColor:colors.red,borderColor:colors.red},
  filterFocused:{borderColor:colors.red},
  filterText:{color:colors.text,fontSize:16,fontWeight:'700'},
  filterTextActive:{color:'#FFFFFF'},
  resultBar:{width:820,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  resultCount:{color:colors.text,fontSize:13,fontWeight:'900',letterSpacing:1},
  snapshot:{color:'#777777',fontSize:11,letterSpacing:1},
  loader:{marginTop:45},
  card:{width:820,backgroundColor:colors.panel,borderRadius:12,borderWidth:2,borderColor:colors.line,padding:20,marginBottom:14},
  cardFocused:{borderColor:colors.red,backgroundColor:colors.panel2,transform:[{scale:1.015}]},
  cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  nameWrap:{flexDirection:'row',alignItems:'center',flex:1},
  appName:{color:colors.text,fontSize:25,fontWeight:'800'},
  verified:{color:colors.success,fontSize:10,fontWeight:'900',letterSpacing:1,marginLeft:12},
  category:{color:colors.red,fontSize:15,fontWeight:'700'},
  description:{color:colors.muted,fontSize:16,lineHeight:23,marginTop:8},
  meta:{color:'#555555',fontSize:14,marginTop:12},
  error:{color:'#B4232B',fontSize:17,marginTop:25,maxWidth:800},
  emptyBox:{width:820,backgroundColor:colors.panel,padding:22,borderRadius:12,borderWidth:1,borderColor:colors.line},
  emptyTitle:{color:colors.text,fontSize:22,fontWeight:'800'},
  empty:{color:colors.muted,fontSize:17,lineHeight:25,marginTop:7}
});
