import { API_BASE } from '../config';
import type { AppProfile, DemandEntry, AppRequest } from '../../../shared/src/types';

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
  health: () => request<{ ok: boolean }>('/health'),
  apps: (q = '', category = '') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<AppProfile[]>(`/apps${suffix}`);
  },
  app: (id: string) => request<AppProfile & { alternativeProfiles: AppProfile[] }>(`/apps/${id}`),
  createRequest: (appName: string, note: string) =>
    request<AppRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify({ appName, note }),
    }),
  demand: () => request<DemandEntry[]>('/requests/demand'),
};
