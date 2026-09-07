# 🚀 KwikStore Pro — Universal Indian Billing POS + Multi-Shop + HRMS & Payroll

> **100% Offline SQLite Engine • Multi-Counter LAN Sync • Zero Cloud Fees**

KwikStore Pro is a comprehensive Windows desktop application designed specifically for Indian retail shops, wholesale merchants, and FMCG distributors.

---

## 🌟 Key Features

### 1. Universal Indian Retail & Wholesale Engine
- **Grocery & Supermarket:** Fast barcode scanning, loose items by weight (kg/g/ltr), decimal quantities, combo offers.
- **FMCG & Food Distributors (Biscuits, Masala, Chocolates, Cakes):** Dual unit conversions (e.g. 1 Box = 24 Packets, 1 Carton = 10 Boxes), wholesale & dealer tiered rates, **10+1 Free Schemes**, market route beats.
- **Garments & Footwear:** Size (S, M, L, XL, 32, 34, 36) and color variant matrix.
- **Pharmacy & Medical Stores:** Batch number, expiry date tracking, near-expiry alerts, HSN codes.
- **Electronics & Mobile Shops:** **IMEI and Serial number tracking**, warranty period on bill.
- **Hardware & Sanitary:** Dual units (Length, Pcs, Bundle, Box), contractor wholesale rates.

### 2. Multi-Shop / Multi-Branch Management
- Switch effortlessly between branches (e.g., *Main Branch - Delhi*, *Branch 2 - Noida*).
- Individual branch profiles, GSTINs, bank accounts, and UPI IDs.
- **Inter-Branch Stock Transfers** with transfer notes.

### 3. Staff Accounts & Granular Access Control (RBAC)
- Create staff logins (Owner, Manager, Cashier, Biller).
- **Hide Sensitive Data:** Protect purchase costs, profit margins, and HRMS records from cashiers.

### 4. Integrated HRMS & Payroll Portal
- **Employee Directory:** Full profile, salary structure (Basic + HRA + Allowances + Overtime).
- **Auto Check-In on POS Login:** When staff signs in to the billing app, attendance is recorded automatically.
- **Leave Management:** Casual/Sick/Paid leave application and owner approval queue.
- **Salary Advances:** Issue and track employee salary advances.
- **Monthly Payroll & Pay Slips:** 1-Click calculation and printable **Salary Slip** PDF.

### 5. Custom Database Drive & Anti-Corruption Safety
- **Store DB on D:\ or E:\ Drive:** Protects data from Windows OS crashes or formatting.
- **Automated USB Backups:** 1-click snapshot to external Pen Drive.
- **1-Click Reconnect:** Instant reconnect to existing `.sqlite` database on fresh Windows reinstall.

### 6. Print & Indian Tax Compliances
- **80mm & 58mm Thermal Receipts** with dynamic **UPI QR Code** (PhonePe, GPay, Paytm, BHIM).
- **A4 / A5 GST Tax Invoices** with Indian number-to-words (Lakhs & Crores), bank details, and terms.
- **Customer Khata (Udhar):** Balance tracking, payment collection receipts, and **WhatsApp payment reminder generator**.

---

## 💻 Quick Start & Running

### Starting Server & Web Client
```bash
cd /Users/rj-rajesh/.gemini/antigravity/scratch/kwikstore-pro

# Run local server & embedded app:
npm run server
```
- **Local PC:** `http://localhost:4848`
- **Shop LAN:** `http://<YOUR-PC-IP>:4848` (Connect other 3 billing counters over Wi-Fi!)

### Pre-Configured Demo Accounts

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin / Owner** | `owner` | `admin123` | Full Access (POS, Stock, HRMS, Profits, DB Hub) |
| **Store Manager** | `manager` | `manager123` | POS, Inventory, Customer Khata, Attendance |
| **Senior Cashier** | `cashier1` | `cashier123` | POS Billing & Cash Register Only (Profits Hidden) |

---

## ⌨️ Fast POS Keyboard Shortcuts

- `F2` — Start New Bill / Clear
- `F3` — Focus Barcode / Item Search
- `F4` — Open Tender & Payment Modal
- `F8` — Hold Current Bill
- `F9` — Recall Held Bill
- `Enter` — Add selected search result to cart
