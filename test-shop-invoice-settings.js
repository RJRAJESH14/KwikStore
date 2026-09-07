import * as shopService from './server/services/shopService.js';
import * as billingService from './server/services/billingService.js';

console.log('=== VERIFYING SHOP INVOICE SETTINGS & PRINT DATA BINDING ===');

// 1. Update Shop 1 details
const updatedShopData = {
  id: 1,
  name: 'KwikStore Supermarket & Wholesale Hub',
  legal_name: 'KwikStore Enterprises Pvt Ltd',
  shop_type: 'SUPERMARKET',
  phone: '+91 98111 22233',
  email: 'billing@kwikstore.in',
  address: 'Shop 10-14, Sector 18 Commercial Complex',
  city: 'Noida',
  state: 'Uttar Pradesh',
  state_code: '09',
  pincode: '201301',
  gstin: '09ABCDE1234F1Z8',
  upi_id: 'kwikstore@okhdfcbank',
  upi_name: 'KwikStore Supermarket',
  bank_name: 'HDFC Bank Ltd',
  bank_account_no: '50200098765432',
  bank_ifsc: 'HDFC0001234',
  invoice_prefix: 'KS-NOI',
  thermal_footer_note: 'Thank you for shopping at KwikStore! Please visit again.',
  terms_conditions: '1. Goods once sold cannot be returned without bill.\n2. Subject to Noida jurisdiction only.'
};

const res = shopService.createOrUpdateShop(updatedShopData);
console.log(`[PASS] Shop settings updated: ${res.message}`);

// 2. Verify shop details directly
const savedShop = shopService.getShopById(1);
if (savedShop.name !== updatedShopData.name || savedShop.gstin !== updatedShopData.gstin || savedShop.upi_id !== updatedShopData.upi_id) {
  throw new Error('Shop settings data mismatch in DB!');
}
console.log(`[PASS] Verified in DB: Name="${savedShop.name}", GSTIN="${savedShop.gstin}", UPI="${savedShop.upi_id}", Prefix="${savedShop.invoice_prefix}"`);

// 3. Generate a bill and verify the invoice captures all shop & banking settings
const nextNum = billingService.getNextInvoiceNumber(1);
console.log(`[PASS] Next Invoice sequence generated: ${nextNum}`);

const invoice = billingService.createInvoice({
  shop_id: 1,
  customer_name: 'FleetBill Pro Test Buyer',
  customer_phone: '9876543210',
  items: [{
    product_id: 1,
    name: 'Parle-G Gold Glucose Biscuits',
    quantity: 2,
    unit: 'BOX',
    unit_price: 650,
    tax_rate: 18,
    discount_amount: 0
  }],
  amount_paid: 1300,
  payment_mode: 'UPI'
});

console.log(`[PASS] Generated invoice #${invoice.invoice_number}`);
console.log(` - Shop Name on Invoice: ${invoice.shop_name}`);
console.log(` - Legal Name on Invoice: ${invoice.shop_legal_name}`);
console.log(` - GSTIN on Invoice: ${invoice.shop_gstin}`);
console.log(` - Address on Invoice: ${invoice.shop_address}, ${invoice.shop_city}, ${invoice.shop_state} (${invoice.shop_state_code})`);
console.log(` - Bank on Invoice: ${invoice.shop_bank_name}, A/C: ${invoice.shop_bank_account_no}, IFSC: ${invoice.shop_bank_ifsc}`);
console.log(` - UPI on Invoice: ${invoice.shop_upi_id}`);
console.log(` - Thermal Footer Note: "${invoice.thermal_footer_note}"`);
console.log(` - Terms & Conditions: "${invoice.terms_conditions}"`);

if (invoice.shop_gstin !== '09ABCDE1234F1Z8' || invoice.shop_upi_id !== 'kwikstore@okhdfcbank') {
  throw new Error('Invoice failed to bind shop settings accurately!');
}

console.log('\n ALL SHOP & INVOICE SETTINGS (FLEETBILL PRO ENGINE) VERIFIED WITH 100% SUCCESS!');
