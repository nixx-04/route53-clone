import { HostedZone, DnsRecord, User } from '../types';

const API_BASE = '/api';

// Simple token storage to ensure persistence in iframe environments
export function getStoredToken(): string | null {
  return localStorage.getItem('route53_auth_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('route53_auth_token', token);
}

export function clearStoredToken() {
  localStorage.removeItem('route53_auth_token');
}

// Custom request wrapper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errBody = await response.json();
      errorMsg = errBody.error || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: async (credentials: any) => {
      const data = await request<any>('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (data.token) {
        setStoredToken(data.token);
      }
      return data;
    },
    logout: async () => {
      clearStoredToken();
      return request<any>('/logout', { method: 'POST' });
    },
    me: async () => {
      return request<User>('/me');
    },
  },

  hostedZones: {
    list: async (params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.search) query.append('search', params.search);
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.sortOrder) query.append('sortOrder', params.sortOrder);
      
      return request<{
        data: HostedZone[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(`/hosted-zones?${query.toString()}`);
    },

    get: async (id: number) => {
      return request<HostedZone>(`/hosted-zones/${id}`);
    },

    create: async (zone: { name: string; comment?: string; type: 'Public' | 'Private' }) => {
      return request<HostedZone>('/hosted-zones', {
        method: 'POST',
        body: JSON.stringify(zone),
      });
    },

    update: async (id: number, zone: { comment: string }) => {
      return request<HostedZone>(`/hosted-zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(zone),
      });
    },

    delete: async (id: number) => {
      return request<{ success: boolean; message: string }>(`/hosted-zones/${id}`, {
        method: 'DELETE',
      });
    },
  },

  dnsRecords: {
    list: async (zoneId: number, params: { page?: number; limit?: number; search?: string; type?: string }) => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.search) query.append('search', params.search);
      if (params.type) query.append('type', params.type);

      return request<{
        data: DnsRecord[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(`/hosted-zones/${zoneId}/records?${query.toString()}`);
    },

    create: async (zoneId: number, record: Partial<DnsRecord>) => {
      return request<DnsRecord>(`/hosted-zones/${zoneId}/records`, {
        method: 'POST',
        body: JSON.stringify(record),
      });
    },

    update: async (id: number, record: Partial<DnsRecord>) => {
      return request<DnsRecord>(`/records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      });
    },

    delete: async (id: number) => {
      return request<{ success: boolean }>(`/records/${id}`, {
        method: 'DELETE',
      });
    },
  },

  globalSearch: {
    search: async (q: string) => {
      return request<{
        zones: HostedZone[];
        records: (DnsRecord & { zone_name: string })[];
      }>(`/global-search?q=${encodeURIComponent(q)}`);
    }
  },
};
