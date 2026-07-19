import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { spawn } from 'child_process';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = 3000;
const FASTAPI_PORT = 8000;

// Spawn FastAPI process
console.log('[Bootstrap] Starting FastAPI backend on port 8000...');
const backendDir = path.join(process.cwd(), 'backend');

// Try python3 first, then fallback to python
let pythonCommand = 'python3';
if (process.platform === 'win32') {
  pythonCommand = 'python';
}

const fastapiProcess = spawn(pythonCommand, [
  '-m',
  'uvicorn',
  'main:app',
  '--host',
  '127.0.0.1',
  '--port',
  String(FASTAPI_PORT)
], {
  cwd: backendDir,
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

fastapiProcess.stdout.on('data', (data) => {
  console.log(`[FastAPI] ${data.toString().trim()}`);
});

fastapiProcess.stderr.on('data', (data) => {
  console.error(`[FastAPI Error] ${data.toString().trim()}`);
});

fastapiProcess.on('error', (err) => {
  console.error('[FastAPI] Failed to start Python server process:', err);
});

fastapiProcess.on('exit', (code) => {
  console.log(`[FastAPI] Process exited with code ${code}`);
});

// Prepare Next.js and listen on port 3000
console.log('[Bootstrap] Preparing Next.js App...');
app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`[Bootstrap] Next.js Route53 Client running on http://0.0.0.0:${PORT}`);
  });
}).catch((err) => {
  console.error('[Bootstrap] Failed to prepare Next.js app:', err);
});

// Clean up child process on exit
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received, killing FastAPI process...');
  fastapiProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received, killing FastAPI process...');
  fastapiProcess.kill();
  process.exit(0);
});
