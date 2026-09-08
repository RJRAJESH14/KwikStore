import { getDb } from '../database/db.js';

/**
 * Indian GST E-Way Bill & B2B E-Invoicing JSON Generation Service
 * Compliant with NIC E-Way Bill System Specification v1.04 & E-Invoice Schema v1.1
 */

// Helper to format date to DD/MM/YYYY
function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Generate NIC Standard E-Way Bill JSON Payload
export function generateEWayBillJson(invoiceId, transporterData = {}) {
  const db = getDb();

  const invoice = db.prepare(`
    SELECT * FROM invoices WHERE id = ? OR invoice_number = ?
  `).get(invoiceId, invoiceId);

  if (!invoice) {
    throw new Error(`Invoice #${invoiceId} not found.`);
  }

  // Get Shop / Business profile (Seller)
  const shop = db.prepare(`
    SELECT * FROM shop_profile LIMIT 1
  `).get() || {
    shop_name: 'KwikStore Retailer',
    gst_number: '21AAAAA0000A1Z5',
    address: 'Main Road',
    city: 'Bhubaneswar',
    pincode: '751001',
    state: 'Odisha',
    state_code: '21',
    phone: '9876543210'
  };

  // Get Customer / Recipient
  let customer = null;
  if (invoice.customer_id) {
    customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(invoice.customer_id);
  }

  // Parse invoice items
  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch (e) {
    items = [];
  }

  const sellerStateCode = parseInt(shop.state_code || '21', 10);
  const buyerStateCode = parseInt(customer?.state_code || shop.state_code || '21', 10);
  const isInterState = sellerStateCode !== buyerStateCode;

  // Format Items according to E-Way Bill Schema
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;

  const itemList = items.map((item, index) => {
    const qty = Number(item.qty || item.quantity || 1);
    const unitPrice = Number(item.price || item.unitPrice || 0);
    const taxRate = Number(item.taxRate || item.gst_rate || 0);
    const taxableAmt = Number(item.taxableAmount || (unitPrice * qty));
    
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
      productName: (item.name || item.product_name || 'Goods').substring(0, 100),
      productDesc: (item.category || item.name || 'General Merchandise').substring(0, 100),
      hsnCode: Number(item.hsn || item.hsnCode || 999999),
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

  const grandTotal = Number(invoice.total_amount || (totalTaxable + totalCgst + totalSgst + totalIgst));

  // Build NIC E-Way Bill JSON Object
  const ewayBillPayload = {
    version: "1.0.0421",
    billLists: [
      {
        userGstin: shop.gst_number || '21AAAAA0000A1Z5',
        supplyType: transporterData.supplyType || 'O', // O = Outward
        subSupplyType: transporterData.subSupplyType || '1', // 1 = Supply
        subSupplyDesc: transporterData.subSupplyDesc || '',
        docType: transporterData.docType || 'INV', // Tax Invoice
        docNo: invoice.invoice_number,
        docDate: formatDateDDMMYYYY(invoice.created_at || new Date().toISOString()),
        fromGstin: shop.gst_number || '21AAAAA0000A1Z5',
        fromTrdName: shop.shop_name,
        fromAddr1: shop.address || 'Shop Premise',
        fromAddr2: shop.area || '',
        fromPlace: shop.city || 'Bhubaneswar',
        fromPincode: parseInt(shop.pincode || '751001', 10),
        fromStateCode: sellerStateCode,
        actualFromStateCode: sellerStateCode,
        toGstin: customer?.gst_number || transporterData.toGstin || 'URP', // Unregistered Person
        toTrdName: customer?.name || transporterData.toTrdName || 'Retail Customer',
        toAddr1: customer?.address || transporterData.toAddr1 || 'Delivery Location',
        toAddr2: '',
        toPlace: customer?.city || transporterData.toPlace || shop.city || 'Bhubaneswar',
        toPincode: parseInt(customer?.pincode || transporterData.toPincode || shop.pincode || '751001', 10),
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

  return {
    success: true,
    invoiceNumber: invoice.invoice_number,
    ewayBillPayload,
    summary: {
      docNo: invoice.invoice_number,
      docDate: invoice.created_at,
      fromGstin: shop.gst_number,
      toGstin: customer?.gst_number || 'URP',
      totalValue: grandTotal,
      itemCount: itemList.length,
      vehicleNo: transporterData.vehicleNo || 'N/A'
    }
  };
}

// Generate NIC Standard B2B E-Invoice JSON Payload (e-Invoice Standard v1.1)
export function generateEInvoiceJson(invoiceId) {
  const db = getDb();

  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ? OR invoice_number = ?`).get(invoiceId, invoiceId);
  if (!invoice) throw new Error(`Invoice #${invoiceId} not found.`);

  const shop = db.prepare(`SELECT * FROM shop_profile LIMIT 1`).get() || {
    shop_name: 'KwikStore Retailer',
    gst_number: '21AAAAA0000A1Z5',
    address: 'Main Market Road',
    city: 'Bhubaneswar',
    pincode: '751001',
    state: 'Odisha',
    state_code: '21',
    phone: '9876543210',
    email: 'info@store.com'
  };

  let customer = null;
  if (invoice.customer_id) {
    customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(invoice.customer_id);
  }

  let items = [];
  try {
    items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
  } catch (e) {
    items = [];
  }

  const sellerState = String(shop.state_code || '21').padStart(2, '0');
  const buyerState = String(customer?.state_code || shop.state_code || '21').padStart(2, '0');
  const isInter = sellerState !== buyerState;

  let totalTaxable = 0;
  let totCgst = 0;
  let totSgst = 0;
  let totIgst = 0;

  const itemDetails = items.map((item, idx) => {
    const qty = Number(item.qty || 1);
    const rate = Number(item.price || 0);
    const taxRate = Number(item.taxRate || item.gst_rate || 0);
    const totAmt = rate * qty;
    const taxable = Number(item.taxableAmount || totAmt);

    const cgst = isInter ? 0 : (taxable * (taxRate / 2)) / 100;
    const sgst = isInter ? 0 : (taxable * (taxRate / 2)) / 100;
    const igst = isInter ? (taxable * taxRate) / 100 : 0;

    totalTaxable += taxable;
    totCgst += cgst;
    totSgst += sgst;
    totIgst += igst;

    return {
      ItemSeqNo: String(idx + 1),
      PrdDesc: item.name || 'Goods',
      IsServc: "N",
      HsnCd: String(item.hsn || 999999),
      Qty: qty,
      Unit: (item.unit || 'NOS').toUpperCase().substring(0, 3),
      UnitPrice: rate,
      TotAmt: totAmt,
      Discount: 0,
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

  const grandTotal = Number(invoice.total_amount || (totalTaxable + totCgst + totSgst + totIgst));

  const einvoicePayload = {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: customer?.gst_number ? "B2B" : "B2C",
      RegRev: "N",
      EcmGstin: null,
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoice_number,
      Dt: formatDateDDMMYYYY(invoice.created_at)
    },
    SellerDtls: {
      Gstin: shop.gst_number || '21AAAAA0000A1Z5',
      LglNm: shop.shop_name,
      TrdNm: shop.shop_name,
      Addr1: shop.address || 'Shop Address',
      Loc: shop.city || 'Bhubaneswar',
      Pin: parseInt(shop.pincode || '751001', 10),
      Stcd: sellerState,
      Ph: shop.phone || '',
      Em: shop.email || ''
    },
    BuyerDtls: {
      Gstin: customer?.gst_number || 'URP',
      LglNm: customer?.name || 'Retail Client',
      TrdNm: customer?.name || 'Retail Client',
      Pos: buyerState,
      Addr1: customer?.address || 'Customer Location',
      Loc: customer?.city || shop.city || 'Bhubaneswar',
      Pin: parseInt(customer?.pincode || shop.pincode || '751001', 10),
      Stcd: buyerState,
      Ph: customer?.phone || ''
    },
    ItemList: itemDetails,
    ValDtls: {
      AssVal: Number(totalTaxable.toFixed(2)),
      CgstVal: Number(totCgst.toFixed(2)),
      SgstVal: Number(totSgst.toFixed(2)),
      IgstVal: Number(totIgst.toFixed(2)),
      CesVal: 0,
      StCesVal: 0,
      Discount: 0,
      OthChrg: 0,
      RndOffAmt: 0,
      TotInvVal: Number(grandTotal.toFixed(2))
    }
  };

  return {
    success: true,
    invoiceNumber: invoice.invoice_number,
    einvoicePayload
  };
}
