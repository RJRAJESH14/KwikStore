import { getDb } from './db.js';

export function seedSampleData() {
  const db = getDb();

  // Check if already seeded
  const shopCount = db.prepare('SELECT COUNT(*) as count FROM shops').get().count;
  if (shopCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding rich Indian business sample data for KwikStore Pro...');

  const insertShop = db.prepare(`
    INSERT INTO shops (id, name, legal_name, shop_type, gstin, phone, email, address, city, state, state_code, pincode, upi_id, upi_name, bank_name, bank_account_no, bank_ifsc, invoice_prefix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Multi-Shop Branches
  insertShop.run(
    1,
    'KwikStore Supermarket & Wholesale Hub',
    'KwikStore Enterprises Pvt Ltd',
    'DISTRIBUTOR',
    '07AAAAA0000A1Z5',
    '+91 98765 43210',
    'sales@kwikstore.in',
    'Plot 45, Commercial Complex, Connaught Place',
    'New Delhi',
    'Delhi',
    '07',
    '110001',
    'kwikstore@upi',
    'KwikStore Enterprises',
    'HDFC Bank',
    '50200012345678',
    'HDFC0000123',
    'KS-DEL'
  );

  insertShop.run(
    2,
    'KwikStore Express & Garments Outlet',
    'KwikStore Retail Ventures',
    'GARMENTS',
    '09AAAAA0000A1Z8',
    '+91 98111 22233',
    'noida@kwikstore.in',
    'Shop 12, Ground Floor, Sector 18 Market',
    'Noida',
    'Uttar Pradesh',
    '09',
    '201301',
    'kwikstore.noida@upi',
    'KwikStore Noida Branch',
    'ICICI Bank',
    '000105012345',
    'ICIC0000001',
    'KS-NOI'
  );

  // 2. Roles & Permissions (RBAC)
  const insertRole = db.prepare(`
    INSERT INTO roles (id, role_key, name, description, permissions_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  const allPermissions = [
    'pos:billing', 'pos:discount', 'pos:reprint', 'pos:cancel',
    'inventory:view', 'inventory:edit', 'inventory:costs', 'inventory:transfer',
    'customers:view', 'customers:edit', 'customers:credit',
    'suppliers:view', 'suppliers:edit',
    'reports:sales', 'reports:profit_loss', 'reports:gst', 'reports:cash_drawer',
    'hrms:view', 'hrms:manage_staff', 'hrms:attendance', 'hrms:leaves', 'hrms:payroll',
    'settings:general', 'settings:database_backup', 'settings:multishop', 'settings:rbac'
  ];

  const cashierPermissions = [
    'pos:billing', 'pos:reprint',
    'inventory:view',
    'customers:view', 'customers:credit',
    'reports:cash_drawer'
  ];

  const managerPermissions = [
    'pos:billing', 'pos:discount', 'pos:reprint', 'pos:cancel',
    'inventory:view', 'inventory:edit', 'inventory:transfer',
    'customers:view', 'customers:edit', 'customers:credit',
    'suppliers:view', 'suppliers:edit',
    'reports:sales', 'reports:gst', 'reports:cash_drawer',
    'hrms:view', 'hrms:attendance'
  ];

  insertRole.run(1, 'SUPER_ADMIN', 'Shop Owner / Super Admin', 'Full access to all modules, profit margins, HRMS, payroll, and settings.', JSON.stringify(allPermissions));
  insertRole.run(2, 'STORE_MANAGER', 'Store Manager', 'Manages billing, stock, customer credit, and view attendance.', JSON.stringify(managerPermissions));
  insertRole.run(3, 'CASHIER', 'POS Biller / Cashier', 'Fast counter billing, payment receipt, cash drawer. Profit and HRMS hidden.', JSON.stringify(cashierPermissions));

  // 3. Employees (HRMS)
  const insertEmployee = db.prepare(`
    INSERT INTO employees (id, employee_code, shop_id, full_name, phone, email, designation, department, monthly_basic_salary, daily_wage, hra, special_allowance, overtime_rate_per_hour, aadhaar_no, pan_no, bank_account, bank_ifsc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEmployee.run(1, 'EMP-1001', 1, 'Rajesh Sharma (Owner)', '+91 98765 43210', 'rajesh@kwikstore.in', 'Managing Director', 'Management', 75000, 2500, 20000, 10000, 0, '1234 5678 9012', 'ABCDE1234F', '50200012345678', 'HDFC0000123');
  insertEmployee.run(2, 'EMP-1002', 1, 'Amit Kumar Verma', '+91 98123 45678', 'amit@kwikstore.in', 'Store Manager', 'Operations', 35000, 1166, 8000, 4000, 200, '2345 6789 0123', 'BCDEF2345G', '50200087654321', 'HDFC0000123');
  insertEmployee.run(3, 'EMP-1003', 1, 'Rahul Sharma', '+91 97234 56789', 'rahul.s@kwikstore.in', 'Senior Cashier & Biller', 'Sales & Billing', 22000, 733, 4000, 2000, 150, '3456 7890 1234', 'CDEFG3456H', '000101567890', 'ICIC0000001');
  insertEmployee.run(4, 'EMP-1004', 1, 'Priya Singh', '+91 96345 67890', 'priya.s@kwikstore.in', 'Inventory & Billing Staff', 'Sales & Billing', 20000, 666, 4000, 1500, 150, '4567 8901 2345', 'DEFGH4567I', '000101987654', 'ICIC0000001');
  insertEmployee.run(5, 'EMP-1005', 2, 'Vikas Gupta', '+91 95456 78901', 'vikas.g@kwikstore.in', 'Branch Manager (Noida)', 'Branch Operations', 32000, 1066, 7000, 3500, 180, '5678 9012 3456', 'EFGHI5678J', '102030405060', 'SBIN0001234');

  // 4. Users / Staff Portal Logins
  const insertUser = db.prepare(`
    INSERT INTO users (id, shop_id, employee_id, username, password_hash, display_name, phone, role_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Plain passwords for simple demo: owner: admin123, manager: manager123, cashier: cashier123
  insertUser.run(1, 1, 1, 'owner', 'admin123', 'Rajesh Sharma (Owner)', '+91 98765 43210', 1);
  insertUser.run(2, 1, 2, 'manager', 'manager123', 'Amit Verma (Manager)', '+91 98123 45678', 2);
  insertUser.run(3, 1, 3, 'cashier1', 'cashier123', 'Rahul Sharma (Cashier)', '+91 97234 56789', 3);
  insertUser.run(4, 1, 4, 'cashier2', 'cashier123', 'Priya Singh (Cashier)', '+91 96345 67890', 3);
  insertUser.run(5, 2, 5, 'noidamgr', 'manager123', 'Vikas Gupta (Noida Mgr)', '+91 95456 78901', 2);
  insertUser.run(6, 1, null, 'pujarani.sahoo', 'f5c5d11b1139d6c2d9920235c71f5eed982ccc55ecf16d434f7c0dde31789c91', 'Pujarani Sahoo', '+91 98765 43210', 1);


  // 5. Product Categories
  const insertCategory = db.prepare('INSERT INTO categories (id, shop_id, name, code, icon) VALUES (?, ?, ?, ?, ?)');
  insertCategory.run(1, 1, 'FMCG Biscuits & Bakery', 'FMCG', 'Cookie');
  insertCategory.run(2, 1, 'Chocolates & Confectionery', 'CHOC', 'Candy');
  insertCategory.run(3, 1, 'Spices, Masala & Grocery', 'GROC', 'ShoppingBag');
  insertCategory.run(4, 1, 'Pharmacy & Medicines', 'PHARM', 'Pill');
  insertCategory.run(5, 1, 'Electronics & Mobile Accessories', 'ELEC', 'Smartphone');
  insertCategory.run(6, 1, 'Garments & Apparels', 'CLOTH', 'Shirt');
  insertCategory.run(7, 1, 'Hardware & Sanitary', 'HARD', 'Wrench');

  // 6. Products Master (Covering all business sectors + distributor features)
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, shop_id, barcode, item_code, name, regional_name, category_id, brand, hsn_code, tax_rate, cess_rate,
      unit, secondary_unit, unit_conversion_factor, purchase_rate, mrp, retail_rate, wholesale_rate, dealer_rate,
      current_stock, min_stock_alert, has_batch, has_serial_imei, has_variants, trade_scheme
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // A. FMCG Distributor items (Dual units + Schemes)
  insertProduct.run(
    1, 1, '8901719101010', 'PARLE-G-BOX', 'Parle-G Gold Glucose Biscuits', 'पारले-जी बिस्कुट',
    1, 'Parle', '1905', 18.0, 0.0,
    'BOX', 'PACKET', 24, 620.0, 720.0, 700.0, 650.0, 635.0,
    150, 20, 1, 0, 0, '10+1 Free Scheme'
  );

  insertProduct.run(
    2, 1, '8901233024883', 'CAD-DAIRY-SILK', 'Cadbury Dairy Milk Silk Chocolate 150g', 'कैडबरी सिल्क',
    2, 'Cadbury', '1806', 18.0, 0.0,
    'BOX', 'BAR', 12, 1620.0, 2160.0, 2040.0, 1750.0, 1690.0,
    80, 15, 1, 0, 0, 'Buy 5 Boxes Get 5% Off'
  );

  insertProduct.run(
    3, 1, '8901725181013', 'EVER-GARAM-100G', 'Everest Garam Masala 100g Pack', 'एवरेस्ट गरम मसाला',
    3, 'Everest', '0910', 5.0, 0.0,
    'BOX', 'PACKET', 20, 1400.0, 1800.0, 1720.0, 1520.0, 1460.0,
    200, 30, 1, 0, 0, '12+1 Free Box Scheme'
  );

  // B. Grocery / Kirana loose & packed items
  insertProduct.run(
    4, 1, '8901030383742', 'AASH-ATTA-5KG', 'Aashirvaad Shudh Chakki Atta 5kg', 'आशीर्वाद आटा',
    3, 'ITC Aashirvaad', '1101', 0.0, 0.0,
    'PACKET', null, 1, 215.0, 260.0, 245.0, 230.0, 225.0,
    120, 25, 0, 0, 0, null
  );

  insertProduct.run(
    5, 1, '8901058852213', 'TATA-SALT-1KG', 'Tata Salt Vacuum Evaporated Iodized 1kg', 'टाटा नमक',
    3, 'Tata', '2501', 0.0, 0.0,
    'PACKET', null, 1, 22.0, 28.0, 27.0, 25.0, 24.0,
    350, 50, 0, 0, 0, null
  );

  insertProduct.run(
    6, 1, '8901262010011', 'AMUL-BUTTER-500G', 'Amul Butter Pasteurised 500g', 'अमूल मक्खन',
    3, 'Amul', '0405', 12.0, 0.0,
    'PACKET', null, 1, 242.0, 285.0, 275.0, 260.0, 252.0,
    65, 10, 1, 0, 0, null
  );

  // C. Pharmacy / Medical Products (Batch + Expiry)
  insertProduct.run(
    7, 1, '8901117201018', 'DOLO-650-TAB', 'Dolo 650mg Paracetamol Tablets (Strip of 15)', 'डोलो 650',
    4, 'Micro Labs', '3004', 12.0, 0.0,
    'STRIP', null, 1, 24.5, 34.1, 34.0, 29.0, 27.5,
    500, 50, 1, 0, 0, '20+2 Free Scheme'
  );

  insertProduct.run(
    8, 1, '8901118302029', 'AZITH-500-TAB', 'Azithral 500mg Tablets (Strip of 5)', 'एज़िथ्रल 500',
    4, 'Alembic Pharma', '3004', 12.0, 0.0,
    'STRIP', null, 1, 85.0, 128.5, 125.0, 102.0, 95.0,
    180, 20, 1, 0, 0, null
  );

  // D. Electronics & Mobile (Serial / IMEI tracking)
  insertProduct.run(
    9, 1, '8806091234567', 'SAM-A55-5G', 'Samsung Galaxy A55 5G (8GB / 128GB Awesome Iceblue)', 'सैमसंग मोबाइल',
    5, 'Samsung', '8517', 18.0, 0.0,
    'PCS', null, 1, 32500.0, 42999.0, 38999.0, 36500.0, 35000.0,
    14, 3, 0, 1, 0, null
  );

  insertProduct.run(
    10, 1, '8904123567890', 'BOAT-ROCK-450', 'boAt Rockerz 450 Bluetooth Wireless On-Ear Headphone', 'बोट हेडफोन',
    5, 'boAt', '8518', 18.0, 0.0,
    'PCS', null, 1, 890.0, 1990.0, 1499.0, 1150.0, 1020.0,
    45, 8, 0, 1, 0, null
  );

  // E. Garments & Apparel (Size & Color Variants)
  insertProduct.run(
    11, 1, '8907123987654', 'DENIM-JEANS-M', 'Men Premium Stretch Slim Fit Denim Jeans', 'डेनिम जीन्स',
    6, 'Levi Style', '6203', 12.0, 0.0,
    'PCS', null, 1, 750.0, 1999.0, 1499.0, 1100.0, 950.0,
    85, 12, 0, 0, 1, null
  );

  insertProduct.run(
    12, 1, '8907987654321', 'COTTON-KURTI-W', 'Women Pure Cotton Embroidered Daily Wear Kurti', 'कॉटन कुर्ती',
    6, 'Biba Style', '6204', 5.0, 0.0,
    'PCS', null, 1, 380.0, 1299.0, 899.0, 620.0, 520.0,
    90, 15, 0, 0, 1, null
  );

  // F. Hardware & Sanitary
  insertProduct.run(
    13, 1, '8902001122334', 'PVC-PIPE-1INCH', 'Supreme PVC Pressure Pipe 1-Inch (6 Meter Length)', 'पीवीसी पाइप',
    7, 'Supreme', '3917', 18.0, 0.0,
    'LENGTH', 'BUNDLE', 10, 240.0, 390.0, 350.0, 290.0, 270.0,
    140, 20, 0, 0, 0, null
  );

  // 7. Product Batches for Pharma & FMCG
  const insertBatch = db.prepare(`
    INSERT INTO product_batches (product_id, shop_id, batch_no, mfg_date, expiry_date, purchase_rate, mrp, selling_rate, stock_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBatch.run(1, 1, 'PG-2026B1', '2026-06-01', '2027-06-01', 620.0, 720.0, 700.0, 150);
  insertBatch.run(2, 1, 'CAD-SILK-99', '2026-05-15', '2027-05-15', 1620.0, 2160.0, 2040.0, 80);
  insertBatch.run(3, 1, 'EV-GM-4421', '2026-04-10', '2027-10-10', 1400.0, 1800.0, 1720.0, 200);
  insertBatch.run(7, 1, 'DOLO-9812A', '2026-01-10', '2028-12-31', 24.5, 34.1, 34.0, 500);
  insertBatch.run(8, 1, 'AZI-7762X', '2026-03-01', '2028-02-28', 85.0, 128.5, 125.0, 180);

  // 8. Electronics Serials / IMEIs
  const insertSerial = db.prepare(`
    INSERT INTO product_serials (product_id, shop_id, serial_imei_no, status, warranty_months)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSerial.run(9, 1, '354892104928101', 'AVAILABLE', 12);
  insertSerial.run(9, 1, '354892104928102', 'AVAILABLE', 12);
  insertSerial.run(9, 1, '354892104928103', 'AVAILABLE', 12);
  insertSerial.run(10, 1, 'BOAT-SN-882910', 'AVAILABLE', 12);
  insertSerial.run(10, 1, 'BOAT-SN-882911', 'AVAILABLE', 12);

  // 9. Garments Variants (Size & Color)
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, size, color, sku_barcode, mrp, selling_rate, stock_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertVariant.run(11, '32', 'Dark Indigo Blue', 'JEAN-BLU-32', 1999.0, 1499.0, 25);
  insertVariant.run(11, '34', 'Dark Indigo Blue', 'JEAN-BLU-34', 1999.0, 1499.0, 30);
  insertVariant.run(11, '36', 'Midnight Black', 'JEAN-BLK-36', 1999.0, 1499.0, 30);
  insertVariant.run(12, 'M', 'Maroon Floral', 'KURTI-MRN-M', 1299.0, 899.0, 30);
  insertVariant.run(12, 'L', 'Maroon Floral', 'KURTI-MRN-L', 1299.0, 899.0, 30);
  insertVariant.run(12, 'XL', 'Mustard Yellow', 'KURTI-YEL-XL', 1299.0, 899.0, 30);

  // 10. Customers & Retailer Khata (with Route Beats for Distributors)
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, shop_id, name, phone, email, address, gstin, state_code, credit_limit, current_balance, route_beat, customer_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCustomer.run(1, 1, 'Gupta General Store', '+91 98111 55667', 'gupta.store@gmail.com', 'Shop 4, Main Chowk, Chandni Chowk, Delhi', '07AACCG1234A1Z1', '07', 50000.0, 14200.0, 'Route 1: Chandni Chowk Market Beat', 'DISTRIBUTOR_RETAILER');
  insertCustomer.run(2, 1, 'Sharma Kirana & Daily Needs', '+91 98222 77889', 'sharma.kirana@yahoo.com', '120, Sadar Bazar, Delhi', null, '07', 30000.0, 8500.0, 'Route 2: Sadar Bazar Market Beat', 'DISTRIBUTOR_RETAILER');
  insertCustomer.run(3, 1, 'Apex Medical & Chemist Store', '+91 98333 99001', 'apexmeds@gmail.com', 'Opp. Civil Hospital, Karol Bagh, Delhi', '07AAACA9999K1Z5', '07', 75000.0, 22400.0, 'Route 3: Karol Bagh Chemist Beat', 'WHOLESALE');
  insertCustomer.run(4, 1, 'Rohan Mehta (Retail Regular)', '+91 98999 11223', 'rohan.mehta@gmail.com', 'B-14, Green Park Extension, New Delhi', null, '07', 10000.0, 0.0, 'Walk-in Local Beat', 'RETAIL');

  // Customer initial ledger entries
  const insertLedger = db.prepare(`
    INSERT INTO customer_ledger (customer_id, shop_id, transaction_type, reference_no, debit_amount, credit_amount, balance_after, payment_mode, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertLedger.run(1, 1, 'OPENING_BALANCE', 'OB-001', 14200.0, 0.0, 14200.0, null, 'Opening credit balance for Chandni Chowk beat');
  insertLedger.run(2, 1, 'OPENING_BALANCE', 'OB-002', 8500.0, 0.0, 8500.0, null, 'Opening credit balance for Sadar Bazar beat');
  insertLedger.run(3, 1, 'OPENING_BALANCE', 'OB-003', 22400.0, 0.0, 22400.0, null, 'Opening credit balance for Pharma wholesale supply');

  // 11. Initial Attendance Record for Today
  const todayStr = new Date().toISOString().slice(0, 10);
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (employee_id, shop_id, date, check_in_time, status, work_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertAttendance.run(1, 1, todayStr, '09:00:00', 'PRESENT', 8.5, 'Owner Checked-in');
  insertAttendance.run(2, 1, todayStr, '09:15:00', 'PRESENT', 8.0, 'Manager on duty');
  insertAttendance.run(3, 1, todayStr, '09:30:00', 'PRESENT', 7.5, 'Shift 1 Counter Biller');
  insertAttendance.run(4, 1, todayStr, '09:45:00', 'PRESENT', 7.2, 'Shift 1 Inventory & Cashier');

  // 12. Active Shift for Counter 1
  const insertShift = db.prepare(`
    INSERT INTO shifts (id, shop_id, user_id, opened_at, opening_cash, total_sales, cash_sales, upi_sales, status, notes)
    VALUES (?, ?, ?, datetime('now', '-4 hours', 'localtime'), ?, ?, ?, ?, ?, ?)
  `);
  insertShift.run(1, 1, 3, 2000.0, 18450.0, 8200.0, 10250.0, 'OPEN', 'Morning Counter Shift 1');

  // 13. System Config
  const insertConfig = db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)');
  insertConfig.run('appName', 'KwikStore Pro');
  insertConfig.run('currency', '₹');
  insertConfig.run('defaultShopId', '1');
  insertConfig.run('lanMode', 'SERVER'); // SERVER or CLIENT
  insertConfig.run('lanPort', '4848');
  insertConfig.run('thermalPrinterWidth', '80mm');
  insertConfig.run('autoPrintThermal', 'true');
  insertConfig.run('disasterRecoveryDrive', 'D:\\KwikStore_Backups');

  console.log('KwikStore Pro Sample Data successfully seeded!');
}
