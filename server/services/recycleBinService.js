import { getDb } from '../database/db.js';

// Auto-purge items that have passed the 30-day retention threshold
export function purgeExpiredItems(shopId = null) {
  const db = getDb();
  try {
    let query = `DELETE FROM recycle_bin WHERE datetime(expires_at) < datetime('now', 'localtime')`;
    const params = [];
    if (shopId) {
      query += ` AND shop_id = ?`;
      params.push(shopId);
    }
    const info = db.prepare(query).run(...params);
    if (info.changes > 0) {
      console.log(`[RecycleBin] Auto-purged ${info.changes} expired items.`);
    }
    return info.changes;
  } catch (err) {
    console.error('[RecycleBin] Purge error:', err.message);
    return 0;
  }
}

// Archive a deleted entity into the recycle bin
export function moveToRecycleBin({
  shopId = 1,
  itemType,
  originalId = null,
  title,
  subtitle = '',
  data,
  userId = null,
  userName = 'Admin / Store Owner'
}) {
  const db = getDb();
  if (!itemType || !title || !data) {
    throw new Error('Item type, title, and data snapshot are required for Recycle Bin archive.');
  }

  const dataJson = typeof data === 'string' ? data : JSON.stringify(data);

  const stmt = db.prepare(`
    INSERT INTO recycle_bin (
      shop_id, item_type, original_id, title, subtitle, data_json,
      deleted_by_user_id, deleted_by_name, deleted_at, expires_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime', '+30 days')
    )
  `);

  const info = stmt.run(
    shopId,
    itemType.toUpperCase(),
    originalId,
    title,
    subtitle || '',
    dataJson,
    userId,
    userName
  );

  return {
    success: true,
    recycleBinId: info.lastInsertRowid,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    message: `Moved "${title}" to Recycle Bin (Retained for 30 days).`
  };
}

// Get items in Recycle Bin with search & filters
export function getRecycleBinItems(shopId, filters = {}) {
  const db = getDb();
  purgeExpiredItems(shopId);

  const { itemType, search, limit = 200, offset = 0 } = filters;

  let query = `
    SELECT id, shop_id, item_type, original_id, title, subtitle,
           deleted_by_user_id, deleted_by_name, deleted_at, expires_at,
           CAST((julianday(expires_at) - julianday('now', 'localtime')) AS INTEGER) as days_left
    FROM recycle_bin
    WHERE 1=1
  `;
  const params = [];

  if (shopId) {
    query += ` AND shop_id = ?`;
    params.push(shopId);
  }

  if (itemType && itemType !== 'ALL') {
    query += ` AND item_type = ?`;
    params.push(itemType.toUpperCase());
  }

  if (search && search.trim()) {
    query += ` AND (title LIKE ? OR subtitle LIKE ? OR deleted_by_name LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const items = db.prepare(query).all(...params);

  return items.map(item => ({
    ...item,
    days_left: Math.max(0, item.days_left !== null ? item.days_left : 30)
  }));
}

// Get single item detail with full data snapshot for preview
export function getRecycleBinItemDetail(id) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM recycle_bin WHERE id = ?`).get(id);
  if (!row) return null;

  let parsedData = null;
  try {
    parsedData = JSON.parse(row.data_json);
  } catch (e) {
    parsedData = { raw: row.data_json };
  }

  return {
    ...row,
    data: parsedData
  };
}

// Get summary metrics for badge & dashboard
export function getRecycleBinStats(shopId) {
  const db = getDb();
  purgeExpiredItems(shopId);

  let query = `SELECT item_type, COUNT(*) as count FROM recycle_bin`;
  const params = [];
  if (shopId) {
    query += ` WHERE shop_id = ?`;
    params.push(shopId);
  }
  query += ` GROUP BY item_type`;

  const countsByType = db.prepare(query).all(...params);
  
  let totalCount = 0;
  const breakdown = {};
  countsByType.forEach(r => {
    breakdown[r.item_type] = r.count;
    totalCount += r.count;
  });

  const expiringSoonCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM recycle_bin 
    WHERE (${shopId ? 'shop_id = ? AND ' : ''} (julianday(expires_at) - julianday('now', 'localtime')) <= 7)
  `).get(...(shopId ? [shopId] : [])).count;

  return {
    total: totalCount,
    expiringSoon: expiringSoonCount,
    byType: breakdown
  };
}

// 1-Click Restore to original destination table
export function restoreItem(recycleBinId) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM recycle_bin WHERE id = ?`).get(recycleBinId);
  if (!row) {
    throw new Error('Recycle Bin item not found or already permanently deleted.');
  }

  let data = null;
  try {
    data = JSON.parse(row.data_json);
  } catch (e) {
    throw new Error('Invalid item data format in Recycle Bin.');
  }

  const { item_type, title, shop_id } = row;

  const tx = db.transaction(() => {
    switch (item_type) {
      case 'CUSTOMER': {
        const cust = data.customer || data;
        const existingCust = cust.id ? db.prepare(`SELECT id FROM customers WHERE id = ?`).get(cust.id) : null;
        let newCustId = cust.id;

        if (existingCust) {
          db.prepare(`
            UPDATE customers
            SET shop_id = ?, name = ?, phone = ?, email = ?, address = ?, gstin = ?,
                state_code = ?, credit_limit = ?, current_balance = ?, route_beat = ?,
                customer_type = ?, loyalty_points = ?, points_earned_total = ?,
                dob = ?, anniversary_date = ?
            WHERE id = ?
          `).run(
            cust.shop_id || shop_id,
            cust.name || '',
            cust.phone || '',
            cust.email || null,
            cust.address || null,
            cust.gstin || null,
            cust.state_code || '07',
            cust.credit_limit !== undefined ? cust.credit_limit : 25000,
            cust.current_balance !== undefined ? cust.current_balance : 0,
            cust.route_beat || null,
            cust.customer_type || 'RETAIL',
            cust.loyalty_points || 0,
            cust.points_earned_total || 0,
            cust.dob || null,
            cust.anniversary_date || null,
            cust.id
          );
        } else {
          const insertStmt = cust.id ? db.prepare(`
            INSERT INTO customers (
              id, shop_id, name, phone, email, address, gstin,
              state_code, credit_limit, current_balance, route_beat,
              customer_type, loyalty_points, points_earned_total, dob, anniversary_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `) : db.prepare(`
            INSERT INTO customers (
              shop_id, name, phone, email, address, gstin,
              state_code, credit_limit, current_balance, route_beat,
              customer_type, loyalty_points, points_earned_total, dob, anniversary_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const params = [
            cust.shop_id || shop_id,
            cust.name || '',
            cust.phone || '',
            cust.email || null,
            cust.address || null,
            cust.gstin || null,
            cust.state_code || '07',
            cust.credit_limit !== undefined ? cust.credit_limit : 25000,
            cust.current_balance !== undefined ? cust.current_balance : 0,
            cust.route_beat || null,
            cust.customer_type || 'RETAIL',
            cust.loyalty_points || 0,
            cust.points_earned_total || 0,
            cust.dob || null,
            cust.anniversary_date || null,
            cust.created_at || new Date().toISOString()
          ];

          if (cust.id) {
            params.unshift(cust.id);
          }

          const info = insertStmt.run(...params);
          if (!cust.id) {
            newCustId = info.lastInsertRowid;
          }
        }

        // Restore customer ledger history
        if (data.ledger && Array.isArray(data.ledger) && data.ledger.length > 0) {
          db.prepare(`DELETE FROM customer_ledger WHERE customer_id = ?`).run(newCustId);
          const insertLedger = db.prepare(`
            INSERT INTO customer_ledger (
              customer_id, shop_id, date, transaction_type, reference_no,
              debit_amount, credit_amount, balance_after, payment_mode, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const l of data.ledger) {
            insertLedger.run(
              newCustId,
              l.shop_id || shop_id,
              l.date || new Date().toISOString(),
              l.transaction_type || 'INVOICE',
              l.reference_no || null,
              l.debit_amount || 0,
              l.credit_amount || 0,
              l.balance_after || 0,
              l.payment_mode || null,
              l.notes || null,
              l.created_at || l.date || new Date().toISOString()
            );
          }
        }

        // Re-link past invoices and quotations
        if (newCustId && cust.phone) {
          try {
            db.prepare(`UPDATE invoices SET customer_id = ? WHERE customer_id IS NULL AND customer_phone = ?`).run(newCustId, cust.phone);
          } catch (e) {}
          try {
            db.prepare(`UPDATE quotations SET customer_id = ? WHERE customer_id IS NULL AND customer_phone = ?`).run(newCustId, cust.phone);
          } catch (e) {}
          try {
            db.prepare(`UPDATE credit_notes SET customer_id = ? WHERE customer_id IS NULL AND customer_phone = ?`).run(newCustId, cust.phone);
          } catch (e) {}
        }
        break;
      }

      case 'SUPPLIER': {
        const sup = data.supplier || data;
        const linkedProductIds = data.linkedProductIds || [];
        const existingSup = sup.id ? db.prepare(`SELECT id FROM suppliers WHERE id = ?`).get(sup.id) : null;
        let restoredSupId = sup.id;

        if (existingSup) {
          db.prepare(`
            UPDATE suppliers
            SET shop_id = ?, name = ?, contact_person = ?, phone = ?, email = ?, gstin = ?,
                address = ?, city = ?, state = ?, state_code = ?, pincode = ?,
                bank_name = ?, bank_account_no = ?, bank_ifsc = ?, upi_id = ?,
                payment_terms = ?, current_balance = ?, notes = ?, is_active = 1
            WHERE id = ?
          `).run(
            sup.shop_id || shop_id,
            sup.name || '',
            sup.contact_person || '',
            sup.phone || '',
            sup.email || '',
            sup.gstin || '',
            sup.address || '',
            sup.city || '',
            sup.state || 'Delhi',
            sup.state_code || '07',
            sup.pincode || '',
            sup.bank_name || '',
            sup.bank_account_no || '',
            sup.bank_ifsc || '',
            sup.upi_id || '',
            sup.payment_terms || 'NET_30',
            parseFloat(sup.current_balance) || 0,
            sup.notes || '',
            sup.id
          );
        } else {
          const insertStmt = sup.id ? db.prepare(`
            INSERT INTO suppliers (
              id, shop_id, name, contact_person, phone, email, gstin,
              address, city, state, state_code, pincode,
              bank_name, bank_account_no, bank_ifsc, upi_id,
              payment_terms, current_balance, notes, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `) : db.prepare(`
            INSERT INTO suppliers (
              shop_id, name, contact_person, phone, email, gstin,
              address, city, state, state_code, pincode,
              bank_name, bank_account_no, bank_ifsc, upi_id,
              payment_terms, current_balance, notes, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `);

          const params = [
            sup.shop_id || shop_id,
            sup.name || '',
            sup.contact_person || '',
            sup.phone || '',
            sup.email || '',
            sup.gstin || '',
            sup.address || '',
            sup.city || '',
            sup.state || 'Delhi',
            sup.state_code || '07',
            sup.pincode || '',
            sup.bank_name || '',
            sup.bank_account_no || '',
            sup.bank_ifsc || '',
            sup.upi_id || '',
            sup.payment_terms || 'NET_30',
            parseFloat(sup.current_balance) || 0,
            sup.notes || '',
            sup.created_at || new Date().toISOString()
          ];

          if (sup.id) {
            params.unshift(sup.id);
          }

          const info = insertStmt.run(...params);
          if (!sup.id) {
            restoredSupId = info.lastInsertRowid;
          }
        }

        // Re-link any products that were associated with this supplier
        if (restoredSupId && Array.isArray(linkedProductIds) && linkedProductIds.length > 0) {
          const relinkStmt = db.prepare(`UPDATE products SET supplier_id = ? WHERE id = ?`);
          for (const pid of linkedProductIds) {
            relinkStmt.run(restoredSupId, pid);
          }
        }
        break;
      }

      case 'INVOICE': {
        const inv = data.invoice || data;
        const items = data.items || inv.items || [];

        const existingInv = db.prepare(`SELECT id FROM invoices WHERE shop_id = ? AND invoice_number = ?`).get(inv.shop_id || shop_id, inv.invoice_number);
        let targetInvoiceNumber = inv.invoice_number;
        if (existingInv) {
          targetInvoiceNumber = `${inv.invoice_number}-R${Date.now().toString().slice(-4)}`;
        }

        const info = db.prepare(`
          INSERT INTO invoices (
            shop_id, invoice_number, invoice_date, invoice_type, customer_id, customer_name, customer_phone,
            customer_gstin, customer_state_code, billing_address, sub_total, discount_amount, discount_percent,
            taxable_amount, cgst_amount, sgst_amount, igst_amount, round_off, grand_total, amount_paid,
            balance_due, payment_status, payment_mode, payment_details_json, cashier_user_id, shift_id, notes,
            sales_employee_id, loyalty_points_earned, loyalty_points_redeemed, loyalty_discount_amount,
            credit_note_code, credit_note_discount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          inv.shop_id || shop_id,
          targetInvoiceNumber,
          inv.invoice_date || new Date().toISOString(),
          inv.invoice_type || 'RETAIL_B2C',
          inv.customer_id || null,
          inv.customer_name || 'Walk-in Customer',
          inv.customer_phone || null,
          inv.customer_gstin || null,
          inv.customer_state_code || '07',
          inv.billing_address || null,
          inv.sub_total || 0,
          inv.discount_amount || 0,
          inv.discount_percent || 0,
          inv.taxable_amount || 0,
          inv.cgst_amount || 0,
          inv.sgst_amount || 0,
          inv.igst_amount || 0,
          inv.round_off || 0,
          inv.grand_total || 0,
          inv.amount_paid || 0,
          inv.balance_due || 0,
          inv.payment_status || 'PAID',
          inv.payment_mode || 'CASH',
          inv.payment_details_json || null,
          inv.cashier_user_id || null,
          inv.shift_id || null,
          inv.notes || null,
          inv.sales_employee_id || null,
          inv.loyalty_points_earned || 0,
          inv.loyalty_points_redeemed || 0,
          inv.loyalty_discount_amount || 0,
          inv.credit_note_code || null,
          inv.credit_note_discount || 0,
          inv.created_at || new Date().toISOString()
        );

        const newInvoiceId = info.lastInsertRowid;

        if (items && Array.isArray(items) && items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO invoice_items (
              invoice_id, product_id, item_name, hsn_code, batch_no, expiry_date, serial_imei, variant_details,
              unit, unit_type, quantity, free_quantity, unit_price, discount_amount, tax_rate, taxable_value,
              cgst_amount, sgst_amount, igst_amount, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const item of items) {
            insertItem.run(
              newInvoiceId,
              item.product_id || null,
              item.item_name || item.name || 'Item',
              item.hsn_code || '1905',
              item.batch_no || null,
              item.expiry_date || null,
              item.serial_imei || null,
              item.variant_details || null,
              item.unit || 'PCS',
              item.unit_type || 'PRIMARY',
              item.quantity || 1,
              item.free_quantity || 0,
              item.unit_price || 0,
              item.discount_amount || 0,
              item.tax_rate || 0,
              item.taxable_value || 0,
              item.cgst_amount || 0,
              item.sgst_amount || 0,
              item.igst_amount || 0,
              item.total_amount || 0
            );
          }
        }
        break;
      }

      case 'PRODUCT': {
        const prod = data.product || data;
        const batches = data.batches || [];
        const serials = data.serials || [];
        const variants = data.variants || [];

        const existingProd = prod.id ? db.prepare(`SELECT id FROM products WHERE id = ?`).get(prod.id) : null;
        let restoredProdId = prod.id;

        if (existingProd) {
          db.prepare(`
            UPDATE products
            SET shop_id = ?, barcode = ?, item_code = ?, name = ?, regional_name = ?, category_id = ?,
                supplier_id = ?, brand = ?, image_url = ?, hsn_code = ?, tax_rate = ?, cess_rate = ?,
                unit = ?, secondary_unit = ?, unit_conversion_factor = ?, purchase_rate = ?, mrp = ?,
                retail_rate = ?, wholesale_rate = ?, dealer_rate = ?, current_stock = ?, min_stock_alert = ?,
                has_batch = ?, has_serial_imei = ?, has_variants = ?, trade_scheme = ?,
                default_batch_no = ?, default_expiry_date = ?, default_size = ?, default_color = ?, is_active = 1
            WHERE id = ?
          `).run(
            prod.shop_id || shop_id,
            prod.barcode || null,
            prod.item_code || null,
            prod.name,
            prod.regional_name || null,
            prod.category_id || null,
            prod.supplier_id || null,
            prod.brand || null,
            prod.image_url || null,
            prod.hsn_code || '1905',
            prod.tax_rate || 18,
            prod.cess_rate || 0,
            prod.unit || 'PCS',
            prod.secondary_unit || null,
            prod.unit_conversion_factor || 1,
            prod.purchase_rate || 0,
            prod.mrp || 0,
            prod.retail_rate || 0,
            prod.wholesale_rate || 0,
            prod.dealer_rate || 0,
            prod.current_stock || 0,
            prod.min_stock_alert || 5,
            prod.has_batch ? 1 : 0,
            prod.has_serial_imei ? 1 : 0,
            prod.has_variants ? 1 : 0,
            prod.trade_scheme || null,
            prod.default_batch_no || null,
            prod.default_expiry_date || null,
            prod.default_size || null,
            prod.default_color || null,
            prod.id
          );
        } else {
          let targetBarcode = prod.barcode;
          if (targetBarcode) {
            const barcodeMatch = db.prepare(`SELECT id FROM products WHERE barcode = ?`).get(targetBarcode);
            if (barcodeMatch) {
              targetBarcode = `${targetBarcode}-RESTORED`;
            }
          }

          const insertStmt = prod.id ? db.prepare(`
            INSERT INTO products (
              id, shop_id, barcode, item_code, name, regional_name, category_id,
              supplier_id, brand, image_url, hsn_code, tax_rate, cess_rate,
              unit, secondary_unit, unit_conversion_factor, purchase_rate, mrp,
              retail_rate, wholesale_rate, dealer_rate, current_stock, min_stock_alert,
              has_batch, has_serial_imei, has_variants, trade_scheme,
              default_batch_no, default_expiry_date, default_size, default_color, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `) : db.prepare(`
            INSERT INTO products (
              shop_id, barcode, item_code, name, regional_name, category_id,
              supplier_id, brand, image_url, hsn_code, tax_rate, cess_rate,
              unit, secondary_unit, unit_conversion_factor, purchase_rate, mrp,
              retail_rate, wholesale_rate, dealer_rate, current_stock, min_stock_alert,
              has_batch, has_serial_imei, has_variants, trade_scheme,
              default_batch_no, default_expiry_date, default_size, default_color, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `);

          const params = [
            prod.shop_id || shop_id,
            targetBarcode || null,
            prod.item_code || null,
            prod.name,
            prod.regional_name || null,
            prod.category_id || null,
            prod.supplier_id || null,
            prod.brand || null,
            prod.image_url || null,
            prod.hsn_code || '1905',
            prod.tax_rate || 18,
            prod.cess_rate || 0,
            prod.unit || 'PCS',
            prod.secondary_unit || null,
            prod.unit_conversion_factor || 1,
            prod.purchase_rate || 0,
            prod.mrp || 0,
            prod.retail_rate || 0,
            prod.wholesale_rate || 0,
            prod.dealer_rate || 0,
            prod.current_stock || 0,
            prod.min_stock_alert || 5,
            prod.has_batch ? 1 : 0,
            prod.has_serial_imei ? 1 : 0,
            prod.has_variants ? 1 : 0,
            prod.trade_scheme || null,
            prod.default_batch_no || null,
            prod.default_expiry_date || null,
            prod.default_size || null,
            prod.default_color || null,
            prod.created_at || new Date().toISOString()
          ];

          if (prod.id) {
            params.unshift(prod.id);
          }

          const info = insertStmt.run(...params);
          if (!prod.id) {
            restoredProdId = info.lastInsertRowid;
          }
        }

        if (batches.length > 0) {
          db.prepare(`DELETE FROM product_batches WHERE product_id = ?`).run(restoredProdId);
          const insertBatch = db.prepare(`
            INSERT INTO product_batches (product_id, shop_id, batch_no, mfg_date, expiry_date, purchase_rate, mrp, selling_rate, stock_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          batches.forEach(b => {
            insertBatch.run(
              restoredProdId,
              b.shop_id || shop_id,
              b.batch_no,
              b.mfg_date || b.manufacturing_date || null,
              b.expiry_date || null,
              b.purchase_rate || b.purchase_price || 0,
              b.mrp || 0,
              b.selling_rate || b.selling_price || 0,
              b.stock_qty || b.quantity || 0
            );
          });
        }

        if (serials.length > 0) {
          db.prepare(`DELETE FROM product_serials WHERE product_id = ?`).run(restoredProdId);
          const insertSerial = db.prepare(`
            INSERT INTO product_serials (product_id, shop_id, serial_imei_no, status, warranty_months)
            VALUES (?, ?, ?, ?, ?)
          `);
          serials.forEach(s => {
            insertSerial.run(
              restoredProdId,
              s.shop_id || shop_id,
              s.serial_imei_no || s.serial_no,
              s.status || 'AVAILABLE',
              s.warranty_months || 12
            );
          });
        }

        if (variants.length > 0) {
          db.prepare(`DELETE FROM product_variants WHERE product_id = ?`).run(restoredProdId);
          const insertVariant = db.prepare(`
            INSERT INTO product_variants (product_id, size, color, sku_barcode, mrp, selling_rate, stock_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          variants.forEach(v => {
            insertVariant.run(
              restoredProdId,
              v.size,
              v.color,
              v.sku_barcode || null,
              v.mrp || 0,
              v.selling_rate || 0,
              v.stock_qty || 0
            );
          });
        }
        break;
      }

      case 'EMPLOYEE': {
        const emp = data.employee || data;
        let empCode = emp.employee_code;
        const existingEmp = emp.id ? db.prepare(`SELECT id FROM employees WHERE id = ?`).get(emp.id) : null;

        if (existingEmp) {
          db.prepare(`
            UPDATE employees
            SET employee_code = ?, shop_id = ?, full_name = ?, phone = ?, email = ?, address = ?,
                designation = ?, department = ?, date_of_joining = ?, monthly_basic_salary = ?,
                daily_wage = ?, hra = ?, special_allowance = ?, overtime_rate_per_hour = ?,
                aadhaar_no = ?, pan_no = ?, bank_account = ?, bank_ifsc = ?, status = 'ACTIVE',
                is_pf_eligible = ?, uan_no = ?, pf_rate_percent = ?, custom_pf_amount = ?,
                photo_url = ?, father_name = ?, emergency_phone = ?, verification_status = ?,
                welcome_letter_generated = ?, sales_commission_percent = ?, blood_group = ?, shift_type = ?
            WHERE id = ?
          `).run(
            emp.employee_code,
            emp.shop_id || shop_id,
            emp.full_name,
            emp.phone,
            emp.email || null,
            emp.address || null,
            emp.designation || 'Staff',
            emp.department || 'Sales',
            emp.date_of_joining || null,
            emp.monthly_basic_salary || 0,
            emp.daily_wage || 0,
            emp.hra || 0,
            emp.special_allowance || 0,
            emp.overtime_rate_per_hour || 0,
            emp.aadhaar_no || null,
            emp.pan_no || null,
            emp.bank_account || null,
            emp.bank_ifsc || null,
            emp.is_pf_eligible ? 1 : 0,
            emp.uan_no || null,
            emp.pf_rate_percent !== undefined ? emp.pf_rate_percent : 12,
            emp.custom_pf_amount || 0,
            emp.photo_url || null,
            emp.father_name || null,
            emp.emergency_phone || null,
            emp.verification_status || 'VERIFIED',
            emp.welcome_letter_generated ? 1 : 0,
            emp.sales_commission_percent || 0,
            emp.blood_group || null,
            emp.shift_type || 'GENERAL',
            emp.id
          );
        } else {
          const codeExists = db.prepare(`SELECT id FROM employees WHERE employee_code = ?`).get(empCode);
          if (codeExists) {
            empCode = `${empCode}-R${Date.now().toString().slice(-4)}`;
          }

          const insertStmt = emp.id ? db.prepare(`
            INSERT INTO employees (
              id, employee_code, shop_id, full_name, phone, email, address, designation,
              department, date_of_joining, monthly_basic_salary, daily_wage, hra,
              special_allowance, overtime_rate_per_hour, aadhaar_no, pan_no, bank_account, bank_ifsc, status,
              is_pf_eligible, uan_no, pf_rate_percent, custom_pf_amount, photo_url,
              father_name, emergency_phone, verification_status, welcome_letter_generated,
              sales_commission_percent, blood_group, shift_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `) : db.prepare(`
            INSERT INTO employees (
              employee_code, shop_id, full_name, phone, email, address, designation,
              department, date_of_joining, monthly_basic_salary, daily_wage, hra,
              special_allowance, overtime_rate_per_hour, aadhaar_no, pan_no, bank_account, bank_ifsc, status,
              is_pf_eligible, uan_no, pf_rate_percent, custom_pf_amount, photo_url,
              father_name, emergency_phone, verification_status, welcome_letter_generated,
              sales_commission_percent, blood_group, shift_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const params = [
            empCode,
            emp.shop_id || shop_id,
            emp.full_name,
            emp.phone,
            emp.email || null,
            emp.address || null,
            emp.designation || 'Staff',
            emp.department || 'Sales',
            emp.date_of_joining || null,
            emp.monthly_basic_salary || 0,
            emp.daily_wage || 0,
            emp.hra || 0,
            emp.special_allowance || 0,
            emp.overtime_rate_per_hour || 0,
            emp.aadhaar_no || null,
            emp.pan_no || null,
            emp.bank_account || null,
            emp.bank_ifsc || null,
            emp.is_pf_eligible ? 1 : 0,
            emp.uan_no || null,
            emp.pf_rate_percent !== undefined ? emp.pf_rate_percent : 12,
            emp.custom_pf_amount || 0,
            emp.photo_url || null,
            emp.father_name || null,
            emp.emergency_phone || null,
            emp.verification_status || 'VERIFIED',
            emp.welcome_letter_generated ? 1 : 0,
            emp.sales_commission_percent || 0,
            emp.blood_group || null,
            emp.shift_type || 'GENERAL',
            emp.created_at || new Date().toISOString()
          ];

          if (emp.id) {
            params.unshift(emp.id);
          }

          insertStmt.run(...params);
        }
        break;
      }

      case 'EXPENSE': {
        const exp = data.expense || data;
        db.prepare(`
          INSERT INTO store_expenses (
            shop_id, expense_category, title, amount, payment_mode, reference_no, expense_date, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          exp.shop_id || shop_id,
          exp.expense_category || 'GENERAL',
          exp.title,
          exp.amount || 0,
          exp.payment_mode || 'CASH',
          exp.reference_no || null,
          exp.expense_date || null,
          exp.notes || null,
          exp.created_at || new Date().toISOString()
        );
        break;
      }

      case 'QUOTATION': {
        const q = data.quotation || data;
        const items = data.items || q.items || [];

        let qNo = q.quotation_number;
        const exists = db.prepare(`SELECT id FROM quotations WHERE shop_id = ? AND quotation_number = ?`).get(q.shop_id || shop_id, qNo);
        if (exists) {
          qNo = `${qNo}-R${Date.now().toString().slice(-4)}`;
        }

        const info = db.prepare(`
          INSERT INTO quotations (
            shop_id, quotation_number, quotation_date, valid_until_date, customer_id,
            customer_name, customer_phone, customer_email, customer_gstin, customer_state_code,
            billing_address, sub_total, discount_amount, discount_percent, taxable_amount,
            cgst_amount, sgst_amount, igst_amount, round_off, grand_total, status,
            terms_conditions, notes, created_by_user_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          q.shop_id || shop_id,
          qNo,
          q.quotation_date || new Date().toISOString(),
          q.valid_until_date || null,
          q.customer_id || null,
          q.customer_name || 'Walk-in Customer',
          q.customer_phone || null,
          q.customer_email || null,
          q.customer_gstin || null,
          q.customer_state_code || '07',
          q.billing_address || null,
          q.sub_total || 0,
          q.discount_amount || 0,
          q.discount_percent || 0,
          q.taxable_amount || 0,
          q.cgst_amount || 0,
          q.sgst_amount || 0,
          q.igst_amount || 0,
          q.round_off || 0,
          q.grand_total || 0,
          q.status || 'DRAFT',
          q.terms_conditions || null,
          q.notes || null,
          q.created_by_user_id || null,
          q.created_at || new Date().toISOString()
        );

        const newQId = info.lastInsertRowid;

        if (items && Array.isArray(items) && items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO quotation_items (
              quotation_id, product_id, item_name, hsn_code, unit, unit_type,
              quantity, unit_price, discount_amount, tax_rate, taxable_value,
              cgst_amount, sgst_amount, igst_amount, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of items) {
            insertItem.run(
              newQId,
              item.product_id || null,
              item.item_name || 'Item',
              item.hsn_code || null,
              item.unit || 'PCS',
              item.unit_type || 'PRIMARY',
              item.quantity || 1,
              item.unit_price || 0,
              item.discount_amount || 0,
              item.tax_rate || 0,
              item.taxable_value || 0,
              item.cgst_amount || 0,
              item.sgst_amount || 0,
              item.igst_amount || 0,
              item.total_amount || 0
            );
          }
        }
        break;
      }

      default:
        throw new Error(`Unsupported item type: ${item_type}`);
    }

    // Delete row from recycle_bin
    db.prepare(`DELETE FROM recycle_bin WHERE id = ?`).run(recycleBinId);
  });

  tx();

  return {
    success: true,
    itemType: item_type,
    message: `"${title}" has been successfully restored to its original destination location with all details preserved!`
  };
}

// Permanently delete a single item from the recycle bin
export function permanentDeleteItem(id) {
  const db = getDb();
  const item = db.prepare(`SELECT title FROM recycle_bin WHERE id = ?`).get(id);
  if (!item) {
    throw new Error('Item not found in Recycle Bin.');
  }

  db.prepare(`DELETE FROM recycle_bin WHERE id = ?`).run(id);

  return {
    success: true,
    message: `"${item.title}" permanently deleted from Recycle Bin.`
  };
}

// Empty the entire recycle bin for the store
export function emptyRecycleBin(shopId) {
  const db = getDb();
  let query = `DELETE FROM recycle_bin`;
  const params = [];
  if (shopId) {
    query += ` WHERE shop_id = ?`;
    params.push(shopId);
  }

  const info = db.prepare(query).run(...params);

  return {
    success: true,
    deletedCount: info.changes,
    message: `Recycle Bin emptied successfully. ${info.changes} items permanently purged.`
  };
}
