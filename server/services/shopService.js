import { getDb } from '../database/db.js';

export function getShops() {
  const db = getDb();
  return db.prepare(`SELECT * FROM shops WHERE is_active = 1 ORDER BY id ASC`).all();
}

export function getShopById(shopId) {
  const db = getDb();
  return db.prepare(`SELECT * FROM shops WHERE id = ?`).get(shopId);
}

export function createOrUpdateShop(shopData) {
  const db = getDb();
  if (shopData.id) {
    db.prepare(`
      UPDATE shops
      SET name = ?, legal_name = ?, shop_type = ?, gstin = ?, drug_license_no = ?, phone = ?, email = ?,
          address = ?, city = ?, state = ?, state_code = ?, pincode = ?,
          upi_id = ?, upi_name = ?, bank_name = ?, bank_account_no = ?, bank_ifsc = ?,
          invoice_prefix = ?, thermal_footer_note = ?, terms_conditions = ?,
          qr_type = ?, custom_qr_image = ?, shop_icon = ?, logo_url = ?
      WHERE id = ?
    `).run(
      shopData.name, shopData.legal_name || null, shopData.shop_type || 'GENERAL_RETAIL',
      shopData.gstin || null, shopData.drug_license_no || null, shopData.phone, shopData.email || null,
      shopData.address || null, shopData.city || null, shopData.state || 'Delhi',
      shopData.state_code || '07', shopData.pincode || null,
      shopData.upi_id || null, shopData.upi_name || null,
      shopData.bank_name || null, shopData.bank_account_no || null, shopData.bank_ifsc || null,
      shopData.invoice_prefix || 'INV', shopData.thermal_footer_note || null,
      shopData.terms_conditions || null,
      shopData.qr_type || 'DYNAMIC', shopData.custom_qr_image || null,
      shopData.shop_icon || '🏬', shopData.logo_url || null,
      shopData.id
    );
    return { success: true, message: 'Shop branch details updated successfully.' };
  } else {
    const info = db.prepare(`
      INSERT INTO shops (
        name, legal_name, shop_type, gstin, drug_license_no, phone, email, address, city, state, state_code,
        pincode, upi_id, upi_name, bank_name, bank_account_no, bank_ifsc, invoice_prefix,
        thermal_footer_note, terms_conditions, qr_type, custom_qr_image, shop_icon, logo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shopData.name, shopData.legal_name || null, shopData.shop_type || 'GENERAL_RETAIL',
      shopData.gstin || null, shopData.drug_license_no || null, shopData.phone, shopData.email || null,
      shopData.address || null, shopData.city || null, shopData.state || 'Delhi',
      shopData.state_code || '07', shopData.pincode || null,
      shopData.upi_id || null, shopData.upi_name || null,
      shopData.bank_name || null, shopData.bank_account_no || null, shopData.bank_ifsc || null,
      shopData.invoice_prefix || 'INV',
      shopData.thermal_footer_note || 'Thank you for shopping with us!',
      shopData.terms_conditions || 'Goods once sold cannot be returned without bill.',
      shopData.qr_type || 'DYNAMIC',
      shopData.custom_qr_image || null,
      shopData.shop_icon || '🏬',
      shopData.logo_url || null
    );
    return { success: true, id: info.lastInsertRowid, message: 'New branch created successfully.' };
  }
}

// Inter-Branch Stock Transfers
export function getBranchTransfers() {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, s1.name as from_shop_name, s2.name as to_shop_name, u.display_name as creator_name
    FROM inter_branch_transfers t
    JOIN shops s1 ON t.from_shop_id = s1.id
    JOIN shops s2 ON t.to_shop_id = s2.id
    LEFT JOIN users u ON t.created_by_user_id = u.id
    ORDER BY t.id DESC
  `).all();
}

export function createBranchTransfer(data) {
  const db = getDb();
  const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;
  
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO inter_branch_transfers (transfer_number, from_shop_id, to_shop_id, items_json, notes, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(transferNumber, data.from_shop_id, data.to_shop_id, JSON.stringify(data.items), data.notes || '', data.created_by_user_id || null);

    // Adjust stock from source shop to target shop
    for (const item of data.items) {
      if (item.product_id && item.quantity) {
        db.prepare(`UPDATE products SET current_stock = current_stock - ? WHERE id = ?`).run(item.quantity, item.product_id);
      }
    }
  });

  tx();

  return { success: true, transfer_number: transferNumber, message: 'Inter-branch stock transfer recorded.' };
}

export function cleanDemoData(options = {}) {
  const db = getDb();
  const tx = db.transaction(() => {
    // 1. Clear Invoices & Sales
    db.prepare(`DELETE FROM invoice_items`).run();
    db.prepare(`DELETE FROM invoices`).run();
    db.prepare(`DELETE FROM eway_bills`).run();
    db.prepare(`DELETE FROM quotations`).run();
    db.prepare(`DELETE FROM quotation_items`).run();
    db.prepare(`DELETE FROM credit_notes`).run();
    db.prepare(`DELETE FROM customer_ledger`).run();
    db.prepare(`DELETE FROM expenses`).run();
    db.prepare(`DELETE FROM inter_branch_transfers`).run();
    db.prepare(`DELETE FROM shifts`).run();
    
    // Reset customer balances to opening balance or 0
    db.prepare(`UPDATE customers SET current_balance = opening_balance`).run();

    // Reset stock transaction history if clear inventory requested
    if (options.clearInventory) {
      db.prepare(`DELETE FROM product_batches`).run();
      db.prepare(`DELETE FROM product_serials`).run();
      db.prepare(`DELETE FROM products`).run();
    } else {
      // Reset product stock to 0 for fresh stock inward
      db.prepare(`UPDATE products SET current_stock = 0`).run();
    }

    if (options.clearCustomers) {
      db.prepare(`DELETE FROM customers`).run();
    }
    
    if (options.clearHrms) {
      db.prepare(`DELETE FROM attendance_logs`).run();
      db.prepare(`DELETE FROM payroll_records`).run();
      db.prepare(`DELETE FROM employee_documents`).run();
    }
  });

  tx();
  return { success: true, message: 'All demo sales, invoices, and test transactions cleared successfully for a fresh store start!' };
}

