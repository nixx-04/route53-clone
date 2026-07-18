import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'route53_db.json');

interface User {
  id: number;
  email: string;
  password: string;
  created_at: string;
}

interface HostedZone {
  id: number;
  name: string;
  comment: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface DnsRecord {
  id: number;
  hosted_zone_id: number;
  name: string;
  type: string;
  ttl: number;
  value: string;
  priority: number | null;
  weight: number | null;
  port: number | null;
  flags: number | null;
  tag: string | null;
  created_at: string;
  updated_at: string;
}

interface DbSchema {
  users: User[];
  hosted_zones: HostedZone[];
  dns_records: DnsRecord[];
  nextUserId: number;
  nextZoneId: number;
  nextRecordId: number;
}

let dbInMemory: DbSchema = {
  users: [],
  hosted_zones: [],
  dns_records: [],
  nextUserId: 1,
  nextZoneId: 1,
  nextRecordId: 1
};

// Raw mock db object for any compatibility checks
export const db = {
  close: () => {}
};

// Helper to load db from file
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      dbInMemory = JSON.parse(data);
    } else {
      dbInMemory = {
        users: [],
        hosted_zones: [],
        dns_records: [],
        nextUserId: 1,
        nextZoneId: 1,
        nextRecordId: 1
      };
      saveDb();
    }
  } catch (err) {
    console.error('Error loading JSON DB:', err);
  }
}

// Helper to save db to file
function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbInMemory, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving JSON DB:', err);
  }
}

// Password hashing utility using Node.js crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  loadDb();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();
  
  let changes = 0;
  let lastID = 0;

  // 1. PRAGMA or CREATE TABLE (noop)
  if (normalizedSql.startsWith('PRAGMA') || normalizedSql.startsWith('CREATE TABLE')) {
    return { lastID: 0, changes: 0 };
  }

  // 2. INSERT INTO users
  if (normalizedSql.toLowerCase().startsWith('insert into users')) {
    const email = params[0];
    const password = params[1];
    const newUser: User = {
      id: dbInMemory.nextUserId++,
      email,
      password,
      created_at: new Date().toISOString()
    };
    dbInMemory.users.push(newUser);
    lastID = newUser.id;
    changes = 1;
    saveDb();
    return { lastID, changes };
  }

  // 3. INSERT INTO hosted_zones
  if (normalizedSql.toLowerCase().startsWith('insert into hosted_zones')) {
    const name = params[0];
    const comment = params[1] || '';
    const type = params[2] || 'Public';
    const newZone: HostedZone = {
      id: dbInMemory.nextZoneId++,
      name,
      comment,
      type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbInMemory.hosted_zones.push(newZone);
    lastID = newZone.id;
    changes = 1;
    saveDb();
    return { lastID, changes };
  }

  // 4. INSERT INTO dns_records
  if (normalizedSql.toLowerCase().startsWith('insert into dns_records')) {
    const hosted_zone_id = parseInt(params[0]);
    const name = params[1];
    const type = params[2];
    const ttl = parseInt(params[3]);
    const value = params[4];
    const priority = params[5] !== undefined && params[5] !== null ? parseInt(params[5]) : null;
    const weight = params[6] !== undefined && params[6] !== null ? parseInt(params[6]) : null;
    const port = params[7] !== undefined && params[7] !== null ? parseInt(params[7]) : null;
    const flags = params[8] !== undefined && params[8] !== null ? parseInt(params[8]) : null;
    const tag = params[9] || null;

    const newRecord: DnsRecord = {
      id: dbInMemory.nextRecordId++,
      hosted_zone_id,
      name,
      type,
      ttl,
      value,
      priority,
      weight,
      port,
      flags,
      tag,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbInMemory.dns_records.push(newRecord);
    lastID = newRecord.id;
    changes = 1;
    saveDb();
    return { lastID, changes };
  }

  // 5. UPDATE hosted_zones
  if (normalizedSql.toLowerCase().startsWith('update hosted_zones set comment')) {
    const comment = params[0];
    const id = parseInt(params[1]);
    const zone = dbInMemory.hosted_zones.find(hz => hz.id === id);
    if (zone) {
      zone.comment = comment;
      zone.updated_at = new Date().toISOString();
      changes = 1;
      saveDb();
    }
    return { lastID: 0, changes };
  }

  // 6. UPDATE dns_records
  if (normalizedSql.toLowerCase().startsWith('update dns_records set')) {
    const name = params[0];
    const type = params[1];
    const ttl = parseInt(params[2]);
    const value = params[3];
    const priority = params[4] !== undefined && params[4] !== null ? parseInt(params[4]) : null;
    const weight = params[5] !== undefined && params[5] !== null ? parseInt(params[5]) : null;
    const port = params[6] !== undefined && params[6] !== null ? parseInt(params[6]) : null;
    const flags = params[7] !== undefined && params[7] !== null ? parseInt(params[7]) : null;
    const tag = params[8] || null;
    const id = parseInt(params[9]);

    const record = dbInMemory.dns_records.find(r => r.id === id);
    if (record) {
      record.name = name;
      record.type = type;
      record.ttl = ttl;
      record.value = value;
      record.priority = priority;
      record.weight = weight;
      record.port = port;
      record.flags = flags;
      record.tag = tag;
      record.updated_at = new Date().toISOString();
      changes = 1;
      saveDb();
    }
    return { lastID: 0, changes };
  }

  // 7. DELETE FROM hosted_zones
  if (normalizedSql.toLowerCase().startsWith('delete from hosted_zones')) {
    const id = parseInt(params[0]);
    const originalLen = dbInMemory.hosted_zones.length;
    dbInMemory.hosted_zones = dbInMemory.hosted_zones.filter(hz => hz.id !== id);
    // Cascade delete dns_records
    dbInMemory.dns_records = dbInMemory.dns_records.filter(r => r.hosted_zone_id !== id);
    changes = originalLen - dbInMemory.hosted_zones.length;
    saveDb();
    return { lastID: 0, changes };
  }

  // 8. DELETE FROM dns_records
  if (normalizedSql.toLowerCase().startsWith('delete from dns_records')) {
    const id = parseInt(params[0]);
    const originalLen = dbInMemory.dns_records.length;
    dbInMemory.dns_records = dbInMemory.dns_records.filter(r => r.id !== id);
    changes = originalLen - dbInMemory.dns_records.length;
    saveDb();
    return { lastID: 0, changes };
  }

  console.warn('dbRun: unhandled SQL statement:', sql);
  return { lastID: 0, changes: 0 };
}

export async function dbGet<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  loadDb();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT * FROM users
  if (normalizedSql.toLowerCase().startsWith('select * from users where email')) {
    const email = params[0]?.toLowerCase();
    const user = dbInMemory.users.find(u => u.email.toLowerCase() === email);
    return user as any;
  }

  // 2. SELECT COUNT(*) as count FROM hosted_zones
  if (normalizedSql.toLowerCase().startsWith('select count(*) as count from hosted_zones')) {
    let zones = dbInMemory.hosted_zones;
    if (params.length > 0 && params[0]) {
      const search = params[0].replace(/%/g, '').toLowerCase();
      zones = zones.filter(hz => hz.name.toLowerCase().includes(search) || hz.comment.toLowerCase().includes(search));
    }
    return { count: zones.length } as any;
  }

  // 3. SELECT hz.* with record_count
  if (normalizedSql.toLowerCase().includes('select hz.*') && normalizedSql.toLowerCase().includes('where hz.id = ?')) {
    const id = parseInt(params[0]);
    const zone = dbInMemory.hosted_zones.find(hz => hz.id === id);
    if (zone) {
      const count = dbInMemory.dns_records.filter(r => r.hosted_zone_id === id).length;
      return { ...zone, record_count: count } as any;
    }
    return undefined;
  }

  // 4. SELECT * FROM hosted_zones WHERE id = ?
  if (normalizedSql.toLowerCase().startsWith('select * from hosted_zones where id')) {
    const id = parseInt(params[0]);
    const zone = dbInMemory.hosted_zones.find(hz => hz.id === id);
    return zone as any;
  }

  // 5. SELECT COUNT(*) as count FROM dns_records
  if (normalizedSql.toLowerCase().startsWith('select count(*) as count from dns_records')) {
    const hosted_zone_id = parseInt(params[0]);
    let records = dbInMemory.dns_records.filter(r => r.hosted_zone_id === hosted_zone_id);

    // Search
    if (normalizedSql.toLowerCase().includes('like')) {
      const searchParam = params[1];
      if (searchParam) {
        const search = searchParam.replace(/%/g, '').toLowerCase();
        records = records.filter(r => r.name.toLowerCase().includes(search) || r.value.toLowerCase().includes(search));
      }
    }

    // Type filter
    const hasTypeFilter = normalizedSql.toLowerCase().includes('type = ?');
    if (hasTypeFilter) {
      const typeParam = params[params.length - 1];
      if (typeParam && typeof typeParam === 'string' && typeParam !== hosted_zone_id.toString()) {
        records = records.filter(r => r.type === typeParam);
      }
    }

    return { count: records.length } as any;
  }

  // 6. SELECT * FROM dns_records WHERE id = ?
  if (normalizedSql.toLowerCase().startsWith('select * from dns_records where id = ?')) {
    const id = parseInt(params[0]);
    const record = dbInMemory.dns_records.find(r => r.id === id);
    return record as any;
  }

  console.warn('dbGet: unhandled SQL statement:', sql);
  return undefined;
}

export async function dbAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  loadDb();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT hz.* with record_count
  if (normalizedSql.toLowerCase().includes('select hz.*') && normalizedSql.toLowerCase().includes('from hosted_zones hz')) {
    let zones = dbInMemory.hosted_zones.map(hz => {
      const count = dbInMemory.dns_records.filter(r => r.hosted_zone_id === hz.id).length;
      return { ...hz, record_count: count };
    });

    let currentParamIdx = 0;
    // Search
    if (normalizedSql.toLowerCase().includes('like')) {
      const searchParam = params[0];
      if (searchParam) {
        const search = searchParam.replace(/%/g, '').toLowerCase();
        zones = zones.filter(hz => hz.name.toLowerCase().includes(search) || hz.comment.toLowerCase().includes(search));
      }
      currentParamIdx = 2;
    }

    // Order By
    const orderByMatch = normalizedSql.match(/order by\s+(\w+)\s+(asc|desc)/i);
    if (orderByMatch) {
      const field = orderByMatch[1].toLowerCase();
      const order = orderByMatch[2].toLowerCase();
      zones.sort((a: any, b: any) => {
        let valA = a[field];
        let valB = b[field];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Limit & Offset
    if (params.length >= currentParamIdx + 2) {
      const limit = parseInt(params[params.length - 2]);
      const offset = parseInt(params[params.length - 1]);
      if (!isNaN(limit) && !isNaN(offset)) {
        zones = zones.slice(offset, offset + limit);
      }
    }

    return zones as any;
  }

  // 2. SELECT * FROM dns_records WHERE hosted_zone_id = ?
  if (normalizedSql.toLowerCase().startsWith('select * from dns_records where hosted_zone_id = ?')) {
    const hosted_zone_id = parseInt(params[0]);
    let records = dbInMemory.dns_records.filter(r => r.hosted_zone_id === hosted_zone_id);

    // Search
    if (normalizedSql.toLowerCase().includes('like')) {
      const searchParam = params[1];
      if (searchParam) {
        const search = searchParam.replace(/%/g, '').toLowerCase();
        records = records.filter(r => r.name.toLowerCase().includes(search) || r.value.toLowerCase().includes(search));
      }
    }

    // Type Filter
    const hasTypeFilter = normalizedSql.toLowerCase().includes('type = ?');
    if (hasTypeFilter) {
      const typeParam = params[params.length - 3] || params[1];
      if (typeParam && typeof typeParam === 'string' && typeParam !== hosted_zone_id.toString()) {
        records = records.filter(r => r.type === typeParam);
      }
    }

    // Default Sort: type ASC, name ASC
    records.sort((a, b) => {
      if (a.type < b.type) return -1;
      if (a.type > b.type) return 1;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    // Limit & Offset
    const limit = parseInt(params[params.length - 2]);
    const offset = parseInt(params[params.length - 1]);
    if (!isNaN(limit) && !isNaN(offset)) {
      records = records.slice(offset, offset + limit);
    }

    return records as any;
  }

  console.warn('dbAll: unhandled SQL statement:', sql);
  return [];
}

export async function initDb() {
  loadDb();

  // Seed default admin user if not exists
  const adminUser = dbInMemory.users.find(u => u.email === 'admin@example.com');
  if (!adminUser) {
    const hashedPassword = hashPassword('password123');
    dbInMemory.users.push({
      id: dbInMemory.nextUserId++,
      email: 'admin@example.com',
      password: hashedPassword,
      created_at: new Date().toISOString()
    });
    console.log('Seeded default admin user: admin@example.com');
  }

  // Seed default Hosted Zones and Records if none exist
  if (dbInMemory.hosted_zones.length === 0) {
    // 1. Seed example.com (Public)
    const z1Id = dbInMemory.nextZoneId++;
    dbInMemory.hosted_zones.push({
      id: z1Id,
      name: 'example.com',
      comment: 'Production domain for Example Corp',
      type: 'Public',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Standard NS and SOA records for example.com
    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: 'example.com',
      type: 'NS',
      ttl: 172800,
      value: 'ns-2048.awsdns-64.co.uk.\nns-2049.awsdns-65.net.\nns-2050.awsdns-66.org.\nns-2051.awsdns-67.com.',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: 'example.com',
      type: 'SOA',
      ttl: 900,
      value: 'ns-2048.awsdns-64.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Additional typical A, CNAME, MX, TXT records
    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: 'example.com',
      type: 'A',
      ttl: 300,
      value: '192.0.2.1',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: 'www.example.com',
      type: 'CNAME',
      ttl: 3600,
      value: 'example.com',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: 'example.com',
      type: 'MX',
      ttl: 14400,
      value: 'mail.example.com',
      priority: 10, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: 'example.com',
      type: 'TXT',
      ttl: 3600,
      value: '"v=spf1 include:_spf.google.com ~all"',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z1Id,
      name: '_sip._tcp.example.com',
      type: 'SRV',
      ttl: 86400,
      value: 'sip.example.com',
      priority: 10, weight: 60, port: 5060, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 2. Seed internal.local (Private)
    const z2Id = dbInMemory.nextZoneId++;
    dbInMemory.hosted_zones.push({
      id: z2Id,
      name: 'internal.local',
      comment: 'VPC Internal development zone',
      type: 'Private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Standard NS and SOA records for internal.local
    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z2Id,
      name: 'internal.local',
      type: 'NS',
      ttl: 172800,
      value: 'ns-1000.awsdns-00.co.uk.\nns-1001.awsdns-01.net.',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z2Id,
      name: 'internal.local',
      type: 'SOA',
      ttl: 900,
      value: 'ns-1000.awsdns-00.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Database server and Cache server (typical private network records)
    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z2Id,
      name: 'db.internal.local',
      type: 'A',
      ttl: 60,
      value: '10.0.1.5',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    dbInMemory.dns_records.push({
      id: dbInMemory.nextRecordId++,
      hosted_zone_id: z2Id,
      name: 'redis.internal.local',
      type: 'A',
      ttl: 60,
      value: '10.0.1.6',
      priority: null, weight: null, port: null, flags: null, tag: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('Seeded initial hosted zones and DNS records.');
  }

  saveDb();
}
