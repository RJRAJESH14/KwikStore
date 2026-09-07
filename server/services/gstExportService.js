import { getDb } from '../database/db.js';

export function getGstr1Data(shopId, period = 'this_month', customFrom = null, customTo = null) {
  const db = getDb();
  let dateFilter = '';
  const params = [shopId];

  const today = new Date().toISOString().split('T')[0];
  const firstDayThisMonth = today.slice(0, 7) + '-01';

  if (period === 'today') {
    dateFilter = ` AND date(invoice_date) = date(?)`;
    params.push(today);
  } else if (period === 'this_month') {
    dateFilter = ` AND date(invoice_date) >= date(?)`;
    params.push(firstDayThisMonth);
  } else if (period === 'custom' && customFrom && customTo) {
    dateFilter = ` AND date(invoice_date) >= date(?) AND date(invoice_date) <= date(?)`;
    params.push(customFrom, customTo);
  }

  // 1. B2B Invoices (Registered Customers with GSTIN)
  const b2bInvoices = db.prepare(`
    SELECT 
      i.invoice_number,
      date(i.invoice_date) as invoice_date,
      i.grand_total,
      i.taxable_amount,
      i.cgst_amount,
      i.sgst_amount,
      i.igst_amount,
      i.customer_name,
      i.customer_gstin,
      i.customer_state_code,
      'Regular' as invoice_type
    FROM invoices i
    WHERE i.shop_id = ? AND i.customer_gstin IS NOT NULL AND trim(i.customer_gstin) != '' ${dateFilter}
    ORDER BY i.id ASC
  `).all(...params);

  // 2. B2C Invoices (Unregistered Customers)
  const b2cInvoices = db.prepare(`
    SELECT 
      i.invoice_number,
      date(i.invoice_date) as invoice_date,
      i.grand_total,
      i.taxable_amount,
      i.cgst_amount,
      i.sgst_amount,
      i.igst_amount,
      i.customer_name,
      i.customer_state_code
    FROM invoices i
    WHERE i.shop_id = ? AND (i.customer_gstin IS NULL OR trim(i.customer_gstin) = '') ${dateFilter}
    ORDER BY i.id ASC
  `).all(...params);

  // 3. HSN Summary
  let hsnDateFilter = '';
  const hsnParams = [shopId];
  if (period === 'today') {
    hsnDateFilter = ` AND date(i.invoice_date) = date(?)`;
    hsnParams.push(today);
  } else if (period === 'this_month') {
    hsnDateFilter = ` AND date(i.invoice_date) >= date(?)`;
    hsnParams.push(firstDayThisMonth);
  } else if (period === 'custom' && customFrom && customTo) {
    hsnDateFilter = ` AND date(i.invoice_date) >= date(?) AND date(i.invoice_date) <= date(?)`;
    hsnParams.push(customFrom, customTo);
  }

  const hsnSummary = db.prepare(`
    SELECT 
      COALESCE(ii.hsn_code, '1905') as hsn_code,
      ii.item_name as description,
      ii.unit as uqc,
      SUM(ii.quantity + ii.free_quantity) as total_quantity,
      SUM(ii.total_amount) as total_value,
      SUM(ii.taxable_value) as taxable_value,
      ii.tax_rate as rate,
      SUM(ii.igst_amount) as igst_amount,
      SUM(ii.cgst_amount) as cgst_amount,
      SUM(ii.sgst_amount) as sgst_amount
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.shop_id = ? ${hsnDateFilter}
    GROUP BY ii.hsn_code, ii.tax_rate
    ORDER BY total_value DESC
  `).all(...hsnParams);

  // Totals
  const totalB2bValue = b2bInvoices.reduce((s, r) => s + (r.grand_total || 0), 0);
  const totalB2cValue = b2cInvoices.reduce((s, r) => s + (r.grand_total || 0), 0);
  const totalTaxable = [...b2bInvoices, ...b2cInvoices].reduce((s, r) => s + (r.taxable_amount || 0), 0);
  const totalCgst = [...b2bInvoices, ...b2cInvoices].reduce((s, r) => s + (r.cgst_amount || 0), 0);
  const totalSgst = [...b2bInvoices, ...b2cInvoices].reduce((s, r) => s + (r.sgst_amount || 0), 0);
  const totalIgst = [...b2bInvoices, ...b2cInvoices].reduce((s, r) => s + (r.igst_amount || 0), 0);

  return {
    period,
    summary: {
      b2bCount: b2bInvoices.length,
      b2bTotal: totalB2bValue,
      b2cCount: b2cInvoices.length,
      b2cTotal: totalB2cValue,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax: totalCgst + totalSgst + totalIgst,
      grandTotalSales: totalB2bValue + totalB2cValue
    },
    b2bInvoices,
    b2cInvoices,
    hsnSummary
  };
}

export function getOwnerDailySummary(shopId, date = new Date().toISOString().split('T')[0]) {
  const db = getDb();
  const shop = db.prepare(`SELECT * FROM shops WHERE id = ?`).get(shopId) || {};

  // 1. Invoices & Sales
  const sales = db.prepare(`
    SELECT 
      COUNT(*) as invoice_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) as cash_collected,
      COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) as upi_collected,
      COALESCE(SUM(CASE WHEN payment_mode = 'CARD' THEN amount_paid ELSE 0 END), 0) as card_collected,
      COALESCE(SUM(balance_due), 0) as credit_issued
    FROM invoices
    WHERE shop_id = ? AND date(invoice_date) = date(?)
  `).get(shopId, date);

  // 2. Expenses today
  const expenses = db.prepare(`
    SELECT 
      COUNT(*) as expense_count,
      COALESCE(SUM(amount), 0) as total_expenses
    FROM store_expenses
    WHERE shop_id = ? AND date(expense_date) = date(?)
  `).get(shopId, date);

  // 3. Top 5 selling items today
  const topItems = db.prepare(`
    SELECT 
      ii.item_name,
      SUM(ii.quantity) as qty_sold,
      SUM(ii.total_amount) as revenue
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.shop_id = ? AND date(i.invoice_date) = date(?)
    GROUP BY ii.item_name
    ORDER BY qty_sold DESC
    LIMIT 5
  `).all(shopId, date);

  // 4. Low stock count
  const lowStock = db.prepare(`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE shop_id = ? AND current_stock <= min_stock_alert AND is_active = 1
  `).get(shopId);

  // 5. Staff attendance today
  const staffAttendance = db.prepare(`
    SELECT 
      COUNT(DISTINCT employee_id) as present_count
    FROM attendance
    WHERE shop_id = ? AND date = date(?) AND status = 'PRESENT'
  `).get(shopId, date);

  const totalEmployees = db.prepare(`SELECT COUNT(*) as count FROM employees WHERE shop_id = ? AND status = 'ACTIVE'`).get(shopId);

  return {
    shop,
    date,
    sales: sales || {},
    expenses: expenses || {},
    netCashFlow: (sales?.cash_collected || 0) - (expenses?.total_expenses || 0),
    topItems: topItems || [],
    lowStockCount: lowStock?.count || 0,
    staff: {
      present: staffAttendance?.present_count || 0,
      total: totalEmployees?.count || 0
    }
  };
}
