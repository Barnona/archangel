import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DiscoveryResult } from '../../../shared/src/types';
import { api } from '../lib/api';
import { colors } from '../theme/theme';

type Props = { onOpen: (id: string) => void; onRequest?: (name: string) => void };
const categories = ['All', 'Streaming', 'Music', 'Games', 'Utility'];

export default function DiscoverScreen({ onOpen, onRequest }: Props) {
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [askFocused, setAskFocused] = useState(false);
  const [requestFocused, setRequestFocused] = useState(false);
  const [requestFocused, setRequestFocused] = useState(false);
  const [aiResult, setAiResult] = useState<{
    intentType: 'SPECIFIC_APP' | 'CAPABILITY' | 'CONTENT' | 'MISSING_APP' | 'AMBIGUOUS';
    requestedApp: string;
    understoodIntent: string;
    exactMatch: string | null;
    alternatives: { appId: string; reason: string; confidence: number }[];
    message: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.discover(query, category);
      setResults(response.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach ARCHANGEL API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const askArchangel = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await api.aiDiscover(query.trim());
      setAiResult(result);
      setAiOpen(true);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI discovery is unavailable');
      setAiOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setCategory('');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>DISCOVERY INTELLIGENCE</Text>
      <Text style={styles.title}>Find an App</Text>
      <Text style={styles.sub}>Search the ARCHANGEL catalog, compare alternatives, and inspect why a result matched.</Text>

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
        <Pressable onPress={load} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} style={[styles.searchButton, searchFocused && styles.focusButton]}>
          <Text style={styles.searchButtonText}>SEARCH</Text>
        </Pressable>
        {(query || category) ? (
          <Pressable onPress={clearSearch} style={({ focused }) => [styles.clearButton, focused && styles.focusOutline]}>
            <Text style={styles.clearText}>CLEAR</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.aiRow}>
        <Pressable onPress={askArchangel} onFocus={() => setAskFocused(true)} onBlur={() => setAskFocused(false)} style={[styles.aiButton, askFocused && styles.focusButton]}>
          <Text style={styles.searchButtonText}>{aiLoading ? 'THINKING...' : 'ASK ARCHANGEL'}</Text>
        </Pressable>
      </View>

      {aiOpen ? (
        <View style={styles.aiBox}>
          <View style={styles.aiHeader}>
            <View>
              <Text style={styles.aiLabel}>ARCHANGEL CONCIERGE</Text>
              <Text style={styles.aiTitle}>Application intent analysis</Text>
            </View>
            <Pressable onPress={() => setAiOpen(false)} style={({ focused }) => [styles.clearButton, focused && styles.focusOutline]}>
              <Text style={styles.clearText}>CLOSE</Text>
            </Pressable>
          </View>
          {aiError ? <Text style={styles.error}>{aiError}</Text> : null}
          {aiResult ? (
            <>
              <View style={styles.intentBadge}>
                <Text style={styles.intentBadgeText}>{aiResult.intentType.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.aiIntent}>{aiResult.understoodIntent}</Text>
              <Text style={styles.aiMessage}>{aiResult.message}</Text>
              <Text style={styles.reasonLabel}>CATALOG DECISION</Text>
              {aiResult.exactMatch ? (
                <>
                  <Text style={styles.reason}>Exact catalog match found.</Text>
                  <Pressable onPress={() => onOpen(aiResult.exactMatch!)} style={({ focused }) => [styles.aiExact, focused && styles.aiResultFocused]}>
                    <Text style={styles.aiExactText}>OPEN {aiResult.exactMatch.toUpperCase()}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.reason}>
                    {aiResult.intentType === 'MISSING_APP'
                      ? 'This app is not in the current verified catalog.'
                      : 'No exact catalog match. Alternatives were evaluated.'}
                  </Text>
                  {aiResult.intentType === 'MISSING_APP' && aiResult.requestedApp.trim() && onRequest ? (
                    <Pressable onPress={() => onRequest(aiResult.requestedApp)} onFocus={() => setRequestFocused(true)} onBlur={() => setRequestFocused(false)} style={[styles.aiRequest, requestFocused && styles.focusButton]}>
                      <Text style={styles.requestButtonText}>REQUEST “{aiResult.requestedApp.toUpperCase()}”</Text>
                    </Pressable>
                  ) : null}
                </>
              )}
              {aiResult.alternatives.length ? (
                <View style={styles.aiAlternatives}>
                  {aiResult.alternatives.slice(0, 3).map(item => (
                    <Pressable key={item.appId} onPress={() => onOpen(item.appId)} style={({ focused }) => [styles.aiAlternative, focused && styles.aiResultFocused]}>
                      <View style={styles.aiAlternativeRow}>
                        <Text style={styles.appName}>{item.appId}</Text>
                        <Text style={styles.aiConfidence}>{Math.round(item.confidence * 100)}%</Text>
                      </View>
                      <Text style={styles.description}>{item.reason}</Text>
                      <Text style={styles.aiOpenHint}>OPEN APP PROFILE ›</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

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
        <Text style={styles.resultCount}>{loading ? 'ANALYZING CATALOG...' : `${results.length} RESULT${results.length === 1 ? '' : 'S'} • RANKED`}</Text>
        <Text style={styles.snapshot}>SOURCE SNAPSHOT • 2026-10-01</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.red} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && results.map((result) => {
        const app = result.app;
        return (
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
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>WHY THIS RESULT</Text>
              <Text style={styles.reason}>{result.reasons.join('  •  ')}</Text>
            </View>
          </Pressable>
        );
      })}

      {!loading && !error && results.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No intelligent match</Text>
          <Text style={styles.empty}>Try another search or clear the filters. If the app is missing, send a developer-demand signal.</Text>
          {query ? <Pressable onPress={() => onRequest?.(query)} style={({ focused }) => [styles.requestButton, focused && styles.actionFocusButton]}><Text style={styles.requestButtonText}>REQUEST “{query.toUpperCase()}”</Text></Pressable> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.bg},
  content:{padding:40,paddingHorizontal:56,paddingBottom:60},
  kicker:{color:colors.red,fontSize:11,fontWeight:'700',letterSpacing:1.8},
  title:{color:colors.text,fontSize:36,fontWeight:'900',marginTop:5},
  sub:{color:colors.muted,fontSize:16,marginTop:4,marginBottom:16,maxWidth:850},
  searchRow:{flexDirection:'row',alignItems:'center'},
  search:{width:500,height:50,borderRadius:9,backgroundColor:colors.panel,borderWidth:2,borderColor:colors.line,color:colors.text,fontSize:18,paddingHorizontal:16},
  aiRow:{flexDirection:'row',alignItems:'center',marginTop:8,marginBottom:2},
  aiButton:{height:48,paddingHorizontal:20,borderRadius:9,backgroundColor:colors.red,alignItems:'center',justifyContent:'center'},
  searchButton:{marginLeft:8,height:50,paddingHorizontal:21,borderRadius:9,backgroundColor:colors.red,alignItems:'center',justifyContent:'center'},
  searchButtonText:{color:'#fff',fontSize:12,fontWeight:'900',letterSpacing:1},
  clearButton:{marginLeft:8,height:50,paddingHorizontal:16,borderRadius:9,borderWidth:1,borderColor:colors.line,backgroundColor:colors.panel,alignItems:'center',justifyContent:'center'},
  clearText:{color:colors.text,fontSize:13,fontWeight:'800',letterSpacing:1},
  focusButton:{backgroundColor:'#171717'},
  actionFocusButton:{backgroundColor: colors.black},
  focusOutline:{borderColor:colors.red,backgroundColor:colors.panel2},
  aiBox:{width:760,backgroundColor:colors.panel2,borderRadius:10,borderWidth:2,borderColor:colors.red,padding:16,marginBottom:14},
  aiHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  aiLabel:{color:colors.red,fontSize:10,fontWeight:'900',letterSpacing:1.3},
  aiTitle:{color:colors.text,fontSize:21,fontWeight:'900',marginTop:3},
  intentBadge:{alignSelf:'flex-start',marginTop:12,paddingHorizontal:9,paddingVertical:4,borderRadius:6,backgroundColor:colors.paleRed},
  intentBadgeText:{color:colors.red,fontSize:9,fontWeight:'900',letterSpacing:1},
  aiIntent:{color:colors.text,fontSize:16,fontWeight:'700',marginTop:7},
  aiMessage:{color:colors.muted,fontSize:14,lineHeight:20,marginTop:5,marginBottom:12},
  aiExact:{alignSelf:'flex-start',marginTop:10,backgroundColor:colors.red,paddingHorizontal:16,paddingVertical:10,borderRadius:8},
  aiExactText:{color:'#fff',fontSize:11,fontWeight:'900',letterSpacing:1},
  aiRequest:{alignSelf:'flex-start',marginTop:10,backgroundColor:colors.red,paddingHorizontal:16,paddingVertical:10,borderRadius:8},
  aiResultFocused:{backgroundColor:colors.panel,borderRadius:8,borderWidth:1,borderColor:colors.red,paddingHorizontal:10},
  aiAlternatives:{marginTop:12},
  aiAlternative:{paddingTop:10,paddingBottom:10,borderTopWidth:1,borderTopColor:colors.line},
  aiAlternativeRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  aiConfidence:{color:colors.red,fontSize:12,fontWeight:'900'},
  aiOpenHint:{color:colors.red,fontSize:9,fontWeight:'900',letterSpacing:1,marginTop:6},
  filters:{flexDirection:'row',marginVertical:14},
  filter:{paddingHorizontal:16,paddingVertical:8,borderRadius:7,marginRight:8,backgroundColor:colors.panel,borderWidth:1,borderColor:colors.line},
  filterActive:{backgroundColor:colors.red,borderColor:colors.red},
  filterFocused:{borderColor:colors.red},
  filterText:{color:colors.text,fontSize:14,fontWeight:'700'},
  filterTextActive:{color:'#FFFFFF'},
  resultBar:{width:760,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  resultCount:{color:colors.text,fontSize:12,fontWeight:'900',letterSpacing:1},
  snapshot:{color:'#777777',fontSize:10,letterSpacing:1},
  loader:{marginTop:35},
  card:{width:760,backgroundColor:colors.panel,borderRadius:10,borderWidth:2,borderColor:colors.line,padding:16,marginBottom:12},
  cardFocused:{borderColor:colors.red,backgroundColor:colors.panel2,transform:[{scale:1.015}]},
  cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  nameWrap:{flexDirection:'row',alignItems:'center',flex:1},
  appName:{color:colors.text,fontSize:21,fontWeight:'800'},
  verified:{color:colors.success,fontSize:9,fontWeight:'900',letterSpacing:1,marginLeft:10},
  category:{color:colors.red,fontSize:13,fontWeight:'700'},
  description:{color:colors.muted,fontSize:14,lineHeight:20,marginTop:6},
  meta:{color:'#555555',fontSize:12,marginTop:9},
  reasonBox:{marginTop:11,paddingTop:10,borderTopWidth:1,borderTopColor:colors.line},
  reasonLabel:{color:colors.red,fontSize:9,fontWeight:'900',letterSpacing:1.4},
  reason:{color:colors.text,fontSize:12,lineHeight:18,marginTop:3},
  error:{color:'#B4232B',fontSize:15,marginTop:18,maxWidth:760},
  emptyBox:{width:820,backgroundColor:colors.panel,padding:22,borderRadius:12,borderWidth:1,borderColor:colors.line},
  emptyTitle:{color:colors.text,fontSize:22,fontWeight:'800'},
  empty:{color:colors.muted,fontSize:17,lineHeight:25,marginTop:7},
  requestButton:{alignSelf:'flex-start',marginTop:16,backgroundColor:colors.red,paddingHorizontal:20,paddingVertical:13,borderRadius:8},
  requestButtonText:{color:'#fff',fontSize:13,fontWeight:'900',letterSpacing:1}
});
