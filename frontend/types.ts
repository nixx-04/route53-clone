export type RecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'PTR' | 'SRV' | 'CAA';

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface HostedZone {
  id: number;
  name: string;
  comment: string;
  type: 'Public' | 'Private';
  created_at: string;
  updated_at: string;
  record_count?: number; // Count of child DNS records
}

export interface DnsRecord {
  id: number;
  hosted_zone_id: number;
  name: string;
  type: RecordType;
  ttl: number;
  value: string;
  priority?: number | null;
  weight?: number | null;
  port?: number | null;
  flags?: number | null;
  tag?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}
