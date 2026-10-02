import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import AppDetailsScreen from './screens/AppDetailsScreen';
import PulseScreen from './screens/PulseScreen';
import RequestScreen from './screens/RequestScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdLensScreen from './screens/AdLensScreen';

type Screen = 'Home' | 'Discover' | 'Details' | 'Pulse' | 'AdLens' | 'Request' | 'Profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Home');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [requestedName, setRequestedName] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Details') { setScreen('Discover'); return true; }
      if (screen !== 'Home') { setScreen('Home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const openApp = (id: string) => { setSelectedApp(id); setScreen('Details'); };

  const openRequest = (name = '') => { setRequestedName(name); setScreen('Request'); };

  if (screen === 'Home') return <HomeScreen navigate={setScreen as (s: 'Discover'|'Pulse'|'Request'|'Profile') => void} />;
  if (screen === 'Discover') return <DiscoverScreen onOpen={openApp} onRequest={openRequest} />;
  if (screen === 'AdLens') return <AdLensScreen />;
  if (screen === 'Details' && selectedApp) return <AppDetailsScreen id={selectedApp} onBack={() => setScreen('Discover')} onOpen={openApp} />;
  if (screen === 'Pulse') return <PulseScreen />;
  if (screen === 'Request') return <RequestScreen initialName={requestedName} />;
  return <ProfileScreen />;
}
