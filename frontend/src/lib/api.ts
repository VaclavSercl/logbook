// API client for Logbook backend
const API_BASE = '/api/v1';

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  let authToken = options.token || (typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    // Attempt automatic token refresh
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const newTokens = await refreshRes.json();
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', newTokens.access_token);
            localStorage.setItem('refresh_token', newTokens.refresh_token);
          }
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${newTokens.access_token}`;
          res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
    }

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
  }

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

  deleteAccount: (token: string) =>
    apiFetch('/auth/me', { method: 'DELETE', token }),
};

// Vessels API
export const vesselsApi = {
  list: (token: string) => apiFetch('/vessels', { token }),
  create: (data: Record<string, unknown>, token: string) =>
    apiFetch('/vessels', { method: 'POST', body: data, token }),
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
    apiFetch('/logbooks', { method: 'POST', body: data, token }),
  get: (id: string, token: string) => apiFetch(`/logbooks/${id}`, { token }),
  close: (id: string, token: string) =>
    apiFetch(`/logbooks/${id}/close`, { method: 'POST', token }),
  delete: (id: string, token: string) =>
    apiFetch(`/logbooks/${id}`, { method: 'DELETE', token }),
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
    apiFetch('/gps', { method: 'POST', body: data, token }),
  getTrack: (vesselId: string, token: string) =>
    apiFetch(`/gps/vessel/${vesselId}`, { token }),
  getLatest: (vesselId: string, token: string) =>
    apiFetch(`/gps/vessel/${vesselId}/latest`, { token }),
  delete: (pointId: number, token: string) =>
    apiFetch(`/gps/${pointId}`, { method: 'DELETE', token }),
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
  list: (token: string) => apiFetch('/modules', { token }),
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
  create: (data: { vessel_id: string; name: string; role?: string; nationality?: string; passport_number?: string; date_of_birth?: string; include_in_watches?: boolean; include_in_galley?: boolean }, token: string) =>
    apiFetch('/crew', { method: 'POST', body: data, token }),
  update: (id: string, data: Partial<{ name: string; role: string; nationality: string; passport_number: string; date_of_birth: string; include_in_watches: boolean; include_in_galley: boolean }>, token: string) =>
    apiFetch(`/crew/${id}`, { method: 'PUT', body: data, token }),
  delete: (id: string, token: string) =>
    apiFetch(`/crew/${id}`, { method: 'DELETE', token }),
};

// Weather API
export const weatherApi = {
  get: (vesselId: string, token: string) =>
    apiFetch(`/weather/vessel/${vesselId}`, { token }),
};

// Watches API
export const watchesApi = {
  listGroups: (vesselId: string, token: string) =>
    apiFetch(`/watches/vessel/${vesselId}`, { token }),
  createGroup: (data: { vessel_id: string; name: string; member_ids: string[] }, token: string) =>
    apiFetch('/watches/group', { method: 'POST', body: data, token }),
  deleteGroup: (groupId: string, token: string) =>
    apiFetch(`/watches/group/${groupId}`, { method: 'DELETE', token }),
  listSchedules: (logbookId: string, token: string) =>
    apiFetch(`/watches/schedule/${logbookId}`, { token }),
  createSchedule: (data: { logbook_id: string; watch_group_id: string; start_time: string; end_time: string; notes?: string }, token: string) =>
    apiFetch('/watches/schedule', { method: 'POST', body: data, token }),
  deleteSchedule: (scheduleId: string, token: string) =>
    apiFetch(`/watches/schedule/${scheduleId}`, { method: 'DELETE', token }),
};

// Galley API
export const galleyApi = {
  listDuties: (logbookId: string, token: string) =>
    apiFetch(`/galley/schedule/${logbookId}`, { token }),
  createDuty: (data: { logbook_id: string; date: string; cook_id: string; cleaner_id: string; notes?: string }, token: string) =>
    apiFetch('/galley/duty', { method: 'POST', body: data, token }),
  deleteDuty: (dutyId: string, token: string) =>
    apiFetch(`/galley/duty/${dutyId}`, { method: 'DELETE', token }),
};

// Cashbox API
export const cashboxApi = {
  listExpenses: (vesselId: string, token: string) =>
    apiFetch(`/cashbox/vessel/${vesselId}`, { token }),
  createExpense: (data: { vessel_id: string; payer_name?: string; category: string; amount: number; currency: string; description: string }, token: string) =>
    apiFetch('/cashbox', { method: 'POST', body: data, token }),
  deleteExpense: (id: string, token: string) =>
    apiFetch(`/cashbox/${id}`, { method: 'DELETE', token }),
};

// Anchoring API
export const anchoringApi = {
  getStatus: (vesselId: string, token: string) =>
    apiFetch(`/anchoring/vessel/${vesselId}/status`, { token }),
  dropAnchor: (data: { vessel_id: string; latitude: number; longitude: number; depth?: number; chain_length?: number; alarm_radius?: number; notes?: string }, token: string) =>
    apiFetch('/anchoring/drop', { method: 'POST', body: data, token }),
  raiseAnchor: (anchorId: string, token: string) =>
    apiFetch(`/anchoring/raise/${anchorId}`, { method: 'POST', token }),
};

// Public API (No tokens required)
export const publicApi = {
  listLogbooks: () => apiFetch<Array<{
    id: string;
    vessel_id: string;
    vessel_name: string;
    title: string;
    voyage_from?: string;
    voyage_to?: string;
    status: string;
    created_at?: string;
  }>>('/logbooks/public/list'),

  getLogbook: (id: string) => apiFetch<{
    id: string;
    vessel_id: string;
    vessel_name: string;
    title: string;
    voyage_from?: string;
    voyage_to?: string;
    status: string;
  }>(`/logbooks/public/${id}`),

  listEntries: (logbookId: string) => apiFetch<Array<Record<string, any>>>(`/entries/public/logbook/${logbookId}`),

  getGpsTrack: (vesselId: string) => apiFetch<Array<Record<string, any>>>(`/gps/public/vessel/${vesselId}`),
};
