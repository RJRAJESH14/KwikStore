import fs from 'fs';
import path from 'path';
import https from 'https';
import { getDb, getDatabaseConfig, createDatabaseBackup } from '../database/db.js';

const CONFIG_KEY = 'google_drive_backup_config';

// Ensure table for Google Drive logs exists
export function initGoogleDriveDb() {
  const db = getDb();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS gdrive_backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_size_mb TEXT NOT NULL,
      gdrive_file_id TEXT,
      gdrive_folder_name TEXT,
      status TEXT NOT NULL, -- SUCCESS, FAILED, UPLOADING
      error_message TEXT,
      trigger_type TEXT DEFAULT 'MANUAL', -- MANUAL, SCHEDULED, ON_SHUTDOWN
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `).run();
}

// Get Google Drive Config
export function getGoogleDriveConfig() {
  initGoogleDriveDb();
  const db = getDb();
  const row = db.prepare(`SELECT value FROM system_config WHERE key = ?`).get(CONFIG_KEY);
  
  const defaultConfig = {
    enabled: false,
    accessToken: '',
    refreshToken: '',
    clientId: '',
    clientSecret: '',
    folderId: '',
    folderName: 'KwikStore_Backups',
    schedule: 'DAILY_2200', // HOURLY_1, HOURLY_4, DAILY_2200, ON_SHUTDOWN, MANUAL
    customDailyTime: '22:00',
    keepLastN: 15,
    lastBackupAt: null,
    accountEmail: ''
  };

  if (!row || !row.value) return defaultConfig;

  try {
    return { ...defaultConfig, ...JSON.parse(row.value) };
  } catch (e) {
    return defaultConfig;
  }
}

// Save Google Drive Config
export function saveGoogleDriveConfig(config) {
  initGoogleDriveDb();
  const db = getDb();
  const current = getGoogleDriveConfig();
  const merged = { ...current, ...config };
  
  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(CONFIG_KEY, JSON.stringify(merged));

  // Reset or re-arm background timer
  setupGoogleDriveScheduler();

  return { success: true, message: 'Google Drive backup settings saved successfully.', config: merged };
}

// Test Google Drive Connection / Validate Token
export async function testGoogleDriveConnection(token) {
  const config = getGoogleDriveConfig();
  const accessToken = token || config.accessToken;

  if (!accessToken) {
    return { success: false, message: 'No Google Drive Access Token provided.' };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'www.googleapis.com',
      path: '/drive/v3/about?fields=user,storageQuota',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'KwikStore-Pro-POS'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 && parsed.user) {
            // Update account email
            saveGoogleDriveConfig({ accountEmail: parsed.user.emailAddress || parsed.user.displayName });
            resolve({
              success: true,
              user: parsed.user,
              storage: parsed.storageQuota,
              message: `Connected successfully as ${parsed.user.displayName} (${parsed.user.emailAddress})`
            });
          } else {
            resolve({
              success: false,
              message: parsed.error?.message || `Google Drive API error (Status ${res.statusCode})`
            });
          }
        } catch (e) {
          resolve({ success: false, message: 'Failed to parse Google Drive response.' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, message: `Network error connecting to Google: ${err.message}` });
    });

    req.end();
  });
}

// Upload a SQLite Backup file to Google Drive using REST API Multipart Upload
export async function uploadBackupToGoogleDrive(filePath, triggerType = 'MANUAL') {
  const config = getGoogleDriveConfig();
  const db = getDb();
  initGoogleDriveDb();

  if (!config.enabled && triggerType !== 'MANUAL') {
    return { success: false, message: 'Google Drive automated cloud backup is disabled.' };
  }

  if (!config.accessToken) {
    return { success: false, message: 'Google Drive Access Token is missing. Please sign in or provide a token.' };
  }

  let localFile = filePath;
  let backupMeta = null;

  // If no specific file passed, create an instant fresh online backup
  if (!localFile || !fs.existsSync(localFile)) {
    backupMeta = await createDatabaseBackup();
    localFile = backupMeta.filePath;
  }

  const fileName = path.basename(localFile);
  const stats = fs.statSync(localFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  return new Promise((resolve) => {
    try {
      const fileBuffer = fs.readFileSync(localFile);
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'application/x-sqlite3',
        description: `KwikStore Pro Database Backup - Created ${new Date().toISOString()}`
      };

      if (config.folderId && config.folderId.trim()) {
        metadata.parents = [config.folderId.trim()];
      }

      const multipartRequestBody = Buffer.concat([
        Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/x-sqlite3\r\n\r\n'),
        fileBuffer,
        Buffer.from(closeDelimiter)
      ]);

      const options = {
        hostname: 'www.googleapis.com',
        path: '/upload/drive/v3/files?uploadType=multipart',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartRequestBody.length,
          'User-Agent': 'KwikStore-Pro-POS'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode === 200 && parsed.id) {
              // Log success
              db.prepare(`
                INSERT INTO gdrive_backup_logs (file_name, file_size_mb, gdrive_file_id, gdrive_folder_name, status, trigger_type)
                VALUES (?, ?, ?, ?, 'SUCCESS', ?)
              `).run(fileName, `${sizeMb} MB`, parsed.id, config.folderName || 'Root', triggerType);

              saveGoogleDriveConfig({ lastBackupAt: new Date().toISOString() });

              resolve({
                success: true,
                fileId: parsed.id,
                fileName,
                sizeMb: `${sizeMb} MB`,
                folder: config.folderName || 'Google Drive',
                timestamp: new Date().toISOString(),
                message: `Successfully uploaded ${fileName} (${sizeMb} MB) to Google Drive!`
              });
            } else {
              const errMsg = parsed.error?.message || `Upload failed with status code ${res.statusCode}`;
              db.prepare(`
                INSERT INTO gdrive_backup_logs (file_name, file_size_mb, status, error_message, trigger_type)
                VALUES (?, ?, 'FAILED', ?, ?)
              `).run(fileName, `${sizeMb} MB`, errMsg, triggerType);

              resolve({ success: false, message: errMsg });
            }
          } catch (e) {
            resolve({ success: false, message: 'Invalid response from Google Drive server.' });
          }
        });
      });

      req.on('error', (err) => {
        db.prepare(`
          INSERT INTO gdrive_backup_logs (file_name, file_size_mb, status, error_message, trigger_type)
          VALUES (?, ?, 'FAILED', ?, ?)
        `).run(fileName, `${sizeMb} MB`, err.message, triggerType);

        resolve({ success: false, message: `Upload network error: ${err.message}` });
      });

      req.write(multipartRequestBody);
      req.end();
    } catch (err) {
      resolve({ success: false, message: `Error reading backup file: ${err.message}` });
    }
  });
}

// Get Recent Google Drive Backup Audit Logs
export function getGoogleDriveLogs(limit = 15) {
  initGoogleDriveDb();
  const db = getDb();
  return db.prepare(`
    SELECT * FROM gdrive_backup_logs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

// Automated Scheduler Engine
let schedulerTimer = null;

export function setupGoogleDriveScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  const config = getGoogleDriveConfig();
  if (!config.enabled || !config.accessToken) return;

  // Check every 60 seconds against schedule
  schedulerTimer = setInterval(async () => {
    try {
      const currentConfig = getGoogleDriveConfig();
      if (!currentConfig.enabled || !currentConfig.accessToken) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      let shouldRun = false;

      if (currentConfig.schedule === 'HOURLY_1') {
        if (currentMin === 0) shouldRun = true;
      } else if (currentConfig.schedule === 'HOURLY_4') {
        if (currentHour % 4 === 0 && currentMin === 0) shouldRun = true;
      } else if (currentConfig.schedule === 'DAILY_2200') {
        const [targetH, targetM] = (currentConfig.customDailyTime || '22:00').split(':').map(Number);
        if (currentHour === targetH && currentMin === targetM) shouldRun = true;
      }

      if (shouldRun) {
        console.log('[Google Drive Sync] Triggering scheduled cloud backup...');
        await uploadBackupToGoogleDrive(null, 'SCHEDULED');
      }
    } catch (e) {
      console.error('[Google Drive Sync] Scheduler tick error:', e.message);
    }
  }, 60000);
}

// Arm scheduler on module initialization
try {
  setupGoogleDriveScheduler();
} catch (e) {}
