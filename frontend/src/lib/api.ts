// API client for Logbook backend
const API_BASE = '/api/v1';

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ access_token: string; refresh_token: string }>('/auth/login/json', {
      method: 'POST',
      body: { username, password },
    }),

  register: (data: { username: string; email: string; password: string; full_name?: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: data }),

  getMe: (token: string) =>
    apiFetch('/auth/me', { token }),
};

// Vessels API
export const vesselsApi = {
  list: (token: string) => apiFetch('/vessels/', { token }),
  create: (data: Record<string, unknown>, token: string) =>
    apiFetch('/vessels/', { method: 'POST', body: data, token }),
  get: (id: string, token: string) => apiFetch(`/vessels/${id}`, { token }),
  update: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/vessels/${id}`, { method: 'PUT', body: data, token }),
  delete: (id: string, token: string) =>
    apiFetch(`/vessels/${id}`, { method: 'DELETE', token }),
};

// Logbooks API
export const logbooksApi = {
  list: (token: string, vesselId?: string) =>
    apiFetch(`/logbooks/${vesselId ? `?vessel_id=${vesselId}` : ''}`, { token }),
  create: (data: Record<string, unknown>, token: string) =>
    apiFetch('/logbooks/', { method: 'POST', body: data, token }),
  get: (id: string, token: string) => apiFetch(`/logbooks/${id}`, { token }),
  close: (id: string, token: string) =>
    apiFetch(`/logbooks/${id}/close`, { method: 'POST', token }),
};

// Entries API
export const entriesApi = {
  list: (logbookId: string, token: string) =>
    apiFetch(`/entries/logbook/${logbookId}`, { token }),
  create: (logbookId: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/entries/logbook/${logbookId}`, { method: 'POST', body: data, token }),
  update: (id: string, data: Record<string, unknown>, token: string) =>
    apiFetch(`/entries/${id}`, { method: 'PUT', body: data, token }),
  delete: (id: string, token: string) =>
    apiFetch(`/entries/${id}`, { method: 'DELETE', token }),
};

// GPS API
export const gpsApi = {
  add: (data: Record<string, unknown>, token: string) =>
    apiFetch('/gps/', { method: 'POST', body: data, token }),
  getTrack: (vesselId: string, token: string) =>
    apiFetch(`/gps/vessel/${vesselId}`, { token }),
  getLatest: (vesselId: string, token: string) =>
    apiFetch(`/gps/vessel/${vesselId}/latest`, { token }),
};

// AI API
export const aiApi = {
  generate: (data: Record<string, unknown>, token: string) =>
    apiFetch('/ai/generate-entry', { method: 'POST', body: data, token }),
};

// Export API
export const exportApi = {
  pdf: (logbookId: string, token: string) =>
    `${API_BASE}/export/pdf/${logbookId}?token=${token}`,
  gpx: (logbookId: string, token: string) =>
    `${API_BASE}/export/gpx/${logbookId}?token=${token}`,
  csv: (logbookId: string, token: string) =>
    `${API_BASE}/export/csv/${logbookId}?token=${token}`,
};

// Dashboard API
export const dashboardApi = {
  getStats: (token: string) =>
    apiFetch<{ vessels: number; logbooks: number; entries: number; activeModules: number }>('/dashboard/stats', { token }),
};

// Modules API
export const modulesApi = {
  list: (token: string) => apiFetch('/modules/', { token }),
  install: (id: string, token: string) =>
    apiFetch(`/modules/${id}/install`, { method: 'POST', token }),
  activate: (id: string, token: string) =>
    apiFetch(`/modules/${id}/activate`, { method: 'POST', token }),
  deactivate: (id: string, token: string) =>
    apiFetch(`/modules/${id}/deactivate`, { method: 'POST', token }),
};

// Crew API
export const crewApi = {
  list: (vesselId: string, token: string) =>
    apiFetch(`/crew/vessel/${vesselId}`, { token }),
  create: (data: { vessel_id: string; name: string; role?: string; nationality?: string; passport_number?: string; date_of_birth?: string }, token: string) =>
    apiFetch('/crew/', { method: 'POST', body: data, token }),
  delete: (id: string, token: string) =>
    apiFetch(`/crew/${id}`, { method: 'DELETE', token }),
};

// Weather API
export const weatherApi = {
  get: (vesselId: string, token: string) =>
    apiFetch(`/weather/vessel/${vesselId}`, { token }),
};


