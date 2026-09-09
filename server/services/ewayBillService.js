import { getDb } from '../database/db.js';

/**
 * Indian GST E-Way Bill & B2B E-Invoicing JSON Generation Service
 * Compliant with NIC E-Way Bill System Specification v1.04 & E-Invoice Schema v1.1
 */

// Helper to format date to DD/MM/YYYY
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('en-GB');
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) {
    const fallback = new Date(dateStr);
    if (isNaN(fallback.getTime())) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }
    return `${String(fallback.getDate()).padStart(2, '0')}/${String(fallback.getMonth() + 1).padStart(2, '0')}/${fallback.getFullYear()}`;
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Generate NIC Standard E-Way Bill JSON Payload
export function generateEWayBillJson(invoiceId, transporterData = {}) {
  const db = getDb();

  const cleanInvoiceId = String(invoiceId || '').replace(/^#/, '').trim();
  const invoice = db.prepare(`
    SELECT * FROM invoices 
    WHERE id = ? OR invoice_number = ? OR invoice_number = ?
    LIMIT 1
  `).get(invoiceId, invoiceId, cleanInvoiceId);

  if (!invoice) {
    throw new Error(`Invoice #${invoiceId} not found in database.`);
  }

  // Get Shop / Business profile from `shops` table
  let shop = null;
  if (invoice.shop_id) {
    shop = db.prepare(`SELECT * FROM shops WHERE id = ?`).get(invoice.shop_id);
  }
  if (!shop) {
    shop = db.prepare(`SELECT * FROM shops LIMIT 1`).get() || {};
  }

  const shopName = shop.name || shop.legal_name || 'KwikStore Retailer';
  const shopGstin = shop.gstin || '21AAAAA0000A1Z5';
  const shopAddress = shop.address || 'Shop Premise';
  const shopCity = shop.city || 'Bhubaneswar';
  const shopPincode = parseInt(shop.pincode || '751001', 10);
  const sellerStateCode = parseInt(shop.state_code || '21', 10);

  // Get Customer / Recipient
  let customer = null;
  if (invoice.customer_id) {
    customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(invoice.customer_id);
  }

  const customerGstin = customer?.gstin || invoice.customer_gstin || transporterData.toGstin || 'URP';
  const customerName = customer?.name || invoice.customer_name || transporterData.toTrdName || 'Retail Customer';
  const customerAddr = customer?.address || invoice.billing_address || transporterData.toAddr1 || 'Delivery Location';
  const customerCity = customer?.city || transporterData.toPlace || shopCity;
  const customerPincode = parseInt(customer?.pincode || transporterData.toPincode || shop.pincode || '751001', 10);
  const buyerStateCode = parseInt(customer?.state_code || invoice.customer_state_code || shop.state_code || '21', 10);

  // Load items: from invoice_items table or invoice.items JSON
  let items = [];
  try {
    items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoice.id);
  } catch (e) {
    items = [];
  }

  if (!items || items.length === 0) {
    if (invoice.items) {
      try {
        items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      } catch (e) {
        items = [];
      }
    }
  }

  // If still empty, add a default fallback goods line item
  if (!items || items.length === 0) {
    items = [{
      item_name: 'General Goods',
      quantity: 1,
      unit_price: Number(invoice.grand_total || invoice.total_amount || 0),
      taxable_value: Number(invoice.taxable_amount || invoice.grand_total || 0),
      tax_rate: 18,
      hsn_code: '1905',
      unit: 'NOS'
    }];
  }

  const isInterState = sellerStateCode !== buyerStateCode;

  // Format Items according to E-Way Bill Schema
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;

  const itemList = items.map((item, index) => {
    const qty = Number(item.quantity || item.qty || 1);
    const unitPrice = Number(item.unit_price || item.price || 0);
    const taxRate = Number(item.tax_rate || item.taxRate || item.gst_rate || 0);
    const taxableAmt = Number(item.taxable_value || item.taxableAmount || (unitPrice * qty));
    
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;

    if (isInterState) {
      igstRate = taxRate;
      igstAmt = (taxableAmt * igstRate) / 100;
    } else {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmt = (taxableAmt * cgstRate) / 100;
      sgstAmt = (taxableAmt * sgstRate) / 100;
    }

    totalTaxable += taxableAmt;
    totalCgst += cgstAmt;
    totalSgst += sgstAmt;
    totalIgst += igstAmt;

    return {
      itemNo: index + 1,
      productName: (item.item_name || item.name || item.product_name || 'Goods').substring(0, 100),
      productDesc: (item.variant_details || item.category || item.item_name || item.name || 'General Merchandise').substring(0, 100),
      hsnCode: Number(String(item.hsn_code || item.hsn || item.hsnCode || '1905').replace(/[^0-9]/g, '')) || 1905,
      quantity: qty,
      qtyUnit: (item.unit || 'NOS').toUpperCase().substring(0, 3),
      cgstRate: Number(cgstRate.toFixed(2)),
      sgstRate: Number(sgstRate.toFixed(2)),
      igstRate: Number(igstRate.toFixed(2)),
      cessRate: 0,
      cessNonAdvol: 0,
      taxableAmount: Number(taxableAmt.toFixed(2))
    };
  });

  const grandTotal = Number(invoice.grand_total || invoice.total_amount || (totalTaxable + totalCgst + totalSgst + totalIgst));

  // Build NIC E-Way Bill JSON Object
  const ewayBillPayload = {
    version: "1.0.0421",
    billLists: [
      {
        userGstin: shopGstin,
        supplyType: transporterData.supplyType || 'O', // O = Outward
        subSupplyType: transporterData.subSupplyType || '1', // 1 = Supply
        subSupplyDesc: transporterData.subSupplyDesc || '',
        docType: transporterData.docType || 'INV', // Tax Invoice
        docNo: invoice.invoice_number,
        docDate: formatDateDDMMYYYY(invoice.invoice_date || invoice.created_at),
        fromGstin: shopGstin,
        fromTrdName: shopName,
        fromAddr1: shopAddress,
        fromAddr2: shop.area || '',
        fromPlace: shopCity,
        fromPincode: shopPincode,
        fromStateCode: sellerStateCode,
        actualFromStateCode: sellerStateCode,
        toGstin: customerGstin,
        toTrdName: customerName,
        toAddr1: customerAddr,
        toAddr2: '',
        toPlace: customerCity,
        toPincode: customerPincode,
        toStateCode: buyerStateCode,
        actualToStateCode: buyerStateCode,
        totalValue: Number(totalTaxable.toFixed(2)),
        cgstValue: Number(totalCgst.toFixed(2)),
        sgstValue: Number(totalSgst.toFixed(2)),
        igstValue: Number(totalIgst.toFixed(2)),
        cessValue: Number(totalCess.toFixed(2)),
        totInvValue: Number(grandTotal.toFixed(2)),
        transMode: transporterData.transMode || '1', // 1 = Road, 2 = Rail, 3 = Air, 4 = Ship
        transDistance: String(transporterData.transDistance || '25'),
        transporterName: transporterData.transporterName || '',
        transporterId: transporterData.transporterId || '',
        transDocNo: transporterData.transDocNo || '',
        transDocDate: transporterData.transDocDate ? formatDateDDMMYYYY(transporterData.transDocDate) : '',
        vehicleNo: (transporterData.vehicleNo || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
        vehicleType: transporterData.vehicleType || 'R', // R = Regular, O = Over Dimensional
        itemList: itemList
      }
    ]
  };

  // Auto-record E-Way Bill in SQLite database
  let ewayBillRecordId = null;
  try {
    ewayBillRecordId = saveEWayBillRecord(invoice, transporterData, ewayBillPayload);
  } catch (saveErr) {
    console.warn('Auto-save eway bill record note:', saveErr.message);
  }

  return {
    success: true,
    invoiceNumber: invoice.invoice_number,
    ewayBillId: ewayBillRecordId,
    ewayBillPayload,
    summary: {
      docNo: invoice.invoice_number,
      docDate: invoice.invoice_date || invoice.created_at,
      fromGstin: shopGstin,
      toGstin: customerGstin,
      totalValue: grandTotal,
      itemCount: itemList.length,
      vehicleNo: transporterData.vehicleNo || 'N/A'
    }
  };
}

// Generate NIC Standard B2B E-Invoice JSON Payload (e-Invoice Standard v1.1)
export function generateEInvoiceJson(invoiceId) {
  const db = getDb();

  const cleanInvoiceId = String(invoiceId || '').replace(/^#/, '').trim();
  const invoice = db.prepare(`
    SELECT * FROM invoices 
    WHERE id = ? OR invoice_number = ? OR invoice_number = ?
    LIMIT 1
  `).get(invoiceId, invoiceId, cleanInvoiceId);

  if (!invoice) throw new Error(`Invoice #${invoiceId} not found in database.`);

  let shop = null;
  if (invoice.shop_id) {
    shop = db.prepare(`SELECT * FROM shops WHERE id = ?`).get(invoice.shop_id);
  }
  if (!shop) {
    shop = db.prepare(`SELECT * FROM shops LIMIT 1`).get() || {};
  }

  const shopName = shop.name || shop.legal_name || 'KwikStore Retailer';
  const shopGstin = shop.gstin || '21AAAAA0000A1Z5';
  const shopAddress = shop.address || 'Main Market Road';
  const shopCity = shop.city || 'Bhubaneswar';
  const shopPincode = parseInt(shop.pincode || '751001', 10);
  const sellerState = String(shop.state_code || '21').padStart(2, '0');

  let customer = null;
  if (invoice.customer_id) {
    customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(invoice.customer_id);
  }

  const customerGstin = customer?.gstin || invoice.customer_gstin || 'URP';
  const customerName = customer?.name || invoice.customer_name || 'Retail Client';
  const customerAddr = customer?.address || invoice.billing_address || 'Customer Location';
  const customerCity = customer?.city || shopCity;
  const customerPincode = parseInt(customer?.pincode || shop.pincode || '751001', 10);
  const buyerState = String(customer?.state_code || invoice.customer_state_code || shop.state_code || '21').padStart(2, '0');

  let items = [];
  try {
    items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoice.id);
  } catch (e) {
    items = [];
  }

  if (!items || items.length === 0) {
    if (invoice.items) {
      try {
        items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      } catch (e) {
        items = [];
      }
    }
  }

  if (!items || items.length === 0) {
    items = [{
      item_name: 'General Goods',
      quantity: 1,
      unit_price: Number(invoice.grand_total || invoice.total_amount || 0),
      taxable_value: Number(invoice.taxable_amount || invoice.grand_total || 0),
      tax_rate: 18,
      hsn_code: '1905',
      unit: 'NOS'
    }];
  }

  const isInter = sellerState !== buyerState;

  let totalTaxable = 0;
  let totCgst = 0;
  let totSgst = 0;
  let totIgst = 0;

  const itemDetails = items.map((item, idx) => {
    const qty = Number(item.quantity || item.qty || 1);
    const rate = Number(item.unit_price || item.price || 0);
    const taxRate = Number(item.tax_rate || item.taxRate || item.gst_rate || 0);
    const totAmt = rate * qty;
    const taxable = Number(item.taxable_value || item.taxableAmount || totAmt);

    const cgst = isInter ? 0 : (taxable * (taxRate / 2)) / 100;
    const sgst = isInter ? 0 : (taxable * (taxRate / 2)) / 100;
    const igst = isInter ? (taxable * taxRate) / 100 : 0;

    totalTaxable += taxable;
    totCgst += cgst;
    totSgst += sgst;
    totIgst += igst;

    return {
      ItemSeqNo: String(idx + 1),
      PrdDesc: (item.item_name || item.name || item.product_name || 'Goods').substring(0, 100),
      IsServc: "N",
      HsnCd: String(item.hsn_code || item.hsn || item.hsnCode || '1905').replace(/[^0-9]/g, '') || '1905',
      Qty: qty,
      Unit: (item.unit || 'NOS').toUpperCase().substring(0, 3),
      UnitPrice: rate,
      TotAmt: totAmt,
      Discount: Number(item.discount_amount || 0),
      AssAmt: taxable,
      GstRt: taxRate,
      IgstAmt: Number(igst.toFixed(2)),
      CgstAmt: Number(cgst.toFixed(2)),
      SgstAmt: Number(sgst.toFixed(2)),
      CesRt: 0,
      CesAmt: 0,
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: Number((taxable + cgst + sgst + igst).toFixed(2))
    };
  });

  const grandTotal = Number(invoice.grand_total || invoice.total_amount || (totalTaxable + totCgst + totSgst + totIgst));

  const einvoicePayload = {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: (customerGstin && customerGstin !== 'URP') ? "B2B" : "B2C",
      RegRev: "N",
      EcmGstin: null,
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoice_number,
      Dt: formatDateDDMMYYYY(invoice.invoice_date || invoice.created_at)
    },
    SellerDtls: {
      Gstin: shopGstin,
      LglNm: shopName,
      TrdNm: shopName,
      Addr1: shopAddress,
      Loc: shopCity,
      Pin: shopPincode,
      Stcd: sellerState,
      Ph: shop.phone || '',
      Em: shop.email || ''
    },
    BuyerDtls: {
      Gstin: customerGstin,
      LglNm: customerName,
      TrdNm: customerName,
      Pos: buyerState,
      Addr1: customerAddr,
      Loc: customerCity,
      Pin: customerPincode,
      Stcd: buyerState,
      Ph: customer?.phone || invoice.customer_phone || ''
    },
    ItemList: itemDetails,
    ValDtls: {
      AssVal: Number(totalTaxable.toFixed(2)),
      CgstVal: Number(totCgst.toFixed(2)),
      SgstVal: Number(totSgst.toFixed(2)),
      IgstVal: Number(totIgst.toFixed(2)),
      CesVal: 0,
      StCesVal: 0,
      Discount: Number(invoice.discount_amount || 0),
      OthChrg: 0,
      RndOffAmt: Number(invoice.round_off || 0),
      TotInvVal: Number(grandTotal.toFixed(2))
    }
  };

  return {
    success: true,
    invoiceNumber: invoice.invoice_number,
    einvoicePayload
  };
}

// -------------------------------------------------------------
// Database CRUD Operations for E-Way Bills
// -------------------------------------------------------------

export function getAllEWayBills(shopId = null, search = '', status = 'ALL') {
  const db = getDb();
  let query = `
    SELECT e.*, 
           s.name as shop_name, s.gstin as shop_gstin,
           i.invoice_date, i.payment_status
    FROM eway_bills e
    LEFT JOIN shops s ON e.shop_id = s.id
    LEFT JOIN invoices i ON e.invoice_id = i.id
    WHERE 1=1
  `;
  const params = [];

  if (shopId) {
    query += ` AND e.shop_id = ?`;
    params.push(shopId);
  }

  if (status && status !== 'ALL') {
    query += ` AND e.status = ?`;
    params.push(status);
  }

  if (search && search.trim()) {
    query += ` AND (
      e.invoice_number LIKE ? OR 
      e.vehicle_no LIKE ? OR 
      e.eway_bill_no LIKE ? OR 
      e.customer_name LIKE ? OR 
      e.transporter_name LIKE ?
    )`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s, s);
  }

  query += ` ORDER BY e.id DESC`;

  return db.prepare(query).all(...params);
}

export function getEWayBillById(id) {
  const db = getDb();
  const ewayBill = db.prepare(`
    SELECT e.*, s.name as shop_name, s.gstin as shop_gstin, s.address as shop_address, s.city as shop_city, s.pincode as shop_pincode, s.state_code as shop_state_code
    FROM eway_bills e
    LEFT JOIN shops s ON e.shop_id = s.id
    WHERE e.id = ?
  `).get(id);

  if (!ewayBill) throw new Error('E-Way Bill record not found.');
  return ewayBill;
}

export function saveEWayBillRecord(invoice, transporterData = {}, payload = null) {
  const db = getDb();
  const shopId = invoice.shop_id || 1;
  const invNumber = invoice.invoice_number;
  const vehicleNo = (transporterData.vehicleNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const distanceKm = Number(transporterData.transDistance || 50);
  const totalAmount = Number(invoice.grand_total || invoice.total_amount || 0);

  // Check if an e-way bill record already exists for this invoice
  const existing = db.prepare(`SELECT id FROM eway_bills WHERE invoice_number = ? LIMIT 1`).get(invNumber);

  if (existing) {
    db.prepare(`
      UPDATE eway_bills SET
        vehicle_no = ?,
        transporter_id = ?,
        transporter_name = ?,
        distance_km = ?,
        transport_mode = ?,
        vehicle_type = ?,
        supply_type = ?,
        sub_supply_type = ?,
        customer_name = ?,
        customer_gstin = ?,
        total_amount = ?,
        payload_json = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      vehicleNo,
      transporterData.transporterId || '',
      transporterData.transporterName || '',
      distanceKm,
      transporterData.transMode || '1',
      transporterData.vehicleType || 'R',
      transporterData.supplyType || 'O',
      transporterData.subSupplyType || '1',
      invoice.customer_name || 'Retail Customer',
      invoice.customer_gstin || 'URP',
      totalAmount,
      payload ? JSON.stringify(payload) : null,
      existing.id
    );
    return existing.id;
  } else {
    const info = db.prepare(`
      INSERT INTO eway_bills (
        shop_id, invoice_id, invoice_number, eway_bill_no, vehicle_no,
        transporter_id, transporter_name, distance_km, transport_mode,
        vehicle_type, supply_type, sub_supply_type, status, customer_name,
        customer_gstin, total_amount, payload_json, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GENERATED', ?, ?, ?, ?, ?)
    `).run(
      shopId,
      invoice.id || null,
      invNumber,
      transporterData.ewayBillNo || null,
      vehicleNo,
      transporterData.transporterId || '',
      transporterData.transporterName || '',
      distanceKm,
      transporterData.transMode || '1',
      transporterData.vehicleType || 'R',
      transporterData.supplyType || 'O',
      transporterData.subSupplyType || '1',
      invoice.customer_name || 'Retail Customer',
      invoice.customer_gstin || 'URP',
      totalAmount,
      payload ? JSON.stringify(payload) : null,
      transporterData.notes || ''
    );
    return info.lastInsertRowid;
  }
}

export function updateEWayBill(id, data = {}) {
  const db = getDb();
  const current = db.prepare(`SELECT * FROM eway_bills WHERE id = ?`).get(id);
  if (!current) throw new Error(`E-Way Bill #${id} not found.`);

  db.prepare(`
    UPDATE eway_bills SET
      eway_bill_no = COALESCE(?, eway_bill_no),
      vehicle_no = COALESCE(?, vehicle_no),
      transporter_id = COALESCE(?, transporter_id),
      transporter_name = COALESCE(?, transporter_name),
      distance_km = COALESCE(?, distance_km),
      transport_mode = COALESCE(?, transport_mode),
      vehicle_type = COALESCE(?, vehicle_type),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(
    data.eway_bill_no !== undefined ? data.eway_bill_no : null,
    data.vehicle_no !== undefined ? data.vehicle_no.toUpperCase().replace(/[^A-Z0-9]/g, '') : null,
    data.transporter_id !== undefined ? data.transporter_id : null,
    data.transporter_name !== undefined ? data.transporter_name : null,
    data.distance_km !== undefined ? Number(data.distance_km) : null,
    data.transport_mode !== undefined ? data.transport_mode : null,
    data.vehicle_type !== undefined ? data.vehicle_type : null,
    data.status !== undefined ? data.status : null,
    data.notes !== undefined ? data.notes : null,
    id
  );

  return getEWayBillById(id);
}

export function deleteEWayBill(id) {
  const db = getDb();
  const info = db.prepare(`DELETE FROM eway_bills WHERE id = ?`).run(id);
  if (info.changes === 0) throw new Error(`E-Way Bill #${id} not found.`);
  return { success: true, message: `E-Way Bill #${id} deleted successfully.` };
}
