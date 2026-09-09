import { getDb } from '../database/db.js';

export function getProducts(shopId, searchTerm = '') {
  const db = getDb();
  let query = `
    SELECT p.*, c.name as category_name, s.name as shop_name,
           sup.name as supplier_name, sup.phone as supplier_phone, sup.contact_person as supplier_contact
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    JOIN shops s ON p.shop_id = s.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (shopId) {
    query += ` AND p.shop_id = ?`;
    params.push(shopId);
  }

  if (searchTerm) {
    query += ` AND (p.name LIKE ? OR p.barcode LIKE ? OR p.item_code LIKE ? OR p.brand LIKE ? OR sup.name LIKE ?)`;
    const term = `%${searchTerm}%`;
    params.push(term, term, term, term, term);
  }

  query += ` ORDER BY p.id ASC`;
  const products = db.prepare(query).all(...params);

  // Attach batches and variants if applicable
  const batchStmt = db.prepare(`SELECT * FROM product_batches WHERE product_id = ? AND stock_qty > 0 ORDER BY expiry_date ASC`);
  const variantStmt = db.prepare(`SELECT * FROM product_variants WHERE product_id = ?`);
  const serialStmt = db.prepare(`SELECT * FROM product_serials WHERE product_id = ? AND status = 'AVAILABLE'`);

  return products.map(prod => {
    const batches = prod.has_batch ? batchStmt.all(prod.id) : [];
    const variants = prod.has_variants ? variantStmt.all(prod.id) : [];
    const serials = prod.has_serial_imei ? serialStmt.all(prod.id) : [];

    return {
      ...prod,
      batches,
      variants,
      serials
    };
  });
}

export function getProductByBarcode(shopId, barcode) {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, sup.name as supplier_name, sup.phone as supplier_phone
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE (p.barcode = ? OR p.item_code = ?) AND p.shop_id = ? AND p.is_active = 1
  `).get(barcode, barcode, shopId);

  if (!product) return null;

  const batches = product.has_batch ? db.prepare(`SELECT * FROM product_batches WHERE product_id = ? AND stock_qty > 0`).all(product.id) : [];
  const variants = product.has_variants ? db.prepare(`SELECT * FROM product_variants WHERE product_id = ?`).all(product.id) : [];
  const serials = product.has_serial_imei ? db.prepare(`SELECT * FROM product_serials WHERE product_id = ? AND status = 'AVAILABLE'`).all(product.id) : [];

  return {
    ...product,
    batches,
    variants,
    serials
  };
}

export function createOrUpdateProduct(prodData) {
  const db = getDb();
  if (prodData.id) {
    // Update
    const stmt = db.prepare(`
      UPDATE products
      SET shop_id = ?, barcode = ?, item_code = ?, name = ?, regional_name = ?, category_id = ?,
          supplier_id = ?, brand = ?, image_url = ?, hsn_code = ?, tax_rate = ?, cess_rate = ?, unit = ?, secondary_unit = ?,
          unit_conversion_factor = ?, purchase_rate = ?, mrp = ?, retail_rate = ?, wholesale_rate = ?,
          dealer_rate = ?, current_stock = ?, min_stock_alert = ?, has_batch = ?, has_serial_imei = ?,
          has_variants = ?, trade_scheme = ?, default_batch_no = ?, default_expiry_date = ?, default_size = ?, default_color = ?, is_active = ?
      WHERE id = ?
    `);

    stmt.run(
      prodData.shop_id, prodData.barcode || null, prodData.item_code || null, prodData.name,
      prodData.regional_name || null, prodData.category_id || null, prodData.supplier_id || null, prodData.brand || null,
      prodData.image_url !== undefined ? prodData.image_url : null,
      prodData.hsn_code || '1905', prodData.tax_rate || 18, prodData.cess_rate || 0,
      prodData.unit || 'PCS', prodData.secondary_unit || null, prodData.unit_conversion_factor || 1,
      prodData.purchase_rate || 0, prodData.mrp || 0, prodData.retail_rate || 0,
      prodData.wholesale_rate || 0, prodData.dealer_rate || 0, prodData.current_stock || 0,
      prodData.min_stock_alert || 5, prodData.has_batch ? 1 : 0, prodData.has_serial_imei ? 1 : 0,
      prodData.has_variants ? 1 : 0, prodData.trade_scheme || null,
      prodData.default_batch_no || null, prodData.default_expiry_date || null,
      prodData.default_size || null, prodData.default_color || null,
      prodData.is_active !== undefined ? prodData.is_active : 1,
      prodData.id
    );

    // If batch provided, upsert into product_batches
    if (prodData.has_batch && prodData.default_batch_no && prodData.default_expiry_date) {
      try {
        const existing = db.prepare(`SELECT id FROM product_batches WHERE product_id = ? AND batch_no = ?`).get(prodData.id, prodData.default_batch_no);
        if (existing) {
          db.prepare(`UPDATE product_batches SET expiry_date = ?, stock_qty = ?, mrp = ?, selling_rate = ? WHERE id = ?`)
            .run(prodData.default_expiry_date, prodData.current_stock || 0, prodData.mrp || 0, prodData.retail_rate || 0, existing.id);
        } else {
          db.prepare(`INSERT INTO product_batches (product_id, shop_id, batch_no, expiry_date, purchase_rate, mrp, selling_rate, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(prodData.id, prodData.shop_id, prodData.default_batch_no, prodData.default_expiry_date, prodData.purchase_rate || 0, prodData.mrp || 0, prodData.retail_rate || 0, prodData.current_stock || 0);
        }
      } catch (e) {}
    }

    return { success: true, message: 'Product updated successfully.' };
  } else {
    // Create
    const stmt = db.prepare(`
      INSERT INTO products (
        shop_id, barcode, item_code, name, regional_name, category_id, supplier_id, brand, image_url, hsn_code,
        tax_rate, cess_rate, unit, secondary_unit, unit_conversion_factor, purchase_rate,
        mrp, retail_rate, wholesale_rate, dealer_rate, current_stock, min_stock_alert,
        has_batch, has_serial_imei, has_variants, trade_scheme, default_batch_no, default_expiry_date, default_size, default_color, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const info = stmt.run(
      prodData.shop_id, prodData.barcode || null, prodData.item_code || null, prodData.name,
      prodData.regional_name || null, prodData.category_id || null, prodData.supplier_id || null, prodData.brand || null,
      prodData.image_url || null,
      prodData.hsn_code || '1905', prodData.tax_rate || 18, prodData.cess_rate || 0,
      prodData.unit || 'PCS', prodData.secondary_unit || null, prodData.unit_conversion_factor || 1,
      prodData.purchase_rate || 0, prodData.mrp || 0, prodData.retail_rate || 0,
      prodData.wholesale_rate || 0, prodData.dealer_rate || 0, prodData.current_stock || 0,
      prodData.min_stock_alert || 5, prodData.has_batch ? 1 : 0, prodData.has_serial_imei ? 1 : 0,
      prodData.has_variants ? 1 : 0, prodData.trade_scheme || null,
      prodData.default_batch_no || null, prodData.default_expiry_date || null,
      prodData.default_size || null, prodData.default_color || null
    );

    const newProductId = info.lastInsertRowid;

    // If batch provided, insert into product_batches
    if (prodData.has_batch && prodData.default_batch_no && prodData.default_expiry_date) {
      try {
        db.prepare(`INSERT INTO product_batches (product_id, shop_id, batch_no, expiry_date, purchase_rate, mrp, selling_rate, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(newProductId, prodData.shop_id, prodData.default_batch_no, prodData.default_expiry_date, prodData.purchase_rate || 0, prodData.mrp || 0, prodData.retail_rate || 0, prodData.current_stock || 0);
      } catch (e) {}
    }

    return { success: true, id: newProductId, message: 'New product added successfully.' };
  }
}

import { moveToRecycleBin } from './recycleBinService.js';

export function deleteProduct(productId, user = null) {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Fetch product batches, serials, variants
  const batches = db.prepare('SELECT * FROM product_batches WHERE product_id = ?').all(productId);
  const serials = db.prepare('SELECT * FROM product_serials WHERE product_id = ?').all(productId);

  // Archive to Recycle Bin (30-day retention)
  try {
    moveToRecycleBin({
      shopId: product.shop_id || 1,
      itemType: 'PRODUCT',
      originalId: product.id,
      title: `Product: ${product.name}`,
      subtitle: `Barcode: ${product.barcode || 'N/A'} • Stock: ${product.stock_quantity || 0} ${product.unit || 'PCS'} • Selling: ₹${product.selling_price || product.retail_rate || 0}`,
      data: {
        product,
        batches,
        serials
      },
      userId: user?.id || null,
      userName: user?.displayName || user?.username || 'Store Admin'
    });
  } catch (archiveErr) {
    console.warn('Failed to archive product to recycle bin:', archiveErr.message);
  }

  // Check if product is referenced in invoice items
  const count = db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?').get(productId);
  if (count && count.count > 0) {
    // Soft delete to preserve past sales audit trail
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(productId);
    return { success: true, message: 'Product moved to Recycle Bin (sales history preserved).' };
  } else {
    // Delete product record (safely archived in recycle bin)
    db.prepare('DELETE FROM product_batches WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM product_serials WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    return { success: true, message: 'Product moved to Recycle Bin (retained for 30 days).' };
  }
}

export function getCategories(shopId) {
  const db = getDb();
  return db.prepare(`SELECT * FROM categories ${shopId ? 'WHERE shop_id = ?' : ''} ORDER BY name ASC`).all(...(shopId ? [shopId] : []));
}

export function getExpiryAnalysis(shopId) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Check product_batches
  const batchList = db.prepare(`
    SELECT pb.*, p.name as product_name, p.barcode, p.unit, p.hsn_code,
           c.name as category_name, sup.name as supplier_name, sup.phone as supplier_phone
    FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE pb.shop_id = ? AND pb.stock_qty > 0 AND p.is_active = 1
    ORDER BY pb.expiry_date ASC
  `).all(shopId);

  // 2. Check direct products with default_expiry_date
  const directList = db.prepare(`
    SELECT p.id as product_id, p.name as product_name, p.barcode, p.unit, p.hsn_code,
           p.default_batch_no as batch_no, p.default_expiry_date as expiry_date,
           p.purchase_rate, p.mrp, p.retail_rate as selling_rate, p.current_stock as stock_qty,
           c.name as category_name, sup.name as supplier_name, sup.phone as supplier_phone
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE p.shop_id = ? AND p.default_expiry_date IS NOT NULL AND p.current_stock > 0 AND p.is_active = 1
          AND p.id NOT IN (SELECT DISTINCT product_id FROM product_batches WHERE shop_id = ? AND stock_qty > 0)
    ORDER BY p.default_expiry_date ASC
  `).all(shopId, shopId);

  const allItems = [...batchList, ...directList];

  const expired = [];
  const within15Days = [];
  const within30Days = [];
  const within60Days = [];
  const within90Days = [];
  const safeStock = [];

  const nowDate = new Date(today);

  for (const item of allItems) {
    if (!item.expiry_date) continue;
    const expDate = new Date(item.expiry_date);
    const diffTime = expDate - nowDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const enriched = {
      ...item,
      daysToExpiry: diffDays,
      status: diffDays < 0 ? 'EXPIRED' : (diffDays <= 15 ? 'CRITICAL_15' : (diffDays <= 30 ? 'EXPIRING_30' : (diffDays <= 60 ? 'EXPIRING_60' : 'EXPIRING_90')))
    };

    if (diffDays < 0) {
      expired.push(enriched);
    } else if (diffDays <= 15) {
      within15Days.push(enriched);
    } else if (diffDays <= 30) {
      within30Days.push(enriched);
    } else if (diffDays <= 60) {
      within60Days.push(enriched);
    } else if (diffDays <= 90) {
      within90Days.push(enriched);
    } else {
      safeStock.push(enriched);
    }
  }

  return {
    summary: {
      expiredCount: expired.length,
      within15Count: within15Days.length,
      within30Count: within30Days.length,
      within60Count: within60Days.length,
      within90Count: within90Days.length,
      totalTracked: allItems.length
    },
    expired,
    within15Days,
    within30Days,
    within60Days,
    within90Days,
    allTracked: allItems
  };
}

export function getLowStockAutoReorder(shopId) {
  const db = getDb();
  const lowItems = db.prepare(`
    SELECT p.*, c.name as category_name,
           sup.id as supplier_id, sup.name as supplier_name, sup.phone as supplier_phone, sup.email as supplier_email,
           (p.min_stock_alert * 3 - p.current_stock) as suggested_reorder_qty,
           ((p.min_stock_alert * 3 - p.current_stock) * p.purchase_rate) as estimated_cost
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers sup ON p.supplier_id = sup.id
    WHERE p.shop_id = ? AND p.current_stock <= p.min_stock_alert AND p.is_active = 1
    ORDER BY (p.current_stock / NULLIF(p.min_stock_alert, 0)) ASC
  `).all(shopId);

  // Group by supplier
  const supplierGroups = {};
  for (const item of lowItems) {
    const sId = item.supplier_id || 'UNASSIGNED';
    const sName = item.supplier_name || 'Direct / Local Purchase';
    if (!supplierGroups[sId]) {
      supplierGroups[sId] = {
        supplierId: sId,
        supplierName: sName,
        supplierPhone: item.supplier_phone || '',
        supplierEmail: item.supplier_email || '',
        items: [],
        totalEstimatedCost: 0
      };
    }
    supplierGroups[sId].items.push(item);
    supplierGroups[sId].totalEstimatedCost += Math.max(0, item.estimated_cost || 0);
  }

  return {
    lowStockCount: lowItems.length,
    lowItems,
    supplierGroups: Object.values(supplierGroups)
  };
}

