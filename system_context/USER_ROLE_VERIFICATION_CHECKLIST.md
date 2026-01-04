# User Role Verification Checklist
> **Purpose**: Comprehensive audit of all user roles against the Highland Fresh Manufacturing Plant business context.
> **Last Verified**: December 7, 2025
> **Business Model**: Manufacturing Plant (NOT E-commerce)
> **Total Roles**: 6 (Admin, QC Officer, Production Supervisor, Sales Officer, Warehouse Staff, Finance Officer)

---

## 📊 Audit Summary

| # | Role | Business Alignment | FIFO Compliance | Status |
|---|------|-------------------|-----------------|--------|
| 1 | **Admin** | ✅ Full access, user management | ✅ Can view all | **PASS** |
| 2 | **QC Officer** | ✅ Milk receiving, quality testing | ✅ Aging alerts | **PASS** |
| 3 | **Production Supervisor** | ✅ Batch creation, material issuance | ✅ FIFO preview & consumption | **PASS** |
| 4 | **Sales Officer** | ✅ Walk-in POS, Mall orders | ✅ FIFO batch preview | **PASS** |
| 5 | **Warehouse Staff** | ✅ Dispatch, FIFO scanning | ✅ Batch validation | **PASS** |
| 6 | **Finance Officer** | ✅ Payouts, AR, Requisitions | ✅ Spoilage tracking | **PASS** |

---

## 1. Admin (System Administrator)
**Business Context**: Full system access, user management, system configuration.

### Required Features
| Feature | Status | Evidence |
|---------|--------|----------|
| User Management | ✅ | `admin-dashboard.html` → Link to `users.html` |
| System Stats | ✅ | `AdminDashboardPageInit.js:loadDashboardStats()` |
| Full Module Access | ✅ | Dashboard links to all modules |
| Requisition Approval | ✅ | `RequisitionAPI.php` allows Admin |

### Files
- **UI**: `html/admin-dashboard.html`
- **JS**: `js/admin/AdminDashboardPageInit.js`
- **API**: `api/DashboardStatsAPI.php`, `api/UsersAPI.php`

### Verification Checklist
- [x] Dashboard loads system-wide statistics
- [x] Can create/edit/delete users
- [x] Can access all other role dashboards
- [x] No out-of-scope features

---

## 2. QC Officer (Quality Control)
**Business Context**: Daily milk receiving, lab results recording, reject low-quality milk.

### Required Features
| Feature | Status | Evidence |
|---------|--------|----------|
| Milk Receiving Form | ✅ | `qc-dashboard.html` "New Collection" modal |
| Fat% Pricing | ✅ | `MilkCollectionAPI.php:calculatePrice()` |
| Alcohol Test Rejection | ✅ | `MilkCollectionAPI.php:rejectMilk()` |
| Inventory Update | ✅ | Auto-increases Raw Milk inventory |
| Aging Alerts (FIFO) | ✅ | `getAgingAlerts()` - oldest collections first |

### Files
- **UI**: `html/qc-dashboard.html`
- **JS**: `js/qc-dashboard.js`
- **API**: `api/MilkCollectionAPI.php`

### Verification Checklist
- [x] New collection form captures: Liters, Fat%, Acidity, Alcohol Test
- [x] High fat% = higher price per liter
- [x] Alcohol test fail = rejected, 0 payout
- [x] Approved collections update raw milk inventory
- [x] Aging alerts show oldest batches first (FIFO)

### Role Interactions
- **→ Finance**: Accepted collections create farmer payout liability
- **→ Production**: Aging alerts inform which batches to consume first

---

## 3. Production Supervisor
**Business Context**: Create production batches, consume raw materials (FIFO), record yields and wastage.

### Required Features
| Feature | Status | Evidence |
|---------|--------|----------|
| Create Batch Modal | ✅ | `production-dashboard.html` 3-step modal |
| FIFO Preview | ✅ | `ProductionAPI.php:preview_fifo_allocation` |
| Material Issuance | ✅ | `ProductionAPI.php:issue_materials_and_create_batch` |
| Wastage Reporting | ✅ | Complete batch modal with reason dropdown |
| Batch Completion | ✅ | Updates finished goods inventory |

### Files
- **UI**: `html/production-dashboard.html`
- **JS**: `js/production/ProductionDashboard.js`
- **API**: `api/ProductionAPI.php`

### Verification Checklist
- [x] Can select finished product and planned quantity
- [x] Can add multiple raw materials to issue
- [x] "Preview FIFO" shows oldest batches to be consumed
- [x] Completing batch deducts raw materials, adds finished goods
- [x] Wastage requires reason selection
- [x] Batch code and expiry date auto-generated

### Role Interactions
- **← QC**: Consumes raw materials from approved collections
- **→ Sales/Warehouse**: Finished goods available for sale

---

## 4. Sales Officer
**Business Context**: Handle walk-in cash sales (POS) and wholesale mall orders, generate receipts.

### Required Features
| Feature | Status | Evidence |
|---------|--------|----------|
| Walk-in POS | ✅ | `sales-orders.js:createWalkInSale()` |
| Mall Orders | ✅ | `sales-orders.js:submitOrder()` with customer |
| FIFO Batch Preview | ✅ | `sales-orders.js:previewFifoBatches()` |
| Receipt Generation | ✅ | `sales-orders.js:showReceipt()` with batch info |
| Delivery Receipt | ✅ | `SalesOrdersAPI.php:getDeliveryReceipt()` |

### Files
- **UI**: `html/sales-order-form.html`, `html/sales-dashboard.html`
- **JS**: `js/sales-orders.js`, `js/sales-dashboard.js`
- **API**: `api/SalesOrdersAPI.php`

### Verification Checklist
- [x] Can search products and add to cart
- [x] Walk-in sale: Immediate FIFO deduction, cash change calculation
- [x] Mall order: Customer selection, payment terms (Net 7/15/30)
- [x] "Preview FIFO" shows which batches will be consumed
- [x] Receipt includes batch codes for traceability
- [x] Can approve/reject pending orders

### Role Interactions
- **→ Warehouse Staff**: Approved orders go to dispatch queue
- **→ Finance**: Credit orders create AR (Accounts Receivable)

---

## 5. Warehouse Staff
**Business Context**: Create purchase requisitions, receive goods (triggers BOM), physically dispatch orders, validate FIFO batch picking.

### Required Features
| Feature | Status | Evidence |
|---------|--------|----------|
| **Requisition Creation** | ✅ | `inventory-requisition.html` - Create PR |
| **Receive Goods** | ✅ | `warehouse-staff-dashboard.html` - Receive modal |
| Dispatch Dashboard | ✅ | `warehouse-staff-dashboard.html` pick tasks |
| FIFO Instruction | ✅ | Shows "Pick from Batch X (Oldest)" |
| Batch Scanning | ✅ | `dispatch-order.js:validateScannedBatch()` |
| Wrong Batch Alert | ✅ | Red error if newer batch scanned |
| Complete Dispatch | ✅ | `SalesAPI.php:completeDispatch()` |

### Files
- **UI**: `html/warehouse-staff-dashboard.html`, `html/dispatch-order.html`, `html/inventory-requisition.html`
- **JS**: `js/warehouse-staff-dashboard.js`, `js/dispatch-order.js`
- **API**: `api/SalesAPI.php`, `api/RequisitionAPI.php`, `api/PurchaseOrdersAPI.php`

### Verification Checklist
- [x] Can create Purchase Requisitions for low stock items
- [x] Dashboard shows "POs to Receive" with "Receive Goods" action
- [x] Receiving modal inputs accepted quantity and triggers BOM update
- [x] Dashboard shows "Ready for Dispatch" orders
- [x] Pick list displays required batch codes
- [x] Scanning correct batch = green success
- [x] Scanning wrong (newer) batch = red FIFO violation error
- [x] Cannot complete dispatch until all items validated
- [x] Generates delivery receipt on completion

### Role Interactions
- **→ Finance**: Requisitions sent for approval & execution
- **← Finance**: Receives approved POs to receive
- **← Sales**: Receives approved orders from sales workflow
- **→ Inventory**: Deducts stock on dispatch, adds stock on receiving
- **→ BOM**: Final invoice cost triggers product cost recalculation

---

## 6. Finance Officer
**Business Context**: Approve & Execute requisitions (auto-generate PO), farmer payouts, AR collection, spoilage loss tracking.

### Required Features
| Feature | Status | Evidence |
|---------|--------|----------|
| **Requisition Approval & Execution** | ✅ | `finance-dashboard.html` - Approve & Send button |
| Farmer Payouts | ✅ | `finance-dashboard.js:loadPayouts()` |
| AR Collection | ✅ | `finance-dashboard.js:loadReceivables()` |
| Spoilage Tracking | ✅ | `finance-dashboard.js:loadExpiredBatches()` |

### The 2-Step Finance-Executed Procurement Flow
> **Key Principle**: Finance Officer is both Approver AND Executor - eliminates Admin bottleneck.

| Step | Actor | Action |
|------|-------|--------|
| 1 | Warehouse Staff | Creates Purchase Requisition (PR) |
| 2 | **Finance Officer** | Clicks "Approve & Send" → PR Approved + PO Auto-Generated |
| 3 | Warehouse Staff | Receives goods, inputs cost → BOM recalculates |

### Files
- **UI**: `html/finance-dashboard.html`
- **JS**: `js/finance-dashboard.js`
- **API**: `api/PaymentsAPI.php`, `api/FarmerPayoutAPI.php`, `api/SpoilageReportAPI.php`, `api/RequisitionAPI.php`

### Verification Checklist
- [x] Farmer payout tab shows aggregated milk collections
- [x] Can generate payslips and mark as paid
- [x] AR Collection shows unpaid/overdue orders
- [x] Can record customer payments
- [x] Spoilage tab shows expired batches and financial loss
- [x] Requisitions tab shows pending requisitions with approve/reject

### Role Interactions
- **← QC**: Farmer payouts based on accepted milk collections
- **← Sales**: AR data from credit orders
- **← Production**: Wastage data for spoilage tracking
- **← Warehouse Staff**: Requisitions requiring financial approval

---

## 🛡️ Quality & Disposal Protocols

> **Purpose**: Ensure spoiled/expired products ("bahaw") are never sold to customers and disposal is properly logged.

### Production Supervisor - Disposal Controls

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Block batch creation if raw material is **Expired** | [ ] | `ProductionAPI.php` must validate `expiry_date` before `issue_materials_and_create_batch` |
| "Disposal Action" button for failed batches | [ ] | Button in `production-dashboard.html` with reason dropdown |
| Disposal generates `spoilage_log` entry | [ ] | API writes to `spoilage_log` table with reason code |

**Disposal Reason Codes:**
- `HIGH_ACIDITY` - Milk failed acidity test
- `CONTAMINATION` - Foreign substance detected
- `EXPIRED` - Past expiry date
- `EQUIPMENT_FAILURE` - Batch ruined due to equipment
- `QUALITY_REJECT` - Failed QC taste/texture test

### Warehouse Staff - Expiry Visibility Controls

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Block Sales visibility for stock within **24 hours of expiry** | [ ] | `SalesOrdersAPI.php` query excludes batches where `expiry_date <= NOW() + INTERVAL 24 HOUR` |
| Near-expiry batches flagged in Warehouse dashboard | [ ] | Visual indicator in `warehouse-staff-dashboard.html` |
| Automatic disposal recommendation for expired stock | [ ] | System generates disposal task for Finance review |

### Verification Checklist - Disposal Flow

- [ ] Production Supervisor cannot select expired raw material batches
- [ ] Disposal button requires selection from predefined reason list
- [ ] `spoilage_log` entry created with: batch_id, reason, quantity, user_id, timestamp
- [ ] Sales Officer product search excludes near-expiry stock (24h buffer)
- [ ] Finance Officer can view all spoilage logs for loss tracking

---

## ✅ Resolved Gaps

### GAP-F1: Requisition Approval UI (RESOLVED)
**Severity**: Medium → ✅ Resolved
**Resolved Date**: December 7, 2025
**Implementation**:
1. Added "Requisitions" tab to `finance-dashboard.html`
2. Added requisition approval functions to `finance-dashboard.js`:
   - `loadPendingRequisitions()` - Fetches pending requisitions
   - `approveRequisition()` - Calls `RequisitionAPI.php?operation=approveRequisition`
   - `rejectRequisition()` - With rejection reason modal
   - `viewRequisitionDetail()` - Shows full requisition with items
3. Badge counter shows pending requisitions in navbar

---

## ❌ Removed Roles

| Role | Status | Removal Date |
|------|--------|--------------|
| Warehouse Manager | ❌ REMOVED | December 7, 2025 |

**Rationale**: Redundant role. Responsibilities redistributed to:
- Order approval → Sales Officer / Admin
- Stock monitoring → Admin / Finance Officer
- Requisition approval → Admin / Finance Officer

---

*Document Updated: December 7, 2025*
*Revised: January 4, 2026 - Updated 2-Step Finance-Executed Procurement Flow, Warehouse Staff requisition & receiving roles*
