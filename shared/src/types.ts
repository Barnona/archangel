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

export interface AppRequest {
  id: string;
  appName: string;
  note?: string;
  createdAt: string;
}

export interface DemandEntry {
  appName: string;
  count: number;
  lastRequestedAt: string;
}
