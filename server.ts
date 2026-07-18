import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  initDb, 
  dbGet, 
  dbRun, 
  dbAll, 
  hashPassword 
} from './src/server/db.ts';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'route53_secure_mock_jwt_secret_token_12345';

// Parse json and cookies manually/manually extract authorization token
app.use(express.json());

// Lightweight standard-compliant JWT helpers using Node.js crypto
function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${data}`).digest('base64url');
  return `${header}.${data}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const [header, data, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${data}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Helper to extract JWT token from cookies or auth header
function getAuthUser(req: express.Request): any {
  // Try Cookie
  const cookies = Object.fromEntries(
    req.headers.cookie?.split(';').map(c => {
      const idx = c.indexOf('=');
      if (idx === -1) return [c.trim(), ''];
      return [c.substring(0, idx).trim(), c.substring(idx + 1).trim()];
    }) || []
  );
  let token = cookies.auth_token;

  // Try Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) return null;
  return verifyToken(token);
}

// Authentication Middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  (req as any).user = user;
  next();
};

// ================= API ENDPOINTS =================

// Auth: Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbGet<any>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || user.password !== hashPassword(password)) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Sign JWT
    const tokenPayload = { id: user.id, email: user.email, exp: Date.now() + 86400000 }; // 24 hours
    const token = signToken(tokenPayload);

    // Set HttpOnly cookie
    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400;`);
    
    // Return token and user profile
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auth: Logout
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT;');
  res.json({ success: true });
});

// Auth: Get Current User
app.get('/api/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({
    id: user.id,
    email: user.email
  });
});

// --- Hosted Zones CRUD ---

// Get all hosted zones with search, sorting, and pagination
app.get('/api/hosted-zones', authenticate, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string || '').trim().toLowerCase();
  const sortBy = req.query.sortBy as string || 'name'; // name, type, created_at
  const sortOrder = req.query.sortOrder as string || 'ASC'; // ASC or DESC

  const offset = (page - 1) * limit;

  try {
    let sqlParams: any[] = [];
    let countSql = 'SELECT COUNT(*) as count FROM hosted_zones';
    let querySql = `
      SELECT hz.*, 
        (SELECT COUNT(*) FROM dns_records WHERE hosted_zone_id = hz.id) as record_count 
      FROM hosted_zones hz
    `;

    if (search) {
      countSql += ' WHERE LOWER(name) LIKE ? OR LOWER(comment) LIKE ?';
      querySql += ' WHERE LOWER(hz.name) LIKE ? OR LOWER(hz.comment) LIKE ?';
      sqlParams.push(`%${search}%`, `%${search}%`);
    }

    // Validate Sort options to prevent injection
    const validSortFields = ['name', 'type', 'created_at', 'record_count'];
    const validOrders = ['ASC', 'DESC'];
    const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';
    const actualSortOrder = validOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    querySql += ` ORDER BY ${actualSortBy} ${actualSortOrder} LIMIT ? OFFSET ?`;
    
    // Total count
    const countResult = await dbGet<{ count: number }>(countSql, search ? [`%${search}%`, `%${search}%`] : []);
    const total = countResult?.count || 0;

    // Fetch pages
    const rows = await dbAll<any>(querySql, [...sqlParams, limit, offset]);

    res.json({
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single hosted zone
app.get('/api/hosted-zones/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const zone = await dbGet<any>(
      `SELECT hz.*, 
        (SELECT COUNT(*) FROM dns_records WHERE hosted_zone_id = hz.id) as record_count 
       FROM hosted_zones hz WHERE hz.id = ?`,
      [id]
    );
    if (!zone) {
      return res.status(404).json({ error: 'Hosted Zone not found' });
    }
    res.json(zone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Hosted Zone
app.post('/api/hosted-zones', authenticate, async (req, res) => {
  const { name, comment, type } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  const zoneType = type === 'Private' ? 'Private' : 'Public';

  try {
    // Normalise domain name (remove whitespace, lowercase)
    const normalizedName = name.trim().toLowerCase();

    const result = await dbRun(
      'INSERT INTO hosted_zones (name, comment, type, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [normalizedName, comment || '', zoneType]
    );

    const newZoneId = result.lastID;

    // AWS Route53 automatically creates an NS and an SOA record for a new hosted zone
    // Create NS record
    const nsServers = [
      `ns-100.awsdns-${Math.floor(Math.random() * 90 + 10)}.co.uk.`,
      `ns-200.awsdns-${Math.floor(Math.random() * 90 + 10)}.net.`,
      `ns-300.awsdns-${Math.floor(Math.random() * 90 + 10)}.org.`,
      `ns-400.awsdns-${Math.floor(Math.random() * 90 + 10)}.com.`
    ].join('\n');

    await dbRun(
      'INSERT INTO dns_records (hosted_zone_id, name, type, ttl, value) VALUES (?, ?, ?, ?, ?)',
      [newZoneId, normalizedName, 'NS', 172800, nsServers]
    );

    // Create SOA record
    const primaryNs = nsServers.split('\n')[0];
    const soaValue = `${primaryNs} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400`;
    await dbRun(
      'INSERT INTO dns_records (hosted_zone_id, name, type, ttl, value) VALUES (?, ?, ?, ?, ?)',
      [newZoneId, normalizedName, 'SOA', 900, soaValue]
    );

    const createdZone = await dbGet('SELECT * FROM hosted_zones WHERE id = ?', [newZoneId]);
    res.status(201).json(createdZone);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Hosted Zone (Route53 only allows updating comments)
app.put('/api/hosted-zones/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  try {
    const zone = await dbGet('SELECT * FROM hosted_zones WHERE id = ?', [id]);
    if (!zone) {
      return res.status(404).json({ error: 'Hosted zone not found' });
    }

    await dbRun(
      'UPDATE hosted_zones SET comment = ?, updated_at = datetime("now") WHERE id = ?',
      [comment || '', id]
    );

    const updated = await dbGet('SELECT * FROM hosted_zones WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Hosted Zone
app.delete('/api/hosted-zones/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const zone = await dbGet('SELECT * FROM hosted_zones WHERE id = ?', [id]);
    if (!zone) {
      return res.status(404).json({ error: 'Hosted zone not found' });
    }

    // Cascade delete is configured, but let's delete records explicitly or rely on schema CASCADE
    await dbRun('DELETE FROM hosted_zones WHERE id = ?', [id]);
    res.json({ success: true, message: 'Hosted zone and its records deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Global search for hosted zones and records
app.get('/api/global-search', authenticate, async (req, res) => {
  const query = (req.query.q as string || '').trim().toLowerCase();
  if (!query) {
    return res.json({ zones: [], records: [] });
  }

  try {
    const zones = await dbAll<any>(
      'SELECT * FROM hosted_zones WHERE LOWER(name) LIKE ? OR LOWER(comment) LIKE ? LIMIT 10',
      [`%${query}%`, `%${query}%`]
    );

    const records = await dbAll<any>(
      `SELECT r.*, z.name as zone_name 
       FROM dns_records r 
       JOIN hosted_zones z ON r.hosted_zone_id = z.id 
       WHERE LOWER(r.name) LIKE ? OR LOWER(r.value) LIKE ? 
       LIMIT 15`,
      [`%${query}%`, `%${query}%`]
    );

    res.json({ zones, records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DNS Records CRUD ---

// Get DNS records for a specific hosted zone
app.get('/api/hosted-zones/:id/records', authenticate, async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100; // default large to load main screen, but supports pagination
  const search = (req.query.search as string || '').trim().toLowerCase();
  const typeFilter = req.query.type as string || '';

  const offset = (page - 1) * limit;

  try {
    const zone = await dbGet('SELECT * FROM hosted_zones WHERE id = ?', [id]);
    if (!zone) {
      return res.status(404).json({ error: 'Hosted zone not found' });
    }

    let sqlParams: any[] = [id];
    let querySql = 'SELECT * FROM dns_records WHERE hosted_zone_id = ?';
    let countSql = 'SELECT COUNT(*) as count FROM dns_records WHERE hosted_zone_id = ?';

    if (search) {
      querySql += ' AND (LOWER(name) LIKE ? OR LOWER(value) LIKE ?)';
      countSql += ' AND (LOWER(name) LIKE ? OR LOWER(value) LIKE ?)';
      sqlParams.push(`%${search}%`, `%${search}%`);
    }

    if (typeFilter) {
      querySql += ' AND type = ?';
      countSql += ' AND type = ?';
      sqlParams.push(typeFilter);
    }

    // Order by record type and then by subdomain name
    querySql += ' ORDER BY type ASC, name ASC LIMIT ? OFFSET ?';

    const countResult = await dbGet<{ count: number }>(countSql, sqlParams); // exclude limit & offset
    const total = countResult?.count || 0;

    const rows = await dbAll<any>(querySql, [...sqlParams, limit, offset]);

    res.json({
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create DNS Record for Hosted Zone
app.post('/api/hosted-zones/:id/records', authenticate, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    ttl,
    value,
    priority,
    weight,
    port,
    flags,
    tag
  } = req.body;

  if (!name || !type || !ttl || !value) {
    return res.status(400).json({ error: 'Name, Type, TTL, and Value are required' });
  }

  try {
    const zone = await dbGet('SELECT * FROM hosted_zones WHERE id = ?', [id]);
    if (!zone) {
      return res.status(404).json({ error: 'Hosted zone not found' });
    }

    const result = await dbRun(
      `INSERT INTO dns_records (
        hosted_zone_id, name, type, ttl, value, priority, weight, port, flags, tag, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
      [
        id,
        name.trim().toLowerCase(),
        type,
        parseInt(ttl),
        value.trim(),
        priority !== undefined && priority !== null ? parseInt(priority) : null,
        weight !== undefined && weight !== null ? parseInt(weight) : null,
        port !== undefined && port !== null ? parseInt(port) : null,
        flags !== undefined && flags !== null ? parseInt(flags) : null,
        tag || null
      ]
    );

    const createdRecord = await dbGet('SELECT * FROM dns_records WHERE id = ?', [result.lastID]);
    res.status(201).json(createdRecord);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update DNS Record
app.put('/api/records/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    type,
    ttl,
    value,
    priority,
    weight,
    port,
    flags,
    tag
  } = req.body;

  if (!name || !type || !ttl || !value) {
    return res.status(400).json({ error: 'Name, Type, TTL, and Value are required' });
  }

  try {
    const record = await dbGet('SELECT * FROM dns_records WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ error: 'DNS Record not found' });
    }

    await dbRun(
      `UPDATE dns_records SET 
        name = ?,
        type = ?,
        ttl = ?,
        value = ?,
        priority = ?,
        weight = ?,
        port = ?,
        flags = ?,
        tag = ?,
        updated_at = datetime("now")
      WHERE id = ?`,
      [
        name.trim().toLowerCase(),
        type,
        parseInt(ttl),
        value.trim(),
        priority !== undefined && priority !== null ? parseInt(priority) : null,
        weight !== undefined && weight !== null ? parseInt(weight) : null,
        port !== undefined && port !== null ? parseInt(port) : null,
        flags !== undefined && flags !== null ? parseInt(flags) : null,
        tag || null,
        id
      ]
    );

    const updated = await dbGet('SELECT * FROM dns_records WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete DNS Record
app.delete('/api/records/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const record = await dbGet('SELECT * FROM dns_records WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ error: 'DNS Record not found' });
    }

    // Restrict deletion of default zone Apex NS/SOA records if needed or allow it. 
    // Route53 allows deleting NS/SOA, but it is standard warning. We'll allow it.
    await dbRun('DELETE FROM dns_records WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= VITE ASSET HANDLING =================

async function bootstrap() {
  // 1. Initialise the SQLite Database
  await initDb();

  // 2. Setup Vite integration or Production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 3. Listen on port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Route53 Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap Express server:', err);
});
