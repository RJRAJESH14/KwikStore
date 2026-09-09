import { getDb } from '../database/db.js';

export function getNextCreditNoteNumber(shopId) {
  const db = getDb();
  const year = new Date().getFullYear();
  const pattern = `CN-${year}-%`;

  const rows = db.prepare(`
    SELECT credit_note_no FROM credit_notes
    WHERE shop_id = ? AND credit_note_no LIKE ?
  `).all(shopId, pattern);

  let maxSeq = 0;
  for (const row of rows) {
    if (row.credit_note_no) {
      const match = row.credit_note_no.match(/-(\d+)$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `CN-${year}-${String(nextSeq).padStart(4, '0')}`;
  const checkExists = db.prepare(`SELECT id FROM credit_notes WHERE shop_id = ? AND credit_note_no = ? LIMIT 1`);
  while (checkExists.get(shopId, candidate)) {
    nextSeq++;
    candidate = `CN-${year}-${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
}

export function createCreditNote(data) {
  const db = getDb();
  const {
    shop_id,
    original_invoice_id,
    original_invoice_number,
    customer_id,
    customer_name = 'Walk-in Customer',
    customer_phone = '',
    refund_mode = 'CREDIT_NOTE', // CREDIT_NOTE or CASH_REFUND
    items = [], // [{ product_id, item_name, quantity, unit_price, return_amount, restock: true }]
    reason = '',
    created_by_user_id
  } = data;

  const totalRefund = items.reduce((sum, it) => sum + (parseFloat(it.return_amount) || (it.quantity * it.unit_price)), 0);
  if (totalRefund <= 0) {
    throw new Error('Total return amount must be greater than zero');
  }

  const creditNoteNo = getNextCreditNoteNumber(shop_id);

  const execute = db.transaction(() => {
    // 1. Restock products if marked
    for (const item of items) {
      if (item.product_id && item.restock !== false) {
        db.prepare(`
          UPDATE products 
          SET current_stock = current_stock + ? 
          WHERE id = ?
        `).run(item.quantity, item.product_id);
      }
    }

    // 2. Insert Credit Note
    const res = db.prepare(`
      INSERT INTO credit_notes (
        shop_id, credit_note_no, original_invoice_id, original_invoice_number,
        customer_id, customer_name, customer_phone, total_refund_amount,
        balance_amount, status, items_json, reason, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shop_id, creditNoteNo, original_invoice_id || null, original_invoice_number || '',
      customer_id || null, customer_name, customer_phone, totalRefund,
      refund_mode === 'CASH_REFUND' ? 0 : totalRefund,
      refund_mode === 'CASH_REFUND' ? 'REDEEMED' : 'ACTIVE',
      JSON.stringify(items), reason, created_by_user_id || null
    );

    // 3. Customer Khata update if customer exists and opted for credit note
    if (customer_id && refund_mode === 'CREDIT_NOTE') {
      const cust = db.prepare(`SELECT current_balance FROM customers WHERE id = ?`).get(customer_id);
      if (cust) {
        const newBal = cust.current_balance - totalRefund;
        db.prepare(`UPDATE customers SET current_balance = ? WHERE id = ?`).run(newBal, customer_id);

        db.prepare(`
          INSERT INTO customer_ledger (customer_id, shop_id, transaction_type, reference_no, debit_amount, credit_amount, balance_after, payment_mode, notes)
          VALUES (?, ?, 'RETURN_REFUND', ?, 0, ?, ?, 'CREDIT_NOTE', ?)
        `).run(customer_id, shop_id, creditNoteNo, totalRefund, newBal, `Return against #${original_invoice_number}`);
      }
    }

    return res.lastInsertRowid;
  });

  const noteId = execute();
  return db.prepare(`SELECT * FROM credit_notes WHERE id = ?`).get(noteId);
}

export function verifyCreditNote(shopId, creditNoteCode) {
  const db = getDb();
  const note = db.prepare(`
    SELECT * FROM credit_notes 
    WHERE shop_id = ? AND credit_note_no = ? AND status = 'ACTIVE' AND balance_amount > 0
  `).get(shopId, creditNoteCode.trim());

  if (!note) {
    return { valid: false, message: 'Invalid or already redeemed credit note.' };
  }

  return { valid: true, creditNote: note };
}

export function redeemCreditNote(shopId, creditNoteCode, amountToUse) {
  const db = getDb();
  const note = db.prepare(`
    SELECT * FROM credit_notes 
    WHERE shop_id = ? AND credit_note_no = ? AND status = 'ACTIVE'
  `).get(shopId, creditNoteCode.trim());

  if (!note) throw new Error('Credit note not valid or active');

  const available = note.balance_amount || 0;
  const used = Math.min(available, amountToUse);
  const remaining = available - used;
  const newStatus = remaining <= 0 ? 'REDEEMED' : 'ACTIVE';

  db.prepare(`
    UPDATE credit_notes 
    SET balance_amount = ?, status = ?
    WHERE id = ?
  `).run(remaining, newStatus, note.id);

  return { usedAmount: used, remainingBalance: remaining };
}

export function getCreditNotes(shopId) {
  const db = getDb();
  return db.prepare(`
    SELECT cn.*, u.display_name as created_by_name
    FROM credit_notes cn
    LEFT JOIN users u ON cn.created_by_user_id = u.id
    WHERE cn.shop_id = ?
    ORDER BY cn.id DESC
  `).all(shopId);
}
