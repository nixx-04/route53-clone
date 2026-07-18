# AWS Route 53 Console Clone - Full Stack Sandbox

Welcome to the **AWS Route 53 Console Clone**, a high-fidelity, production-quality clone of the Amazon Web Services Route 53 web application. 

This full-stack sandbox recreates the precise design systems, user flows, and configuration mechanics of the AWS Management Console. Rather than managing real external DNS resolvers, it features an interactive SQL-backed backend that manages hosted zones and supports dynamic record forms (A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA).

---

## 🚀 Live Demo Link & Preview

* **Developer Portal:** [AWS Route 53 Live Sandboxed App](https://ais-dev-kthrw75un4qgavvy7fnj72-472514257619.asia-east1.run.app)
* **AWS Console Credentials:**
  * **Email (IAM Username):** `admin@example.com`
  * **Password:** `password123`

---

## 🎨 Design Philosophy & UX Highlights

* **AWS Console Fidelity:** The UI mimics the real AWS Route53 Console (the deep navy navigation bar, global region selector, slate sidebar tabs, orange action highlight borders, and standard gray/white cards).
* **AWS-Style Split Record Panel:** Squeezes the records table into a 60/40 grid and displays a side panel on the right with dynamic forms (such as separate Priority/Target fields) when creating or editing records, matching Route 53's actual interface.
* **Administrative Utilities:**
  * **Export as BIND Zone Format:** Generates and downloads a `.zone` BIND zone configuration file with correct headers (`$TTL`, `$ORIGIN`, `SOA`, `NS` mappings).
  * **Export as JSON Configuration:** Downloads the full zone and record hierarchy as a JSON schema.
  * **Copy-to-Clipboard Actions:** Fast copying buttons on records names and resolving addresses.

---

## 🛠️ Architecture Overview

The system runs on a **Full-Stack Single-Container Architecture** to bind both client and database securely in the sandbox.

```text
               +--------------------------------------+
               |          React Single Page App       |  <--- Styled with Tailwind CSS v4,
               |         (Vite, Zustand, TanStack)    |       lucide-react icons, and custom fonts
               +-------------------+------------------+
                                   |
                                   | (Express REST API with JWT Auth)
                                   v
               +-------------------+------------------+
               |        Express Server Backend        |  <--- tsx-driven development mode,
               |           (TypeScript CJS)           |       esbuild bundled production compiler
               +-------------------+------------------+
                                   |
                                   | (SQL Query Layer)
                                   v
               +-------------------+------------------+
               |          SQLite DB Persistence       |  <--- route53.db file on disk,
               |          (Sqlite3 Driver)            |       fully relational CRUD, CASCADE deletions
               +--------------------------------------+
```

---

## 🗂️ Folder Structure

```text
/
├── .env.example            # Example environment templates
├── .gitignore              # Repository file exclusion rules
├── package.json            # Node.js dependencies and full-stack scripts
├── tsconfig.json           # Type configurations for ESNext compilation
├── vite.config.ts          # Vite frontend configuration and dev options
├── server.ts               # Full-stack API Express router & Vite static middleware
├── route53.db              # SQLite Database file (persistent)
└── src/
    ├── main.tsx            # React application entry point
    ├── App.tsx             # Master navigation coordinator
    ├── index.css           # Tailwind v4 directives, font imports, AWS themes
    ├── types.ts            # Global Type definitions (HostedZone, DnsRecord)
    ├── lib/
    │   └── api.ts          # API Client wraps, Bearer headers, error handlers
    ├── store/
    │   └── authStore.ts    # Zustand login/logout state machine
    └── components/         # High-fidelity AWS Console Views
        ├── AWSLayout.tsx   # Global navigation wrapper (Navbar + Sidebar)
        ├── AWSLogin.tsx    # AWS IAM Sign-In Portal
        ├── DashboardView.xs# Route 53 Dashboard status widgets
        ├── HostedZonesView # Hosted Zones listing, tables, creation modal
        ├── HostedZoneDetail# Records management table, BIND exports, split form
        └── ComingSoonView  # Placeholders for health-checks/policies
```

---

## 🗄️ Database Schema (SQLite)

We use three highly relational database tables designed with cascade relationships:

### 1. `users` Table
Stores authenticated IAM Users.
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,         -- SHA256 hashed password with crypto
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 2. `hosted_zones` Table
Maintains DNS domains.
```sql
CREATE TABLE hosted_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,             -- e.g. "example.com"
  comment TEXT,                   -- Optional description
  type TEXT NOT NULL,             -- "Public" or "Private"
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 3. `dns_records` Table
Holds individual mapping records. Linked to `hosted_zones` with `ON DELETE CASCADE`.
```sql
CREATE TABLE dns_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hosted_zone_id INTEGER NOT NULL,
  name TEXT NOT NULL,             -- Subdomain, e.g. "www.example.com"
  type TEXT NOT NULL,             -- "A", "AAAA", "CNAME", "TXT", "MX", "NS", "SOA", "SRV", "CAA"
  ttl INTEGER NOT NULL,           -- Time-to-live in seconds
  value TEXT NOT NULL,            -- Resolving target IP/domain
  priority INTEGER,               -- MX, SRV specific
  weight INTEGER,                 -- SRV specific
  port INTEGER,                   -- SRV specific
  flags INTEGER,                  -- CAA specific
  tag TEXT,                       -- CAA specific
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(hosted_zone_id) REFERENCES hosted_zones(id) ON DELETE CASCADE
);
```

---

## 🔗 API Documentation

All request parameters and payloads exchange JSON. All endpoints except login require standard Bearer token verification: `Authorization: Bearer <token>`.

### Authentication Endpoints
* **`POST /api/login`**: Sign-in to console.
  * **Payload:** `{ "email": "admin@example.com", "password": "password123" }`
  * **Response:** `{ "token": "JWT_TOKEN", "user": { "id": 1, "email": "..." } }`
* **`POST /api/logout`**: Terminate session (clears cookie).
* **`GET /api/me`**: Read current active session profile details.

### Hosted Zones Endpoints
* **`GET /api/hosted-zones`**: Retrieve paginated list of zones.
  * **Query Parameters:** `?page=1&limit=20&search=google&sortBy=name&sortOrder=ASC`
* **`GET /api/hosted-zones/:id`**: Get single zone details and record counts.
* **`POST /api/hosted-zones`**: Create new zone. (Automatically creates NS & SOA).
  * **Payload:** `{ "name": "example.com", "comment": "prod server", "type": "Public" }`
* **`PUT /api/hosted-zones/:id`**: Update zone parameters (Comment).
* **`DELETE /api/hosted-zones/:id`**: Delete zone and cascade delete records.

### DNS Records Endpoints
* **`GET /api/hosted-zones/:id/records`**: Retrieve all DNS records for a zone.
  * **Query Parameters:** `?page=1&limit=100&search=www&type=A`
* **`POST /api/hosted-zones/:id/records`**: Create new record.
  * **Payload:** `{ "name": "www.example.com", "type": "A", "ttl": 300, "value": "1.1.1.1" }`
* **`PUT /api/records/:id`**: Update existing record parameters.
* **`DELETE /api/records/:id`**: Delete record.

---

## ⚙️ Environment Variables

Copy `.env.example` into `.env`:
```env
# Port is locked to 3000 by infrastructure
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
```

---

## 🚀 Setup & Local Execution

Follow these simple commands to run the application offline:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run in Development Mode:**
   ```bash
   npm run dev
   ```
   Opens [http://localhost:3000](http://localhost:3000). The development server will compile TypeScript server-side and trigger Vite assets hot replacement on the fly.

3. **Build & Compile for Production:**
   ```bash
   npm run build
   ```
   Compiles static React clients into `/dist` and bundles the Express server to CommonJS `/dist/server.cjs` using esbuild.

4. **Start Production Host:**
   ```bash
   npm run start
   ```

---

## 🛡️ License
Distributed under the Apache-2.0 License. Built with ❤️ for Google AI Studio.
