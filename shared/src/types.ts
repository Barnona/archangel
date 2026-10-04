// Shared data models for ARCHANGEL (used by fire-os, vega and backend docs).

export type MonetizationModel =
  | 'free'
  | 'ad-supported'
  | 'subscription'
  | 'freemium'
  | 'one-time'
  | 'unknown';

export type AdLevel = 'none' | 'light' | 'moderate' | 'heavy' | 'unknown';

export interface AppProfile {
  id: string;
  name: string;
  category: string;
  description: string;
  platforms: { fireOs: boolean; vega: boolean };
  monetization: MonetizationModel[];
  adLevel: AdLevel;
  alternatives: string[];
  source: string;
  availabilityNote?: string;
  lastVerified: string | null;
  verified: boolean;
}

export interface DiscoveryResult {
  app: AppProfile;
  score: number;
  reasons: string[];
}

export interface AlternativeResult {
  app: AppProfile;
  score: number;
  reasons: string[];
}

export interface CatalogStatus {
  catalogVersion: string;
  source: string;
  lastUpdated: string;
  total: number;
  verified: number;
  fireOs: number;
  vega: number;
  categories: string[];
  coverage: number;
  amazonAppstoreApi: {
    status: 'not_available' | 'available';
    mode: string;
    note: string;
  };
}

export interface AppRequest {
  id: string;
  appName: string;
  note?: string;
  source?: 'manual' | 'missing-app-discovery';
  createdAt: string;
}

export interface DemandEntry {
  appName: string;
  normalizedName?: string;
  count: number;
  discoveryRequests?: number;
  manualRequests?: number;
  lastRequestedAt: string;
}

export interface SubscriptionIntelligence {
  model: 'subscription' | 'mixed' | 'unknown';
  adFreeTierKnown: boolean;
  adFreeTierName: string | null;
  adFreeTierVerified: boolean;
  offerStatus: 'unknown' | 'available' | 'unavailable';
  explanation: string;
  evidence: AdLensEvidence;
}

export interface AdLensEvidence {
  source: string;
  catalogVersion: string;
  lastVerified: string | null;
  verificationMethod: 'curated-catalog' | 'official-amazon-api' | 'unknown';
}

export interface AdLensProfile {
  appId: string;
  appName: string;
  monetization: MonetizationModel[];
  adLevel: AdLevel;
  adSignal: 'known' | 'unknown';
  transparency: 'verified' | 'limited';
  explanation: string;
  systemAds: {
    controllable: false;
    note: string;
  };
  verified: boolean;
  lastVerified: string | null;
  evidence: AdLensEvidence;
  subscription: SubscriptionIntelligence;
}

export interface MonetizationSnapshot {
  id: string;
  appId: string;
  appName: string;
  capturedAt: string;
  catalogVersion: string;
  monetization: MonetizationModel[];
  adSignal: 'known' | 'unknown';
  adLevel: AdLevel;
  subscriptionModel: 'subscription' | 'mixed' | 'unknown';
  adFreeTierKnown: boolean;
  adFreeTierName: string | null;
  evidence: AdLensEvidence;
}

export interface MonetizationChange {
  field: 'adSignal' | 'adLevel' | 'monetization' | 'subscriptionModel' | 'adFreeTier';
  previous: string;
  current: string;
  kind: 'data-signal-changed';
}

export interface AdLensHistory {
  appId: string;
  appName: string;
  snapshots: MonetizationSnapshot[];
  changes: MonetizationChange[];
  generatedAt: string;
}

export interface AdLensDetail extends AdLensProfile {
  category: string;
  description: string;
}

export interface AdLensSummary {
  totalApps: number;
  adSupported: number;
  knownAdLevels: number;
  unknownAdLevels: number;
  verifiedProfiles: number;
  profiles: AdLensProfile[];
  systemAdControl: {
    controllable: false;
    note: string;
  };
  generatedAt: string;
}
