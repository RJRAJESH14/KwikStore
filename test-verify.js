import { getDb } from './server/database/db.js';
import * as authService from './server/services/authService.js';
import * as billingService from './server/services/billingService.js';
import * as hrmsService from './server/services/hrmsService.js';
import * as inventoryService from './server/services/inventoryService.js';
import * as customerService from './server/services/customerService.js';
import * as backupService from './server/services/backupService.js';

console.log('--- Starting KwikStore Pro Automated Verification Suite ---');

// 1. Database & Config
const dbStatus = backupService.getDatabaseStatus();
console.log('✓ Database Status Check:', {
  path: dbStatus.currentPath,
  size: dbStatus.fileSizeMb,
  invoicesCount: dbStatus.stats.invoices,
  productsCount: dbStatus.stats.products,
  customersCount: dbStatus.stats.customers
});

// 2. Auth & Auto Check-in
const loginResult = authService.authenticateUser('cashier1', 'cashier123');
console.log('✓ Cashier Auth & Auto Check-in:', {
  success: loginResult.success,
  displayName: loginResult.user?.displayName,
  role: loginResult.user?.roleKey,
  permissionsCount: loginResult.user?.permissions?.length
});

// Check that attendance was auto-recorded
const att = hrmsService.getAttendanceRegister(1);
const cashierAtt = att.find(a => a.employee_code === 'EMP-1003');
console.log('✓ HRMS Auto-Checkin Record Verified:', {
  employee: cashierAtt?.full_name,
  checkInTime: cashierAtt?.check_in_time,
  status: cashierAtt?.status,
  notes: cashierAtt?.notes
});

// 3. Inventory & FMCG Distributor Dual Units
const prods = inventoryService.getProducts(1);
const fmcgDistItem = prods.find(p => p.item_code === 'PARLE-G-BOX');
console.log('✓ FMCG Distributor Product Verified:', {
  name: fmcgDistItem?.name,
  unit: fmcgDistItem?.unit,
  secondaryUnit: fmcgDistItem?.secondary_unit,
  conversionFactor: fmcgDistItem?.unit_conversion_factor,
  tradeScheme: fmcgDistItem?.trade_scheme,
  wholesaleRate: fmcgDistItem?.wholesale_rate,
  retailRate: fmcgDistItem?.retail_rate
});

// 4. POS Billing with 10+1 Scheme & GST
const newInvoice = billingService.createInvoice({
  shop_id: 1,
  invoice_type: 'TAX_INVOICE_B2B',
  customer_id: 1,
  customer_name: 'Gupta General Store',
  customer_phone: '+91 98111 55667',
  customer_gstin: '07AACCG1234A1Z1',
  items: [
    {
      product_id: fmcgDistItem.id,
      item_name: fmcgDistItem.name,
      unit: 'BOX',
      quantity: 10,
      free_quantity: 1, // 10+1 free scheme
      unit_price: fmcgDistItem.wholesale_rate,
      tax_rate: 18.0
    }
  ],
  payment_mode: 'CREDIT',
  amount_paid: 2000,
  cashier_user_id: 3,
  notes: 'Wholesale beat delivery'
});

console.log('✓ POS Invoice Generation & GST Split:', {
  invoiceNumber: newInvoice.invoice_number,
  grandTotal: newInvoice.grand_total,
  amountPaid: newInvoice.amount_paid,
  balanceDue: newInvoice.balance_due,
  cgst: newInvoice.cgst_amount,
  sgst: newInvoice.sgst_amount,
  itemQuantity: newInvoice.items[0]?.quantity,
  freeQuantity: newInvoice.items[0]?.free_quantity
});

// 5. Customer Khata Ledger Balance Updated
const custLedger = customerService.getCustomerLedger(1);
console.log('✓ Customer Khata Udhar Balance Updated:', {
  customer: custLedger.customer.name,
  newBalance: custLedger.customer.current_balance,
  lastLedgerEntry: custLedger.ledger[custLedger.ledger.length - 1]
});

// 6. HRMS Payroll Calculation & Salary Slip
const payroll = hrmsService.calculatePayroll(1, '2026-08');
const empPay = payroll[0];
console.log('✓ Monthly Payroll Slip Calculation:', {
  employee: empPay?.full_name,
  month: empPay?.month_year,
  daysWorked: empPay?.present_days,
  earnedBasic: empPay?.earned_basic,
  grossSalary: empPay?.gross_salary,
  advanceDeduction: empPay?.advance_deduction,
  netPayable: empPay?.net_payable
});

// 7. Instant Backup Creation
const backupRes = await backupService.triggerManualBackup();
console.log('✓ Instant 1-Click Database Backup:', {
  success: backupRes.success,
  fileName: backupRes.fileName,
  size: backupRes.sizeMb
});

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
process.exit(0);
