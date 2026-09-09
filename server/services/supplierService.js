import { getDb } from '../database/db.js';

export function getSuppliers(shopId, search = '') {
  const db = getDb();
  let query = `
    SELECT s.*,
           (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id AND p.is_active = 1) as products_count
    FROM suppliers s
    WHERE s.is_active = 1
  `;
  const params = [];

  if (shopId) {
    query += ` AND s.shop_id = ?`;
    params.push(shopId);
  }

  if (search) {
    query += ` AND (s.name LIKE ? OR s.contact_person LIKE ? OR s.phone LIKE ? OR s.gstin LIKE ? OR s.city LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  query += ` ORDER BY s.id DESC`;
  return db.prepare(query).all(...params);
}

export function getSupplierById(id) {
  const db = getDb();
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id);
  if (!supplier) return null;

  const products = db.prepare(`
    SELECT id, name, barcode, item_code, current_stock, unit, purchase_rate, mrp, retail_rate
    FROM products
    WHERE supplier_id = ? AND is_active = 1
  `).all(id);

  return {
    ...supplier,
    products
  };
}

export function createOrUpdateSupplier(data) {
  const db = getDb();
  const {
    id,
    shop_id,
    name,
    contact_person = '',
    phone,
    email = '',
    gstin = '',
    address = '',
    city = '',
    state = 'Delhi',
    state_code = '07',
    pincode = '',
    bank_name = '',
    bank_account_no = '',
    bank_ifsc = '',
    upi_id = '',
    payment_terms = 'NET_30',
    current_balance = 0.0,
    notes = '',
    is_active = 1
  } = data;

  if (!name || !name.trim()) {
    throw new Error('Supplier company / trade name is required.');
  }
  if (!phone || !phone.trim()) {
    throw new Error('Supplier contact phone is required.');
  }

  if (id) {
    // Update
    const stmt = db.prepare(`
      UPDATE suppliers
      SET shop_id = ?, name = ?, contact_person = ?, phone = ?, email = ?, gstin = ?,
          address = ?, city = ?, state = ?, state_code = ?, pincode = ?,
          bank_name = ?, bank_account_no = ?, bank_ifsc = ?, upi_id = ?,
          payment_terms = ?, current_balance = ?, notes = ?, is_active = ?
      WHERE id = ?
    `);

    stmt.run(
      shop_id, name.trim(), contact_person.trim(), phone.trim(), email.trim(), gstin.trim().toUpperCase(),
      address.trim(), city.trim(), state.trim(), state_code.trim(), pincode.trim(),
      bank_name.trim(), bank_account_no.trim(), bank_ifsc.trim().toUpperCase(), upi_id.trim(),
      payment_terms, parseFloat(current_balance) || 0, notes.trim(), is_active,
      id
    );

    return { success: true, message: 'Supplier profile updated successfully.' };
  } else {
    // Create
    const stmt = db.prepare(`
      INSERT INTO suppliers (
        shop_id, name, contact_person, phone, email, gstin,
        address, city, state, state_code, pincode,
        bank_name, bank_account_no, bank_ifsc, upi_id,
        payment_terms, current_balance, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      shop_id || 1, name.trim(), contact_person.trim(), phone.trim(), email.trim(), gstin.trim().toUpperCase(),
      address.trim(), city.trim(), state.trim(), state_code.trim(), pincode.trim(),
      bank_name.trim(), bank_account_no.trim(), bank_ifsc.trim().toUpperCase(), upi_id.trim(),
      payment_terms, parseFloat(current_balance) || 0, notes.trim()
    );

    return { success: true, id: result.lastInsertRowid, message: 'Supplier added successfully.' };
  }
}

import { moveToRecycleBin } from './recycleBinService.js';

export function deleteSupplier(id, user = null) {
  const db = getDb();
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id);
  if (!supplier) {
    throw new Error('Supplier not found');
  }

  // Find linked product IDs before unlinking
  const linkedProducts = db.prepare(`SELECT id FROM products WHERE supplier_id = ?`).all(id);
  const linkedProductIds = linkedProducts.map(p => p.id);

  // Archive to Recycle Bin
  try {
    moveToRecycleBin({
      shopId: supplier.shop_id || 1,
      itemType: 'SUPPLIER',
      originalId: supplier.id,
      title: `Supplier: ${supplier.name}`,
      subtitle: `Contact: ${supplier.contact_person || 'N/A'} • Phone: ${supplier.phone || 'N/A'} • GSTIN: ${supplier.gstin || 'N/A'}`,
      data: {
        supplier,
        linkedProductIds
      },
      userId: user?.id || null,
      userName: user?.displayName || user?.username || 'Store Admin'
    });
  } catch (archiveErr) {
    console.warn('Failed to archive supplier to recycle bin:', archiveErr.message);
  }

  // Safe soft delete
  db.prepare(`UPDATE suppliers SET is_active = 0 WHERE id = ?`).run(id);
  // Unlink products
  db.prepare(`UPDATE products SET supplier_id = NULL WHERE supplier_id = ?`).run(id);
  return { success: true, message: 'Supplier moved to Recycle Bin (retained for 30 days).' };
}
