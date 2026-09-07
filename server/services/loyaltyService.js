import { getDb } from '../database/db.js';

export function getLoyaltyConfig(shopId) {
  const db = getDb();
  const earnRateRow = db.prepare(`SELECT value FROM system_config WHERE key = 'loyalty_earn_rate_rs'`).get();
  const redeemValueRow = db.prepare(`SELECT value FROM system_config WHERE key = 'loyalty_redeem_value_rs'`).get();
  const minPointsRow = db.prepare(`SELECT value FROM system_config WHERE key = 'loyalty_min_redeem_points'`).get();

  return {
    earnRateRs: parseFloat(earnRateRow?.value) || 100, // 1 point per 100 Rs spent
    redeemValueRs: parseFloat(redeemValueRow?.value) || 1, // 1 point = 1 Rs discount
    minRedeemPoints: parseFloat(minPointsRow?.value) || 10
  };
}

export function awardLoyaltyPoints(shopId, customerId, invoiceId, grandTotal) {
  const db = getDb();
  if (!customerId || grandTotal <= 0) return { pointsEarned: 0 };

  const config = getLoyaltyConfig(shopId);
  const pointsEarned = Math.floor(grandTotal / config.earnRateRs);
  if (pointsEarned <= 0) return { pointsEarned: 0 };

  const customer = db.prepare(`SELECT loyalty_points, points_earned_total FROM customers WHERE id = ?`).get(customerId);
  if (!customer) return { pointsEarned: 0 };

  const currentPoints = customer.loyalty_points || 0;
  const totalEarned = (customer.points_earned_total || 0) + pointsEarned;
  const newBalance = currentPoints + pointsEarned;

  db.prepare(`
    UPDATE customers 
    SET loyalty_points = ?, points_earned_total = ?
    WHERE id = ?
  `).run(newBalance, totalEarned, customerId);

  db.prepare(`
    INSERT INTO loyalty_transactions (
      shop_id, customer_id, invoice_id, type, points, amount_equivalent, balance_after, notes
    ) VALUES (?, ?, ?, 'EARN', ?, ?, ?, ?)
  `).run(
    shopId, customerId, invoiceId, pointsEarned, pointsEarned * config.redeemValueRs, newBalance, `Points earned on Bill #${invoiceId}`
  );

  return { pointsEarned, newBalance };
}

export function redeemLoyaltyPoints(shopId, customerId, invoiceId, pointsToRedeem) {
  const db = getDb();
  if (!customerId || pointsToRedeem <= 0) return { pointsRedeemed: 0, discountAmount: 0 };

  const config = getLoyaltyConfig(shopId);
  const customer = db.prepare(`SELECT loyalty_points FROM customers WHERE id = ?`).get(customerId);
  if (!customer) return { pointsRedeemed: 0, discountAmount: 0 };

  const available = customer.loyalty_points || 0;
  const redeemQty = Math.min(available, pointsToRedeem);
  if (redeemQty <= 0) return { pointsRedeemed: 0, discountAmount: 0 };

  const discountAmount = redeemQty * config.redeemValueRs;
  const newBalance = available - redeemQty;

  db.prepare(`
    UPDATE customers 
    SET loyalty_points = ?
    WHERE id = ?
  `).run(newBalance, customerId);

  db.prepare(`
    INSERT INTO loyalty_transactions (
      shop_id, customer_id, invoice_id, type, points, amount_equivalent, balance_after, notes
    ) VALUES (?, ?, ?, 'REDEEM', ?, ?, ?, ?)
  `).run(
    shopId, customerId, invoiceId, redeemQty, discountAmount, newBalance, `Points redeemed on Bill #${invoiceId}`
  );

  return { pointsRedeemed: redeemQty, discountAmount, newBalance };
}

export function getCustomerLoyaltyHistory(customerId) {
  const db = getDb();
  return db.prepare(`
    SELECT lt.*, i.invoice_number
    FROM loyalty_transactions lt
    LEFT JOIN invoices i ON lt.invoice_id = i.id
    WHERE lt.customer_id = ?
    ORDER BY lt.id DESC
  `).all(customerId);
}

export function getUpcomingSpecialOccasions(shopId) {
  const db = getDb();
  // Upcoming birthdays and anniversaries in the next 15 days
  const customers = db.prepare(`
    SELECT id, name, phone, dob, anniversary_date, loyalty_points
    FROM customers
    WHERE shop_id = ? AND (dob IS NOT NULL OR anniversary_date IS NOT NULL)
  `).all(shopId);

  const today = new Date();
  const curMonth = today.getMonth() + 1;
  const curDay = today.getDate();

  const specialList = [];

  for (const c of customers) {
    if (c.dob) {
      const parts = c.dob.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[parts.length - 2], 10);
        const d = parseInt(parts[parts.length - 1], 10);
        if (m === curMonth && Math.abs(d - curDay) <= 7) {
          specialList.push({
            ...c,
            occasionType: 'BIRTHDAY',
            occasionDate: c.dob,
            isToday: (m === curMonth && d === curDay),
            daysAway: d - curDay
          });
        }
      }
    }
    if (c.anniversary_date) {
      const parts = c.anniversary_date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[parts.length - 2], 10);
        const d = parseInt(parts[parts.length - 1], 10);
        if (m === curMonth && Math.abs(d - curDay) <= 7) {
          specialList.push({
            ...c,
            occasionType: 'ANNIVERSARY',
            occasionDate: c.anniversary_date,
            isToday: (m === curMonth && d === curDay),
            daysAway: d - curDay
          });
        }
      }
    }
  }

  return specialList;
}
