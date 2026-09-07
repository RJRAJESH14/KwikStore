import crypto from 'crypto';
import os from 'os';
import { getDb } from '../database/db.js';

// Private Developer Secret Salt (Master Signing Key)
const DEVELOPER_SECRET = 'KWIKSTORE_PRO_DEEP_ROOT_MASTER_SALT_2026_RAJESH';
const DEVELOPER_MASTER_PIN = '990011'; // Master Developer Emergency PIN

/**
 * Get Hardware Machine ID (Unique PC Fingerprint)
 * Combines OS platform, CPU architecture, hostname, and primary network MAC/interface info
 */
export function getMachineId() {
  const db = getDb();
  
  // Check if we have a persisted unique hardware identifier
  try {
    const existing = db.prepare(`SELECT value FROM system_config WHERE key = 'machine_hardware_id'`).get();
    if (existing && existing.value) {
      return existing.value;
    }
  } catch (e) {
    // database might be initializing
  }

  // Generate hardware fingerprint
  const networkInterfaces = os.networkInterfaces();
  let macAddress = '';
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name] || []) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        macAddress = net.mac;
        break;
      }
    }
    if (macAddress) break;
  }

  const rawFingerprint = [
    os.platform(),
    os.arch(),
    os.hostname(),
    os.cpus()[0]?.model || 'UNKNOWN_CPU',
    os.totalmem(),
    macAddress || 'DEFAULT_INTERFACE'
  ].join('###');

  const hash = crypto.createHash('sha256').update(rawFingerprint).digest('hex').toUpperCase();
  // Form a neat 16-character Hardware ID: e.g. "KWIK-8A9F-7B2C-9E41"
  const machineId = `KWIK-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;

  try {
    db.prepare(`
      INSERT INTO system_config (key, value)
      VALUES ('machine_hardware_id', ?)
      ON CONFLICT(key) DO NOTHING
    `).run(machineId);
  } catch (e) {
    // ignore
  }

  return machineId;
}

/**
 * Normalize Machine ID by extracting clean uppercase hex characters
 */
export function normalizeMachineId(id) {
  if (!id) return '';
  return String(id).toUpperCase().replace(/[^A-F0-9]/g, '');
}

/**
 * Generate Cryptographic License Key for a Machine
 * @param {Object} opts
 * @param {string} opts.machineId - Target PC Machine ID (e.g. KWIK-8A9F-7B2C-9E41)
 * @param {string} opts.customerName - Business / Customer Name
 * @param {string} opts.planType - TRIAL, 1MONTH, 1YEAR, 2YEAR, LIFETIME
 * @param {number} [opts.customDays] - Custom validity in days
 */
export function generateLicenseKey({ machineId, customerName = 'KwikStore User', planType = '1YEAR', customDays }) {
  const cleanMachineId = (machineId || '').trim().toUpperCase();
  const normMachineId = normalizeMachineId(cleanMachineId);
  if (normMachineId.length < 8) {
    throw new Error('Invalid Machine ID format. Must contain at least 8 hex characters.');
  }

  let days = 365;
  if (planType === 'TRIAL') days = 14;
  else if (planType === '1MONTH') days = 30;
  else if (planType === '6MONTHS') days = 180;
  else if (planType === '1YEAR') days = 365;
  else if (planType === '2YEAR') days = 730;
  else if (planType === 'LIFETIME') days = 36500; // 100 years
  else if (customDays && customDays > 0) days = customDays;

  const issueTimestamp = Math.floor(Date.now() / 1000);
  const expiryTimestamp = issueTimestamp + (days * 86400);

  // Plan code identifier
  const planCode = planType.substring(0, 3).toUpperCase(); // e.g. "1YE", "LIF", "TRI"

  // Standard Normalized Hardware Payload
  const payload = `${normMachineId}|${planType}|${expiryTimestamp}`;

  // HMAC-SHA256 signature
  const signature = crypto.createHmac('sha256', DEVELOPER_SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase();

  // License Key Format:
  // KWIK-<PLAN>-<EXPIRY_HEX>-<SIG_PART1>-<SIG_PART2>
  const expiryHex = expiryTimestamp.toString(16).toUpperCase();
  const sigPart1 = signature.substring(0, 4);
  const sigPart2 = signature.substring(4, 8);

  const licenseKey = `KWIK-${planCode}-${expiryHex}-${sigPart1}-${sigPart2}`;

  return {
    licenseKey,
    machineId: cleanMachineId,
    customerName: (customerName || 'KwikStore User').trim(),
    planType,
    daysValid: days,
    issuedAt: new Date(issueTimestamp * 1000).toISOString(),
    expiresAt: new Date(expiryTimestamp * 1000).toISOString()
  };
}

/**
 * Validate and parse a License Key against current hardware
 */
export function verifyLicenseKey(licenseKey, machineId, customerName = '') {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, message: 'No license key provided.' };
  }

  const parts = licenseKey.trim().toUpperCase().split('-');
  if (parts.length !== 5 || parts[0] !== 'KWIK') {
    return { valid: false, message: 'Invalid license key format.' };
  }

  const [, planCode, expiryHex, sigPart1, sigPart2] = parts;
  const expiryTimestamp = parseInt(expiryHex, 16);
  if (isNaN(expiryTimestamp)) {
    return { valid: false, message: 'Corrupted license expiry stamp.' };
  }

  const nowTimestamp = Math.floor(Date.now() / 1000);
  if (nowTimestamp > expiryTimestamp) {
    const expiredDate = new Date(expiryTimestamp * 1000).toLocaleDateString('en-IN');
    return { 
      valid: false, 
      expired: true, 
      message: `License expired on ${expiredDate}. Please renew with the seller.` 
    };
  }

  const normMachineId = normalizeMachineId(machineId);

  // Attempt matching known plan types with resilient signatures
  const planTypes = ['1YEAR', 'LIFETIME', 'TRIAL', '1MONTH', '6MONTHS', '2YEAR'];
  let matchedPlan = null;

  for (const plan of planTypes) {
    if (plan.substring(0, 3).toUpperCase() === planCode) {
      // 1. Check primary normalized hardware payload
      const payload1 = `${normMachineId}|${plan}|${expiryTimestamp}`;
      const sig1 = crypto.createHmac('sha256', DEVELOPER_SECRET).update(payload1).digest('hex').toUpperCase();
      if (sig1.substring(0, 4) === sigPart1 && sig1.substring(4, 8) === sigPart2) {
        matchedPlan = plan;
        break;
      }

      // 2. Check legacy raw machineId + customer payload
      const payload2 = `${machineId}|${customerName.trim()}|${plan}|${expiryTimestamp}`;
      const sig2 = crypto.createHmac('sha256', DEVELOPER_SECRET).update(payload2).digest('hex').toUpperCase();
      if (sig2.substring(0, 4) === sigPart1 && sig2.substring(4, 8) === sigPart2) {
        matchedPlan = plan;
        break;
      }

      // 3. Check legacy no-dashes machineId + customer payload (handles screenshot case!)
      const noDashMachineId = (machineId || '').replace(/-/g, '');
      const payload3 = `${noDashMachineId}|${customerName.trim()}|${plan}|${expiryTimestamp}`;
      const sig3 = crypto.createHmac('sha256', DEVELOPER_SECRET).update(payload3).digest('hex').toUpperCase();
      if (sig3.substring(0, 4) === sigPart1 && sig3.substring(4, 8) === sigPart2) {
        matchedPlan = plan;
        break;
      }

      // 4. Check normalized machineId with 'KWIK-' prefix + customer
      const payload4 = `KWIK-${normMachineId}|${customerName.trim()}|${plan}|${expiryTimestamp}`;
      const sig4 = crypto.createHmac('sha256', DEVELOPER_SECRET).update(payload4).digest('hex').toUpperCase();
      if (sig4.substring(0, 4) === sigPart1 && sig4.substring(4, 8) === sigPart2) {
        matchedPlan = plan;
        break;
      }
    }
  }

  if (!matchedPlan) {
    return { valid: false, message: 'License signature mismatch. Key is invalid for this computer.' };
  }

  const daysRemaining = Math.ceil((expiryTimestamp - nowTimestamp) / 86400);

  return {
    valid: true,
    planType: matchedPlan,
    expiryTimestamp,
    expiresAt: new Date(expiryTimestamp * 1000).toISOString(),
    daysRemaining,
    message: `License is active! (${daysRemaining} days remaining)`
  };
}

/**
 * Get the current system license status
 */
export function getSystemLicenseStatus() {
  const db = getDb();
  const machineId = getMachineId();

  try {
    // 1. Check Developer Override
    const devOverride = db.prepare(`SELECT value FROM system_config WHERE key = 'developer_override_active'`).get();
    if (devOverride && devOverride.value === 'true') {
      return {
        status: 'ACTIVE',
        isActivated: true,
        planType: 'DEVELOPER_MASTER_ACTIVE',
        planName: 'Developer Master Override Mode',
        machineId,
        customerName: 'Authorized Developer / Super Admin',
        daysRemaining: 9999,
        expiresAt: new Date(Date.now() + 9999 * 86400000).toISOString(),
        isDeveloperMode: true
      };
    }

    // 2. Check Installed License Key
    const keyRow = db.prepare(`SELECT value FROM system_config WHERE key = 'license_key'`).get();
    const custRow = db.prepare(`SELECT value FROM system_config WHERE key = 'license_customer_name'`).get();
    const customerName = custRow?.value || '';

    if (keyRow && keyRow.value) {
      const verification = verifyLicenseKey(keyRow.value, machineId, customerName);
      if (verification.valid) {
        return {
          status: 'ACTIVE',
          isActivated: true,
          planType: verification.planType,
          planName: formatPlanName(verification.planType),
          licenseKey: keyRow.value,
          customerName,
          machineId,
          daysRemaining: verification.daysRemaining,
          expiresAt: verification.expiresAt,
          isExpiringSoon: verification.daysRemaining <= 15
        };
      } else if (verification.expired) {
        return {
          status: 'EXPIRED',
          isActivated: false,
          licenseKey: keyRow.value,
          customerName,
          machineId,
          daysRemaining: 0,
          message: verification.message,
          sellerContact: {
            name: 'Rajesh Sharma / FleetBill Pro',
            phone: '+91 8338833377',
            whatsapp: '918338833377',
            website: 'https://fleetbillpro.com'
          }
        };
      }
    }

    // 3. Check Free Trial Status
    const trialRow = db.prepare(`SELECT value FROM system_config WHERE key = 'trial_start_timestamp'`).get();
    if (trialRow && trialRow.value) {
      const trialStart = parseInt(trialRow.value, 10);
      const trialDuration = 7 * 86400; // 7 Days Trial
      const trialExpiry = trialStart + trialDuration;
      const now = Math.floor(Date.now() / 1000);

      if (now < trialExpiry) {
        const daysLeft = Math.ceil((trialExpiry - now) / 86400);
        return {
          status: 'TRIAL',
          isActivated: true,
          planType: 'TRIAL_7DAYS',
          planName: '7-Day Free Evaluation Trial',
          machineId,
          customerName: customerName || 'Trial Evaluation User',
          daysRemaining: daysLeft,
          expiresAt: new Date(trialExpiry * 1000).toISOString(),
          isTrial: true
        };
      } else {
        return {
          status: 'EXPIRED',
          isActivated: false,
          planType: 'TRIAL_EXPIRED',
          machineId,
          daysRemaining: 0,
          message: 'Your 7-day evaluation trial has ended. Please enter an activation key.',
          sellerContact: {
            name: 'Rajesh Sharma / FleetBill Pro',
            phone: '+91 8338833377',
            whatsapp: '918338833377',
            website: 'https://fleetbillpro.com'
          }
        };
      }
    }

    // 4. Fresh Unactivated Install
    return {
      status: 'UNACTIVATED',
      isActivated: false,
      machineId,
      canStartTrial: true,
      message: 'KwikStore Pro requires activation or a trial start to proceed.',
      sellerContact: {
        name: 'Rajesh Sharma / FleetBill Pro',
        phone: '+91 8338833377',
        whatsapp: '918338833377',
        website: 'https://fleetbillpro.com'
      }
    };
  } catch (err) {
    console.error('License status check error:', err);
    return {
      status: 'ACTIVE',
      isActivated: true,
      machineId,
      planType: 'OFFLINE_FALLBACK',
      planName: 'Offline Protection Mode'
    };
  }
}

/**
 * Apply and activate a License Key
 */
export function activateLicenseKey(licenseKey, customerName) {
  const db = getDb();
  const machineId = getMachineId();

  if (!licenseKey || !licenseKey.trim()) {
    return { success: false, message: 'Please enter a valid license key.' };
  }

  const cleanKey = licenseKey.trim().toUpperCase();
  const cleanCustomer = (customerName || '').trim();

  const verification = verifyLicenseKey(cleanKey, machineId, cleanCustomer);
  if (!verification.valid) {
    return { success: false, message: verification.message };
  }

  // Save license into system config
  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES ('license_key', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(cleanKey);

  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES ('license_customer_name', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(cleanCustomer);

  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES ('license_plan_type', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(verification.planType);

  // Clear developer override if active
  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES ('developer_override_active', 'false')
    ON CONFLICT(key) DO UPDATE SET value = 'false'
  `).run();

  return {
    success: true,
    planType: verification.planType,
    planName: formatPlanName(verification.planType),
    daysRemaining: verification.daysRemaining,
    expiresAt: verification.expiresAt,
    message: `KwikStore Pro successfully activated! Enjoy your ${formatPlanName(verification.planType)}.`
  };
}

/**
 * Start the 7-day free evaluation trial
 */
export function startEvaluationTrial(customerName = 'Trial Store') {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const existingTrial = db.prepare(`SELECT value FROM system_config WHERE key = 'trial_start_timestamp'`).get();
  if (existingTrial && existingTrial.value) {
    return { success: false, message: 'Evaluation trial has already been used on this computer.' };
  }

  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES ('trial_start_timestamp', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(now.toString());

  if (customerName) {
    db.prepare(`
      INSERT INTO system_config (key, value)
      VALUES ('license_customer_name', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(customerName.trim());
  }

  return {
    success: true,
    message: '7-Day Full Feature Evaluation Trial activated! Welcome to KwikStore Pro.'
  };
}

/**
 * Master Developer PIN Override
 */
export function verifyDeveloperOverride(pin) {
  if (pin !== DEVELOPER_MASTER_PIN) {
    return { success: false, message: 'Invalid Developer Master PIN.' };
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO system_config (key, value)
    VALUES ('developer_override_active', 'true')
    ON CONFLICT(key) DO UPDATE SET value = 'true'
  `).run();

  return {
    success: true,
    message: 'Developer Master Override mode enabled. POS unlocked for maintenance.'
  };
}

function formatPlanName(plan) {
  switch (plan) {
    case '1YEAR': return 'Professional 1-Year License';
    case '2YEAR': return 'Enterprise 2-Year License';
    case 'LIFETIME': return 'Lifetime Unlimited License';
    case '1MONTH': return 'Monthly Subscription License';
    case '6MONTHS': return '6-Month License';
    case 'TRIAL':
    case 'TRIAL_7DAYS': return '7-Day Free Trial';
    default: return `${plan} Plan`;
  }
}
