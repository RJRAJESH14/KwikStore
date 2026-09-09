import { getDb } from '../database/db.js';
import * as loyaltyService from './loyaltyService.js';
import * as creditNoteService from './creditNoteService.js';

export function getNextInvoiceNumber(shopId) {
  const db = getDb();
  const shop = db.prepare(`SELECT invoice_prefix FROM shops WHERE id = ?`).get(shopId) || { invoice_prefix: 'INV' };
  const prefix = shop.invoice_prefix || 'INV';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  // Fetch all existing invoice numbers for this shop and year prefix to find the true max sequence
  const rows = db.prepare(`
    SELECT invoice_number FROM invoices
    WHERE shop_id = ? AND invoice_number LIKE ?
  `).all(shopId, pattern);

  let maxSeq = 0;
  for (const row of rows) {
    if (row.invoice_number) {
      const match = row.invoice_number.match(/-(\d+)(?:-R\d+)?$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      } else {
        const parts = row.invoice_number.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum) && lastNum > maxSeq) {
          maxSeq = lastNum;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;

  // Collision-guard: ensure generated candidate number does not exist
  const checkExists = db.prepare(`SELECT id FROM invoices WHERE shop_id = ? AND invoice_number = ? LIMIT 1`);
  while (checkExists.get(shopId, candidate)) {
    nextSeq++;
    candidate = `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  return candidate;
}

export function createInvoice(invoiceData) {
  const db = getDb();
  const {
    shop_id,
    invoice_type = 'RETAIL_B2C',
    customer_id,
    customer_name = 'Walk-in Customer',
    customer_phone = '',
    customer_gstin = '',
    customer_state_code = '07',
    billing_address = '',
    items = [],
    discount_amount = 0,
    discount_percent = 0,
    payment_mode = 'CASH', // CASH, UPI, CARD, CREDIT, SPLIT
    amount_paid = 0,
    payment_details = {},
    cashier_user_id,
    sales_employee_id,
    loyalty_points_redeemed = 0,
    credit_note_code = '',
    credit_note_discount = 0,
    shift_id,
    notes = ''
  } = invoiceData;

  const shop = db.prepare(`SELECT * FROM shops WHERE id = ?`).get(shop_id);
  if (!shop) {
    throw new Error('Shop branch not found');
  }

  const invoiceNumber = getNextInvoiceNumber(shop_id);
  const isInterState = (customer_state_code && shop.state_code && customer_state_code !== shop.state_code);

  // Compute item totals
  let subTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTaxable = 0;

  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 1;
    const freeQty = parseFloat(item.free_quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const itemDiscount = parseFloat(item.discount_amount) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;

    const rawTotal = (qty * unitPrice) - itemDiscount;
    subTotal += rawTotal;

    const taxableValue = Math.round((rawTotal / (1 + (taxRate / 100))) * 100) / 100;
    const taxAmount = Math.round((rawTotal - taxableValue) * 100) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = taxAmount;
      totalIgst += igst;
    } else {
      cgst = Math.round((taxAmount / 2) * 100) / 100;
      sgst = taxAmount - cgst;
      totalCgst += cgst;
      totalSgst += sgst;
    }

    totalTaxable += taxableValue;

    return {
      ...item,
      quantity: qty,
      free_quantity: freeQty,
      unit_price: unitPrice,
      discount_amount: itemDiscount,
      tax_rate: taxRate,
      taxable_value: taxableValue,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: rawTotal
    };
  });

  // Additional discounts (Loyalty + Credit Note)
  let loyaltyDiscountAmt = 0;
  if (customer_id && loyalty_points_redeemed > 0) {
    const loyaltyConf = loyaltyService.getLoyaltyConfig(shop_id);
    loyaltyDiscountAmt = loyalty_points_redeemed * loyaltyConf.redeemValueRs;
  }

  const numCreditNoteDiscount = parseFloat(credit_note_discount) || 0;
  const totalBillDiscount = (parseFloat(discount_amount) || 0) + loyaltyDiscountAmt + numCreditNoteDiscount;

  const totalBeforeRound = subTotal - totalBillDiscount;
  const grandTotal = Math.max(0, Math.round(totalBeforeRound));
  const roundOff = Math.round((grandTotal - totalBeforeRound) * 100) / 100;
  
  const paid = parseFloat(amount_paid) || 0;
  const balanceDue = Math.max(0, grandTotal - paid);
  const paymentStatus = balanceDue === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');

  // Begin Transaction
  const executeTransaction = db.transaction(() => {
    // 1. Insert Invoice
    const insertInv = db.prepare(`
      INSERT INTO invoices (
        shop_id, invoice_number, invoice_type, customer_id, customer_name, customer_phone, customer_gstin,
        customer_state_code, billing_address, sub_total, discount_amount, discount_percent, taxable_amount,
        cgst_amount, sgst_amount, igst_amount, round_off, grand_total, amount_paid, balance_due, payment_status,
        payment_mode, payment_details_json, cashier_user_id, sales_employee_id, loyalty_points_redeemed,
        loyalty_discount_amount, credit_note_code, credit_note_discount, shift_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invResult = insertInv.run(
      shop_id, invoiceNumber, invoice_type, customer_id || null, customer_name, customer_phone, customer_gstin,
      customer_state_code, billing_address, subTotal, totalBillDiscount, discount_percent, totalTaxable,
      totalCgst, totalSgst, totalIgst, roundOff, grandTotal, paid, balanceDue, paymentStatus,
      payment_mode, JSON.stringify(payment_details), cashier_user_id || null, sales_employee_id || null,
      loyalty_points_redeemed, loyaltyDiscountAmt, credit_note_code || null, numCreditNoteDiscount,
      shift_id || null, notes
    );

    const invoiceId = invResult.lastInsertRowid;

    // 2. Insert Line Items & Auto-Deduct Inventory
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, item_name, hsn_code, batch_no, expiry_date, serial_imei, variant_details,
        unit, unit_type, quantity, free_quantity, unit_price, discount_amount, tax_rate, taxable_value,
        cgst_amount, sgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateProductStock = db.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`);
    const updateBatchStock = db.prepare(`UPDATE product_batches SET stock_qty = stock_qty - ? WHERE product_id = ? AND batch_no = ?`);
    const updateSerialSold = db.prepare(`UPDATE product_serials SET status = 'SOLD', invoice_id = ?, sold_date = date('now', 'localtime') WHERE serial_imei_no = ?`);

    for (const item of processedItems) {
      insertItem.run(
        invoiceId, item.product_id || null, item.name || item.item_name, item.hsn_code || '1905',
        item.batch_no || null, item.expiry_date || null, item.serial_imei || null, item.variant_details || null,
        item.unit || 'PCS', item.unit_type || 'PRIMARY', item.quantity, item.free_quantity || 0,
        item.unit_price, item.discount_amount || 0, item.tax_rate || 0, item.taxable_value,
        item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount
      );

      const totalQtyToDeduct = item.quantity + (item.free_quantity || 0);

      if (item.product_id) {
        updateProductStock.run(totalQtyToDeduct, item.product_id);

        if (item.batch_no) {
          updateBatchStock.run(totalQtyToDeduct, item.product_id, item.batch_no);
        }
      }

      if (item.serial_imei) {
        updateSerialSold.run(invoiceId, item.serial_imei);
      }
    }

    // 3. Customer Ledger (Khata) entry if Credit or Partial Due
    if (customer_id && (payment_mode === 'CREDIT' || balanceDue > 0)) {
      const cust = db.prepare(`SELECT current_balance FROM customers WHERE id = ?`).get(customer_id);
      const newBal = (cust ? cust.current_balance : 0) + balanceDue;

      db.prepare(`UPDATE customers SET current_balance = ? WHERE id = ?`).run(newBal, customer_id);

      db.prepare(`
        INSERT INTO customer_ledger (customer_id, shop_id, transaction_type, reference_no, debit_amount, credit_amount, balance_after, payment_mode, notes)
        VALUES (?, ?, 'INVOICE', ?, ?, 0, ?, ?, ?)
      `).run(customer_id, shop_id, invoiceNumber, grandTotal, newBal, payment_mode, `Bill #${invoiceNumber}`);

      if (paid > 0) {
        db.prepare(`
          INSERT INTO customer_ledger (customer_id, shop_id, transaction_type, reference_no, debit_amount, credit_amount, balance_after, payment_mode, notes)
          VALUES (?, ?, 'PAYMENT_RECEIVED', ?, 0, ?, ?, ?, ?)
        `).run(customer_id, shop_id, `PAY-${invoiceNumber}`, paid, newBal, payment_mode, `Partial payment against #${invoiceNumber}`);
      }
    }

    // 4. Redeem Loyalty Points if applied
    if (customer_id && loyalty_points_redeemed > 0) {
      loyaltyService.redeemLoyaltyPoints(shop_id, customer_id, invoiceId, loyalty_points_redeemed);
    }

    // 5. Award Loyalty Points on paid/grand total
    if (customer_id && grandTotal > 0) {
      const { pointsEarned } = loyaltyService.awardLoyaltyPoints(shop_id, customer_id, invoiceId, grandTotal);
      if (pointsEarned > 0) {
        db.prepare(`UPDATE invoices SET loyalty_points_earned = ? WHERE id = ?`).run(pointsEarned, invoiceId);
      }
    }

    // 6. Redeem Credit Note if applied
    if (credit_note_code && numCreditNoteDiscount > 0) {
      try {
        creditNoteService.redeemCreditNote(shop_id, credit_note_code, numCreditNoteDiscount);
      } catch (cnErr) {
        console.warn('Credit note redeem warning:', cnErr.message);
      }
    }

    // 7. Update Shift Sales Totals
    if (shift_id) {
      const shiftUpdate = db.prepare(`
        UPDATE shifts
        SET total_sales = total_sales + ?,
            cash_sales = cash_sales + ?,
            upi_sales = upi_sales + ?,
            card_sales = card_sales + ?,
            credit_sales = credit_sales + ?
        WHERE id = ?
      `);

      let cashAdd = 0;
      let upiAdd = 0;
      let cardAdd = 0;
      const creditAdd = balanceDue;

      if (payment_mode === 'CASH') cashAdd = paid;
      else if (payment_mode === 'UPI') upiAdd = paid;
      else if (payment_mode === 'CARD') cardAdd = paid;
      else if (payment_mode === 'SPLIT' && payment_details) {
        cashAdd = parseFloat(payment_details.cash) || 0;
        upiAdd = parseFloat(payment_details.upi) || 0;
        cardAdd = parseFloat(payment_details.card) || 0;
      }

      shiftUpdate.run(grandTotal, cashAdd, upiAdd, cardAdd, creditAdd, shift_id);
    }

    return {
      id: invoiceId,
      invoice_number: invoiceNumber,
      grand_total: grandTotal,
      balance_due: balanceDue,
      payment_status: paymentStatus
    };
  });

  const result = executeTransaction();
  return getInvoiceById(result.id);
}

export function getInvoiceById(invoiceIdOrNumber) {
  const db = getDb();
  const invoice = db.prepare(`
    SELECT i.*, s.name as shop_name, s.legal_name as shop_legal_name, s.gstin as shop_gstin,
           s.drug_license_no as shop_drug_license_no,
           s.phone as shop_phone, s.email as shop_email, s.address as shop_address,
           s.city as shop_city, s.state as shop_state, s.state_code as shop_state_code, s.pincode as shop_pincode,
           s.upi_id as shop_upi_id, s.upi_name as shop_upi_name,
           s.bank_name as shop_bank_name, s.bank_account_no as shop_bank_account_no, s.bank_ifsc as shop_bank_ifsc,
           s.thermal_footer_note, s.terms_conditions,
           s.qr_type as shop_qr_type, s.custom_qr_image as shop_custom_qr_image,
           u.display_name as cashier_name
    FROM invoices i
    LEFT JOIN shops s ON i.shop_id = s.id
    LEFT JOIN users u ON i.cashier_user_id = u.id
    WHERE i.id = ? OR i.invoice_number = ?
  `).get(invoiceIdOrNumber, String(invoiceIdOrNumber));

  if (!invoice) return null;

  const items = db.prepare(`
    SELECT ii.*, p.barcode as product_barcode
    FROM invoice_items ii
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE ii.invoice_id = ?
  `).all(invoice.id);

  let paymentDetails = {};
  try {
    paymentDetails = JSON.parse(invoice.payment_details_json || '{}');
  } catch (e) {
    paymentDetails = {};
  }

  return {
    ...invoice,
    items: items || [],
    payment_details: paymentDetails
  };
}

export function getRecentInvoices(options = {}) {
  const db = getDb();
  let shopId = typeof options === 'object' ? options.shopId : options;
  let limit = typeof options === 'object' ? (parseInt(options.limit, 10) || 500) : (arguments[1] || 50);
  
  let query = `
    SELECT i.*, s.name as shop_name, u.display_name as cashier_name,
           (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as items_count
    FROM invoices i
    JOIN shops s ON i.shop_id = s.id
    LEFT JOIN users u ON i.cashier_user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (shopId) {
    query += ` AND i.shop_id = ?`;
    params.push(shopId);
  }

  if (typeof options === 'object') {
    if (options.customerId) {
      query += ` AND i.customer_id = ?`;
      params.push(options.customerId);
    }
    if (options.startDate) {
      query += ` AND date(i.invoice_date) >= date(?)`;
      params.push(options.startDate);
    }
    if (options.endDate) {
      query += ` AND date(i.invoice_date) <= date(?)`;
      params.push(options.endDate);
    }
    if (options.paymentMode && options.paymentMode !== 'ALL') {
      query += ` AND i.payment_mode = ?`;
      params.push(options.paymentMode);
    }
    if (options.paymentStatus && options.paymentStatus !== 'ALL') {
      query += ` AND i.payment_status = ?`;
      params.push(options.paymentStatus);
    }
    if (options.invoiceType && options.invoiceType !== 'ALL') {
      query += ` AND i.invoice_type = ?`;
      params.push(options.invoiceType);
    }
    if (options.cashierUserId && options.cashierUserId !== 'ALL') {
      query += ` AND i.cashier_user_id = ?`;
      params.push(options.cashierUserId);
    }
    if (options.search && options.search.trim()) {
      query += ` AND (i.invoice_number LIKE ? OR i.customer_name LIKE ? OR i.customer_phone LIKE ? OR i.customer_gstin LIKE ?)`;
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term, term);
    }
    if (options.minAmount) {
      query += ` AND i.grand_total >= ?`;
      params.push(parseFloat(options.minAmount));
    }
    if (options.maxAmount) {
      query += ` AND i.grand_total <= ?`;
      params.push(parseFloat(options.maxAmount));
    }
  }

  query += ` ORDER BY i.id DESC LIMIT ?`;
  params.push(limit);

  return db.prepare(query).all(...params);
}

// Update existing invoice details (Customer info, Payment mode/status, Remarks)
export function updateInvoice(invoiceId, updateData, user = null) {
  const db = getDb();
  const currentInvoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!currentInvoice) {
    throw new Error('Invoice not found');
  }

  const {
    customer_name,
    customer_phone,
    customer_gstin,
    customer_state_code,
    billing_address,
    invoice_type,
    invoice_date,
    payment_mode,
    payment_status,
    amount_paid,
    balance_due,
    notes
  } = updateData;

  const newPaid = amount_paid !== undefined ? parseFloat(amount_paid) : currentInvoice.amount_paid;
  const newBalance = balance_due !== undefined ? parseFloat(balance_due) : (currentInvoice.grand_total - newPaid);
  const newStatus = payment_status || (newBalance <= 0.01 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID'));

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE invoices
      SET customer_name = COALESCE(?, customer_name),
          customer_phone = COALESCE(?, customer_phone),
          customer_gstin = COALESCE(?, customer_gstin),
          customer_state_code = COALESCE(?, customer_state_code),
          billing_address = COALESCE(?, billing_address),
          invoice_type = COALESCE(?, invoice_type),
          invoice_date = COALESCE(?, invoice_date),
          payment_mode = COALESCE(?, payment_mode),
          payment_status = ?,
          amount_paid = ?,
          balance_due = ?,
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      customer_name !== undefined ? customer_name : null,
      customer_phone !== undefined ? customer_phone : null,
      customer_gstin !== undefined ? customer_gstin : null,
      customer_state_code !== undefined ? customer_state_code : null,
      billing_address !== undefined ? billing_address : null,
      invoice_type !== undefined ? invoice_type : null,
      invoice_date !== undefined ? invoice_date : null,
      payment_mode !== undefined ? payment_mode : null,
      newStatus,
      newPaid,
      newBalance,
      notes !== undefined ? notes : null,
      invoiceId
    );

    // If customer balance changed for a registered customer
    if (currentInvoice.customer_id && (newBalance !== currentInvoice.balance_due)) {
      const diff = newBalance - currentInvoice.balance_due;
      db.prepare(`UPDATE customers SET current_balance = current_balance + ? WHERE id = ?`).run(diff, currentInvoice.customer_id);
    }
  });

  tx();

  return getInvoiceById(invoiceId);
}

// Grouped Customer-Wise Invoice Overview
export function getCustomerWiseInvoices(shopId, options = {}) {
  const db = getDb();
  let query = `
    SELECT 
      COALESCE(i.customer_id, 0) as customer_id,
      COALESCE(NULLIF(i.customer_name, ''), 'Walk-in Customer') as customer_name,
      COALESCE(NULLIF(i.customer_phone, ''), 'N/A') as customer_phone,
      i.customer_gstin,
      COUNT(i.id) as total_invoices,
      SUM(i.grand_total) as total_sales,
      SUM(i.amount_paid) as total_paid,
      SUM(i.balance_due) as total_balance_due,
      MAX(i.invoice_date) as last_invoice_date,
      (
        SELECT sub.invoice_number 
        FROM invoices sub 
        WHERE (sub.customer_id = i.customer_id AND i.customer_id > 0)
           OR (sub.customer_phone = i.customer_phone AND i.customer_phone != 'N/A')
           OR (sub.customer_name = i.customer_name)
        ORDER BY sub.id DESC LIMIT 1
      ) as last_invoice_number
    FROM invoices i
    WHERE i.shop_id = ?
  `;
  const params = [shopId || 1];

  if (options.startDate) {
    query += ` AND date(i.invoice_date) >= date(?)`;
    params.push(options.startDate);
  }
  if (options.endDate) {
    query += ` AND date(i.invoice_date) <= date(?)`;
    params.push(options.endDate);
  }
  if (options.search && options.search.trim()) {
    query += ` AND (i.customer_name LIKE ? OR i.customer_phone LIKE ? OR i.customer_gstin LIKE ?)`;
    const term = `%${options.search.trim()}%`;
    params.push(term, term, term);
  }

  query += ` GROUP BY CASE WHEN i.customer_id > 0 THEN i.customer_id ELSE COALESCE(NULLIF(i.customer_phone, ''), i.customer_name) END`;
  query += ` ORDER BY total_sales DESC`;

  return db.prepare(query).all(...params);
}

// HSN / SAC Summary for GST Filing
export function getHsnSummary(shopId, startDate, endDate) {
  const db = getDb();
  let query = `
    SELECT 
      COALESCE(ii.hsn_code, '1905') as hsn_code,
      ii.unit,
      ii.tax_rate,
      SUM(ii.quantity) as total_qty,
      SUM(ii.total_amount) as total_value,
      SUM(ii.taxable_value) as taxable_value,
      SUM(ii.cgst_amount) as total_cgst,
      SUM(ii.sgst_amount) as total_sgst,
      SUM(ii.igst_amount) as total_igst
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.shop_id = ?
  `;
  const params = [shopId];

  if (startDate) {
    query += ` AND date(i.invoice_date) >= date(?)`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND date(i.invoice_date) <= date(?)`;
    params.push(endDate);
  }

  query += ` GROUP BY COALESCE(ii.hsn_code, '1905'), ii.tax_rate, ii.unit ORDER BY total_value DESC`;
  return db.prepare(query).all(...params);
}

// Profit & Loss Analytics
export function getProfitAndLossReport(shopId, startDate, endDate) {
  const db = getDb();
  let query = `
    SELECT 
      ii.product_id,
      ii.item_name,
      ii.unit,
      SUM(ii.quantity) as sold_qty,
      SUM(ii.taxable_value) as total_sales_revenue,
      SUM(ii.quantity * COALESCE(p.purchase_rate, 0)) as total_cogs,
      SUM(ii.taxable_value - (ii.quantity * COALESCE(p.purchase_rate, 0))) as gross_profit,
      COALESCE(p.purchase_rate, 0) as unit_purchase_cost,
      AVG(ii.unit_price) as avg_selling_price
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.shop_id = ?
  `;
  const params = [shopId];

  if (startDate) {
    query += ` AND date(i.invoice_date) >= date(?)`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND date(i.invoice_date) <= date(?)`;
    params.push(endDate);
  }

  query += ` GROUP BY ii.product_id, ii.item_name ORDER BY gross_profit DESC`;
  const itemProfits = db.prepare(query).all(...params);

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalGrossProfit = 0;

  for (const item of itemProfits) {
    totalRevenue += (item.total_sales_revenue || 0);
    totalCogs += (item.total_cogs || 0);
    totalGrossProfit += (item.gross_profit || 0);
  }

  const marginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  return {
    summary: {
      totalRevenue,
      totalCogs,
      totalGrossProfit,
      marginPercent
    },
    items: itemProfits
  };
}

import { moveToRecycleBin } from './recycleBinService.js';

export function deleteInvoice(invoiceId, user = null) {
  const db = getDb();
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoiceId);

  // Archive full invoice + items to Recycle Bin
  try {
    moveToRecycleBin({
      shopId: invoice.shop_id || 1,
      itemType: 'INVOICE',
      originalId: invoice.id,
      title: `Invoice #${invoice.invoice_number} - ₹${(invoice.grand_total || 0).toLocaleString('en-IN')}`,
      subtitle: `Customer: ${invoice.customer_name || 'Walk-in'} (${invoice.customer_phone || 'No phone'}) • ${items.length} items • ${invoice.payment_mode}`,
      data: {
        invoice,
        items
      },
      userId: user?.id || null,
      userName: user?.displayName || user?.username || 'Store Admin'
    });
  } catch (archiveErr) {
    console.warn('Failed to archive invoice to recycle bin:', archiveErr.message);
  }

  const tx = db.transaction(() => {
    // Delete invoice items
    db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`).run(invoiceId);
    // Delete invoice
    db.prepare(`DELETE FROM invoices WHERE id = ?`).run(invoiceId);
  });

  tx();

  return {
    success: true,
    message: `Invoice #${invoice.invoice_number} moved to Recycle Bin (retained for 30 days).`
  };
}
