import { getDb } from '../database/db.js';

/**
 * Inter-Branch Stock Transfer Service
 * Compliant with GST Rule 55 Delivery Challan (DC)
 */

function generateNextTransferNumber() {
  const db = getDb();
  const year = new Date().getFullYear();
  const pattern = `DC-${year}-%`;

  const rows = db.prepare(`
    SELECT transfer_number FROM stock_transfers 
    WHERE transfer_number LIKE ?
  `).all(pattern);

  let maxSeq = 0;
  for (const row of rows) {
    if (row.transfer_number) {
      const match = row.transfer_number.match(/-(\d+)$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `DC-${year}-${String(nextSeq).padStart(4, '0')}`;
  const checkExists = db.prepare(`SELECT id FROM stock_transfers WHERE transfer_number = ? LIMIT 1`);
  while (checkExists.get(candidate)) {
    nextSeq++;
    candidate = `DC-${year}-${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
}

// Create & Dispatch Stock Transfer (Deducts stock from source shop)
export function createStockTransfer(data) {
  const db = getDb();
  const {
    from_shop_id,
    to_shop_id,
    vehicle_no,
    transporter_name,
    driver_phone,
    notes,
    items,
    dispatched_by
  } = data;

  if (!from_shop_id || !to_shop_id) {
    throw new Error('Please specify source (From) and destination (To) shops.');
  }

  if (Number(from_shop_id) === Number(to_shop_id)) {
    throw new Error('Source and destination shop branches cannot be the same.');
  }

  if (!items || items.length === 0) {
    throw new Error('Cannot create transfer with 0 items.');
  }

  const transferNumber = generateNextTransferNumber();

  let totalQty = 0;
  let totalValue = 0;

  for (const it of items) {
    const qty = Number(it.quantity || it.qty || 1);
    const cost = Number(it.unit_cost || it.purchase_rate || 0);
    totalQty += qty;
    totalValue += (qty * cost);
  }

  const insertTransfer = db.prepare(`
    INSERT INTO stock_transfers (
      transfer_number, from_shop_id, to_shop_id, status,
      vehicle_no, transporter_name, driver_phone, notes,
      total_items, total_qty, total_value, dispatched_by, dispatched_at
    ) VALUES (?, ?, ?, 'DISPATCHED', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  const insertItem = db.prepare(`
    INSERT INTO stock_transfer_items (
      transfer_id, product_id, product_name, barcode, hsn_code,
      batch_no, expiry_date, quantity, unit, unit_cost, total_cost
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deductStock = db.prepare(`
    UPDATE products 
    SET current_stock = MAX(0, current_stock - ?)
    WHERE id = ? AND shop_id = ?
  `);

  // Execute in transaction
  const transaction = db.transaction(() => {
    const result = insertTransfer.run(
      transferNumber,
      from_shop_id,
      to_shop_id,
      vehicle_no ? vehicle_no.toUpperCase() : null,
      transporter_name || null,
      driver_phone || null,
      notes || null,
      items.length,
      totalQty,
      totalValue,
      dispatched_by || null
    );

    const transferId = result.lastInsertRowid;

    for (const it of items) {
      const qty = Number(it.quantity || it.qty || 1);
      const cost = Number(it.unit_cost || it.purchase_rate || 0);
      const totalCost = qty * cost;

      insertItem.run(
        transferId,
        it.product_id || it.id,
        it.product_name || it.name,
        it.barcode || null,
        it.hsn_code || '999999',
        it.batch_no || null,
        it.expiry_date || null,
        qty,
        it.unit || 'PCS',
        cost,
        totalCost
      );

      // Deduct stock from source branch
      if (it.product_id || it.id) {
        deductStock.run(qty, it.product_id || it.id, from_shop_id);
      }
    }

    return transferId;
  });

  const createdId = transaction();
  return getStockTransferById(createdId);
}

// Get Single Stock Transfer with Items & Shop Profiles
export function getStockTransferById(transferId) {
  const db = getDb();
  const transfer = db.prepare(`
    SELECT t.*,
           fs.name as from_shop_name, fs.gstin as from_shop_gstin, fs.address as from_shop_address, fs.city as from_shop_city, fs.phone as from_shop_phone,
           ts.name as to_shop_name, ts.gstin as to_shop_gstin, ts.address as to_shop_address, ts.city as to_shop_city, ts.phone as to_shop_phone,
           du.display_name as dispatched_by_name,
           ru.display_name as received_by_name
    FROM stock_transfers t
    JOIN shops fs ON t.from_shop_id = fs.id
    JOIN shops ts ON t.to_shop_id = ts.id
    LEFT JOIN users du ON t.dispatched_by = du.id
    LEFT JOIN users ru ON t.received_by = ru.id
    WHERE t.id = ? OR t.transfer_number = ?
  `).get(transferId, transferId);

  if (!transfer) return null;

  const items = db.prepare(`
    SELECT * FROM stock_transfer_items WHERE transfer_id = ?
  `).all(transfer.id);

  return { ...transfer, items };
}

// Get All Stock Transfers for a Shop (Inward and Outward)
export function getStockTransfers(shopId, type = 'ALL') {
  const db = getDb();
  let query = `
    SELECT t.*,
           fs.name as from_shop_name,
           ts.name as to_shop_name,
           du.display_name as dispatched_by_name,
           ru.display_name as received_by_name
    FROM stock_transfers t
    JOIN shops fs ON t.from_shop_id = fs.id
    JOIN shops ts ON t.to_shop_id = ts.id
    LEFT JOIN users du ON t.dispatched_by = du.id
    LEFT JOIN users ru ON t.received_by = ru.id
  `;

  const params = [];
  if (shopId) {
    if (type === 'OUTWARD') {
      query += ` WHERE t.from_shop_id = ?`;
      params.push(shopId);
    } else if (type === 'INWARD') {
      query += ` WHERE t.to_shop_id = ?`;
      params.push(shopId);
    } else {
      query += ` WHERE t.from_shop_id = ? OR t.to_shop_id = ?`;
      params.push(shopId, shopId);
    }
  }

  query += ` ORDER BY t.id DESC`;
  return db.prepare(query).all(...params);
}

// Receive Stock Transfer (Adds stock into destination shop)
export function receiveStockTransfer(transferId, userId) {
  const db = getDb();
  const transfer = getStockTransferById(transferId);

  if (!transfer) {
    throw new Error(`Stock Transfer #${transferId} not found.`);
  }

  if (transfer.status === 'RECEIVED') {
    throw new Error(`Stock Transfer #${transfer.transfer_number} has already been received.`);
  }

  if (transfer.status === 'CANCELLED') {
    throw new Error(`Cannot receive a cancelled stock transfer.`);
  }

  const toShopId = transfer.to_shop_id;

  const receiveTransaction = db.transaction(() => {
    // 1. Update transfer status
    db.prepare(`
      UPDATE stock_transfers
      SET status = 'RECEIVED',
          received_by = ?,
          received_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(userId || null, transfer.id);

    // 2. Add stock to destination shop products
    for (const it of transfer.items) {
      // Find matching product in destination shop by barcode or name
      let destProd = null;
      if (it.barcode) {
        destProd = db.prepare(`SELECT * FROM products WHERE shop_id = ? AND barcode = ?`).get(toShopId, it.barcode);
      }
      if (!destProd) {
        destProd = db.prepare(`SELECT * FROM products WHERE shop_id = ? AND lower(name) = lower(?)`).get(toShopId, it.product_name);
      }

      if (destProd) {
        // Increment stock
        db.prepare(`
          UPDATE products 
          SET current_stock = current_stock + ? 
          WHERE id = ?
        `).run(it.quantity, destProd.id);
      } else {
        // Create product entry in destination branch
        db.prepare(`
          INSERT INTO products (
            shop_id, name, barcode, hsn_code, unit, purchase_rate, mrp, retail_rate, current_stock, min_stock_alert, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, 1)
        `).run(
          toShopId,
          it.product_name,
          it.barcode || null,
          it.hsn_code || '999999',
          it.unit || 'PCS',
          it.unit_cost || 0,
          (it.unit_cost || 0) * 1.25,
          (it.unit_cost || 0) * 1.25,
          it.quantity
        );
      }
    }
  });

  receiveTransaction();
  return getStockTransferById(transfer.id);
}
