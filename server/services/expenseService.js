import { getDb } from '../database/db.js';

export function getExpenses(shopId, filters = {}) {
  const db = getDb();
  const { category, dateFrom, dateTo, search, payment_mode } = filters;

  let query = `
    SELECT e.*, u.display_name as created_by_name, s.name as shop_name
    FROM store_expenses e
    JOIN shops s ON e.shop_id = s.id
    LEFT JOIN users u ON e.created_by_user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (shopId) {
    query += ` AND e.shop_id = ?`;
    params.push(shopId);
  }

  if (category && category !== 'ALL') {
    query += ` AND e.category = ?`;
    params.push(category);
  }

  if (payment_mode && payment_mode !== 'ALL') {
    query += ` AND e.payment_mode = ?`;
    params.push(payment_mode);
  }

  if (dateFrom) {
    query += ` AND date(e.expense_date) >= date(?)`;
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND date(e.expense_date) <= date(?)`;
    params.push(dateTo);
  }

  if (search && search.trim()) {
    query += ` AND (e.expense_title LIKE ? OR e.paid_to LIKE ? OR e.notes LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY e.expense_date DESC, e.id DESC`;
  const expenses = db.prepare(query).all(...params);

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Category breakdown
  const categorySummary = {};
  for (const exp of expenses) {
    const cat = exp.category || 'MISCELLANEOUS';
    categorySummary[cat] = (categorySummary[cat] || 0) + (exp.amount || 0);
  }

  return {
    expenses,
    totalAmount,
    categorySummary,
    count: expenses.length
  };
}

export function createExpense(expenseData) {
  const db = getDb();
  const {
    shop_id,
    category = 'MISCELLANEOUS',
    expense_title,
    amount,
    payment_mode = 'CASH',
    expense_date = new Date().toISOString().split('T')[0],
    paid_to = '',
    receipt_image = null,
    notes = '',
    created_by_user_id = null
  } = expenseData;

  const numAmount = parseFloat(amount) || 0;
  if (!expense_title || !expense_title.trim()) {
    throw new Error('Expense title is required');
  }
  if (numAmount <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  const result = db.prepare(`
    INSERT INTO store_expenses (
      shop_id, category, expense_title, amount, payment_mode, expense_date, paid_to, receipt_image, notes, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    shop_id, category, expense_title.trim(), numAmount, payment_mode, expense_date, paid_to.trim(), receipt_image, notes.trim(), created_by_user_id
  );

  return db.prepare(`SELECT * FROM store_expenses WHERE id = ?`).get(result.lastInsertRowid);
}

export function deleteExpense(expenseId) {
  const db = getDb();
  const exp = db.prepare(`SELECT * FROM store_expenses WHERE id = ?`).get(expenseId);
  if (!exp) throw new Error('Expense record not found');
  db.prepare(`DELETE FROM store_expenses WHERE id = ?`).run(expenseId);
  return { success: true, message: 'Expense deleted successfully' };
}

export function getProfitAndLoss(shopId, period = 'this_month', customFrom = null, customTo = null) {
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

  // 1. Sales & Revenue
  const salesQuery = `
    SELECT 
      COUNT(*) as invoice_count,
      COALESCE(SUM(grand_total), 0) as total_revenue,
      COALESCE(SUM(sub_total), 0) as sub_total,
      COALESCE(SUM(discount_amount), 0) as total_discount,
      COALESCE(SUM(taxable_amount), 0) as taxable_revenue,
      COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) as total_tax_collected,
      COALESCE(SUM(amount_paid), 0) as total_cash_collected,
      COALESCE(SUM(balance_due), 0) as credit_issued
    FROM invoices
    WHERE shop_id = ? ${dateFilter}
  `;
  const salesStats = db.prepare(salesQuery).get(...params);

  // 2. Cost of Goods Sold (COGS)
  let cogsDateFilter = '';
  const cogsParams = [shopId];
  if (period === 'today') {
    cogsDateFilter = ` AND date(i.invoice_date) = date(?)`;
    cogsParams.push(today);
  } else if (period === 'this_month') {
    cogsDateFilter = ` AND date(i.invoice_date) >= date(?)`;
    cogsParams.push(firstDayThisMonth);
  } else if (period === 'custom' && customFrom && customTo) {
    cogsDateFilter = ` AND date(i.invoice_date) >= date(?) AND date(i.invoice_date) <= date(?)`;
    cogsParams.push(customFrom, customTo);
  }

  const cogsQuery = `
    SELECT 
      COALESCE(SUM((ii.quantity + ii.free_quantity) * COALESCE(p.purchase_rate, 0)), 0) as total_cogs
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.shop_id = ? ${cogsDateFilter}
  `;
  const cogsResult = db.prepare(cogsQuery).get(...cogsParams);
  const totalCogs = cogsResult ? cogsResult.total_cogs : 0;

  // 3. Store Expenses
  let expDateFilter = '';
  const expParams = [shopId];
  if (period === 'today') {
    expDateFilter = ` AND date(expense_date) = date(?)`;
    expParams.push(today);
  } else if (period === 'this_month') {
    expDateFilter = ` AND date(expense_date) >= date(?)`;
    expParams.push(firstDayThisMonth);
  } else if (period === 'custom' && customFrom && customTo) {
    expDateFilter = ` AND date(expense_date) >= date(?) AND date(expense_date) <= date(?)`;
    expParams.push(customFrom, customTo);
  }

  const expQuery = `
    SELECT 
      category,
      COALESCE(SUM(amount), 0) as cat_amount
    FROM store_expenses
    WHERE shop_id = ? ${expDateFilter}
    GROUP BY category
  `;
  const expenseRows = db.prepare(expQuery).all(...expParams);
  const totalExpenses = expenseRows.reduce((sum, r) => sum + r.cat_amount, 0);

  // 4. Payroll Paid
  let payrollQuery = `
    SELECT COALESCE(SUM(net_payable), 0) as total_payroll
    FROM payroll_runs
    WHERE shop_id = ?
  `;
  const payrollParams = [shopId];
  if (period === 'this_month' || period === 'today') {
    payrollQuery += ` AND month_year = ?`;
    payrollParams.push(today.slice(0, 7));
  }
  const payrollResult = db.prepare(payrollQuery).get(...payrollParams);
  const totalPayroll = payrollResult ? payrollResult.total_payroll : 0;

  // Calculations
  const grossProfit = salesStats.total_revenue - totalCogs;
  const grossMarginPercent = salesStats.total_revenue > 0 
    ? Math.round((grossProfit / salesStats.total_revenue) * 10000) / 100 
    : 0;
  
  const totalOperatingCosts = totalExpenses + totalPayroll;
  const netProfit = grossProfit - totalOperatingCosts;
  const netProfitMarginPercent = salesStats.total_revenue > 0
    ? Math.round((netProfit / salesStats.total_revenue) * 10000) / 100
    : 0;

  return {
    period,
    revenue: {
      totalSales: salesStats.total_revenue,
      invoiceCount: salesStats.invoice_count,
      subTotal: salesStats.sub_total,
      discounts: salesStats.total_discount,
      taxCollected: salesStats.total_tax_collected,
      cashReceived: salesStats.total_cash_collected,
      creditIssued: salesStats.credit_issued
    },
    cogs: totalCogs,
    grossProfit,
    grossMarginPercent,
    operatingExpenses: {
      total: totalOperatingCosts,
      storeExpenses: totalExpenses,
      payroll: totalPayroll,
      categoryBreakdown: expenseRows
    },
    netProfit,
    netProfitMarginPercent
  };
}
