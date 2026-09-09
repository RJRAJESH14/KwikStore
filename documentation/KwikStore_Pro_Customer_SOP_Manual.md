# KwikStore Pro™ POS — Customer Standard Operating Procedure (SOP) & User Manual

**Universal Indian Retail & Billing POS + Multi-Shop + Multi-Counter LAN + HRMS Desktop Application**  
**Software Version:** v1.1.0 (Windows `.exe` & macOS `.dmg` Native)  
**Helpline & WhatsApp Support:** +91 8338833377  
**Official Portal & Updates:** [https://fleetbillpro.in](https://fleetbillpro.in)

---

## 📑 Table of Contents
1. [Chapter 1: Installation, Software Activation & Machine ID Fingerprint](#chapter-1-installation-software-activation--machine-id)
2. [Chapter 2: Creating Your Store Owner Account & Master Recovery PIN](#chapter-2-creating-your-store-owner-account--master-recovery-pin)
3. [Chapter 3: First-Time Shop Profile, GST, Rate Tiers & WhatsApp Cloud API](#chapter-3-first-time-shop-profile-gst-rate-tiers--whatsapp-cloud-api)
4. [Chapter 4: Hardware Hub (Printers, Scanners, Weighing Scales, CFD & LAN)](#chapter-4-hardware-hub-printers-scanners-weighing-scales-cfd--lan)
5. [Chapter 5: Staff Management & Role-Based Access Control (RBAC)](#chapter-5-staff-management--role-based-access-control-rbac)
6. [Chapter 6: Master Inventory, Dual-Units, Garment Sizes & Pharmacy Batches](#chapter-6-master-inventory-dual-units-garment-sizes--pharmacy-batches)
7. [Chapter 7: POS Fast Billing Counter, Scale Grabs & Direct WhatsApp Bills](#chapter-7-pos-fast-billing-counter-scale-grabs--direct-whatsapp-bills)
8. [Chapter 8: Customer Khata & Udhar (Credit) Ledger Management](#chapter-8-customer-khata--udhar-credit-ledger-management)
9. [Chapter 9: Sales Analytics, Profit & Loss & GSTR-1 Tax Filing Reports](#chapter-9-sales-analytics-profit--loss--gstr-1-tax-filing-reports)
10. [Chapter 10: Data Backup, Disaster Recovery & PC Migration](#chapter-10-data-backup-disaster-recovery--pc-migration)
11. [Chapter 11: Developer Maintenance, FAQs & Troubleshooting](#chapter-11-developer-maintenance-faqs--troubleshooting)

---

## Chapter 1: Installation, Software Activation & Machine ID

### 1.1 Windows Installation (.exe)
1. Locate `KwikStore Pro Setup 1.1.0.exe` on your PC or USB installation drive.
2. Double-click the installer. If Windows SmartScreen prompts "Windows protected your PC", click **More Info** and select **Run Anyway**.
3. Choose your installation path (default: `C:\Program Files\KwikStore Pro`).
4. Launch the application via the desktop shortcut.

### 1.2 macOS Installation (.dmg) (Apple Silicon M1/M2/M3/M4 & Intel)
1. Double-click `KwikStore Pro-1.1.0-arm64.dmg`.
2. Drag the **KwikStore Pro** icon into your Mac's **Applications** folder.
3. Open `Finder ➔ Applications ➔ KwikStore Pro`. Click **Open** if prompted on first launch.

### 1.3 Android POS Terminals (Sunmi, IMIN, Tablets)
1. Open the Chrome / Android browser on your handheld terminal or tablet.
2. Enter your Master PC's IP address (e.g. `http://192.168.1.50:4848`).
3. Click the browser menu (⋮) and select **"Add to Home Screen" / "Install App"** to install KwikStore Pro as a standalone, full-screen APK app.

---

## Chapter 2: Creating Your Store Owner Account & Master Recovery PIN

### 2.1 Store Owner Account Registration
1. On the login screen, click **New Store Owner? Create Owner Account**.
2. Enter:
   - **Shop Name:** Your official trade name (e.g., Mahaveer Garments & Textiles).
   - **Business Sector:** Retail, Wholesale Distributor, Pharmacy, Garments, Hardware, Supermarket.
   - **Owner Username & Password:** Master login credentials (e.g., `rajesh.store`).
   - **Master Security Recovery PIN:** 4-6 digit secret PIN (e.g. `9853`) for password resets without calling support.
3. Click **Create Store & Sign In**.

---

## Chapter 3: First-Time Shop Profile, GST, Rate Tiers & WhatsApp Cloud API

### 3.1 Shop Profile & GST
1. Navigate to **Settings ➔ Shop & Invoice Settings**.
2. Fill in:
   - **Shop Name & Legal Name:** Appears on top of all invoices.
   - **GSTIN:** 15-digit GST Number (e.g., `21ABCDE1234F1Z5`).
   - **Drug License Number:** Mandatory for Pharmacy & Healthcare (DL-20B / DL-21B).
   - **UPI ID (VPA):** E.g., `shopname@okaxis` or `9876543210@paytm` to generate dynamic payment QR codes on bills.

### 3.2 Direct WhatsApp Cloud API Messaging (Meta Graph API)
- Under **Section 5 (WhatsApp Cloud API)** in Shop Settings:
  - Toggle **Enable WhatsApp Cloud API**.
  - Enter your **WhatsApp Phone Number ID**, **Meta Business Account ID (WABA ID)**, and **Permanent Access Token**.
  - Enter a phone number and click **Send Test Bill** to verify automated background sending.

---

## Chapter 4: Hardware Hub (Printers, Scanners, Weighing Scales, CFD & LAN)

### 4.1 Multi-Counter LAN Discovery
- **Master Server Mode:** Auto-detects local LAN IP (e.g. `http://192.168.1.50:4848`).
- **Counter Terminal Mode:** Connects satellite counters/laptops/tablets to Master PC.
- **Live Terminal Heartbeats:** Monitors active counters with real-time ping latency.

### 4.2 Thermal POS & Laser A4 Printers
- **Auto-Detection:** Automatically enumerates connected USB and network printers.
- **Dual Target Setup:** Assign separate printers for **80mm/58mm Thermal Receipts** vs **A4 Laser Tax Invoices**.
- **1-Click Test Slip & RJ11 Cash Drawer Kick:** Test print alignment and trigger electronic cash drawers.

### 4.3 USB HID Barcode Scanners
- **Plug & Play:** Connects standard USB/Bluetooth barcode guns.
- **High-Speed Burst Detection (< 35ms):** Instantly adds scanned items to the cart from any screen.

### 4.4 Electronic Weighing Scales (RS-232 / USB Serial)
- **Direct Serial Port Connection:** Compatible with Essae, CAS, Phoenix, Citizen, Sansui, Toledo scales.
- **Live LED Weight Meter:** Displays live weight in Kg with STABLE/STABILIZING status.
- **Tare & Zero:** 1-Click Tare (T) button to subtract container weight.
- **1-Click POS Grab:** Click the "⚖️" scale button in the POS cart to instantly grab live weight into item quantity.

### 4.5 Dual-Screen Customer Facing Display (CFD)
- **Open CFD:** Click **CFD Screen** in the top navbar or open `http://<Master_IP>:4848/customer-display` on a secondary screen or tablet.
- **Live Sync:** Displays live shopping basket, applied discounts, and full-screen Dynamic UPI Payment QR codes.

---

## Chapter 7: POS Fast Billing Counter, Scale Grabs & Direct WhatsApp Bills

### 7.1 Keyboard Shortcuts Cheat-Sheet
- `F2`: New Bill / Clear Cart
- `F3`: Focus Customer Search / Mobile
- `F4`: Apply Bill Discount (% or ₹)
- `F8`: Hold / Park Active Bill
- `F9`: Quick Cash Pay
- `F10`: Settle & Print Receipt
- `Delete`: Remove Selected Cart Item
- `+ / -`: Increase / Decrease Quantity

### 7.2 Sending Invoices to Customer WhatsApp
- On the Thermal Receipt or billing screen, click **Share to WhatsApp** to transmit the formatted invoice receipt directly to the customer's WhatsApp phone.
