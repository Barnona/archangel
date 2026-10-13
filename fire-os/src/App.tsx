import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import AppDetailsScreen from './screens/AppDetailsScreen';
import PulseScreen from './screens/PulseScreen';
import RequestScreen from './screens/RequestScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdLensScreen from './screens/AdLensScreen';
import AdLensDetailScreen from './screens/AdLensDetailScreen';
import SideloadSentinelScreen from './screens/SideloadSentinelScreen';
import { applyTheme } from './theme/theme';

type Screen = 'Home' | 'Discover' | 'Details' | 'Pulse' | 'AdLens' | 'AdLensDetail' | 'Request' | 'Profile' | 'Sentinel';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Home');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [requestedName, setRequestedName] = useState('');
  const [requestSource, setRequestSource] = useState<'manual' | 'missing-app-discovery'>('manual');
  const [adLensAppId, setAdLensAppId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  useEffect(() => { applyTheme(mode); }, [mode]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Details') { setScreen('Discover'); return true; }
      if (screen === 'AdLensDetail') { setScreen('AdLens'); return true; }
      if (screen !== 'Home') { setScreen('Home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const openApp = (id: string) => { setSelectedApp(id); setScreen('Details'); };

  const openRequest = (name = '', source: 'manual' | 'missing-app-discovery' = 'manual') => { setRequestedName(name); setRequestSource(source); setScreen('Request'); };

  if (screen === 'Home') return <HomeScreen key={mode} navigate={setScreen as (s: 'Discover'|'Pulse'|'Request'|'Profile'|'Sentinel') => void} />;
  if (screen === 'Discover') return <DiscoverScreen key={mode} onOpen={openApp} onRequest={(name) => openRequest(name, 'missing-app-discovery')} />;
  if (screen === 'AdLens') return <AdLensScreen key={mode} onOpenApp={(id) => { setAdLensAppId(id); setScreen('AdLensDetail'); }} />;
  if (screen === 'AdLensDetail' && adLensAppId) return <AdLensDetailScreen key={mode} id={adLensAppId} onBack={() => setScreen('AdLens')} />;
  if (screen === 'Details' && selectedApp) return <AppDetailsScreen key={mode} id={selectedApp} onBack={() => setScreen('Discover')} onOpen={openApp} />;
  if (screen === 'Pulse') return <PulseScreen key={mode} />;
  if (screen === 'Sentinel') return <SideloadSentinelScreen key={mode} onBack={() => setScreen('Home')} />;
  if (screen === 'Request') return <RequestScreen key={mode} initialName={requestedName} source={requestSource} />;
  return <ProfileScreen fontSize={fontSize} onFontSizeChange={setFontSize} mode={mode} onModeChange={setMode} />;
}
