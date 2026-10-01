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
  alternatives: string[]; // ids of other AppProfile entries
  source: string;         // where this info came from (be honest in the UI)
  lastVerified: string | null; // ISO date, null if never verified
  verified: boolean;
}

export interface AppRequest {
  id: string;
  appName: string;
  note?: string;
  createdAt: string; // ISO date
}

export interface DemandEntry {
  appName: string;
  count: number;
  lastRequestedAt: string;
}
