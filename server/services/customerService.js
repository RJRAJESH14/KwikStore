import { getDb } from '../database/db.js';

export function getCustomers(shopId, searchTerm = '') {
  const db = getDb();
  let query = `
    SELECT c.*, s.name as shop_name
    FROM customers c
    JOIN shops s ON c.shop_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (shopId) {
    query += ` AND c.shop_id = ?`;
    params.push(shopId);
  }

  if (searchTerm) {
    query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.gstin LIKE ? OR c.route_beat LIKE ?)`;
    const term = `%${searchTerm}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY c.current_balance DESC, c.name ASC`;
  return db.prepare(query).all(...params);
}

export function getCustomerInvoices(customerId) {
  const db = getDb();
  const customer = db.prepare(`SELECT id, phone FROM customers WHERE id = ?`).get(customerId);
  if (!customer) return [];
  
  const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
  const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

  const query = `
    SELECT i.id, i.invoice_number, i.invoice_date, i.invoice_type, i.payment_status, i.payment_mode,
           i.sub_total, i.taxable_amount, (i.cgst_amount + i.sgst_amount + i.igst_amount) as tax_amount,
           i.discount_amount, i.grand_total, i.amount_paid, i.balance_due,
           i.shop_id, s.name as shop_name, u.display_name as cashier_name,
           (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i
    LEFT JOIN shops s ON i.shop_id = s.id
    LEFT JOIN users u ON i.cashier_user_id = u.id
    WHERE i.customer_id = ? 
       OR (i.customer_phone IS NOT NULL AND i.customer_phone != '' AND (i.customer_phone = ? OR (length(?) > 0 AND i.customer_phone LIKE ?)))
    ORDER BY i.id DESC
  `;
  return db.prepare(query).all(customerId, customer.phone || '', last10, '%' + last10);
}

export function getCustomerLedger(customerId, filters = {}) {
  const db = getDb();
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId);
  if (!customer) return null;

  const { dateFrom, dateTo, transactionType, search } = filters;

  let query = `
    SELECT * FROM customer_ledger
    WHERE customer_id = ?
  `;
  const params = [customerId];

  if (dateFrom) {
    query += ` AND date(date) >= date(?)`;
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND date(date) <= date(?)`;
    params.push(dateTo);
  }

  if (transactionType && transactionType !== 'ALL') {
    query += ` AND transaction_type = ?`;
    params.push(transactionType);
  }

  if (search && search.trim()) {
    query += ` AND (reference_no LIKE ? OR notes LIKE ? OR payment_mode LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY id ASC`;
  const ledger = db.prepare(query).all(...params);

  // Enrich ledger rows with invoice_id and invoice details if matching reference_no
  const findInvoiceStmt = db.prepare(`SELECT id, grand_total, payment_status, payment_mode FROM invoices WHERE invoice_number = ? LIMIT 1`);
  const enrichedLedger = ledger.map(row => {
    let invoiceInfo = null;
    if (row.reference_no) {
      invoiceInfo = findInvoiceStmt.get(row.reference_no);
    }
    return {
      ...row,
      invoice_id: invoiceInfo ? invoiceInfo.id : null,
      invoice_grand_total: invoiceInfo ? invoiceInfo.grand_total : null,
      invoice_payment_status: invoiceInfo ? invoiceInfo.payment_status : null
    };
  });

  // Calculate opening balance before dateFrom if dateFrom is specified
  let priorBalance = 0;
  if (dateFrom) {
    const priorRow = db.prepare(`
      SELECT balance_after FROM customer_ledger
      WHERE customer_id = ? AND date(date) < date(?)
      ORDER BY id DESC LIMIT 1
    `).get(customerId, dateFrom);

    if (priorRow) {
      priorBalance = priorRow.balance_after || 0;
    } else {
      // Check if opening balance row is before or at start
      const firstRow = db.prepare(`
        SELECT balance_after FROM customer_ledger
        WHERE customer_id = ?
        ORDER BY id ASC LIMIT 1
      `).get(customerId);
      priorBalance = firstRow ? 0 : (customer.opening_balance || 0);
    }
  } else {
    priorBalance = 0;
  }

  const totalDebit = ledger.reduce((sum, r) => sum + (r.debit_amount || 0), 0);
  const totalCredit = ledger.reduce((sum, r) => sum + (r.credit_amount || 0), 0);
  const closingBalance = ledger.length > 0 
    ? (ledger[ledger.length - 1].balance_after) 
    : priorBalance;

  const customerInvoices = getCustomerInvoices(customerId);

  return {
    customer,
    ledger: enrichedLedger,
    invoices: customerInvoices,
    summary: {
      openingBalance: priorBalance,
      totalDebit,
      totalCredit,
      netChange: totalDebit - totalCredit,
      closingBalance,
      count: ledger.length,
      totalInvoicesCount: customerInvoices.length,
      totalInvoicedAmount: customerInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0)
    }
  };
}

export function recordCustomerPayment(data) {
  const db = getDb();
  const { customer_id, shop_id, amount, payment_mode = 'CASH', reference_no, notes } = data;
  const payAmount = parseFloat(amount) || 0;

  if (payAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const cust = db.prepare(`SELECT current_balance, name FROM customers WHERE id = ?`).get(customer_id);
  if (!cust) throw new Error('Customer not found');

  const newBalance = cust.current_balance - payAmount;
  const refNo = reference_no || `REC-${Date.now().toString().slice(-6)}`;

  const tx = db.transaction(() => {
    db.prepare(`UPDATE customers SET current_balance = ? WHERE id = ?`).run(newBalance, customer_id);

    db.prepare(`
      INSERT INTO customer_ledger (
        customer_id, shop_id, transaction_type, reference_no, debit_amount, credit_amount,
        balance_after, payment_mode, notes
      ) VALUES (?, ?, 'PAYMENT_RECEIVED', ?, 0, ?, ?, ?, ?)
    `).run(customer_id, shop_id, refNo, payAmount, newBalance, payment_mode, notes || 'Customer Udhar Payment Received');
  });

  tx();

  return {
    success: true,
    reference_no: refNo,
    previous_balance: cust.current_balance,
    paid_amount: payAmount,
    new_balance: newBalance,
    message: `Payment of ₹${payAmount.toLocaleString('en-IN')} received successfully.`
  };
}

export function createOrUpdateCustomer(custData) {
  const db = getDb();
  if (custData.id) {
    db.prepare(`
      UPDATE customers
      SET shop_id = ?, name = ?, phone = ?, email = ?, address = ?, gstin = ?,
          state_code = ?, credit_limit = ?, route_beat = ?, customer_type = ?
      WHERE id = ?
    `).run(
      custData.shop_id, custData.name, custData.phone, custData.email || null,
      custData.address || null, custData.gstin || null, custData.state_code || '07',
      custData.credit_limit || 25000, custData.route_beat || null, custData.customer_type || 'RETAIL',
      custData.id
    );
    return { success: true, message: 'Customer updated successfully.' };
  } else {
    const info = db.prepare(`
      INSERT INTO customers (shop_id, name, phone, email, address, gstin, state_code, credit_limit, current_balance, route_beat, customer_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      custData.shop_id, custData.name, custData.phone, custData.email || null,
      custData.address || null, custData.gstin || null, custData.state_code || '07',
      custData.credit_limit || 25000, custData.opening_balance || 0,
      custData.route_beat || null, custData.customer_type || 'RETAIL'
    );

    const custId = info.lastInsertRowid;
    if (custData.opening_balance && custData.opening_balance > 0) {
      db.prepare(`
        INSERT INTO customer_ledger (customer_id, shop_id, transaction_type, reference_no, debit_amount, credit_amount, balance_after, notes)
        VALUES (?, ?, 'OPENING_BALANCE', 'OB-INITIAL', ?, 0, ?, 'Opening Balance on Creation')
      `).run(custId, custData.shop_id, custData.opening_balance, custData.opening_balance);
    }

    return { success: true, id: custId, message: 'Customer added successfully.' };
  }
}
