import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Writable storage directory (supports Electron userData or local project data)
function getStorageDir() {
  if (process.env.KWIKSTORE_DATA_DIR) {
    return process.env.KWIKSTORE_DATA_DIR;
  }
  return path.join(__dirname, '../../data');
}

const STORAGE_DIR = getStorageDir();
const CONFIG_FILE = path.join(STORAGE_DIR, 'db-location.json');
const DEFAULT_DB_PATH = path.join(STORAGE_DIR, 'kwikstore.db');
const DEFAULT_BACKUP_DIR = path.join(STORAGE_DIR, 'backups');

export function getDatabaseConfig() {
  let config = {
    dbPath: DEFAULT_DB_PATH,
    backupDir: DEFAULT_BACKUP_DIR,
    autoBackupOnClose: true,
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (data && data.dbPath) {
        config = { ...config, ...data };
      }
    }
  } catch (err) {
    console.error('Error reading DB config, using default:', err.message);
  }

  // Cross-platform sanitizer: If on macOS/Linux but path is Windows Drive format (D:\...), sanitize to default path
  if (process.platform !== 'win32' && /^[a-zA-Z]:[\\\/]/.test(config.dbPath)) {
    config.dbPath = DEFAULT_DB_PATH;
    config.backupDir = DEFAULT_BACKUP_DIR;
  }

  return config;
}

export function saveDatabaseConfig(config) {
  try {
    const dir = getStorageDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving DB config:', err);
    throw err;
  }
}

let dbInstance = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const config = getDatabaseConfig();
  const dbDir = path.dirname(config.dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (config.backupDir && !fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }

  console.log(`Connecting to SQLite Database at: ${config.dbPath}`);
  
  dbInstance = new Database(config.dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? null : null,
  });

  // Enable WAL (Write-Ahead Logging) for lightning-fast concurrent reads & writes
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('busy_timeout = 5000'); // 5-second wait on concurrent LAN counter writes
  dbInstance.pragma('cache_size = -64000'); // 64MB cache

  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
      console.log('Database connection closed safely.');
    } catch (err) {
      console.error('Error closing database:', err.message);
    }
    dbInstance = null;
  }
}

// Perform instant safe online backup
export async function createDatabaseBackup(customDestinationDir = null) {
  const db = getDb();
  const config = getDatabaseConfig();
  const destDir = customDestinationDir || config.backupDir || path.join(DEFAULT_DATA_DIR, 'backups');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `kwikstore-backup-${timestamp}.sqlite`;
  const backupFilePath = path.join(destDir, backupFileName);

  // SQLite online backup API
  await db.backup(backupFilePath);

  const stats = fs.statSync(backupFilePath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  // Log backup to database
  try {
    const stmt = db.prepare(`
      INSERT INTO backup_logs (file_name, file_path, file_size_mb, backup_type, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    stmt.run(backupFileName, backupFilePath, sizeMb, customDestinationDir ? 'EXTERNAL_USB' : 'AUTO_LOCAL');
  } catch (e) {
    // If backup_logs table not yet created, ignore
  }

  return {
    success: true,
    fileName: backupFileName,
    filePath: backupFilePath,
    sizeMb: `${sizeMb} MB`,
    timestamp: new Date().toISOString(),
  };
}

// Relocate database to a new directory (e.g. D:\ or E:\ drive)
export async function relocateDatabase(newPath) {
  const oldConfig = getDatabaseConfig();
  const oldDbPath = oldConfig.dbPath;

  if (path.resolve(oldDbPath) === path.resolve(newPath)) {
    return { success: true, message: 'Database is already in the specified location.' };
  }

  // Ensure new directory exists
  const newDir = path.dirname(newPath);
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  // Backup current DB to new path
  const currentDb = getDb();
  await currentDb.backup(newPath);

  // Close active connection
  closeDb();

  // Update config
  const newConfig = {
    ...oldConfig,
    dbPath: newPath,
  };
  saveDatabaseConfig(newConfig);

  // Re-open at new location
  getDb();

  return {
    success: true,
    oldPath: oldDbPath,
    newPath: newPath,
    message: 'Database successfully migrated to new drive location!',
  };
}

// Restore database from an existing backup or mapped file
export async function restoreDatabaseFromBackup(backupFilePath) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`);
  }

  // Close active connection
  closeDb();

  const config = getDatabaseConfig();
  const activeDbPath = config.dbPath;

  // Make sure destination directory exists
  const destDir = path.dirname(activeDbPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy backup to active database path
  fs.copyFileSync(backupFilePath, activeDbPath);

  // Clean any existing WAL or SHM temporary files
  try {
    if (fs.existsSync(`${activeDbPath}-wal`)) fs.unlinkSync(`${activeDbPath}-wal`);
    if (fs.existsSync(`${activeDbPath}-shm`)) fs.unlinkSync(`${activeDbPath}-shm`);
  } catch (e) {
    // ignore
  }

  // Re-open DB
  const db = getDb();
  const invoicesCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
  const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

  return {
    success: true,
    message: 'Database successfully restored from backup!',
    restoredFrom: backupFilePath,
    activePath: activeDbPath,
    stats: {
      invoices: invoicesCount,
      products: productsCount,
      customers: customersCount
    }
  };
}

// Create a new fresh database and set it as active default
export async function createNewDatabase({
  dbPath,
  shopName = 'My Retail Store',
  ownerName = 'Store Owner',
  username = 'owner',
  password = 'password123',
  recoveryPin = '9853',
  shopType = 'RETAIL',
  city = 'Bhubaneswar',
  stateCode = '21',
  gstin = ''
} = {}) {
  if (!dbPath || !dbPath.trim()) {
    throw new Error('Database path is required.');
  }

  let finalDbPath = dbPath.trim();
  if (!finalDbPath.endsWith('.db') && !finalDbPath.endsWith('.sqlite')) {
    finalDbPath += '.db';
  }

  const dbDir = path.dirname(finalDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // If a file already exists at this path, remove it cleanly
  if (fs.existsSync(finalDbPath)) {
    fs.unlinkSync(finalDbPath);
  }
  if (fs.existsSync(`${finalDbPath}-wal`)) fs.unlinkSync(`${finalDbPath}-wal`);
  if (fs.existsSync(`${finalDbPath}-shm`)) fs.unlinkSync(`${finalDbPath}-shm`);

  // Close active connection
  closeDb();

  // Save new configuration as default
  const oldConfig = getDatabaseConfig();
  const newConfig = {
    ...oldConfig,
    dbPath: finalDbPath
  };
  saveDatabaseConfig(newConfig);

  // Open fresh database
  const db = getDb();

  // Run schema migrations to create all tables
  const { runMigrations } = await import('./migrations.js');
  runMigrations();

  // Ensure default roles exist
  const rolesCount = db.prepare(`SELECT COUNT(*) as count FROM roles`).get().count;
  if (rolesCount === 0) {
    db.prepare(`
      INSERT INTO roles (id, role_key, name, description, permissions_json)
      VALUES 
        (1, 'SUPER_ADMIN', 'Super Admin (Shop Owner)', 'Full administrative privileges', '["*"]'),
        (2, 'MANAGER', 'Store Manager', 'Store management & inventory', '["pos:*","inventory:*","customers:*","suppliers:*","reports:*"]'),
        (3, 'CASHIER', 'Billing Cashier', 'Point of sale billing only', '["pos:billing","pos:view","customers:view","customers:add"]')
    `).run();
  }

  // Create primary shop
  const cleanGstin = (gstin && gstin.trim()) ? gstin.trim() : null;
  db.prepare(`
    INSERT INTO shops (id, name, shop_type, address, city, state_code, gstin, phone, is_active)
    VALUES (1, ?, ?, 'Main Market', ?, ?, ?, '9876543210', 1)
  `).run(
    shopName.trim(),
    shopType,
    city.trim(),
    (stateCode && stateCode.trim()) ? stateCode.trim() : '27',
    cleanGstin
  );

  // Create owner user
  db.prepare(`
    INSERT INTO users (id, shop_id, username, password_hash, display_name, phone, role_id, is_active)
    VALUES (1, 1, ?, ?, ?, '9876543210', 1, 1)
  `).run(
    username.trim().toLowerCase(),
    password.trim(),
    ownerName.trim()
  );

  // Save master recovery pin
  if (recoveryPin && recoveryPin.trim()) {
    db.prepare(`
      INSERT INTO system_config (key, value)
      VALUES ('owner_recovery_pin', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(recoveryPin.trim());
  }

  return {
    success: true,
    activePath: finalDbPath,
    shopName: shopName.trim(),
    username: username.trim().toLowerCase(),
    message: `New clean database created at ${finalDbPath} and set as default!`
  };
}

// Switch active database to an existing database file
export async function switchActiveDatabase(targetDbPath) {
  if (!targetDbPath || !targetDbPath.trim()) {
    throw new Error('Target database file path is required.');
  }

  const cleanPath = targetDbPath.trim();
  if (!fs.existsSync(cleanPath)) {
    throw new Error(`Database file not found at: ${cleanPath}`);
  }

  // Close active connection
  closeDb();

  // Save new configuration as default
  const oldConfig = getDatabaseConfig();
  const newConfig = {
    ...oldConfig,
    dbPath: cleanPath
  };
  saveDatabaseConfig(newConfig);

  // Re-open DB
  const db = getDb();
  const { runMigrations } = await import('./migrations.js');
  runMigrations();

  const invoicesCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
  const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const shopsCount = db.prepare('SELECT COUNT(*) as count FROM shops').get().count;

  return {
    success: true,
    activePath: cleanPath,
    message: `Switched active database to: ${cleanPath}`,
    stats: {
      invoices: invoicesCount,
      products: productsCount,
      customers: customersCount,
      shops: shopsCount
    }
  };
}

// Reset current database transactions (Wipe demo sales, khata, and keep clean)
export function resetDatabaseTransactions({ wipeProducts = false } = {}) {
  const db = getDb();

  db.transaction(() => {
    // Delete sales & invoice transactions
    db.prepare(`DELETE FROM invoice_items`).run();
    db.prepare(`DELETE FROM invoices`).run();
    db.prepare(`DELETE FROM khata_transactions`).run();
    db.prepare(`DELETE FROM customer_ledger`).run();
    db.prepare(`DELETE FROM quotations`).run();
    db.prepare(`DELETE FROM quotation_items`).run();
    db.prepare(`DELETE FROM stock_adjustments`).run();
    db.prepare(`DELETE FROM purchase_orders`).run();
    db.prepare(`DELETE FROM purchase_order_items`).run();
    db.prepare(`DELETE FROM attendance`).run();
    db.prepare(`DELETE FROM salary_payments`).run();
    db.prepare(`DELETE FROM audit_logs`).run();

    // Reset customer balances to 0
    db.prepare(`UPDATE customers SET current_balance = 0, total_spent = 0, total_orders = 0`).run();

    // Optionally wipe products
    if (wipeProducts) {
      db.prepare(`DELETE FROM product_serials`).run();
      db.prepare(`DELETE FROM product_variants`).run();
      db.prepare(`DELETE FROM product_batches`).run();
      db.prepare(`DELETE FROM products`).run();
      db.prepare(`DELETE FROM categories`).run();
      db.prepare(`DELETE FROM suppliers`).run();
    }
  })();

  // VACUUM database to compact size
  try {
    db.pragma('vacuum');
  } catch (e) {
    // ignore
  }

  return {
    success: true,
    message: wipeProducts 
      ? 'Database completely reset to blank state (all products, invoices, and ledgers purged).'
      : 'All test invoices, sales, and Khata balances purged. Product catalog preserved.'
  };
}

