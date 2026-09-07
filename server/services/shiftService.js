import { getDb } from '../database/db.js';

export function getActiveShift(shopId, userId) {
  const db = getDb();
  let shift = null;
  if (userId) {
    shift = db.prepare(`
      SELECT s.*, u.display_name as cashier_name
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE s.shop_id = ? AND s.user_id = ? AND s.status = 'OPEN'
      ORDER BY s.id DESC LIMIT 1
    `).get(shopId, userId);
  } else {
    shift = db.prepare(`
      SELECT s.*, u.display_name as cashier_name
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE s.shop_id = ? AND s.status = 'OPEN'
      ORDER BY s.id DESC LIMIT 1
    `).get(shopId);
  }

  if (!shift) return null;

  // Calculate live shift totals
  const liveStats = db.prepare(`
    SELECT 
      COUNT(*) as invoice_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) as direct_cash,
      COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) as direct_upi,
      COALESCE(SUM(CASE WHEN payment_mode = 'CARD' THEN amount_paid ELSE 0 END), 0) as direct_card,
      COALESCE(SUM(balance_due), 0) as credit_sales
    FROM invoices
    WHERE shift_id = ?
  `).get(shift.id);

  // Cash In / Cash Out drawer movements
  const drawerIn = shift.drawer_cash_in || 0;
  const drawerOut = shift.drawer_cash_out || 0;
  const openingCash = shift.opening_cash || 0;
  const totalCashInDrawer = openingCash + (liveStats ? liveStats.direct_cash : 0) + drawerIn - drawerOut;

  return {
    ...shift,
    liveStats: {
      invoiceCount: liveStats.invoice_count,
      totalSales: liveStats.total_sales,
      cashSales: liveStats.direct_cash,
      upiSales: liveStats.direct_upi,
      cardSales: liveStats.direct_card,
      creditSales: liveStats.credit_sales
    },
    drawerIn,
    drawerOut,
    calculatedExpectedCash: totalCashInDrawer,
    history: shift.cash_drawer_history_json ? JSON.parse(shift.cash_drawer_history_json) : []
  };
}

export function openShift(shiftData) {
  const db = getDb();
  const { shop_id, user_id, opening_cash = 0, notes = '' } = shiftData;

  // Check if active shift exists for this user
  const existing = db.prepare(`
    SELECT id FROM shifts WHERE shop_id = ? AND user_id = ? AND status = 'OPEN'
  `).get(shop_id, user_id);

  if (existing) {
    throw new Error('An active register shift is already open for this user.');
  }

  const numFloat = parseFloat(opening_cash) || 0;
  const initialHistory = [{
    type: 'OPENING_FLOAT',
    amount: numFloat,
    time: new Date().toISOString(),
    notes: 'Shift opened with initial float'
  }];

  const result = db.prepare(`
    INSERT INTO shifts (
      shop_id, user_id, opening_cash, status, notes, cash_drawer_history_json
    ) VALUES (?, ?, ?, 'OPEN', ?, ?)
  `).run(shop_id, user_id, numFloat, notes, JSON.stringify(initialHistory));

  return getActiveShift(shop_id, user_id);
}

export function recordDrawerMovement(data) {
  const db = getDb();
  const { shift_id, type, amount, reason = '' } = data; // type: CASH_IN, CASH_OUT
  const numAmount = parseFloat(amount) || 0;

  if (numAmount <= 0) {
    throw new Error('Drawer cash amount must be greater than zero');
  }

  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ? AND status = 'OPEN'`).get(shift_id);
  if (!shift) throw new Error('Active shift not found');

  const history = shift.cash_drawer_history_json ? JSON.parse(shift.cash_drawer_history_json) : [];
  history.push({
    type,
    amount: numAmount,
    time: new Date().toISOString(),
    reason
  });

  if (type === 'CASH_IN') {
    db.prepare(`
      UPDATE shifts 
      SET drawer_cash_in = drawer_cash_in + ?, cash_drawer_history_json = ?
      WHERE id = ?
    `).run(numAmount, JSON.stringify(history), shift_id);
  } else {
    db.prepare(`
      UPDATE shifts 
      SET drawer_cash_out = drawer_cash_out + ?, cash_drawer_history_json = ?
      WHERE id = ?
    `).run(numAmount, JSON.stringify(history), shift_id);
  }

  return getActiveShift(shift.shop_id, shift.user_id);
}

export function closeShift(shiftId, closeData) {
  const db = getDb();
  const { closing_cash = 0, notes = '' } = closeData;
  const countedCash = parseFloat(closing_cash) || 0;

  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shiftId);
  if (!shift) throw new Error('Shift not found');
  if (shift.status === 'CLOSED') throw new Error('Shift is already closed');

  // Compute final shift totals from invoices
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as invoice_count,
      COALESCE(SUM(grand_total), 0) as total_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) as cash_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) as upi_sales,
      COALESCE(SUM(CASE WHEN payment_mode = 'CARD' THEN amount_paid ELSE 0 END), 0) as card_sales,
      COALESCE(SUM(balance_due), 0) as credit_sales
    FROM invoices
    WHERE shift_id = ?
  `).get(shiftId);

  const drawerIn = shift.drawer_cash_in || 0;
  const drawerOut = shift.drawer_cash_out || 0;
  const expectedCash = (shift.opening_cash || 0) + (totals.cash_sales || 0) + drawerIn - drawerOut;
  const cashDifference = countedCash - expectedCash;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE shifts
    SET status = 'CLOSED',
        closed_at = ?,
        closing_cash = ?,
        expected_cash = ?,
        cash_difference = ?,
        total_sales = ?,
        cash_sales = ?,
        upi_sales = ?,
        card_sales = ?,
        credit_sales = ?,
        notes = ?
    WHERE id = ?
  `).run(
    now,
    countedCash,
    expectedCash,
    cashDifference,
    totals.total_sales,
    totals.cash_sales,
    totals.upi_sales,
    totals.card_sales,
    totals.credit_sales,
    notes,
    shiftId
  );

  return db.prepare(`
    SELECT s.*, u.display_name as cashier_name, sh.name as shop_name
    FROM shifts s
    JOIN users u ON s.user_id = u.id
    JOIN shops sh ON s.shop_id = sh.id
    WHERE s.id = ?
  `).get(shiftId);
}

export function getShiftHistory(shopId, limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, u.display_name as cashier_name
    FROM shifts s
    JOIN users u ON s.user_id = u.id
    WHERE s.shop_id = ?
    ORDER BY s.id DESC
    LIMIT ?
  `).all(shopId, limit);
}
