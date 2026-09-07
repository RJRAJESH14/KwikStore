import { getDb, getDatabaseConfig, saveDatabaseConfig, createDatabaseBackup, relocateDatabase, restoreDatabaseFromBackup } from '../database/db.js';
import fs from 'fs';
import path from 'path';

export function getDatabaseStatus() {
  const config = getDatabaseConfig();
  const db = getDb();

  let fileSizeMb = '0.00';
  let totalInvoices = 0;
  let totalProducts = 0;
  let totalCustomers = 0;

  try {
    if (fs.existsSync(config.dbPath)) {
      const stats = fs.statSync(config.dbPath);
      fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    }

    totalInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
    totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
    totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  } catch (err) {
    console.error('Error fetching database status:', err);
  }

  const backupLogs = db.prepare(`SELECT * FROM backup_logs ORDER BY id DESC LIMIT 10`).all();

  return {
    currentPath: config.dbPath,
    backupDir: config.backupDir,
    fileSizeMb: `${fileSizeMb} MB`,
    stats: {
      invoices: totalInvoices,
      products: totalProducts,
      customers: totalCustomers
    },
    recentBackups: backupLogs
  };
}

export async function triggerManualBackup(customPath) {
  return await createDatabaseBackup(customPath);
}

export async function migrateDbLocation(newPath) {
  return await relocateDatabase(newPath);
}

export async function restoreDbFromBackup(backupFilePath) {
  return await restoreDatabaseFromBackup(backupFilePath);
}
