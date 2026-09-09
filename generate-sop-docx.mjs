import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber
} from 'docx';
import fs from 'fs';
import path from 'path';

console.log('Generating Enhanced KwikStore Pro Customer SOP Word Document (.docx)...');

// Color Palette
const BRAND_PRIMARY = '005A9C'; // Navy Blue
const BRAND_SECONDARY = '008080'; // Teal / Cyan
const BRAND_DARK = '1E293B'; // Slate Dark
const TEXT_MUTED = '64748B'; // Slate Muted
const BG_LIGHT = 'F8FAFC'; // Light grey/slate background
const TABLE_HEADER_BG = '005A9C';
const BORDER_COLOR = 'CBD5E1';

// Helper for Heading 1
function createHeading1(title) {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 150 },
    run: {
      color: BRAND_PRIMARY,
      bold: true,
      size: 32, // 16pt
      font: 'Calibri'
    }
  });
}

// Helper for Heading 2
function createHeading2(title) {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    run: {
      color: BRAND_SECONDARY,
      bold: true,
      size: 26, // 13pt
      font: 'Calibri'
    }
  });
}

// Helper for Heading 3
function createHeading3(title) {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    run: {
      color: BRAND_DARK,
      bold: true,
      size: 22, // 11pt
      font: 'Calibri'
    }
  });
}

// Helper for Paragraph
function createParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({
        text,
        size: 22, // 11pt
        font: 'Calibri',
        color: options.color || BRAND_DARK,
        bold: options.bold || false,
        italics: options.italics || false
      })
    ]
  });
}

// Helper for Callout Box
function createCallout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' }, // Light blue
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: BRAND_PRIMARY }
            },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `📌 ${title}: `, bold: true, color: BRAND_PRIMARY, size: 22, font: 'Calibri' }),
                  new TextRun({ text, color: BRAND_DARK, size: 22, font: 'Calibri' })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Helper for Key-Value Row
function createKVRow(key, value) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: `• ${key}: `, bold: true, color: BRAND_PRIMARY, size: 22, font: 'Calibri' }),
      new TextRun({ text: value, color: BRAND_DARK, size: 22, font: 'Calibri' })
    ]
  });
}

// Helper for Table
function createStyledTable(headers, rowsData) {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: TABLE_HEADER_BG },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: TABLE_HEADER_BG },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: TABLE_HEADER_BG },
        left: { style: BorderStyle.SINGLE, size: 4, color: TABLE_HEADER_BG },
        right: { style: BorderStyle.SINGLE, size: 4, color: TABLE_HEADER_BG }
      },
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' })
          ]
        })
      ]
    }))
  });

  const bodyRows = rowsData.map((row, rIdx) => new TableRow({
    children: row.map((cellText, cIdx) => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: rIdx % 2 === 1 ? BG_LIGHT : 'FFFFFF' },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
        left: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR },
        right: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR }
      },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: cellText, size: 20, font: 'Calibri', color: BRAND_DARK, bold: cIdx === 0 })
          ]
        })
      ]
    }))
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows]
  });
}

// Build the full SOP Document
const doc = new Document({
  creator: 'FleetBillPro Support Team',
  title: 'KwikStore Pro - Complete Customer Standard Operating Procedure (SOP)',
  description: 'Step-by-step customer onboarding and operational manual for KwikStore Pro Desktop POS',
  sections: [
    {
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: 'KwikStore Pro™ | Standard Operating Procedure (SOP)', size: 16, color: TEXT_MUTED, font: 'Calibri' })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.SPACE_BETWEEN,
              children: [
                new TextRun({ text: 'Helpline: +91 8338833377 | https://fleetbillpro.in', size: 16, color: TEXT_MUTED, font: 'Calibri' }),
                new TextRun({ text: '    Page ', size: 16, color: TEXT_MUTED, font: 'Calibri' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: TEXT_MUTED, font: 'Calibri' })
              ]
            })
          ]
        })
      },
      children: [
        // Title Block
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 100 },
          children: [
            new TextRun({ text: 'KWIKSTORE PRO™ POS', bold: true, size: 48, color: BRAND_PRIMARY, font: 'Calibri' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({ text: 'Universal Indian Retail & Billing POS + Multi-Shop + HRMS System', size: 24, color: BRAND_SECONDARY, font: 'Calibri', bold: true })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
          children: [
            new TextRun({ text: 'COMPLETE CUSTOMER ONBOARDING & STANDARD OPERATING PROCEDURE (SOP)', size: 20, color: TEXT_MUTED, font: 'Calibri', bold: true })
          ]
        }),

        // Quick Reference Box
        createCallout(
          'CUSTOMER SUPPORT & HELPLINE',
          'Thank you for choosing KwikStore Pro! For 24/7 priority support, setup assistance, license renewals, or hardware setup (printers, barcode scanners, multi-counter LAN), reach our support team via WhatsApp & Call at +91 8338833377 or visit https://fleetbillpro.in.'
        ),
        new Paragraph({ spacing: { before: 200, after: 200 } }),

        // Quick Meta Table
        createStyledTable(
          ['Document Property', 'Details'],
          [
            ['Product Name', 'KwikStore Pro™ Enterprise POS System'],
            ['Software Version', 'Version 1.1.0 (Windows .exe & macOS .dmg Native)'],
            ['Target Industries', 'Retail, Wholesale Distributor, Pharmacy, Garments, Hardware, Supermarket'],
            ['Hardware Licensing', 'Machine-Locked Cryptographic Key (100% Offline & Secure)'],
            ['Database Architecture', 'Offline-First SQLite Engine with Multi-Counter LAN Sync'],
            ['Hardware Integration', 'Thermal POS Printers (80mm/58mm), Laser A4, USB HID Barcode Scanners, Cash Drawers'],
            ['Helpline & WhatsApp', '+91 8338833377'],
            ['Official Portal', 'https://fleetbillpro.in']
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // TABLE OF CONTENTS
        createHeading1('Table of Contents'),
        createParagraph('This document provides step-by-step instructions to get your shop live and running in less than 15 minutes:'),
        createKVRow('Chapter 1', 'Installation, Software Activation & Machine ID Fingerprint'),
        createKVRow('Chapter 2', 'Creating Your Store Owner Account & Master Recovery PIN'),
        createKVRow('Chapter 3', 'First-Time Shop Profile, GST & Rate Tier Configuration'),
        createKVRow('Chapter 4', 'Hardware & LAN Multi-Counter System (Printers, Barcode Scanners & Network Hub)'),
        createKVRow('Chapter 5', 'Staff Management & Role-Based Access Control (RBAC)'),
        createKVRow('Chapter 6', 'Master Inventory, Dual-Units, Garment Sizes & Pharmacy Batches'),
        createKVRow('Chapter 7', 'POS Fast Billing Counter, Distributor Tiers & Day-to-Day Sales'),
        createKVRow('Chapter 8', 'Customer Khata & Udhar (Credit) Ledger Management'),
        createKVRow('Chapter 9', 'Sales Analytics, Profit & Loss & GSTR-1 Tax Filing Reports'),
        createKVRow('Chapter 10', 'Data Backup, Disaster Recovery & PC Migration'),
        createKVRow('Chapter 11', 'Developer Maintenance, FAQs & Troubleshooting'),

        new Paragraph({ spacing: { before: 200, after: 200 } }),

        // CHAPTER 1
        createHeading1('Chapter 1: Installation, Software Activation & Machine ID'),
        createParagraph('KwikStore Pro is a high-speed, offline-first application that runs entirely on your local computer without requiring constant internet connectivity.'),
        
        createHeading2('1.1 Windows Installation (.exe)'),
        createParagraph('1. Locate the file named "KwikStore Pro Setup 1.1.0.exe" from your setup package or USB drive.'),
        createParagraph('2. Double-click the installer. If Windows SmartScreen prompts "Windows protected your PC", click "More Info" and select "Run Anyway".'),
        createParagraph('3. Follow the simple on-screen wizard to choose your installation directory (e.g. C:\\Program Files\\KwikStore Pro).'),
        createParagraph('4. The installer will automatically place a "KwikStore Pro" shortcut on your Desktop.'),
        createParagraph('5. Double-click the desktop icon to launch the application.'),

        createHeading2('1.2 macOS Installation (.dmg) (Intel & Apple Silicon M1/M2/M3/M4)'),
        createParagraph('1. Double-click "KwikStore Pro-1.1.0-arm64.dmg" (or your Intel .dmg file).'),
        createParagraph('2. Drag and drop the "KwikStore Pro" app icon into your Mac "Applications" folder.'),
        createParagraph('3. Open Finder ➔ Applications ➔ KwikStore Pro. If prompted on first launch, click "Open".'),

        createHeading2('1.3 Hardware-Locked Machine ID & Activation'),
        createParagraph('To ensure product genuineness and copy protection, KwikStore Pro locks your license to your computer\'s hardware (Motherboard + CPU fingerprint):'),
        createParagraph('1. On first launch, the "License Activation" window will appear displaying your unique Machine ID (e.g., KWIK-8A9F-7B2C-9E41).'),
        createParagraph('2. Click "Copy ID" or click "WhatsApp Key Request" to message our support desk (+91 8338833377).'),
        createParagraph('3. Enter your Shop Name and the genuine License Key (e.g. KWIK-1YE-XXXX-YYYY-ZZZZ) received from us.'),
        createParagraph('4. Click "Activate KwikStore Pro". Your software is immediately unlocked for the licensed period (1 Year, Lifetime, etc.).'),
        createParagraph('5. Free Trial: New buyers can click "Start 7-Day Free Trial" to evaluate all features before purchasing.'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 2
        createHeading1('Chapter 2: Creating Your Store Owner Account & Recovery PIN'),
        createParagraph('KwikStore Pro allows every store owner to create their own dedicated administrative profile with emergency recovery protections.'),

        createHeading2('2.1 Store Owner Account Registration Wizard'),
        createParagraph('1. On the initial login screen, click "New Store Owner? Create Owner Account".'),
        createParagraph('2. Fill in your store details:'),
        createKVRow('Shop / Business Name', 'Your official shop name (e.g., Mahaveer Garments & Footwear).'),
        createKVRow('Business Sector', 'Select your industry (Retail, Wholesale Distributor, Pharmacy, Garments, Hardware, Supermarket) for tailored presets.'),
        createKVRow('Owner Full Name & Username', 'Your personal name and desired login username (e.g., rajesh.store).'),
        createKVRow('Mobile / WhatsApp', 'Your contact number for customer receipts and recovery notifications.'),
        createKVRow('Password', 'A secure password of your choice (minimum 4 characters).'),
        createKVRow('Master Security Recovery PIN', 'A 4 to 6-digit secret PIN (e.g. 9853). Keep this safe! It allows you to reset your password if ever forgotten without calling support.'),
        createParagraph('3. Click "Create Store & Sign In". You will be instantly logged in as the Super Admin Owner.'),

        createHeading2('2.2 Emergency Owner Password Recovery'),
        createParagraph('If you ever forget your Owner password:'),
        createParagraph('1. Click "Forgot Password? Owner Reset" on the login screen.'),
        createParagraph('2. Enter your Username, registered Mobile Number, and Master Recovery PIN.'),
        createParagraph('3. Set a new password immediately and regain full access to your store.'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 3
        createHeading1('Chapter 3: First-Time Shop Profile, GST & Rate Tier Configuration'),
        createParagraph('Before generating your first bill, configure your business details. These details automatically appear on your printed thermal receipts and A4 tax invoices.'),

        createHeading2('3.1 Configuring Shop Details & Multi-Sector Fields'),
        createParagraph('1. Click on "Settings ➔ Shop & Invoice Settings" in the left navigation sidebar.'),
        createParagraph('2. In the "Shop Profile" tab, fill in the following information:'),
        createKVRow('Shop Name', 'Your trade/business name (e.g., Shree Balaji Enterprises)'),
        createKVRow('GSTIN', 'Your 15-digit GST Identification Number (e.g., 21ABCDE1234F1Z5)'),
        createKVRow('Drug License No', 'Mandatory for Medical Stores / Pharmacies (DL-20B / DL-21B)'),
        createKVRow('Address & City', 'Your physical shop street address, city, state, and pincode'),
        createKVRow('Phone & WhatsApp', 'Contact number printed on customer bills for inquiries'),
        createKVRow('UPI ID (VPA)', 'Your store GooglePay/PhonePe/Paytm UPI ID to automatically generate Dynamic Payment QR codes on bills!'),

        createHeading2('3.2 Distributor & Multi-Tier Pricing (Retail, Wholesale, Dealer, MRP)'),
        createParagraph('If your business operates as a Wholesale Distributor or sells at multiple price points:'),
        createParagraph('• KwikStore Pro supports 4 distinct price tiers for every product: RETAIL, WHOLESALE, DEALER, and MRP.'),
        createParagraph('• During POS billing, simply select the customer\'s rate tier from the top rate selector (or set it automatically per customer type). The POS will instantly recalculate line item rates, margins, and taxes!'),

        createHeading2('3.3 1-Click Industry Terms & Conditions Presets'),
        createParagraph('KwikStore Pro provides pre-written, legally compliant terms for different business sectors:'),
        createKVRow('👗 Garments Policy', '"Exchange allowed within 7 days with price tag and original bill intact. No cash refunds."'),
        createKVRow('💊 Pharmacy Policy', '"Medicines once sold cannot be returned after 48 hrs. Schedule H/H1 drugs require doctor prescription."'),
        createKVRow('🔩 Hardware Policy', '"Cut pipes, electrical wires, and tinted paints cannot be returned. Interest 18% on overdue credit."'),
        createKVRow('📦 Wholesale Policy', '"Goods dispatched at buyer\'s risk. Claims for shortage must be reported within 24 hours."'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 4
        createHeading1('Chapter 4: Hardware & Multi-Counter LAN System'),
        createParagraph('KwikStore Pro includes a built-in Hardware & LAN Diagnostics Hub accessible right from the top navigation bar. It automatically discovers and initializes your shop hardware:'),

        createHeading2('4.1 Multi-Counter LAN Discovery & Master Server Setup'),
        createParagraph('You can connect multiple PCs, laptops, or Android/iOS tablets in your shop over local Wi-Fi or LAN without any cloud server fees:'),
        createParagraph('1. Master Server (Main PC): Keep System Mode = "Master Host (Host Server & Database)". The app auto-detects its local LAN IP (e.g. http://192.168.1.50:4848).'),
        createParagraph('2. Counter Terminals (Satellite PCs): Open their browser or KwikStore client, set System Mode = "Secondary Counter", and enter the Host IP address.'),
        createParagraph('3. Live Counter Registry: The master server automatically tracks every active terminal with live heartbeat and ping latency (ms).'),
        createParagraph('4. 1-Click Copy URL: Click "Copy URL" in the Hardware Hub to quickly share the connection link across the shop.'),

        createHeading2('4.2 Thermal POS & Laser A4 Printer Driver Initialization'),
        createParagraph('KwikStore Pro talks directly to your system print spooler and physical printers:'),
        createParagraph('1. Auto-Detection: Connected USB, Network, and Bluetooth printers (TVS RP3200, EPSON TM-T82, HP LaserJet, Canon, POS-80) are detected on launch.'),
        createParagraph('2. Dual Target Assignment:'),
        createKVRow('POS Thermal Printer', 'Select your 80mm or 58mm thermal receipt printer.'),
        createKVRow('A4 Laser Invoice Printer', 'Select your A4 printer for full tax invoices & Delivery Challans.'),
        createParagraph('3. Test Print Slip: Click "Print 80mm Test Slip" in the Hardware Hub to verify driver alignment, text clarity, and auto-cutter.'),
        createParagraph('4. RJ-11 Cash Drawer Kick: Click "Test RJ11 Cash Drawer Kick" to send an electronic pulse signal that automatically pops open your connected cash drawer.'),

        createHeading2('4.3 USB HID & Wireless Barcode Scanner Driver'),
        createParagraph('KwikStore Pro features plug-and-play support for all standard 1D Laser and 2D QR barcode guns:'),
        createParagraph('1. Plug & Play: Simply plug your USB barcode scanner into any USB port. No manual driver installation needed.'),
        createParagraph('2. High-Speed Burst Detector: The system listens globally for rapid keystroke pulses (< 35ms) sent by barcode scanners and automatically adds the scanned product to the cart from any screen!'),
        createParagraph('3. Scanner Diagnostic Box: Use the physical scanner test box in the Hardware Hub to test scan speeds, verify decoded characters, and detect symbologies (EAN-13, Code 128, QR Code).'),
        createParagraph('4. Scanner Simulator: Test with 1-click simulation buttons (Tata Salt, Maggi Noodles, Dettol Soap) even if you don\'t have a physical scanner on hand.'),

        createHeading2('4.4 Electronic Weighing Scale Integration (RS-232 / USB Serial)'),
        createParagraph('For Grocery, Fruits, Vegetables, Meat, Dry Fruits, and Sweet shops, KwikStore Pro connects directly with electronic weighing scales:'),
        createParagraph('1. Serial Port Connection: Connect your scale to your PC via RS-232 / USB Serial port (Essae, CAS, Phoenix, Citizen, Sansui, Toledo).'),
        createParagraph('2. Live LED Weight Meter: The Hardware Hub displays the live weight reading in real-time with stability indicators (STABLE / STABILIZING).'),
        createParagraph('3. 1-Click Weight Capture: During POS billing, click the "⚖️" scale button next to any item quantity to instantly pull the live scale weight into the bill!'),
        createParagraph('4. Tare & Zero: Use the built-in Tare (T) button in the Hardware Hub to subtract container or packaging weights.'),

        createHeading2('4.5 Dual-Screen Customer Facing Display (CFD)'),
        createParagraph('Elevate your store\'s customer experience with a dedicated secondary monitor or tablet mounted at the billing counter:'),
        createParagraph('1. Open CFD: Click "CFD Screen" in the top navbar or open http://<Master_IP>:4848/customer-display on any customer-facing monitor or tablet.'),
        createParagraph('2. Idle State: Displays your official store logo, greeting message, and promotional offer banners.'),
        createParagraph('3. Active Billing State: Shows line-by-line items scanned in real-time, photos, applied discounts, and total savings.'),
        createParagraph('4. Payment State: Displays a high-contrast, full-screen Dynamic UPI QR Code for instant customer scanning.'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 5
        createHeading1('Chapter 5: Staff Management & Role-Based Access Control (RBAC)'),
        createParagraph('KwikStore Pro supports multi-user staff security so you can hire cashiers and billing operators without giving them access to confidential profit margins, financial reports, or store settings.'),

        createHeading2('5.1 User Roles in KwikStore Pro'),
        createStyledTable(
          ['Role Name', 'POS Billing', 'Inventory Edit', 'Customer Khata', 'Reports & Profit Loss', 'Settings & DB Backup'],
          [
            ['Shop Owner / Admin', '✅ Full Access', '✅ Full Access', '✅ Full Access', '✅ Full Access', '✅ Full Access'],
            ['Store Manager', '✅ Full Access', '✅ Full Access', '✅ Full Access', '✅ Sales Reports', '❌ Restricted'],
            ['Cashier / Biller', '✅ Full Access', '❌ View Only', '✅ Add / Settle', '❌ Restricted', '❌ Restricted']
          ]
        ),

        createHeading2('5.2 Adding a New Cashier'),
        createParagraph('1. Navigate to "Staff Access (RBAC)" in the sidebar.'),
        createParagraph('2. Click "+ Add Staff Member".'),
        createParagraph('3. Enter the Staff Member\'s Name, Username, Login Password, and select Role = "Cashier / Biller".'),
        createParagraph('4. Click "Save Staff". The cashier can now log in at any billing terminal with their individual credentials.'),

        new Paragraph({ spacing: { before: 200, after: 200 } }),

        // CHAPTER 6
        createHeading1('Chapter 6: Master Inventory & Product Catalog Setup'),
        createParagraph('Adding your items is quick and supports barcode scanning, multi-tier pricing, garment variants, pharmacy batch dates, and Excel bulk importing.'),

        createHeading2('6.1 Adding a Single Product'),
        createParagraph('1. Click "Inventory" from the left sidebar and click "+ Add Product".'),
        createParagraph('2. Scan the item barcode using your USB/Bluetooth barcode scanner, or type a custom Barcode/SKU.'),
        createParagraph('3. Enter Product Name, Category, HSN/SAC Code, and GST Tax Slab (0%, 5%, 12%, 18%, or 28%).'),
        createParagraph('4. Fill in the Pricing Matrix:'),
        createKVRow('MRP (₹)', 'Maximum Retail Price printed on packaging.'),
        createKVRow('Retail Selling Price (₹)', 'The standard price charged to walk-in retail customers.'),
        createKVRow('Wholesale / Dealer Price (₹)', 'Discounted tier rates for bulk buyers, retailers, or dealers.'),
        createKVRow('Purchase / Cost Price (COGS ₹)', 'Your actual purchase cost per unit. Used by KwikStore Pro to accurately calculate your real-time Net Profit and Gross Margins!'),

        createHeading2('6.2 Industry-Specific Item Attributes'),
        createKVRow('👗 For Garments & Clothing', 'Select Size (XS, S, M, L, XL, XXL, 30, 32, 34, 36, etc.) and Color chips. Automatically printed on receipts.'),
        createKVRow('💊 For Pharmacy & Healthcare', 'Enter Batch Number (e.g. AUG-2026A1) and Expiry Date (e.g. 12/2027). The system flags expiring items automatically.'),
        createKVRow('🔩 For Hardware & Wholesale', 'Select Dual Units (e.g. 1 Box = 50 Pieces or 1 Bag = 50 Kgs).'),
        createKVRow('🛒 For Supermarkets & FMCG', 'Configure Trade Schemes (e.g. "Buy 10 Get 1 Free"). The POS automatically applies free units during checkout.'),

        createHeading2('6.3 Bulk Product Import via Excel / CSV'),
        createParagraph('If you have thousands of existing products in Excel:'),
        createParagraph('1. In the Inventory screen, click "Download Sample Excel Template".'),
        createParagraph('2. Paste your item barcodes, names, MRP, selling price, and opening stock into the sheet.'),
        createParagraph('3. Click "Import CSV/Excel" and select your completed file. Your entire catalog is imported in seconds!'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 7
        createHeading1('Chapter 7: POS Fast Billing Counter (Day-to-Day Operations)'),
        createParagraph('The POS Billing counter is engineered for lightning-fast checkouts with keyboard-only shortcuts, rate tier switching, and barcode scanner support.'),

        createHeading2('7.1 Standard 3-Step Checkout Flow'),
        createParagraph('Step 1: Scan / Add Items'),
        createParagraph('Scan item barcodes with your scanner. The items immediately appear in the active cart with tax calculation. You can also search by item name or barcode in the search bar.'),
        createParagraph('Step 2: Customer & Rate Tier Selection (Optional)'),
        createParagraph('Type the customer\'s mobile number. If they are a Wholesale or Dealer customer, their rate tier automatically applies. For B2B tax invoices, enter their GSTIN to print a valid B2B Tax Invoice with E-Way Bill support.'),
        createParagraph('Step 3: Settle & Print'),
        createParagraph('Press F10 or click "Settle & Print". Choose payment method (Cash, UPI QR, Card, Split Payment, or Credit Khata) and the receipt prints instantly.'),

        createHeading2('7.2 Essential Keyboard Shortcuts Cheat-Sheet'),
        createStyledTable(
          ['Shortcut Key', 'Action', 'Usage Description'],
          [
            ['F2', 'New Bill / Clear Cart', 'Starts a clean transaction for the next customer'],
            ['F3', 'Focus Customer Search', 'Quick jump to enter customer mobile number'],
            ['F4', 'Apply Bill Discount', 'Opens discount modal for flat ₹ or % store discounts'],
            ['F8', 'Hold / Park Bill', 'Puts current customer cart on hold while next customer is billed'],
            ['F9', 'Quick Cash Pay', 'Instantly completes exact cash payment without prompt'],
            ['F10', 'Settle & Print', 'Opens payment window and prints thermal receipt/A4 bill'],
            ['Delete', 'Remove Cart Item', 'Removes selected item from active cart'],
            ['+ / -', 'Increase / Decrease Qty', 'Adjusts quantity of the selected product']
          ]
        ),

        createHeading2('7.3 UPI Dynamic Payment QR Code'),
        createParagraph('When UPI payment mode is selected, KwikStore Pro generates an on-screen UPI QR Code encoded with your exact bill total. The customer scans using GooglePay, PhonePe, Paytm, or BHIM. Once payment is confirmed, click "Payment Received" to finish the sale.'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 8
        createHeading1('Chapter 8: Customer Khata & Udhar (Credit) Management'),
        createParagraph('Keep 100% accurate track of credit balances and customer khata without manual paper ledgers.'),

        createHeading2('8.1 Selling on Credit (Full or Partial Udhar)'),
        createParagraph('1. In POS billing, select or add the customer by entering their mobile number and name.'),
        createParagraph('2. At payment settlement, choose "Customer Khata (Credit / Udhar)".'),
        createParagraph('3. If the customer makes a partial cash payment (e.g. ₹500 paid on a ₹2000 bill), enter ₹500 in Amount Paid. The remaining ₹1500 is automatically added to their Khata balance.'),

        createHeading2('8.2 Receiving Khata Repayments'),
        createParagraph('1. Click "Customer Khata" in the sidebar.'),
        createParagraph('2. Search the customer by name or phone number.'),
        createParagraph('3. Click "Receive Payment". Enter the amount paid, payment mode (Cash/UPI/Bank), and optional receipt note.'),
        createParagraph('4. The customer\'s ledger is instantly updated and a printable payment statement is generated.'),

        new Paragraph({ spacing: { before: 200, after: 200 } }),

        // CHAPTER 9
        createHeading1('Chapter 9: Reports, Profit & Loss & GSTR-1 Tax Filing'),
        createParagraph('KwikStore Pro provides deep commercial analytics to track your profits, cash flow, and tax liabilities.'),

        createHeading2('9.1 Reports Tabs Overview'),
        createKVRow('📊 Sales Register & Invoices', 'View, filter, and inspect every invoice generated. Filter by Date (Today, Weekly, Monthly, Custom Range), Cashier, Payment Mode, or Invoice Type. 1-click A4 invoice re-printing and PDF downloads.'),
        createKVRow('💰 Profit & Loss Analysis', 'Live gross turnover, total Cost of Goods Sold (COGS), Net Gross Profit (₹), and Overall Profit Margin (%). Item-by-item profit breakdown showing your highest margin items.'),
        createKVRow('📑 GSTR-1 & HSN/SAC Summary', 'HSN-wise breakdown showing Quantity, Taxable Value, CGST, SGST, IGST, and Total GST. Ready for direct filing on the GST portal.'),

        createHeading2('9.2 1-Click Excel / CSV Exports'),
        createParagraph('Click the "Export Reports" button in the top right to download:'),
        createParagraph('• Sales_Register.csv (Itemized accounting ledger)'),
        createParagraph('• Profit_Loss_Report.csv (Gross margins and cost audit)'),
        createParagraph('• HSN_GST_Summary.csv (Official HSN table for GSTR-1)'),
        createParagraph('• GSTR1_Portal_Ready.csv (Direct upload to GST portal)'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 10
        createHeading1('Chapter 10: Data Backup, Disaster Recovery & PC Migration'),

        createHeading2('10.1 1-Click Database Backup'),
        createParagraph('Your entire shop data (inventory, bills, customer accounts, and logs) is stored securely in an offline SQLite database.'),
        createParagraph('1. Go to "DB Hub & Safety" in the sidebar.'),
        createParagraph('2. Click "Create Full Database Backup Now".'),
        createParagraph('3. Save the backup file to a safe external USB drive, secondary hard drive, or cloud folder.'),

        createHeading2('10.2 PC Crash Disaster Recovery & Reinstallation'),
        createParagraph('Suppose your Windows computer crashes, or you migrate to a brand new PC:'),
        createParagraph('1. Install KwikStore Pro fresh on the new PC from your setup file (KwikStore Pro Setup 1.1.0.exe).'),
        createParagraph('2. Plug in your external backup USB drive containing your previous database backup (e.g. kwikstore_backup_YYYY-MM-DD.db).'),
        createParagraph('3. In KwikStore Pro, open "DB Hub & Safety" in the sidebar.'),
        createParagraph('4. In the "Restore Database" panel, select your backup file and click "Restore Database from File".'),
        createParagraph('5. All your historical bills, stock balances, khata ledgers, and accounts are instantly restored!'),

        new Paragraph({ children: [new PageBreak()] }),

        // CHAPTER 11
        createHeading1('Chapter 11: Developer Maintenance, FAQs & Troubleshooting'),

        createHeading2('11.1 License Renewal & In-App Management'),
        createParagraph('To check your remaining subscription days or renew your key:'),
        createParagraph('1. Click "License & Security" in the sidebar.'),
        createParagraph('2. View your active Plan Tier, Expiry Date, and remaining days.'),
        createParagraph('3. Click "Renew License" to enter a new activation key upon subscription renewal.'),

        createHeading2('11.2 Developer Master Maintenance Mode (For Sellers)'),
        createParagraph('If a customer ever locks themselves out or requires emergency database service:'),
        createParagraph('• The authorized developer/seller can enter the Developer Master PIN (990011) to bypass lockouts and service the customer database without data loss.'),

        createHeading2('11.3 Frequently Asked Questions (FAQs)'),
        createParagraph('Q1: How do I change the store name or phone number on bills?'),
        createParagraph('A: Go to Settings ➔ Shop & Invoice Settings. Edit your store name, address, or phone and click Save Changes.'),
        
        createParagraph('Q2: My barcode scanner is not submitting items automatically.'),
        createParagraph('A: Ensure your barcode scanner is configured to send an "Enter / CR (Carriage Return)" suffix after each scan. This is a standard setting in your scanner\'s user manual barcode sheet.'),

        createParagraph('Q3: Can I run multiple billing counters on different PCs?'),
        createParagraph('A: Yes! Keep your main PC in "Master Host" mode, and point all secondary counter PCs or laptops to the master\'s LAN IP (e.g. http://192.168.1.50:4848).'),

        createParagraph('Q4: Can I run this software when the internet is down?'),
        createParagraph('A: Yes! KwikStore Pro is 100% offline-first. Internet is only required if you wish to check for software updates online.'),

        createHeading2('11.4 Customer Support & Assistance'),
        createParagraph('For any technical queries, custom hardware setup (Thermal printers, cash drawers, barcode scanners), or software updates, please contact:'),
        createKVRow('Helpline & WhatsApp', '+91 8338833377'),
        createKVRow('Official Website', 'https://fleetbillpro.in'),
        createKVRow('Cloud Update Channel', 'https://fleetbillpro.in/updates')
      ]
    }
  ]
});

// Write document to file
const outputDir = path.join('/Users/rj-rajesh/.gemini/antigravity/scratch/kwikstore-pro', 'documentation');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const docxPath = path.join(outputDir, 'KwikStore_Pro_Customer_SOP_Manual.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(docxPath, buffer);
  console.log(`\n✅ Enhanced SOP Word Document created successfully at:\n${docxPath}`);

  // Also copy to dist-electron
  const distDir = path.join('/Users/rj-rajesh/.gemini/antigravity/scratch/kwikstore-pro', 'dist-electron');
  if (fs.existsSync(distDir)) {
    const distPath = path.join(distDir, 'KwikStore_Pro_Customer_SOP_Manual.docx');
    fs.writeFileSync(distPath, buffer);
    console.log(`✅ Also copied to dist-electron at:\n${distPath}`);
  }
});
