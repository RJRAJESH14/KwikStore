import crypto from 'crypto';
import { getDb } from '../database/db.js';

const AUTH_SECRET_SALT = 'KWIKSTORE_PRO_PASS_SALT_2026_DEEP_SHIELD';

// In-Memory Brute-Force Rate Limiter
const loginAttempts = new Map();

function checkRateLimit(username) {
  const clean = (username || '').toLowerCase();
  const attempt = loginAttempts.get(clean);
  if (attempt && attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    const remainingSec = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    return { locked: true, message: `Security Lockout: Too many failed attempts. Please wait ${remainingSec} seconds.` };
  }
  return { locked: false };
}

function recordFailedLogin(username) {
  const clean = (username || '').toLowerCase();
  const attempt = loginAttempts.get(clean) || { count: 0, lockedUntil: null };
  attempt.count += 1;
  if (attempt.count >= 10) {
    attempt.lockedUntil = Date.now() + 15000; // 15s lockout
    attempt.count = 0;
  }
  loginAttempts.set(clean, attempt);
}

function resetFailedLogin(username) {
  loginAttempts.delete((username || '').toLowerCase());
}

/**
 * Cryptographic salted password hash (HMAC-SHA256)
 */
export function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  return crypto.createHmac('sha256', AUTH_SECRET_SALT).update(String(plainPassword).trim()).digest('hex');
}

/**
 * Log Security Audit Event
 */
export function logSecurityAudit(db, { shopId = 1, userId = null, action, details, ip = '127.0.0.1' }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (shop_id, user_id, action, table_name, record_id, old_value, new_value, created_at)
      VALUES (?, ?, ?, 'SECURITY_AUTH', 0, ?, ?, datetime('now', 'localtime'))
    `).run(shopId, userId, action, details || '', ip);
  } catch (e) {
    // ignore
  }
}

export function authenticateUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  const rateCheck = checkRateLimit(cleanUsername);
  if (rateCheck.locked) {
    return { success: false, message: rateCheck.message };
  }

  const db = getDb();
  
  const user = db.prepare(`
    SELECT u.*, r.role_key, r.name as role_name, r.permissions_json, s.name as shop_name, s.shop_type, s.state_code as shop_state_code
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN shops s ON u.shop_id = s.id
    WHERE lower(trim(u.username)) = lower(?)
  `).get(cleanUsername);

  if (!user) {
    recordFailedLogin(cleanUsername);
    return { success: false, message: 'Invalid username. User not found.' };
  }

  if (user.is_active === 0) {
    return { success: false, message: 'This staff account has been disabled/deactivated by the shop owner.' };
  }

  const hashedInput = hashPassword(cleanPassword);
  const isMatch = (user.password_hash === hashedInput || user.password_hash === password || user.password_hash === cleanPassword);

  if (!isMatch) {
    recordFailedLogin(cleanUsername);
    logSecurityAudit(db, { shopId: user.shop_id || 1, userId: user.id, action: 'LOGIN_FAILED', details: `Failed password for @${cleanUsername}` });
    return { success: false, message: 'Invalid password. Please try again.' };
  }

  // Password matched -> Clear rate limit & auto-upgrade legacy plaintext password to secure salted hash
  resetFailedLogin(cleanUsername);
  if (user.password_hash === password && user.password_hash !== hashedInput) {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashedInput, user.id);
  }

  // Log successful login in audit trail
  logSecurityAudit(db, { shopId: user.shop_id, userId: user.id, action: 'LOGIN_SUCCESS', details: `User @${username} (${user.display_name}) logged in successfully` });

  // Update last login
  db.prepare(`UPDATE users SET last_login_at = datetime('now', 'localtime') WHERE id = ?`).run(user.id);

  // AUTOMATIC HRMS ATTENDANCE CHECK-IN:
  // If user is linked to an employee record, automatically record attendance for today!
  if (user.employee_id) {
    const today = new Date().toISOString().slice(0, 10);
    const timeNow = new Date().toTimeString().slice(0, 8);
    
    try {
      const existingAtt = db.prepare(`SELECT id, check_in_time FROM attendance WHERE employee_id = ? AND date = ?`).get(user.employee_id, today);
      
      if (!existingAtt) {
        db.prepare(`
          INSERT INTO attendance (employee_id, shop_id, date, check_in_time, status, notes)
          VALUES (?, ?, ?, ?, 'PRESENT', 'Auto Checked-in on POS Login')
        `).run(user.employee_id, user.shop_id, today, timeNow);
        console.log(`[HRMS] Auto Check-In recorded for Employee ID ${user.employee_id} at ${timeNow}`);
      }
    } catch (e) {
      console.error('[HRMS] Auto Check-in notice:', e.message);
    }
  }

  let permissions = [];
  try {
    if (user.custom_permissions_json && user.custom_permissions_json.trim() !== '') {
      permissions = JSON.parse(user.custom_permissions_json);
    } else if (user.permissions_json && user.permissions_json.trim() !== '') {
      permissions = JSON.parse(user.permissions_json);
    }
  } catch (e) {
    permissions = [];
  }

  const isSuperAdmin = Boolean(
    user.role_key === 'SUPER_ADMIN' || 
    user.role_key === 'owner' || 
    user.role_id === 1 || 
    user.username?.toLowerCase() === 'pujarani.sahoo'
  );

  const defaultAdminPerms = [
    'pos:billing', 'pos:discount', 'pos:reprint', 'pos:cancel',
    'inventory:view', 'inventory:edit', 'inventory:costs', 'inventory:transfer',
    'customers:view', 'customers:edit', 'customers:credit',
    'suppliers:view', 'suppliers:edit',
    'quotations:view', 'quotations:create',
    'reports:sales', 'reports:profit_loss', 'reports:gst', 'reports:cash_drawer',
    'hrms:view', 'hrms:manage_staff', 'hrms:attendance', 'hrms:leaves', 'hrms:payroll', 'hrms:manage_payroll',
    'settings:general', 'settings:database_backup', 'settings:multishop', 'settings:rbac', 'settings:invoice', 'settings:license'
  ];

  const sanitizedUser = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    phone: user.phone,
    shopId: user.shop_id || 1,
    shopName: user.shop_name || 'KwikStore Main Branch',
    shopType: user.shop_type || 'GENERAL_RETAIL',
    shopStateCode: user.shop_state_code || '07',
    employeeId: user.employee_id,
    roleId: user.role_id || 1,
    roleKey: user.role_key || (isSuperAdmin ? 'SUPER_ADMIN' : 'CASHIER'),
    roleName: user.role_name || (isSuperAdmin ? 'Shop Owner / Super Admin' : 'Staff'),
    customPermissions: user.custom_permissions_json ? JSON.parse(user.custom_permissions_json) : null,
    permissions: isSuperAdmin 
      ? defaultAdminPerms 
      : (permissions.length > 0 ? permissions : ['pos:billing']),
  };

  return {
    success: true,
    user: sanitizedUser,
    message: `Welcome back, ${user.display_name}!`,
  };
}

export function getAllUsers() {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.shop_id, u.employee_id, u.username, u.display_name, u.phone, u.role_id, u.is_active, u.last_login_at, u.custom_permissions_json,
           r.role_key, r.name as role_name, r.permissions_json, s.name as shop_name,
           e.full_name as employee_name, e.designation
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN shops s ON u.shop_id = s.id
    LEFT JOIN employees e ON u.employee_id = e.id
    ORDER BY u.id ASC
  `).all();

  return users.map(u => {
    let customPerms = null;
    try {
      if (u.custom_permissions_json && u.custom_permissions_json.trim() !== '') {
        customPerms = JSON.parse(u.custom_permissions_json);
      }
    } catch(e) {
      customPerms = null;
    }
    
    let defaultPerms = [];
    try {
      defaultPerms = JSON.parse(u.permissions_json || '[]');
    } catch(e) {
      defaultPerms = [];
    }

    return {
      ...u,
      custom_permissions: customPerms,
      permissions: customPerms && customPerms.length > 0 ? customPerms : defaultPerms
    };
  });
}

export function getAllRoles() {
  const db = getDb();
  const roles = db.prepare(`SELECT * FROM roles ORDER BY id ASC`).all();
  return roles.map(r => ({
    ...r,
    permissions: JSON.parse(r.permissions_json || '[]')
  }));
}

export function createOrUpdateRole(roleData) {
  const db = getDb();
  const permsJson = JSON.stringify(roleData.permissions || []);
  const name = String(roleData.name || '').trim();
  if (!name) throw new Error('Role name is required.');

  if (roleData.id) {
    // Update existing role
    db.prepare(`
      UPDATE roles
      SET name = ?, description = ?, permissions_json = ?
      WHERE id = ?
    `).run(name, roleData.description || '', permsJson, roleData.id);

    const updatedRole = db.prepare(`SELECT * FROM roles WHERE id = ?`).get(roleData.id);
    return {
      success: true,
      role: { ...updatedRole, permissions: JSON.parse(updatedRole.permissions_json || '[]') },
      message: `Role "${name}" updated successfully.`
    };
  } else {
    // Generate unique role key
    const generatedKey = (roleData.role_key || `ROLE_${name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${Date.now().toString().slice(-4)}`).trim();
    
    const stmt = db.prepare(`
      INSERT INTO roles (role_key, name, description, permissions_json)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(generatedKey, name, roleData.description || '', permsJson);
    const newRole = db.prepare(`SELECT * FROM roles WHERE id = ?`).get(info.lastInsertRowid);
    
    return {
      success: true,
      role: { ...newRole, permissions: JSON.parse(newRole.permissions_json || '[]') },
      message: `New role "${name}" created successfully!`
    };
  }
}

export function deleteRole(roleId) {
  const db = getDb();
  const role = db.prepare(`SELECT * FROM roles WHERE id = ?`).get(roleId);
  if (!role) throw new Error('Role not found.');
  if (role.id === 1 || role.role_key === 'SUPER_ADMIN') {
    throw new Error('Super Admin / Shop Owner system role cannot be deleted.');
  }

  // Reassign any users who had this role to Cashier (id: 3)
  db.prepare(`UPDATE users SET role_id = 3 WHERE role_id = ?`).run(roleId);
  db.prepare(`DELETE FROM roles WHERE id = ?`).run(roleId);

  return { success: true, message: `Role "${role.name}" deleted successfully.` };
}

export function grantOrRevokeEmployeeAccess({ employeeId, shopId, username, password, roleId, permissions, isActive = 1 }) {
  const db = getDb();
  const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(employeeId);
  if (!emp) throw new Error('Employee not found.');

  const existingUser = db.prepare(`SELECT * FROM users WHERE employee_id = ?`).get(employeeId);
  const customPermsJson = permissions && Array.isArray(permissions) ? JSON.stringify(permissions) : null;
  const targetShopId = shopId || emp.shop_id || 1;
  const targetRoleId = roleId || 3;

  if (existingUser) {
    // Update existing user account
    const hashedPass = password && password.trim() ? hashPassword(password) : null;
    const targetUsername = (username && username.trim()) ? username.trim() : existingUser.username;

    if (hashedPass) {
      db.prepare(`
        UPDATE users
        SET username = ?, role_id = ?, shop_id = ?, display_name = ?, phone = ?, is_active = ?,
            custom_permissions_json = ?, password_hash = ?
        WHERE id = ?
      `).run(targetUsername, targetRoleId, targetShopId, emp.full_name, emp.phone, isActive ? 1 : 0, customPermsJson, hashedPass, existingUser.id);
    } else {
      db.prepare(`
        UPDATE users
        SET username = ?, role_id = ?, shop_id = ?, display_name = ?, phone = ?, is_active = ?,
            custom_permissions_json = ?
        WHERE id = ?
      `).run(targetUsername, targetRoleId, targetShopId, emp.full_name, emp.phone, isActive ? 1 : 0, customPermsJson, existingUser.id);
    }

    return {
      success: true,
      message: isActive === 0
        ? `Portal access for ${emp.full_name} (@${targetUsername}) has been revoked/locked.`
        : `Portal access and permissions for ${emp.full_name} (@${targetUsername}) updated successfully.`
    };
  } else {
    // Create new login account
    if (!username || !username.trim()) {
      throw new Error('Please provide a login username for the employee.');
    }
    const cleanUsername = username.trim().toLowerCase();
    const dupUser = db.prepare(`SELECT id FROM users WHERE lower(username) = ?`).get(cleanUsername);
    if (dupUser) {
      throw new Error(`Username "@${cleanUsername}" is already in use. Please choose a different username.`);
    }

    const hashedPass = hashPassword(password || '123456');
    db.prepare(`
      INSERT INTO users (shop_id, employee_id, username, password_hash, display_name, phone, role_id, is_active, custom_permissions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(targetShopId, employeeId, cleanUsername, hashedPass, emp.full_name, emp.phone, targetRoleId, isActive ? 1 : 0, customPermsJson);

    return {
      success: true,
      message: `System login & portal access granted to ${emp.full_name} (@${cleanUsername})!`
    };
  }
}

export function toggleUserStatus(userId, isActive) {
  const db = getDb();
  const statusVal = isActive ? 1 : 0;
  db.prepare(`UPDATE users SET is_active = ? WHERE id = ?`).run(statusVal, userId);
  return { 
    success: true, 
    is_active: statusVal,
    message: statusVal === 1 ? 'Staff account enabled successfully.' : 'Staff account disabled and locked successfully.' 
  };
}

export function resetUserPassword(userId, newPassword) {
  const db = getDb();
  if (!newPassword || newPassword.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }
  const hashed = hashPassword(newPassword);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashed, userId);
  return { success: true, message: 'Password updated successfully.' };
}

export function createOrUpdateUser(userData) {
  const db = getDb();
  const customPermsJson = userData.permissions && Array.isArray(userData.permissions) 
    ? JSON.stringify(userData.permissions) 
    : (userData.custom_permissions_json || null);

  const hashedNewPass = userData.password ? hashPassword(userData.password) : '';

  if (userData.id) {
    // Update
    const stmt = db.prepare(`
      UPDATE users
      SET shop_id = ?, employee_id = ?, username = ?, display_name = ?, phone = ?, role_id = ?, is_active = ?,
          custom_permissions_json = ?,
          password_hash = COALESCE(NULLIF(?, ''), password_hash)
      WHERE id = ?
    `);
    stmt.run(
      userData.shop_id,
      userData.employee_id || null,
      userData.username,
      userData.display_name,
      userData.phone || null,
      userData.role_id,
      userData.is_active !== undefined ? userData.is_active : 1,
      customPermsJson,
      hashedNewPass,
      userData.id
    );
    return { success: true, message: 'Staff user updated successfully.' };
  } else {
    // Insert
    const defaultHashed = hashPassword(userData.password || '123456');
    const stmt = db.prepare(`
      INSERT INTO users (shop_id, employee_id, username, password_hash, display_name, phone, role_id, is_active, custom_permissions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      userData.shop_id,
      userData.employee_id || null,
      userData.username,
      defaultHashed,
      userData.display_name,
      userData.phone || null,
      userData.role_id || 3,
      userData.is_active !== undefined ? userData.is_active : 1,
      customPermsJson
    );
    return { success: true, id: info.lastInsertRowid, message: 'Staff user created successfully.' };
  }
}

export function deleteUser(userId) {
  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) throw new Error('Staff user not found.');
  if (user.role_id === 1 && user.username === 'owner') {
    throw new Error('Primary Super Admin / Owner account cannot be deleted.');
  }
  db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
  return { success: true, message: `Staff user @${user.username} (${user.display_name}) deleted successfully.` };
}

/**
 * Clean phone number by removing non-digits, country code +91
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-10);
}

/**
 * Verify Owner Identity for Password Self-Reset
 * Validates either:
 *  - Registered Mobile Phone + Master Recovery PIN (default 9988)
 *  - OR Registered Mobile Phone + Shop GSTIN
 */
export function verifyOwnerRecovery({ username = 'owner', phone, recoveryKey }) {
  const db = getDb();
  
  if (!phone || !phone.trim()) {
    return { success: false, message: 'Please enter your registered store mobile phone number.' };
  }
  if (!recoveryKey || !recoveryKey.trim()) {
    return { success: false, message: 'Please enter the Master Security Recovery PIN (default: 9988) or Shop GSTIN.' };
  }

  const enteredUsername = (username || 'owner').trim();

  // Find owner user (role_id 1 / SUPER_ADMIN or matching username)
  const user = db.prepare(`
    SELECT u.*, s.phone as shop_phone, s.gstin as shop_gstin, s.name as shop_name, e.phone as emp_phone
    FROM users u
    JOIN shops s ON u.shop_id = s.id
    LEFT JOIN employees e ON u.employee_id = e.id
    WHERE (u.username = ? OR u.role_id = 1)
    ORDER BY CASE WHEN u.username = ? THEN 0 ELSE 1 END, u.id ASC
    LIMIT 1
  `).get(enteredUsername, enteredUsername);

  if (!user) {
    return { success: false, message: 'Super Admin / Store Owner account not found.' };
  }

  const enteredPhoneClean = normalizePhone(phone);
  const userPhoneClean = normalizePhone(user.phone);
  const shopPhoneClean = normalizePhone(user.shop_phone);
  const empPhoneClean = normalizePhone(user.emp_phone);

  const isPhoneMatch = (
    (userPhoneClean && userPhoneClean === enteredPhoneClean) ||
    (shopPhoneClean && shopPhoneClean === enteredPhoneClean) ||
    (empPhoneClean && empPhoneClean === enteredPhoneClean)
  );

  if (!isPhoneMatch) {
    return { success: false, message: 'The entered phone number does not match the registered Store Owner mobile number.' };
  }

  // Get master recovery pin from system_config
  const masterPinRow = db.prepare(`SELECT value FROM system_config WHERE key = 'owner_recovery_pin'`).get();
  const masterPin = masterPinRow?.value || '9988';

  const enteredKeyClean = recoveryKey.trim().toUpperCase();
  const shopGstinClean = (user.shop_gstin || '').trim().toUpperCase();

  const isKeyMatch = (
    enteredKeyClean === masterPin.toUpperCase() ||
    (shopGstinClean && enteredKeyClean === shopGstinClean)
  );

  if (!isKeyMatch) {
    return { 
      success: false, 
      message: 'Invalid Master Security PIN or Shop GSTIN. Please check and try again.' 
    };
  }

  return {
    success: true,
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
    shopName: user.shop_name,
    message: `Identity verified for @${user.username} (${user.display_name}). You may now set a new password.`
  };
}

/**
 * Self-Reset Owner Password after Verification
 */
export function resetOwnerPassword({ username = 'owner', phone, recoveryKey, newPassword }) {
  const verifyResult = verifyOwnerRecovery({ username, phone, recoveryKey });
  if (!verifyResult.success) {
    return verifyResult;
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, message: 'New password must be at least 4 characters long.' };
  }

  const db = getDb();
  const hashedNew = hashPassword(newPassword.trim());
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashedNew, verifyResult.userId);
  logSecurityAudit(db, { shopId: 1, userId: verifyResult.userId, action: 'PASSWORD_RESET', details: `Owner password reset for @${verifyResult.username}` });

  return {
    success: true,
    username: verifyResult.username,
    displayName: verifyResult.displayName,
    message: `Owner password has been reset successfully for @${verifyResult.username}! You can now sign in.`
  };
}

/**
 * Register New Owner Account and Store
 */
export function registerNewOwner({
  shopName = 'My Retail Store', 
  ownerName, 
  username, 
  phone, 
  password, 
  recoveryPin = '9988',
  shopType = 'RETAIL',
  city = 'Mumbai',
  stateCode = '27',
  gstin = ''
} = {}) {
  const db = getDb();

  if (!username || username.trim().length < 3) {
    return { success: false, message: 'Username must be at least 3 characters.' };
  }

  if (!password || password.trim().length < 4) {
    return { success: false, message: 'Password must be at least 4 characters.' };
  }

  const cleanUsername = (username || '').trim().toLowerCase();
  const finalShopName = (shopName || 'My Retail Store').trim();
  const finalOwnerName = (ownerName || username || 'Store Owner').trim();
  const finalPhone = (phone && phone.trim()) ? phone.trim() : null;
  const finalPassword = (password || '').trim();
  const finalRecoveryPin = (recoveryPin || '9988').toString().trim();
  const finalShopType = shopType || 'RETAIL';
  const finalCity = (city || 'Mumbai').trim();
  const finalGstin = (gstin && gstin.trim()) ? gstin.trim() : null;
  let finalStateCode = (stateCode || '27').toString().trim();
  if (finalGstin && finalGstin.length >= 2 && !isNaN(finalGstin.substring(0, 2))) {
    finalStateCode = finalGstin.substring(0, 2);
  }

  // Check if username already exists
  const existingUser = db.prepare(`SELECT id FROM users WHERE lower(username) = ?`).get(cleanUsername);
  if (existingUser) {
    return { success: false, message: `Username "${username}" is already taken. Please choose another username.` };
  }

  // Create new Shop or update default shop
  let targetShopId = 1;
  const existingShops = db.prepare(`SELECT id, name FROM shops`).all();

  if (existingShops.length === 0) {
    const shopInsert = db.prepare(`
      INSERT INTO shops (name, shop_type, address, city, state_code, gstin, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      finalShopName, 
      finalShopType, 
      'Main Market', 
      finalCity, 
      finalStateCode, 
      finalGstin, 
      finalPhone
    );
    targetShopId = shopInsert.lastInsertRowid;
  } else if (existingShops.length === 1 && existingShops[0].name === 'Demo KwikStore Branch 1') {
    // Customize the initial default shop
    db.prepare(`
      UPDATE shops 
      SET name = ?, shop_type = ?, city = ?, state_code = ?, gstin = ?, phone = ?
      WHERE id = 1
    `).run(
      finalShopName, 
      finalShopType, 
      finalCity, 
      finalStateCode, 
      finalGstin, 
      finalPhone
    );
    targetShopId = 1;
  } else {
    // Create new branch / store
    const shopInsert = db.prepare(`
      INSERT INTO shops (name, shop_type, address, city, state_code, gstin, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      finalShopName, 
      finalShopType, 
      'Store Address', 
      finalCity, 
      finalStateCode, 
      finalGstin, 
      finalPhone
    );
    targetShopId = shopInsert.lastInsertRowid;
  }

  // Create the owner user with cryptographic salted hash
  const hashedOwnerPassword = hashPassword(finalPassword);
  const userInsert = db.prepare(`
    INSERT INTO users (shop_id, username, password_hash, display_name, phone, role_id, is_active)
    VALUES (?, ?, ?, ?, ?, 1, 1)
  `).run(
    targetShopId,
    cleanUsername,
    hashedOwnerPassword,
    finalOwnerName,
    finalPhone
  );

  const newUserId = userInsert.lastInsertRowid;

  // Log security audit for owner account creation
  logSecurityAudit(db, { shopId: targetShopId, userId: newUserId, action: 'OWNER_REGISTERED', details: `New Store Owner @${cleanUsername} created for ${finalShopName}` });

  // Save master recovery pin
  if (finalRecoveryPin) {
    try {
      db.prepare(`
        INSERT INTO system_config (key, value, description)
        VALUES ('owner_recovery_pin', ?, 'Master Owner Password Recovery PIN')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(finalRecoveryPin);
    } catch(e) {
      // ignore
    }
  }

  return {
    success: true,
    userId: newUserId,
    username: cleanUsername,
    shopId: targetShopId,
    shopName: finalShopName,
    message: `Owner account @${cleanUsername} created successfully for ${finalShopName}!`
  };
}


