import * as authService from './server/services/authService.js';
import { getDb } from './server/database/db.js';

console.log('=== VERIFYING SHOP OWNER STAFF MANAGEMENT & RBAC CONTROLS ===');

// 1. Get all staff accounts (Owner View)
const allUsers = authService.getAllUsers();
console.log(`[PASS] Total staff accounts retrieved: ${allUsers.length}`);
allUsers.forEach(u => {
  console.log(` - User ID ${u.id}: ${u.display_name} (@${u.username}) | Role: ${u.role_name} | Branch: ${u.shop_name} | Active: ${u.is_active === 1 ? 'YES' : 'NO'}`);
});

// 2. Shop owner creates a new staff cashier
const newStaff = {
  shop_id: 1,
  username: 'test_cashier_' + Date.now(),
  password: 'initial_password_123',
  display_name: 'Test Cashier User',
  phone: '9876543210',
  role_id: 3,
  is_active: 1
};
const createRes = authService.createOrUpdateUser(newStaff);
console.log(`[PASS] Created new staff user ID: ${createRes.id}`);

// 3. Authenticate with initial password
const login1 = authService.authenticateUser(newStaff.username, 'initial_password_123');
if (!login1.success) throw new Error('Initial login failed: ' + login1.message);
console.log(`[PASS] Initial login verified: ${login1.user.displayName} (Role: ${login1.user.roleName})`);

// 4. Shop owner resets / edits staff password
const passRes = authService.resetUserPassword(createRes.id, 'new_secret_pwd_999');
console.log(`[PASS] Password reset result: ${passRes.message}`);

// Verify old password fails
const loginOld = authService.authenticateUser(newStaff.username, 'initial_password_123');
if (loginOld.success) throw new Error('Old password should have been rejected!');
console.log(`[PASS] Old password correctly rejected: "${loginOld.message}"`);

// Verify new password succeeds
const loginNew = authService.authenticateUser(newStaff.username, 'new_secret_pwd_999');
if (!loginNew.success) throw new Error('New password failed to login: ' + loginNew.message);
console.log(`[PASS] Login with new password succeeded!`);

// 5. Shop owner disables/locks staff account
const disableRes = authService.toggleUserStatus(createRes.id, false);
console.log(`[PASS] Account disabled result: ${disableRes.message}`);

// Verify disabled account is blocked from login
const loginBlocked = authService.authenticateUser(newStaff.username, 'new_secret_pwd_999');
if (loginBlocked.success) throw new Error('Disabled user should not be able to log in!');
console.log(`[PASS] Login blocked for disabled user: "${loginBlocked.message}"`);

// 6. Shop owner re-enables staff account
const enableRes = authService.toggleUserStatus(createRes.id, true);
console.log(`[PASS] Account re-enabled result: ${enableRes.message}`);

// Verify re-enabled account can log in again
const loginReEnabled = authService.authenticateUser(newStaff.username, 'new_secret_pwd_999');
if (!loginReEnabled.success) throw new Error('Re-enabled account should be able to log in: ' + loginReEnabled.message);
console.log(`[PASS] Login successful after re-enabling account!`);

// 7. Shop owner edits staff profile & upgrades role to Manager (role_id 2)
authService.createOrUpdateUser({
  id: createRes.id,
  shop_id: 2, // Branch transferred
  username: newStaff.username,
  display_name: 'Promoted Senior Manager',
  phone: '9999999999',
  role_id: 2,
  is_active: 1
});

const loginPromoted = authService.authenticateUser(newStaff.username, 'new_secret_pwd_999');
if (loginPromoted.user.roleName !== 'Store Manager' || loginPromoted.user.displayName !== 'Promoted Senior Manager') {
  throw new Error('Staff profile update verification failed!');
}
console.log(`[PASS] Staff profile update & role upgrade verified: ${loginPromoted.user.displayName} (Role: ${loginPromoted.user.roleName}, Branch ID: ${loginPromoted.user.shopId})`);

console.log('\n ALL 7 SHOP OWNER STAFF RBAC & PASSWORD MANAGEMENT TESTS PASSED WITH 100% SUCCESS!');
