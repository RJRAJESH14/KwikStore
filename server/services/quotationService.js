import { getDb } from '../database/db.js';
import { createInvoice } from './billingService.js';

export function getNextQuotationNumber(shopId) {
  const db = getDb();
  const shop = db.prepare(`SELECT invoice_prefix FROM shops WHERE id = ?`).get(shopId) || { invoice_prefix: 'QT' };
  const prefix = shop.invoice_prefix ? `QT-${shop.invoice_prefix}` : 'QT';
  const year = new Date().getFullYear();
  
  const lastQuotation = db.prepare(`
    SELECT quotation_number FROM quotations
    WHERE shop_id = ? AND quotation_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(shopId, `${prefix}-${year}-%`);

  let nextSeq = 1;
  if (lastQuotation && lastQuotation.quotation_number) {
    const parts = lastQuotation.quotation_number.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

export function getQuotations(shopId, search = '', status = 'ALL', dateFrom = '', dateTo = '') {
  const db = getDb();
  
  let query = `
    SELECT q.*, s.name as shop_name, s.city as shop_city, s.state_code as shop_state_code,
           u.display_name as creator_name,
           (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count
    FROM quotations q
    JOIN shops s ON q.shop_id = s.id
    LEFT JOIN users u ON q.created_by_user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (shopId) {
    query += ` AND q.shop_id = ?`;
    params.push(shopId);
  }

  if (status && status !== 'ALL') {
    query += ` AND q.status = ?`;
    params.push(status);
  }

  if (search && search.trim() !== '') {
    query += ` AND (q.quotation_number LIKE ? OR q.customer_name LIKE ? OR q.customer_phone LIKE ? OR q.customer_gstin LIKE ?)`;
    const sTerm = `%${search.trim()}%`;
    params.push(sTerm, sTerm, sTerm, sTerm);
  }

  if (dateFrom) {
    query += ` AND date(q.quotation_date) >= ?`;
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND date(q.quotation_date) <= ?`;
    params.push(dateTo);
  }

  query += ` ORDER BY q.id DESC`;

  const quotations = db.prepare(query).all(...params);

  // Summary Metrics
  const statsQuery = db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft_count,
      SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent_count,
      SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_count,
      SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) as converted_count,
      SUM(grand_total) as total_value,
      SUM(CASE WHEN status = 'CONVERTED' THEN grand_total ELSE 0 END) as converted_value
    FROM quotations
    WHERE (? IS NULL OR shop_id = ?)
  `).get(shopId || null, shopId || null);

  return {
    quotations,
    stats: {
      totalCount: statsQuery ? (statsQuery.total_count || 0) : 0,
      draftCount: statsQuery ? (statsQuery.draft_count || 0) : 0,
      sentCount: statsQuery ? (statsQuery.sent_count || 0) : 0,
      acceptedCount: statsQuery ? (statsQuery.accepted_count || 0) : 0,
      convertedCount: statsQuery ? (statsQuery.converted_count || 0) : 0,
      totalValue: statsQuery ? (statsQuery.total_value || 0) : 0,
      convertedValue: statsQuery ? (statsQuery.converted_value || 0) : 0
    }
  };
}

export function getQuotationById(id) {
  const db = getDb();
  
  const quotation = db.prepare(`
    SELECT q.*, s.name as shop_name, s.legal_name as shop_legal_name, s.gstin as shop_gstin,
           s.phone as shop_phone, s.email as shop_email, s.address as shop_address,
           s.city as shop_city, s.state as shop_state, s.state_code as shop_state_code,
           s.pincode as shop_pincode, s.upi_id as shop_upi_id, s.bank_name as shop_bank_name,
           s.bank_account_no as shop_bank_account_no, s.bank_ifsc as shop_bank_ifsc,
           s.terms_conditions as shop_default_terms,
           u.display_name as creator_name
    FROM quotations q
    JOIN shops s ON q.shop_id = s.id
    LEFT JOIN users u ON q.created_by_user_id = u.id
    WHERE q.id = ?
  `).get(id);

  if (!quotation) return null;

  const items = db.prepare(`
    SELECT qi.*, p.barcode, p.mrp, p.retail_rate, p.wholesale_rate, p.dealer_rate, p.current_stock
    FROM quotation_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    WHERE qi.quotation_id = ?
    ORDER BY qi.id ASC
  `).all(id);

  return {
    ...quotation,
    items
  };
}

export function createOrUpdateQuotation(data) {
  const db = getDb();
  const {
    id,
    shop_id,
    quotation_number,
    quotation_date = new Date().toISOString().slice(0, 19).replace('T', ' '),
    valid_until_date,
    recipient_type = 'EXISTING_CUSTOMER', // NEW_CUSTOMER, EXISTING_CUSTOMER, SHOP_BRANCH
    customer_id = null,
    target_shop_id = null,
    customer_name = 'Customer',
    customer_phone = '',
    customer_email = '',
    customer_gstin = '',
    customer_state_code = '07',
    billing_address = '',
    items = [],
    discount_amount = 0,
    discount_percent = 0,
    status = 'DRAFT',
    terms_conditions = '',
    notes = '',
    created_by_user_id = null
  } = data;

  const shop = db.prepare(`SELECT * FROM shops WHERE id = ?`).get(shop_id);
  if (!shop) throw new Error('Shop branch not found.');

  const qNumber = quotation_number || getNextQuotationNumber(shop_id);
  const isInterState = (customer_state_code && shop.state_code && customer_state_code !== shop.state_code);

  // Calculate totals
  let subTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTaxable = 0;

  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 1;
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
      sgst = Math.round((taxAmount - cgst) * 100) / 100;
      totalCgst += cgst;
      totalSgst += sgst;
    }

    totalTaxable += taxableValue;

    return {
      product_id: item.product_id || null,
      item_name: item.item_name || 'Item',
      hsn_code: item.hsn_code || '1905',
      unit: item.unit || 'PCS',
      unit_type: item.unit_type || 'PRIMARY',
      quantity: qty,
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

  // Additional overall discount
  let overallDiscount = parseFloat(discount_amount) || 0;
  if (discount_percent > 0) {
    overallDiscount = Math.round((subTotal * (discount_percent / 100)) * 100) / 100;
  }

  const finalAmountBeforeRound = subTotal - overallDiscount;
  const grandTotal = Math.round(finalAmountBeforeRound);
  const roundOff = Math.round((grandTotal - finalAmountBeforeRound) * 100) / 100;

  // Default validity date to 15 days if not set
  let validUntil = valid_until_date;
  if (!validUntil) {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    validUntil = d.toISOString().slice(0, 10);
  }

  let quotationId = id;

  if (id) {
    // Update existing
    db.prepare(`
      UPDATE quotations
      SET shop_id = ?, quotation_number = ?, quotation_date = ?, valid_until_date = ?,
          recipient_type = ?, customer_id = ?, target_shop_id = ?,
          customer_name = ?, customer_phone = ?, customer_email = ?, customer_gstin = ?,
          customer_state_code = ?, billing_address = ?,
          sub_total = ?, discount_amount = ?, discount_percent = ?,
          taxable_amount = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?,
          round_off = ?, grand_total = ?, status = ?, terms_conditions = ?, notes = ?
      WHERE id = ?
    `).run(
      shop_id, qNumber, quotation_date, validUntil,
      recipient_type, customer_id, target_shop_id,
      customer_name, customer_phone, customer_email, customer_gstin,
      customer_state_code, billing_address,
      subTotal, overallDiscount, discount_percent,
      totalTaxable, totalCgst, totalSgst, totalIgst,
      roundOff, grandTotal, status, terms_conditions, notes,
      id
    );

    // Delete old items and re-insert
    db.prepare(`DELETE FROM quotation_items WHERE quotation_id = ?`).run(id);
  } else {
    // Insert new quotation
    const stmt = db.prepare(`
      INSERT INTO quotations (
        shop_id, quotation_number, quotation_date, valid_until_date,
        recipient_type, customer_id, target_shop_id,
        customer_name, customer_phone, customer_email, customer_gstin,
        customer_state_code, billing_address,
        sub_total, discount_amount, discount_percent,
        taxable_amount, cgst_amount, sgst_amount, igst_amount,
        round_off, grand_total, status, terms_conditions, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      shop_id, qNumber, quotation_date, validUntil,
      recipient_type, customer_id, target_shop_id,
      customer_name, customer_phone, customer_email, customer_gstin,
      customer_state_code, billing_address,
      subTotal, overallDiscount, discount_percent,
      totalTaxable, totalCgst, totalSgst, totalIgst,
      roundOff, grandTotal, status, terms_conditions, notes, created_by_user_id
    );

    quotationId = info.lastInsertRowid;
  }

  // Insert items
  const insertItemStmt = db.prepare(`
    INSERT INTO quotation_items (
      quotation_id, product_id, item_name, hsn_code, unit, unit_type,
      quantity, unit_price, discount_amount, tax_rate, taxable_value,
      cgst_amount, sgst_amount, igst_amount, total_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of processedItems) {
    insertItemStmt.run(
      quotationId,
      item.product_id,
      item.item_name,
      item.hsn_code,
      item.unit,
      item.unit_type,
      item.quantity,
      item.unit_price,
      item.discount_amount,
      item.tax_rate,
      item.taxable_value,
      item.cgst_amount,
      item.sgst_amount,
      item.igst_amount,
      item.total_amount
    );
  }

  return {
    success: true,
    id: quotationId,
    quotation_number: qNumber,
    grand_total: grandTotal,
    message: id ? `Quotation ${qNumber} updated successfully.` : `Quotation ${qNumber} created successfully.`
  };
}

export function updateQuotationStatus(id, status) {
  const db = getDb();
  db.prepare(`UPDATE quotations SET status = ? WHERE id = ?`).run(status, id);
  return { success: true, message: `Quotation status updated to ${status}.` };
}

export function deleteQuotation(id) {
  const db = getDb();
  const q = db.prepare(`SELECT * FROM quotations WHERE id = ?`).get(id);
  if (!q) throw new Error('Quotation not found.');
  
  db.prepare(`DELETE FROM quotation_items WHERE quotation_id = ?`).run(id);
  db.prepare(`DELETE FROM quotations WHERE id = ?`).run(id);
  
  return { success: true, message: `Quotation ${q.quotation_number} deleted successfully.` };
}

export function convertQuotationToInvoice(quotationId, cashierUserId, paymentMode = 'CASH', paymentDetails = {}) {
  const db = getDb();
  const quotation = getQuotationById(quotationId);
  
  if (!quotation) {
    throw new Error('Quotation not found.');
  }

  if (quotation.status === 'CONVERTED' && quotation.converted_invoice_id) {
    throw new Error(`Quotation has already been converted to Invoice #${quotation.converted_invoice_id}`);
  }

  // Convert to Invoice via billingService
  const invoiceData = {
    shop_id: quotation.shop_id,
    invoice_type: quotation.customer_gstin ? 'TAX_INVOICE_B2B' : 'RETAIL_B2C',
    customer_id: quotation.customer_id,
    customer_name: quotation.customer_name,
    customer_phone: quotation.customer_phone,
    customer_gstin: quotation.customer_gstin,
    customer_state_code: quotation.customer_state_code || '07',
    billing_address: quotation.billing_address,
    items: quotation.items.map(i => ({
      product_id: i.product_id,
      item_name: i.item_name,
      hsn_code: i.hsn_code,
      unit: i.unit,
      unit_type: i.unit_type,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount_amount: i.discount_amount,
      tax_rate: i.tax_rate
    })),
    discount_amount: quotation.discount_amount,
    discount_percent: quotation.discount_percent,
    payment_mode: paymentMode,
    amount_paid: quotation.grand_total,
    payment_details: paymentDetails,
    cashier_user_id: cashierUserId || quotation.created_by_user_id,
    notes: `Generated from Quotation #${quotation.quotation_number}. ${quotation.notes || ''}`
  };

  const invoiceResult = createInvoice(invoiceData);

  if (invoiceResult && invoiceResult.id) {
    const invoiceId = invoiceResult.id;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Update quotation status to CONVERTED
    db.prepare(`
      UPDATE quotations
      SET status = 'CONVERTED', converted_invoice_id = ?, converted_at = ?
      WHERE id = ?
    `).run(invoiceId, now, quotationId);

    return {
      success: true,
      quotation_id: quotationId,
      invoice_id: invoiceId,
      invoice_number: invoiceResult.invoice_number,
      grand_total: invoiceResult.grand_total,
      message: `Quotation #${quotation.quotation_number} converted to Invoice #${invoiceResult.invoice_number} successfully!`
    };
  }

  throw new Error('Failed to generate sales invoice from quotation.');
}
