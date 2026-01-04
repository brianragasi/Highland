# Highland Fresh - Master Verification Checklist

**Purpose:** Comprehensive validation of the "Manufacturing Plant" pivot and FIFO enforcement across all user roles.  
**Reference Documents:** `1_PROJECT_BLUEPRINT.md`, `2_FIFO_OPERATIONS_GUIDE.md`  
**Date Updated:** December 7, 2025

---

## 🔴 CRITICAL SYSTEM CONFIGURATION CHECK

Before testing user flows, verify the system is configured for the **Manufacturing Plant** model.

| # | Configuration Item | Requirement | Status |
|---|-------------------|-------------|--------|
| C1 | **Business Model** | "Online Store" features (Cart, Customer Login) are DISABLED/REMOVED | ⬜ |
| C2 | **User Roles** | Roles exist: QC Officer, Production, Warehouse, Sales, Finance | ⬜ |
| C3 | **FIFO Mode** | System enforces `ORDER BY date ASC` globally | ⬜ |
| C4 | **Inventory Mode** | Tracks Raw Materials (Milk, Sugar) AND Finished Goods (Bottles) | ⬜ |

---

## 👤 ROLE 1: QC OFFICER (The Gatekeeper)
**Focus:** Milk Receiving & Quality Control

### 1.1 Milk Receiving Form
**Location:** `qc-dashboard.html` -> New Collection

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| Q1 | **Load Form** | Form shows fields: Supplier, Liters, Fat %, Acidity, Alcohol Test, Transport | ⬜ |
| Q2 | **Price Calculation (High Quality)** | Input: Fat=4.0% → System auto-sets Price = **₱42.00/L** | ⬜ |
| Q3 | **Price Calculation (Low Quality)** | Input: Fat=3.4% → System auto-sets Price = **₱38.00/L** | ⬜ |
| Q4 | **Transport Deduction** | Input: Transport="No" → System deducts **₱2.00/L** from net price | ⬜ |
| Q5 | **Rejection Logic** | Input: Alcohol Test="Fail" → Entry flagged as REJECTED, 0 payment | ⬜ |
| Q6 | **Inventory Update** | Saving collection INCREASES `Raw Milk` inventory by Accepted Liters | ⬜ |

---

## 👤 ROLE 2: PRODUCTION SUPERVISOR (The Manufacturer)
**Focus:** Batch Creation & FIFO Consumption  
**Verified:** December 7, 2025 ✅

### 2.1 Dashboard & Setup
**Location:** `production-dashboard.html`

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| P1 | **Dashboard Load** | Shows stats: Active Batches, Completed Today, Total Production | ✅ |
| P2 | **Create Batch Modal** | Click "Create Production Batch" → Modal opens with 3 steps | ✅ |
| P3 | **Product Dropdown** | Dropdown loads finished products from `ProductsAPI.php` | ✅ |
| P4 | **Add Raw Materials** | Click "Add Raw Material" → Dynamic row with material dropdown | ✅ |

### 2.2 FIFO Preview (Critical Verification)
**API Action:** `preview_fifo_allocation`

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| P5 | **Preview Button** | Click "Preview FIFO Batches" → API call triggered | ✅ |
| P6 | **FIFO Order** | Batches sorted by `received_date ASC` (OLDEST first) | ✅ |
| P7 | **Expiry Warnings** | Near-expiry batches highlighted in preview table | ✅ |
| P8 | **Insufficient Alert** | If `total_available < quantity_requested` → Red "Insufficient Stock" badge | ✅ |

### 2.3 Batch Creation & Material Issuance
**API Action:** `issue_materials_and_create_batch`

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| P9 | **Stock Validation** | If quantity_on_hand goes negative → Exception thrown | ✅ |
| P10 | **Batch ID Format** | Generated: `BATCH-YYYYMMDD-XXXX` | ✅ |
| P11 | **FIFO Deduction** | Raw materials consumed from **OLDEST** batches | ✅ |
| P12 | **Expiry Auto-Set** | Finished goods expiry = Production Date + 7 days | ✅ |
| P13 | **Traceability** | `raw_material_consumption` table records batch-to-batch linkage | ✅ |

### 2.4 Batch Completion (Record Output)
**API Action:** `complete_production_batch`

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| P14 | **Complete Button** | Click checkmark on "In Progress" batch → Modal opens | ✅ |
| P15 | **Materials Used Display** | Shows raw material batches consumed (FIFO traceability) | ✅ |
| P16 | **Yield Entry** | Enter "Quantity Produced" → Required field | ✅ |
| P17 | **Wastage Reporting** | If Waste > 0 → Reason dropdown becomes required | ✅ |
| P18 | **Inventory Update** | `products.quantity_on_hand += yield_quantity` | ✅ |
| P19 | **Print Label Prompt** | After completion → "Would you like to print batch labels?" | ✅ |

---

## 👤 ROLE 3: SALES OFFICER (The Distributor)
**Focus:** Dual-Mode Sales (Walk-in vs Mall)

### 3.1 Walk-In Sale (Cash POS)
**Location:** `sales-order-form.html` (Tab: Walk-in)

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| S1 | **Product Lookup** | Can search products by Name or SKU | ⬜ |
| S2 | **Cart Calculation** | Total Amount updates instantly as items added | ⬜ |
| S3 | **Payment Processing** | Input Cash > Total → System calculates Change | ⬜ |
| S4 | **Instant Deduct** | Completing sale IMMEDIATELY deducts inventory (FIFO logic) | ⬜ |
| S5 | **Receipt** | System generates printable thermal receipt | ⬜ |

### 3.2 Mall Order (Charge Invoice)
**Location:** `sales-order-form.html` (Tab: Charge Invoice)

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| S6 | **Customer Selection** | Can select "Gaisano", "SM", etc. from customer list | ⬜ |
| S7 | **Credit Terms** | Can select Terms (Net 15, Net 30) | ⬜ |
| S8 | **Batch Allocation** | System reserves **OLDEST** finished goods batches for this order | ⬜ |
| S9 | **Document Gen** | Generates "Delivery Receipt" and "Charge Invoice" | ⬜ |

---

## 👤 ROLE 4: WAREHOUSE STAFF (The FIFO Enforcer)
**Focus:** Dispatch Validation

### 4.1 Dispatch Execution
**Location:** `dispatch-order.html`

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| W1 | **Order Loading** | Loading an order shows list of items to pick | ⬜ |
| W2 | **FIFO Instruction** | UI explicitly shows **"Required Batch: [BATCH-CODE]"** (Oldest) | ⬜ |
| W3 | **Scan Validation (CORRECT)** | Scanning the **Required Batch** → Green Checkmark "✓ Validated" | ⬜ |
| W4 | **Scan Validation (WRONG)** | Scanning a **NEWER Batch** → Red Error "❌ WRONG BATCH - FIFO VIOLATION" | ⬜ |
| W5 | **Completion Block** | "Complete Dispatch" button DISABLED until all items validated | ⬜ |

---

## 👤 ROLE 5: FINANCE OFFICER (The Auditor)
**Focus:** Payouts & Loss Prevention

### 5.1 Farmer Payouts
**Location:** `finance-dashboard.html` (Payouts Tab)

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| F1 | **Data Aggregation** | Shows total liters accepted from QC Module for selected period | ⬜ |
| F2 | **Deduction Logic** | Verifies Transport Fees and Rejected Liters are deducted | ⬜ |
| F3 | **Payslip Gen** | Generates PDF payslip for farmer | ⬜ |

### 5.2 FIFO & Spoilage Audit
**Location:** `finance-dashboard.html` (FIFO Tab)

| # | Test Scenario | Expected Behavior | Status |
|---|---------------|-------------------|--------|
| F4 | **Bypass Report** | Lists any dispatch events where FIFO was overridden (if allowed) | ⬜ |
| F5 | **Spoilage Value** | Calculates financial loss from expired/spoiled batches | ⬜ |

---

## 🔄 END-TO-END INTEGRATION TEST

**Scenario:** "The Perfect Flow"

1. **QC:** Receives 100L Raw Milk from Farmer A (Batch `RM-001`).
2. **Production:** Uses `RM-001` to make 100 bottles Choco Milk (Batch `CM-001`).
3. **Sales:** Creates order for 50 bottles Choco Milk for Gaisano.
4. **Warehouse:** Dispatches `CM-001` (Validates FIFO).
5. **Finance:** Pays Farmer A for the 100L milk.

**Success Criteria:**
- [ ] `RM-001` quantity is 0.
- [ ] `CM-001` quantity is 50.
- [ ] Farmer A status is "Paid".
- [ ] Gaisano Invoice is "Unpaid/Open".
- [ ] No FIFO violations recorded.

---

*Document Consolidated: December 7, 2025*
