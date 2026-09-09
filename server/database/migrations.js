import crypto from 'crypto';
import { getDb } from './db.js';

const AUTH_SECRET_SALT = 'KWIKSTORE_PRO_PASS_SALT_2026_DEEP_SHIELD';
function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  return crypto.createHmac('sha256', AUTH_SECRET_SALT).update(String(plainPassword).trim()).digest('hex');
}

export function runMigrations() {
  const db = getDb();

  console.log('Running SQLite Schema Migrations for KwikStore Pro...');

  db.exec(`
    -- System Configuration Table
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Multi-Shop / Branches Master Table
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      legal_name TEXT,
      shop_type TEXT DEFAULT 'GENERAL_RETAIL', -- GROCERY, GARMENTS, ELECTRONICS, PHARMACY, HARDWARE, BAKERY, DISTRIBUTOR
      gstin TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT DEFAULT 'Delhi',
      state_code TEXT DEFAULT '07',
      pincode TEXT,
      upi_id TEXT,
      upi_name TEXT,
      bank_name TEXT,
      bank_account_no TEXT,
      bank_ifsc TEXT,
      invoice_prefix TEXT DEFAULT 'INV',
      thermal_footer_note TEXT DEFAULT 'Thank you for shopping with us! Visit again.',
      terms_conditions TEXT DEFAULT '1. Goods once sold will not be taken back without bill.\n2. Subject to local jurisdiction.',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Roles Table (RBAC)
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      permissions_json TEXT NOT NULL, -- JSON array of permission strings
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Staff / Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      employee_id INTEGER REFERENCES employees(id),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      phone TEXT,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- HRMS: Employee Master Table
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE NOT NULL,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      designation TEXT NOT NULL,
      department TEXT DEFAULT 'Sales & Billing',
      date_of_joining TEXT DEFAULT (date('now', 'localtime')),
      monthly_basic_salary REAL DEFAULT 0,
      daily_wage REAL DEFAULT 0,
      hra REAL DEFAULT 0,
      special_allowance REAL DEFAULT 0,
      overtime_rate_per_hour REAL DEFAULT 0,
      aadhaar_no TEXT,
      pan_no TEXT,
      bank_account TEXT,
      bank_ifsc TEXT,
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ON_LEAVE, TERMINATED
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- HRMS: Attendance Table (With Auto Check-In on Login)
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      date TEXT NOT NULL, -- YYYY-MM-DD
      check_in_time TEXT, -- HH:MM:SS
      check_out_time TEXT,
      status TEXT DEFAULT 'PRESENT', -- PRESENT, HALF_DAY, ABSENT, LATE, PAID_LEAVE
      work_hours REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(employee_id, date)
    );

    -- HRMS: Leave Applications & Approvals
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      leave_type TEXT NOT NULL, -- CASUAL, SICK, PAID, UNPAID
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days REAL NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
      approved_by_user_id INTEGER REFERENCES users(id),
      action_notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- HRMS: Employee Salary Advances / Loans
    CREATE TABLE IF NOT EXISTS employee_advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      amount REAL NOT NULL,
      date TEXT DEFAULT (date('now', 'localtime')),
      reason TEXT,
      status TEXT DEFAULT 'PENDING', -- PENDING, RECOVERED
      recovered_in_payroll_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- HRMS: Monthly Payroll Runs & Salary Slips
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      month_year TEXT NOT NULL, -- YYYY-MM
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      total_days_in_month INTEGER DEFAULT 30,
      present_days REAL DEFAULT 0,
      paid_leaves REAL DEFAULT 0,
      unpaid_leaves REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      basic_pay REAL DEFAULT 0,
      hra REAL DEFAULT 0,
      allowances REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      gross_salary REAL DEFAULT 0,
      advance_deduction REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      net_payable REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'PROCESSED', -- DRAFT, PROCESSED, PAID
      payment_date TEXT,
      payment_mode TEXT DEFAULT 'BANK_TRANSFER', -- BANK_TRANSFER, CASH, UPI
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(month_year, employee_id)
    );

    -- HRMS: Employee Documents & KYC Verification Store (<500 KB image/pdf per document)
    CREATE TABLE IF NOT EXISTS employee_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL, -- PASSPORT_PHOTO, AADHAAR_FRONT, AADHAAR_BACK, PAN_CARD, CERT_10TH, CERT_12TH, CERT_GRADUATION
      doc_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL, -- image/jpeg, image/png, application/pdf
      file_size INTEGER NOT NULL,
      file_data TEXT NOT NULL, -- Base64 data URL
      uploaded_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(employee_id, doc_type)
    );

    -- Product Categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      name TEXT NOT NULL,
      code TEXT,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Universal Product Master Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      barcode TEXT,
      item_code TEXT,
      name TEXT NOT NULL,
      regional_name TEXT,
      category_id INTEGER REFERENCES categories(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      brand TEXT,
      image_url TEXT,
      hsn_code TEXT DEFAULT '1905',
      tax_rate REAL DEFAULT 18.0, -- 0, 5, 12, 18, 28
      cess_rate REAL DEFAULT 0.0,
      unit TEXT DEFAULT 'PCS', -- PCS, KG, GM, LTR, MTR, BOX, CARTON, PACKET
      secondary_unit TEXT, -- e.g. PACKET when primary is BOX
      unit_conversion_factor REAL DEFAULT 1, -- e.g. 1 Box = 24 Packets
      purchase_rate REAL DEFAULT 0.0,
      mrp REAL NOT NULL DEFAULT 0.0,
      retail_rate REAL NOT NULL DEFAULT 0.0,
      wholesale_rate REAL DEFAULT 0.0,
      dealer_rate REAL DEFAULT 0.0,
      current_stock REAL DEFAULT 0.0,
      min_stock_alert REAL DEFAULT 5.0,
      has_batch INTEGER DEFAULT 0, -- 1 for Pharmacy / FMCG expiry tracking
      has_serial_imei INTEGER DEFAULT 0, -- 1 for Electronics / Mobile IMEI
      has_variants INTEGER DEFAULT 0, -- 1 for Garments size/color
      trade_scheme TEXT, -- e.g. "10+1 Free Scheme" for Distributors
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Garments / Apparel Size & Color Variants
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      size TEXT NOT NULL, -- S, M, L, XL, XXL, 32, 34, 36, etc.
      color TEXT NOT NULL,
      sku_barcode TEXT,
      mrp REAL,
      selling_rate REAL,
      stock_qty REAL DEFAULT 0
    );

    -- Pharma & Food Batches & Expiry Dates
    CREATE TABLE IF NOT EXISTS product_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      batch_no TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT NOT NULL, -- YYYY-MM-DD
      purchase_rate REAL,
      mrp REAL,
      selling_rate REAL,
      stock_qty REAL DEFAULT 0
    );

    -- Electronics IMEI & Serial Numbers
    CREATE TABLE IF NOT EXISTS product_serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      serial_imei_no TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'AVAILABLE', -- AVAILABLE, SOLD, DEFECTIVE
      invoice_id INTEGER,
      sold_date TEXT,
      warranty_months INTEGER DEFAULT 12
    );

    -- Customers & Retailer Master (Khata Book)
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gstin TEXT,
      state_code TEXT DEFAULT '07',
      credit_limit REAL DEFAULT 25000.0,
      current_balance REAL DEFAULT 0.0, -- Positive = Customer owes us (Debit/Udhar)
      route_beat TEXT, -- Monday Market Beat, Station Road Beat (for Distributors)
      customer_type TEXT DEFAULT 'RETAIL', -- RETAIL, WHOLESALE, DISTRIBUTOR_RETAILER
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Customer Ledger (Udhar / Khata History)
    CREATE TABLE IF NOT EXISTS customer_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      date TEXT DEFAULT (datetime('now', 'localtime')),
      transaction_type TEXT NOT NULL, -- INVOICE, PAYMENT_RECEIVED, RETURN_REFUND, OPENING_BALANCE
      reference_no TEXT,
      debit_amount REAL DEFAULT 0, -- Increases customer debt
      credit_amount REAL DEFAULT 0, -- Decreases customer debt (Payment made)
      balance_after REAL DEFAULT 0,
      payment_mode TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Suppliers / Vendors Master
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      gstin TEXT,
      address TEXT,
      current_balance REAL DEFAULT 0.0, -- Amount we owe to supplier
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Cashier Shift & Cash Drawer Register
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      opened_at TEXT DEFAULT (datetime('now', 'localtime')),
      closed_at TEXT,
      opening_cash REAL DEFAULT 0.0,
      closing_cash REAL DEFAULT 0.0,
      expected_cash REAL DEFAULT 0.0,
      cash_difference REAL DEFAULT 0.0,
      total_sales REAL DEFAULT 0.0,
      cash_sales REAL DEFAULT 0.0,
      upi_sales REAL DEFAULT 0.0,
      card_sales REAL DEFAULT 0.0,
      credit_sales REAL DEFAULT 0.0,
      status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED
      notes TEXT
    );

    -- Invoices / Bills Master Table
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      invoice_number TEXT NOT NULL,
      invoice_date TEXT DEFAULT (datetime('now', 'localtime')),
      invoice_type TEXT DEFAULT 'RETAIL_B2C', -- RETAIL_B2C, TAX_INVOICE_B2B, DELIVERY_CHALLAN, ESTIMATE
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT DEFAULT 'Walk-in Customer',
      customer_phone TEXT,
      customer_gstin TEXT,
      customer_state_code TEXT DEFAULT '07',
      billing_address TEXT,
      sub_total REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      discount_percent REAL DEFAULT 0.0,
      taxable_amount REAL NOT NULL DEFAULT 0.0,
      cgst_amount REAL DEFAULT 0.0,
      sgst_amount REAL DEFAULT 0.0,
      igst_amount REAL DEFAULT 0.0,
      round_off REAL DEFAULT 0.0,
      grand_total REAL NOT NULL DEFAULT 0.0,
      amount_paid REAL DEFAULT 0.0,
      balance_due REAL DEFAULT 0.0,
      payment_status TEXT DEFAULT 'PAID', -- PAID, PARTIAL, UNPAID
      payment_mode TEXT DEFAULT 'CASH', -- CASH, UPI, CARD, CREDIT, SPLIT
      payment_details_json TEXT,
      cashier_user_id INTEGER REFERENCES users(id),
      shift_id INTEGER REFERENCES shifts(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(shop_id, invoice_number)
    );

    -- Invoice Line Items Table
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      item_name TEXT NOT NULL,
      hsn_code TEXT,
      batch_no TEXT,
      expiry_date TEXT,
      serial_imei TEXT,
      variant_details TEXT, -- e.g. "Size: L, Color: Blue"
      unit TEXT DEFAULT 'PCS',
      unit_type TEXT DEFAULT 'PRIMARY', -- PRIMARY, SECONDARY (Carton/Box)
      quantity REAL NOT NULL DEFAULT 1,
      free_quantity REAL DEFAULT 0, -- For 10+1 free schemes
      unit_price REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 18.0,
      taxable_value REAL NOT NULL,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    -- Indian GST E-Way Bills & Transit Records
    CREATE TABLE IF NOT EXISTS eway_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      invoice_id INTEGER REFERENCES invoices(id),
      invoice_number TEXT NOT NULL,
      eway_bill_no TEXT, -- Official Government EBN if entered
      vehicle_no TEXT NOT NULL,
      transporter_id TEXT,
      transporter_name TEXT,
      distance_km INTEGER DEFAULT 50,
      transport_mode TEXT DEFAULT '1', -- 1=Road, 2=Rail, 3=Air, 4=Ship
      vehicle_type TEXT DEFAULT 'R', -- R=Regular, O=Over Dimensional
      supply_type TEXT DEFAULT 'O', -- Outward
      sub_supply_type TEXT DEFAULT '1', -- Supply
      status TEXT DEFAULT 'GENERATED', -- GENERATED, IN_TRANSIT, DELIVERED, CANCELLED
      customer_name TEXT,
      customer_gstin TEXT,
      total_amount REAL DEFAULT 0.0,
      payload_json TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Inter-Branch Stock Transfers
    CREATE TABLE IF NOT EXISTS inter_branch_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_number TEXT UNIQUE NOT NULL,
      from_shop_id INTEGER NOT NULL REFERENCES shops(id),
      to_shop_id INTEGER NOT NULL REFERENCES shops(id),
      transfer_date TEXT DEFAULT (datetime('now', 'localtime')),
      status TEXT DEFAULT 'COMPLETED', -- PENDING, COMPLETED, CANCELLED
      items_json TEXT NOT NULL,
      notes TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Database Backup & Restore Logs
    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_mb TEXT,
      backup_type TEXT DEFAULT 'AUTO_LOCAL', -- AUTO_LOCAL, MANUAL_USER, EXTERNAL_USB
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Quotations & Price Estimates Master Table
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      quotation_number TEXT NOT NULL,
      quotation_date TEXT DEFAULT (datetime('now', 'localtime')),
      valid_until_date TEXT,
      recipient_type TEXT DEFAULT 'EXISTING_CUSTOMER', -- NEW_CUSTOMER, EXISTING_CUSTOMER, SHOP_BRANCH
      customer_id INTEGER REFERENCES customers(id),
      target_shop_id INTEGER REFERENCES shops(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      customer_gstin TEXT,
      customer_state_code TEXT DEFAULT '07',
      billing_address TEXT,
      sub_total REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL DEFAULT 0.0,
      discount_percent REAL DEFAULT 0.0,
      taxable_amount REAL NOT NULL DEFAULT 0.0,
      cgst_amount REAL DEFAULT 0.0,
      sgst_amount REAL DEFAULT 0.0,
      igst_amount REAL DEFAULT 0.0,
      round_off REAL DEFAULT 0.0,
      grand_total REAL NOT NULL DEFAULT 0.0,
      status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, CONVERTED, EXPIRED, REJECTED
      converted_invoice_id INTEGER REFERENCES invoices(id),
      converted_at TEXT,
      terms_conditions TEXT,
      notes TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(shop_id, quotation_number)
    );

    -- Quotation Line Items Table
    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      item_name TEXT NOT NULL,
      hsn_code TEXT,
      unit TEXT DEFAULT 'PCS',
      unit_type TEXT DEFAULT 'PRIMARY',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 18.0,
      taxable_value REAL NOT NULL,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    -- Inter-Branch Stock Transfers & Delivery Challans (Rule 55)
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_number TEXT UNIQUE NOT NULL,
      from_shop_id INTEGER NOT NULL REFERENCES shops(id),
      to_shop_id INTEGER NOT NULL REFERENCES shops(id),
      status TEXT DEFAULT 'DISPATCHED', -- DRAFT, DISPATCHED, RECEIVED, CANCELLED
      vehicle_no TEXT,
      transporter_name TEXT,
      driver_phone TEXT,
      notes TEXT,
      total_items INTEGER DEFAULT 0,
      total_qty REAL DEFAULT 0,
      total_value REAL DEFAULT 0,
      dispatched_by INTEGER REFERENCES users(id),
      received_by INTEGER REFERENCES users(id),
      dispatched_at TEXT DEFAULT (datetime('now', 'localtime')),
      received_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT,
      hsn_code TEXT,
      batch_no TEXT,
      expiry_date TEXT,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'PCS',
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0
    );

    -- Universal 30-Day Recycle Bin & Recovery Vault
    CREATE TABLE IF NOT EXISTS recycle_bin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      item_type TEXT NOT NULL, -- INVOICE, CUSTOMER, PRODUCT, EMPLOYEE, SUPPLIER, EXPENSE, QUOTATION, EWAY_BILL
      original_id INTEGER,
      title TEXT NOT NULL,
      subtitle TEXT,
      data_json TEXT NOT NULL,
      deleted_by_user_id INTEGER,
      deleted_by_name TEXT,
      deleted_at TEXT DEFAULT (datetime('now', 'localtime')),
      expires_at TEXT DEFAULT (datetime('now', 'localtime', '+30 days'))
    );

    -- Create Indexes for Super Fast Querying
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_shop_date ON invoices(shop_id, invoice_date);
    CREATE INDEX IF NOT EXISTS idx_quotations_shop_date ON quotations(shop_id, quotation_date);
    CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_stock_transfers_shops ON stock_transfers(from_shop_id, to_shop_id);
    CREATE INDEX IF NOT EXISTS idx_recycle_bin_shop_type ON recycle_bin(shop_id, item_type);
    CREATE INDEX IF NOT EXISTS idx_recycle_bin_expires ON recycle_bin(expires_at);
  `);

  // Safe column additions
  try {
    db.prepare(`ALTER TABLE shops ADD COLUMN qr_type TEXT DEFAULT 'DYNAMIC'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE shops ADD COLUMN custom_qr_image TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE shops ADD COLUMN shop_icon TEXT DEFAULT '🏬'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE shops ADD COLUMN logo_url TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN image_url TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN city TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN state TEXT DEFAULT 'Delhi'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN state_code TEXT DEFAULT '07'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN pincode TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN bank_name TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN bank_account_no TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN bank_ifsc TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN upi_id TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN payment_terms TEXT DEFAULT 'NET_30'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN notes TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE suppliers ADD COLUMN is_active INTEGER DEFAULT 1`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN custom_permissions_json TEXT`).run();
  } catch (e) {}

  try {
    db.prepare(`ALTER TABLE shops ADD COLUMN drug_license_no TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN default_batch_no TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN default_expiry_date TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN default_size TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE products ADD COLUMN default_color TEXT`).run();
  } catch (e) {}
    try {
    db.prepare(`ALTER TABLE employees ADD COLUMN is_pf_eligible INTEGER DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN uan_no TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN pf_rate_percent REAL DEFAULT 12`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN custom_pf_amount REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN photo_url TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN father_name TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN emergency_phone TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN date_of_joining TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN verification_status TEXT DEFAULT 'VERIFIED'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN welcome_letter_generated INTEGER DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE payroll_runs ADD COLUMN pf_deduction REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE payroll_runs ADD COLUMN employer_pf REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE payroll_runs ADD COLUMN payment_ref TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE payroll_runs ADD COLUMN notes TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('owner_recovery_pin', '9988')`).run();
  } catch (e) {}

  // Suite 1-6 Schema Additions: Store Expenses, Credit Notes, Loyalty, Commissions, Shifts
  db.exec(`
    -- Store Expenses & Petty Cash Ledger
    CREATE TABLE IF NOT EXISTS store_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      category TEXT NOT NULL, -- RENT, ELECTRICITY, STAFF_WELFARE, TEA_SNACKS, TRANSPORT, REPAIR_MAINTENANCE, MARKETING, MISCELLANEOUS
      expense_title TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'CASH', -- CASH, UPI, BANK_TRANSFER, CHEQUE
      expense_date TEXT DEFAULT (date('now', 'localtime')),
      paid_to TEXT,
      receipt_image TEXT,
      notes TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Credit Notes & Return Vouchers
    CREATE TABLE IF NOT EXISTS credit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      credit_note_no TEXT UNIQUE NOT NULL,
      original_invoice_id INTEGER REFERENCES invoices(id),
      original_invoice_number TEXT,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      total_refund_amount REAL NOT NULL,
      balance_amount REAL NOT NULL,
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, REDEEMED, EXPIRED, CANCELLED
      items_json TEXT NOT NULL,
      reason TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Customer Loyalty Ledger
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      invoice_id INTEGER REFERENCES invoices(id),
      type TEXT NOT NULL, -- EARN, REDEEM, ADJUSTMENT
      points REAL NOT NULL,
      amount_equivalent REAL DEFAULT 0,
      balance_after REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  try {
    db.prepare(`ALTER TABLE customers ADD COLUMN loyalty_points REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE customers ADD COLUMN points_earned_total REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE customers ADD COLUMN dob TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE customers ADD COLUMN anniversary_date TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN sales_employee_id INTEGER REFERENCES employees(id)`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN loyalty_points_earned REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN loyalty_points_redeemed REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN loyalty_discount_amount REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN credit_note_code TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN credit_note_discount REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE shifts ADD COLUMN drawer_cash_in REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE shifts ADD COLUMN drawer_cash_out REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE shifts ADD COLUMN cash_drawer_history_json TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN sales_commission_percent REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN blood_group TEXT`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN shift_type TEXT DEFAULT 'GENERAL'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE payroll_runs ADD COLUMN sales_commission_pay REAL DEFAULT 0`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE payroll_runs ADD COLUMN incentives_pay REAL DEFAULT 0`).run();
  } catch (e) {}

  // Self-Healing Essential Bootstrap: Ensure default roles, default shop, and owner account pujarani.sahoo exist
  try {
    const allPerms = JSON.stringify([
      'pos:billing', 'pos:discount', 'pos:reprint', 'pos:cancel', 'pos:returns', 'pos:shifts',
      'inventory:view', 'inventory:edit', 'inventory:costs', 'inventory:transfer', 'inventory:barcode', 'inventory:expiry',
      'customers:view', 'customers:edit', 'customers:credit', 'customers:loyalty',
      'suppliers:view', 'suppliers:edit',
      'reports:sales', 'reports:profit_loss', 'reports:gst', 'reports:cash_drawer', 'reports:owner_summary',
      'expenses:view', 'expenses:create', 'expenses:delete',
      'hrms:view', 'hrms:manage_staff', 'hrms:attendance', 'hrms:leaves', 'hrms:payroll', 'hrms:id_cards',
      'settings:general', 'settings:database_backup', 'settings:multishop', 'settings:rbac'
    ]);

    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (1, 'SUPER_ADMIN', 'Shop Owner / Super Admin', 'Full access to all modules.', ?)
    `).run(allPerms);

    const managerPerms = JSON.stringify([
      'pos:billing', 'pos:discount', 'pos:reprint', 'pos:cancel',
      'inventory:view', 'inventory:edit', 'inventory:costs',
      'customers:view', 'customers:edit', 'customers:credit',
      'suppliers:view', 'suppliers:edit',
      'quotations:view', 'quotations:create',
      'reports:sales', 'reports:gst',
      'hrms:view', 'hrms:manage_payroll'
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (2, 'STORE_MANAGER', 'Store Manager', 'Operational store management, inventory, reports & HRMS payroll access.', ?)
    `).run(managerPerms);

    const cashierPerms = JSON.stringify([
      'pos:billing', 'pos:discount', 'pos:reprint'
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (3, 'CASHIER', 'Billing Cashier', 'Point of sale billing, barcode scanning, print & reprint receipts.', ?)
    `).run(cashierPerms);

    const inventoryPerms = JSON.stringify([
      'inventory:view', 'inventory:edit', 'inventory:costs', 'suppliers:view'
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (4, 'INVENTORY_STAFF', 'Inventory & Stock Manager', 'Product catalog, stock updates, purchase entries & vendor records.', ?)
    `).run(inventoryPerms);

    const accountantPerms = JSON.stringify([
      'pos:billing', 'customers:view', 'customers:credit', 'suppliers:view', 'reports:sales', 'reports:gst', 'quotations:view'
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (5, 'ACCOUNTANT', 'Accountant & GST Auditor', 'Customer khata ledger, supplier accounts, GST reports, profit & loss analysis.', ?)
    `).run(accountantPerms);

    const salesPerms = JSON.stringify([
      'pos:billing', 'quotations:view', 'quotations:create', 'customers:view'
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (6, 'SALES_EXECUTIVE', 'Sales & Quotation Executive', 'POS counter billing, customer relationship, B2B price estimates & quotations.', ?)
    `).run(salesPerms);

    const hrPerms = JSON.stringify([
      'hrms:view', 'hrms:attendance', 'hrms:leaves'
    ]);
    db.prepare(`
      INSERT OR IGNORE INTO roles (id, role_key, name, description, permissions_json)
      VALUES (7, 'HR_ASSISTANT', 'HR & Payroll Assistant', 'Staff directory, daily attendance check-ins, leave approvals & staff KYC records.', ?)
    `).run(hrPerms);

    const shopCount = db.prepare('SELECT COUNT(*) as count FROM shops').get().count;
    if (shopCount === 0) {
      db.prepare(`
        INSERT INTO shops (id, name, legal_name, shop_type, phone, email, address, city, state, state_code, pincode)
        VALUES (1, 'KwikStore Supermarket Hub', 'KwikStore Enterprises Pvt Ltd', 'GENERAL_RETAIL', '+91 98765 43210', 'admin@kwikstore.in', 'Main Market', 'New Delhi', 'Delhi', '07', '110001')
      `).run();
    }

    // Ensure rajesh.sahoo exists with password Shonaraj@123456
    const rajeshUser = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get('rajesh.sahoo');
    const rajeshPassHash = hashPassword('Shonaraj@123456');
    if (!rajeshUser) {
      db.prepare(`
        INSERT INTO users (shop_id, username, password_hash, display_name, phone, role_id, is_active)
        VALUES (1, 'rajesh.sahoo', ?, 'Rajesh Kumar Sahoo', '+91 98765 43210', 1, 1)
      `).run(rajeshPassHash);
      console.log('Bootstrapped owner account rajesh.sahoo successfully.');
    } else {
      db.prepare(`
        UPDATE users 
        SET is_active = 1, role_id = 1, password_hash = ? 
        WHERE lower(username) = lower(?)
      `).run(rajeshPassHash, 'rajesh.sahoo');
    }

    // Ensure pujarani.sahoo exists with password Spenser@123456
    const pujaraniUser = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get('pujarani.sahoo');
    const pujaraniPassHash = hashPassword('Spenser@123456');
    if (!pujaraniUser) {
      db.prepare(`
        INSERT INTO users (shop_id, username, password_hash, display_name, phone, role_id, is_active)
        VALUES (1, 'pujarani.sahoo', ?, 'Pujarani Sahoo', '+91 98765 43210', 1, 1)
      `).run(pujaraniPassHash);
      console.log('Bootstrapped owner account pujarani.sahoo successfully.');
    } else {
      db.prepare(`
        UPDATE users 
        SET is_active = 1, role_id = 1, password_hash = ? 
        WHERE lower(username) = lower(?)
      `).run(pujaraniPassHash, 'pujarani.sahoo');
    }
  } catch (bootstrapErr) {
    console.warn('Bootstrap account check warning:', bootstrapErr.message);
  }

  console.log('Database Schema Migrations completed successfully.');
}

