import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import apiRoutes from './routes/api.js';
import { getDb, closeDb, createDatabaseBackup, getDatabaseConfig } from './database/db.js';
import { runMigrations } from './database/migrations.js';
import { seedSampleData } from './database/sample-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4848;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static frontend from dist
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Register API router
app.use('/api', apiRoutes);

// Fallback to index.html for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      status: 'online',
      app: 'KwikStore Pro Server Engine',
      version: '1.0.0',
      mode: 'LOCAL_LAN_SQLITE',
      database: getDatabaseConfig().dbPath,
      message: 'KwikStore Pro server is running.'
    });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Broadcast event helper for live multi-counter sync
export function broadcastToCounters(event, data) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[LAN Sync] Billing Counter Connected from IP: ${clientIp}`);

  ws.send(JSON.stringify({
    event: 'CONNECTED',
    message: 'Connected to KwikStore Pro Central SQLite Engine'
  }));

  ws.on('message', message => {
    try {
      const parsed = JSON.parse(message);
      console.log('[LAN Sync] Message received:', parsed.event);
    } catch (e) {
      console.error('WebSocket parse error:', e.message);
    }
  });
});

// Run SQLite migrations and seed data
try {
  runMigrations();
  seedSampleData();
} catch (err) {
  console.error('Database initialization error:', err);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n============================================================`);
  console.log(`🚀 KwikStore Pro Server Engine running at:`);
  console.log(`   - Local PC (Primary):   http://localhost:${PORT}`);
  console.log(`   - Shop LAN:            http://0.0.0.0:${PORT} (Connect other counters via Wi-Fi/LAN)`);
  console.log(`   - Database:            ${getDatabaseConfig().dbPath}`);
  console.log(`============================================================\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Notice] Port ${PORT} already active. Reusing running server instance.`);
  } else {
    console.error('Server listen error:', err);
  }
});

// Also bind secondary port 4849 for convenience
if (PORT !== 4849) {
  try {
    const altServer = http.createServer(app);
    altServer.listen(4849, '0.0.0.0', () => {
      console.log(`🚀 Also accessible on: http://localhost:4849`);
    }).on('error', (err) => {
      // Port might already be used, ignore gracefully
    });
  } catch (e) {
    // Ignore
  }
}

// Graceful shutdown with automatic SQLite backup
async function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Performing automated safety backup before closing...`);
  try {
    const backupRes = await createDatabaseBackup();
    console.log(`Safety backup saved: ${backupRes.fileName} (${backupRes.sizeMb})`);
  } catch (e) {
    console.error('Auto backup warning on exit:', e.message);
  }
  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
