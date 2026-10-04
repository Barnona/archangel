import { API_BASE } from '../config';
import type { AdLensSummary, AdLensProfile, SubscriptionIntelligence, AdLensHistory, AppProfile, AlternativeResult, CatalogStatus, DemandEntry, AppRequest, DiscoveryResult } from '../../../shared/src/types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; service: string; version: string; catalogCount: number; requestCount: number; uptimeSeconds: number; timestamp: string }>('/health'),
  catalogStatus: () => request<CatalogStatus>('/catalog/status'),
  apps: (q = '', category = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<AppProfile[]>(`/apps${suffix}`);
  },
  discover: (q = '', category = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<{ query: string; category: string; results: DiscoveryResult[]; catalogCount: number; catalogSource: string; generatedAt: string }>(`/apps/discover${suffix}`);
  },
  app: (id: string) => request<AppProfile & { alternativeProfiles: AlternativeResult[] }>(`/apps/${id}`),
  aiDiscover: (requestText: string) =>
    request<{
      requestedApp: string;
      understoodIntent: string;
      exactMatch: string | null;
      alternatives: { appId: string; reason: string; confidence: number }[];
      message: string;
      modelId?: string;
      catalogCount: number;
      catalogSource: string;
      generatedAt: string;
    }>('/ai/app-discovery', {
      method: 'POST',
      body: JSON.stringify({ request: requestText }),
    }),
  createRequest: (appName: string, note: string, source: AppRequest['source'] = 'manual') =>
    request<AppRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify({ appName, note, source }),
    }),
  demand: () => request<DemandEntry[]>('/requests/demand'),
  adLens: () => request<AdLensSummary>('/adlens'),
  adLensApp: (id: string) => request<AdLensProfile & { category: string; description: string; subscription: SubscriptionIntelligence }>(`/adlens/${id}`),
  adLensHistory: (id: string) => request<AdLensHistory>(`/adlens/${id}/history`),
};
