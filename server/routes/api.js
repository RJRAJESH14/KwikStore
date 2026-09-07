import express from 'express';
import * as authService from '../services/authService.js';
import * as billingService from '../services/billingService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as hrmsService from '../services/hrmsService.js';
import * as customerService from '../services/customerService.js';
import * as supplierService from '../services/supplierService.js';
import * as quotationService from '../services/quotationService.js';
import * as shopService from '../services/shopService.js';
import * as backupService from '../services/backupService.js';
import * as licenseService from '../services/licenseService.js';
import * as expenseService from '../services/expenseService.js';
import * as shiftService from '../services/shiftService.js';
import * as loyaltyService from '../services/loyaltyService.js';
import * as creditNoteService from '../services/creditNoteService.js';
import * as gstExportService from '../services/gstExportService.js';
import { getDb } from '../database/db.js';

const router = express.Router();

// 0. Hardware Licensing & Developer Control
router.get('/license/status', (req, res) => {
  try {
    const status = licenseService.getSystemLicenseStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ status: 'ACTIVE', message: err.message });
  }
});

router.post('/license/activate', (req, res) => {
  const { licenseKey, customerName } = req.body;
  const result = licenseService.activateLicenseKey(licenseKey, customerName);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/license/start-trial', (req, res) => {
  const { customerName } = req.body;
  const result = licenseService.startEvaluationTrial(customerName);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/license/developer-override', (req, res) => {
  const { pin } = req.body;
  const result = licenseService.verifyDeveloperOverride(pin);
  if (!result.success) return res.status(401).json(result);
  res.json(result);
});

router.post('/license/generate', (req, res) => {
  const { machineId, customerName, planType, devPin } = req.body;
  if (devPin !== '990011') {
    return res.status(401).json({ success: false, message: 'Unauthorized developer access.' });
  }
  try {
    const keyData = licenseService.generateLicenseKey({ machineId, customerName, planType });
    res.json({ success: true, ...keyData });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 1. Auth & Staff Access
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const result = authService.authenticateUser(username, password);
  if (!result.success) return res.status(401).json(result);
  res.json(result);
});

router.post('/auth/owner-recovery/verify', (req, res) => {
  const result = authService.verifyOwnerRecovery(req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/auth/owner-recovery/reset', (req, res) => {
  const result = authService.resetOwnerPassword(req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/auth/register-owner', (req, res) => {
  try {
    const result = authService.registerNewOwner(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('Owner registration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/staff/users', (req, res) => {
  res.json(authService.getAllUsers());
});

router.get('/staff/roles', (req, res) => {
  res.json(authService.getAllRoles());
});

router.post('/staff/roles', (req, res) => {
  try {
    res.json(authService.createOrUpdateRole(req.body));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/staff/roles/:id', (req, res) => {
  try {
    res.json(authService.deleteRole(parseInt(req.params.id, 10)));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/staff/users', (req, res) => {
  try {
    res.json(authService.createOrUpdateUser(req.body));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/staff/users/:id/status', (req, res) => {
  const { isActive } = req.body;
  res.json(authService.toggleUserStatus(req.params.id, isActive));
});

router.patch('/staff/users/:id/password', (req, res) => {
  const { newPassword } = req.body;
  try {
    res.json(authService.resetUserPassword(req.params.id, newPassword));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/staff/users/:id', (req, res) => {
  try {
    res.json(authService.deleteUser(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/hrms/employees/:id/portal-access', (req, res) => {
  try {
    res.json(authService.grantOrRevokeEmployeeAccess({
      employeeId: parseInt(req.params.id, 10),
      ...req.body
    }));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 2. Multi-Shop Branches
router.get('/shops', (req, res) => {
  res.json(shopService.getShops());
});

router.get('/shops/:id', (req, res) => {
  res.json(shopService.getShopById(req.params.id));
});

router.post('/shops', (req, res) => {
  res.json(shopService.createOrUpdateShop(req.body));
});

router.delete('/shops/:id', (req, res) => {
  try {
    res.json(shopService.deleteShop(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/shops/transfers/list', (req, res) => {
  res.json(shopService.getBranchTransfers());
});

router.post('/shops/transfers', (req, res) => {
  res.json(shopService.createBranchTransfer(req.body));
});

// 3. Products & Inventory
router.get('/products', (req, res) => {
  const { shopId, search } = req.query;
  res.json(inventoryService.getProducts(shopId, search));
});

router.get('/products/barcode/:barcode', (req, res) => {
  const { shopId } = req.query;
  const prod = inventoryService.getProductByBarcode(shopId, req.params.barcode);
  if (!prod) return res.status(404).json({ message: 'Product not found' });
  res.json(prod);
});

router.post('/products', (req, res) => {
  res.json(inventoryService.createOrUpdateProduct(req.body));
});

router.delete('/products/:id', (req, res) => {
  try {
    res.json(inventoryService.deleteProduct(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/categories', (req, res) => {
  res.json(inventoryService.getCategories(req.query.shopId));
});

// 4. Invoices & POS Billing
router.get('/invoices/next-number', (req, res) => {
  res.json({ invoiceNumber: billingService.getNextInvoiceNumber(req.query.shopId || 1) });
});

router.post('/invoices', (req, res) => {
  try {
    const invoice = billingService.createInvoice(req.body);
    res.json({ success: true, invoice });
  } catch (err) {
    console.error('Invoice creation error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/invoices', (req, res) => {
  res.json(billingService.getRecentInvoices(req.query));
});

router.get('/invoices/:id', (req, res) => {
  try {
    const invoice = billingService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    console.error('Error fetching invoice by ID:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/hsn-summary', (req, res) => {
  const { shopId, startDate, endDate } = req.query;
  res.json(billingService.getHsnSummary(shopId, startDate, endDate));
});

router.get('/reports/profit-loss', (req, res) => {
  const { shopId, startDate, endDate } = req.query;
  res.json(billingService.getProfitAndLossReport(shopId, startDate, endDate));
});

// 4.1 Quotations & Price Estimates
router.get('/quotations/next-number', (req, res) => {
  res.json({ quotationNumber: quotationService.getNextQuotationNumber(req.query.shopId || 1) });
});

router.get('/quotations', (req, res) => {
  const { shopId, search, status, dateFrom, dateTo } = req.query;
  res.json(quotationService.getQuotations(shopId, search, status, dateFrom, dateTo));
});

router.get('/quotations/:id', (req, res) => {
  const q = quotationService.getQuotationById(req.params.id);
  if (!q) return res.status(404).json({ message: 'Quotation not found' });
  res.json(q);
});

router.post('/quotations', (req, res) => {
  try {
    const result = quotationService.createOrUpdateQuotation(req.body);
    res.json(result);
  } catch (err) {
    console.error('Quotation save error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/quotations/:id/status', (req, res) => {
  try {
    res.json(quotationService.updateQuotationStatus(req.params.id, req.body.status));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/quotations/:id', (req, res) => {
  try {
    res.json(quotationService.deleteQuotation(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/quotations/:id/convert-to-invoice', (req, res) => {
  try {
    const { cashierUserId, paymentMode, paymentDetails } = req.body;
    const result = quotationService.convertQuotationToInvoice(req.params.id, cashierUserId, paymentMode, paymentDetails);
    res.json(result);
  } catch (err) {
    console.error('Quotation convert error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 5. HRMS & Employees & Payroll
router.get('/hrms/employees/next-code', (req, res) => {
  try {
    res.json({ success: true, nextCode: hrmsService.getNextEmployeeCode() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/hrms/employees', (req, res) => {
  res.json(hrmsService.getEmployees(req.query.shopId));
});

router.post('/hrms/employees', (req, res) => {
  try {
    res.json(hrmsService.createOrUpdateEmployee(req.body));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/hrms/employees/:id/documents', (req, res) => {
  try {
    res.json(hrmsService.getEmployeeDocuments(req.params.id));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/hrms/employees/:id/documents', (req, res) => {
  try {
    res.json(hrmsService.saveEmployeeDocument(req.params.id, req.body));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/hrms/documents/:id', (req, res) => {
  try {
    res.json(hrmsService.deleteEmployeeDocument(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/hrms/employees/:id/toggle', (req, res) => {
  try {
    res.json(hrmsService.toggleEmployeeStatus(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/hrms/employees/:id', (req, res) => {
  try {
    res.json(hrmsService.deleteEmployee(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/hrms/attendance', (req, res) => {
  res.json(hrmsService.getAttendanceRegister(req.query.shopId, req.query.date));
});

router.post('/hrms/attendance', (req, res) => {
  res.json(hrmsService.recordAttendance(req.body));
});

router.post('/hrms/attendance/batch', (req, res) => {
  res.json(hrmsService.markBatchAttendance(req.body));
});

router.get('/hrms/leaves', (req, res) => {
  res.json(hrmsService.getLeaves(req.query.shopId));
});

router.post('/hrms/leaves', (req, res) => {
  res.json(hrmsService.applyLeave(req.body));
});

router.patch('/hrms/leaves/:id', (req, res) => {
  const { status, userId, actionNotes } = req.body;
  res.json(hrmsService.updateLeaveStatus(req.params.id, status, userId, actionNotes));
});

router.get('/hrms/advances', (req, res) => {
  res.json(hrmsService.getAdvances(req.query.shopId));
});

router.post('/hrms/advances', (req, res) => {
  res.json(hrmsService.issueAdvance(req.body));
});

router.get('/hrms/payroll/calculate', (req, res) => {
  res.json(hrmsService.calculatePayroll(req.query.shopId, req.query.monthYear));
});

router.post('/hrms/payroll/process', (req, res) => {
  res.json(hrmsService.processPayrollRun(req.body));
});

router.delete('/hrms/payroll/reset', (req, res) => {
  try {
    const { shopId, monthYear, employeeId } = req.query;
    res.json(hrmsService.deletePayrollRun(shopId, monthYear, employeeId));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 6. Customers & Khata (Udhar)
router.get('/customers', (req, res) => {
  res.json(customerService.getCustomers(req.query.shopId, req.query.search));
});

router.get('/customers/:id/ledger', (req, res) => {
  const data = customerService.getCustomerLedger(req.params.id, req.query);
  if (!data) return res.status(404).json({ message: 'Customer not found' });
  res.json(data);
});

router.get('/customers/:id/invoices', (req, res) => {
  res.json(customerService.getCustomerInvoices(req.params.id));
});

router.post('/customers', (req, res) => {
  res.json(customerService.createOrUpdateCustomer(req.body));
});

router.post('/customers/payment', (req, res) => {
  try {
    res.json(customerService.recordCustomerPayment(req.body));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 7. Suppliers & Vendors Management
router.get('/suppliers', (req, res) => {
  res.json(supplierService.getSuppliers(req.query.shopId, req.query.search));
});

router.get('/suppliers/:id', (req, res) => {
  const sup = supplierService.getSupplierById(req.params.id);
  if (!sup) return res.status(404).json({ message: 'Supplier not found' });
  res.json(sup);
});

router.post('/suppliers', (req, res) => {
  try {
    res.json(supplierService.createOrUpdateSupplier(req.body));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/suppliers/:id', (req, res) => {
  try {
    res.json(supplierService.deleteSupplier(req.params.id));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 8. Database Safety & Disaster Recovery Hub
router.get('/database/status', (req, res) => {
  res.json(backupService.getDatabaseStatus());
});

router.post('/database/backup', async (req, res) => {
  try {
    const result = await backupService.triggerManualBackup(req.body.customPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/database/relocate', async (req, res) => {
  try {
    const result = await backupService.migrateDbLocation(req.body.newPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/database/restore', async (req, res) => {
  try {
    const { backupFilePath } = req.body;
    if (!backupFilePath) {
      return res.status(400).json({ success: false, message: 'Please provide backupFilePath' });
    }
    const result = await backupService.restoreDbFromBackup(backupFilePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/database/create-new', async (req, res) => {
  try {
    const { createNewDatabase } = await import('../database/db.js');
    const result = await createNewDatabase(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/database/switch', async (req, res) => {
  try {
    const { switchActiveDatabase } = await import('../database/db.js');
    const { targetDbPath } = req.body;
    const result = await switchActiveDatabase(targetDbPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/database/reset', async (req, res) => {
  try {
    const { resetDatabaseTransactions } = await import('../database/db.js');
    const { wipeProducts } = req.body;
    const result = resetDatabaseTransactions({ wipeProducts: Boolean(wipeProducts) });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Reports & Analytics Summary
router.get('/reports/dashboard-stats', (req, res) => {
  const db = getDb();
  const shopId = req.query.shopId;
  const today = new Date().toISOString().slice(0, 10);

  let whereShop = shopId ? `WHERE shop_id = ${shopId}` : '';
  let andShop = shopId ? `AND shop_id = ${shopId}` : '';

  const todaySales = db.prepare(`SELECT SUM(grand_total) as total, COUNT(*) as count FROM invoices WHERE date(invoice_date) = ? ${andShop}`).get(today);
  const totalStockVal = db.prepare(`SELECT SUM(current_stock * purchase_rate) as total_cost, SUM(current_stock * mrp) as total_mrp FROM products WHERE is_active = 1 ${andShop}`).get();
  const totalCustomerUdhar = db.prepare(`SELECT SUM(current_balance) as total_udhar FROM customers ${whereShop}`).get();
  const lowStockCount = db.prepare(`SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock_alert AND is_active = 1 ${andShop}`).get().count;
  const activeStaff = db.prepare(`SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'PRESENT' ${andShop}`).get(today).count;

  res.json({
    todaySales: todaySales?.total || 0,
    todayBillCount: todaySales?.count || 0,
    stockValuationCost: totalStockVal?.total_cost || 0,
    stockValuationMrp: totalStockVal?.total_mrp || 0,
    totalCustomerUdhar: totalCustomerUdhar?.total_udhar || 0,
    lowStockCount: lowStockCount || 0,
    activeStaffToday: activeStaff || 0
  });
});

// 9. Store Expenses & Petty Cash
router.get('/expenses', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = expenseService.getExpenses(shopId, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/expenses', (req, res) => {
  try {
    const result = expenseService.createExpense(req.body);
    res.json({ success: true, expense: result, message: 'Expense saved successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/expenses/:id', (req, res) => {
  try {
    const result = expenseService.deleteExpense(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 10. Financial Accounting & Profit and Loss
router.get('/reports/profit-loss', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const { period, from, to } = req.query;
    const result = expenseService.getProfitAndLoss(shopId, period || 'this_month', from, to);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. Shifts & Cash Register (X-Report & Z-Report)
router.get('/shifts/active', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const userId = req.query.userId || null;
    const result = shiftService.getActiveShift(shopId, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/shifts/open', (req, res) => {
  try {
    const result = shiftService.openShift(req.body);
    res.json({ success: true, shift: result, message: 'Cash register shift opened successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/shifts/drawer-movement', (req, res) => {
  try {
    const result = shiftService.recordDrawerMovement(req.body);
    res.json({ success: true, shift: result, message: 'Drawer cash movement recorded.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/shifts/:id/close', (req, res) => {
  try {
    const result = shiftService.closeShift(req.params.id, req.body);
    res.json({ success: true, shift: result, message: 'Shift closed and Z-Report generated.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/shifts/history', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = shiftService.getShiftHistory(shopId, req.query.limit || 20);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 12. Customer Loyalty & Rewards
router.get('/loyalty/config', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    res.json(loyaltyService.getLoyaltyConfig(shopId));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/loyalty/customer/:id', (req, res) => {
  try {
    const history = loyaltyService.getCustomerLoyaltyHistory(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/customers/occasions', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const occasions = loyaltyService.getUpcomingSpecialOccasions(shopId);
    res.json(occasions);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. Returns & Credit Notes
router.post('/credit-notes', (req, res) => {
  try {
    const result = creditNoteService.createCreditNote(req.body);
    res.json({ success: true, creditNote: result, message: 'Credit Note / Refund issued successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/credit-notes', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = creditNoteService.getCreditNotes(shopId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/credit-notes/verify/:code', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = creditNoteService.verifyCreditNote(shopId, req.params.code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ valid: false, message: err.message });
  }
});

// 14. Inventory Intelligence: Expiry Analysis & Low Stock Auto Reorder
router.get('/inventory/expiry-analysis', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = inventoryService.getExpiryAnalysis(shopId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/inventory/low-stock-reorder', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = inventoryService.getLowStockAutoReorder(shopId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 15. GST Export & Owner Day-End Business Summary
router.get('/reports/gstr1', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const { period, from, to } = req.query;
    const result = gstExportService.getGstr1Data(shopId, period || 'this_month', from, to);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reports/owner-summary', (req, res) => {
  try {
    const shopId = req.query.shopId || 1;
    const result = gstExportService.getOwnerDailySummary(shopId, req.query.date);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
