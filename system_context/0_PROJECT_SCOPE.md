# Highland Fresh System - Project Scope

**Document Version:** 1.0  
**Date:** December 15, 2025  
**System:** Highland Fresh Dairy Manufacturing Management System  
**Location:** El Salvador City, Misamis Oriental, Philippines

---

## Executive Summary

Highland Fresh is a **comprehensive Dairy Manufacturing Management System** designed for a processing plant environment. Unlike an e-commerce platform, this system manages the entire dairy production lifecycle—from raw milk collection and quality control to production, inventory management, sales, and financial tracking. The system enforces **FIFO (First-In, First-Out)** principles throughout to ensure product freshness and minimize spoilage.

---

## 1. Project Objectives

### Primary Goals
1. **Digitize Dairy Operations** - Replace manual tracking with an integrated digital system
2. **Enforce FIFO Compliance** - Ensure oldest materials are used/sold first to minimize waste
3. **Streamline Quality Control** - Track milk quality from farmer delivery to final product
4. **Automate Financial Workflows** - Farmer payouts, spoilage tracking, and sales reconciliation
5. **Enable Real-time Inventory Visibility** - Track raw materials and finished goods in real-time

### Key Performance Indicators (KPIs)
- Spoilage reduction through expiry tracking
- FIFO compliance rate in production and dispatch
- Farmer payout accuracy and timeliness
- Production batch traceability

---

## 2. System Modules & Features

### Module A: Quality Control (QC) Dashboard
**File:** `html/qc-dashboard.html`  
**Purpose:** Dairy-specific milk intake with lab quality testing

| Feature | Description |
|---------|-------------|
| Milk Collection | Record daily deliveries from farmers/cooperatives |
| Quality Testing | Fat %, acidity, alcohol test, sediment test |
| Price Calculation | Fat-based pricing with quality premiums |
| Acceptance/Rejection | QC officer decision with audit trail |
| Auto-Inventory Update | Accepted milk → Raw Milk inventory with 48h expiry |

---

### Module B: Production Dashboard
**File:** `html/production-dashboard.html`  
**Purpose:** Convert raw materials into finished dairy products

| Feature | Description |
|---------|-------------|
| Batch Creation | Create production batches for any finished product |
| Material Issuance | FIFO-enforced allocation of raw materials |
| Production Tracking | Status workflow: Pending → In Progress → Completed |
| Yield Recording | Track actual output vs. planned quantity |
| Waste Logging | Record production losses with reasons |

---

### Module C: Sales Dashboard & Order Management
**Files:** `html/sales-dashboard.html`, `html/sales-order-form.html`, `html/sales-orders.html`  
**Purpose:** Handle both walk-in retail and wholesale B2B transactions

| Feature | Description |
|---------|-------------|
| Walk-in POS | Instant cash sales with immediate inventory deduction |
| Wholesale Orders | Credit-based orders with payment terms (Net 7/15/30) |
| Order Approval | Workflow for pending orders |
| FIFO Preview | Preview which batches will be allocated |
| Payment Recording | Track partial and full payments |
| Receipt Printing | Generate thermal receipts and delivery receipts |

---

### Module D: Inventory Management
**Files:** `html/two-tier-inventory-dashboard.html`, `html/inventory-requisition.html`, `html/bulk-inventory-update.html`  
**Purpose:** Manage raw materials and finished goods inventory

| Feature | Description |
|---------|-------------|
| Two-Tier Inventory | Separate tracking for raw materials vs. finished goods |
| Low Stock Alerts | Automatic reorder point notifications |
| Purchase Requisition | Request materials when stock is low |
| Batch Tracking | FIFO-based batch management with expiry dates |
| Bulk Updates | Mass inventory adjustments |

---

### Module E: Warehouse Operations
**Files:** `html/warehouse-staff-dashboard.html`, `html/dispatch-order.html`, `html/material-issuance.html`  
**Purpose:** Physical goods movement and FIFO enforcement

| Feature | Description |
|---------|-------------|
| Order Dispatch | Pick and pack approved wholesale orders |
| Barcode Scanning | Validate correct FIFO batch during dispatch |
| Material Issuance | Issue raw materials to production batches |
| Delivery Receipts | Generate DRs with batch codes and expiry info |

---

### Module F: Finance Dashboard
**File:** `html/finance-dashboard.html`  
**Purpose:** Financial tracking, farmer payouts, and loss monitoring

| Feature | Description |
|---------|-------------|
| Farmer Payout | Generate payroll based on milk deliveries and quality |
| Inventory at Risk | Dashboard for batches nearing expiry |
| Expired Batch Tracking | Identify and write off expired inventory |
| Spoilage Reports | Track losses by reason and period |
| Accounts Receivable | Track outstanding payments from wholesale customers |

---

### Module G: Admin Dashboard
**Files:** `html/admin-dashboard.html`, `html/users.html`, `html/suppliers.html`, `html/products.html`  
**Purpose:** System configuration and user management

| Feature | Description |
|---------|-------------|
| User Management | Create/edit/deactivate user accounts |
| Role Assignment | Assign roles with specific permissions |
| Supplier Management | Manage farmers and material suppliers |
| Product Catalog | Maintain finished goods catalog |
| System Configuration | Business rules and settings |

---

## 3. User Roles & Permissions

| Role | Access Level | Primary Responsibilities |
|------|--------------|-------------------------|
| **Admin** | Full System | User management, system configuration, all dashboards |
| **Production Supervisor** | Production + QC | Milk collection, quality control, batch creation |
| **QC Officer** | Quality Control | Daily milk receiving, lab results, accept/reject decisions |
| **Sales Officer** | Sales | Walk-in POS, wholesale orders, payment collection |
| **Warehouse Staff** | Inventory | Stock management, dispatch, FIFO validation |
| **Finance Officer** | Finance | Farmer payouts, spoilage reports, financial tracking |

---

## 4. Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5 |
| **Backend** | PHP 7.4+ (Object-Oriented) |
| **Database** | MySQL / MariaDB |
| **Web Server** | Apache (XAMPP stack) |
| **AJAX Library** | Axios |
| **Icons** | Bootstrap Icons |
| **Architecture** | RESTful API with BaseAPI pattern |

---

## 5. Database Structure

### Core Tables (50+ total)

#### Transaction Tables
| Table | Purpose |
|-------|---------|
| `milk_daily_collections` | Raw milk intake records with QC data |
| `raw_material_batches` | Material inventory by batch (FIFO) |
| `production_batches` | Finished goods production records |
| `raw_material_consumption` | Links input batches → output batches |
| `sales` | Sales transactions (walk-in and wholesale) |
| `sale_items` | Line items per sale with batch allocation |
| `customer_payments` | Payment records for AR tracking |
| `farmer_payouts` | Farmer payment vouchers |
| `spoilage_log` | Waste and expired inventory tracking |

#### Master Data Tables
| Table | Purpose |
|-------|---------|
| `suppliers` | Farmers and material suppliers |
| `raw_materials` | Ingredients and packaging catalog |
| `products` | Finished goods catalog |
| `customers` | Wholesale customer database |
| `users` | System user accounts |
| `user_roles` | Role definitions and permissions |

---

## 6. API Structure

| API File | Key Operations |
|----------|---------------|
| `AuthAPI.php` | login, logout, session validation |
| `MilkCollectionAPI.php` | createCollection, acceptMilk, getCollections |
| `ProductionAPI.php` | createBatch, completeBatch, issueMaterials |
| `SalesOrdersAPI.php` | createOrder, createWalkInSale, approveOrder |
| `PaymentsAPI.php` | recordPayment, getUnpaidOrders |
| `FarmerPayoutAPI.php` | generatePayout, approvePayout |
| `RawMaterialInventoryAPI.php` | getBatches, allocateFIFO |
| `SpoilageReportAPI.php` | logSpoilage, getInventoryAtRisk |
| `RequisitionAPI.php` | createRequisition, approveRequisition |
| `PurchaseOrdersAPI.php` | createPO, receivePO |

---

## 7. Key Business Rules

### 7.1 FIFO Enforcement
```
Priority: ORDER BY received_date ASC, batch_id ASC

1. Always allocate/dispatch from oldest batch first
2. Production consumes oldest raw materials
3. Sales dispatches oldest finished goods
4. Barcode validation prevents picking newer batches
```

### 7.2 Expiry Timers
| Material Type | Expiry Period |
|---------------|---------------|
| Raw Milk | 48 hours from collection |
| Fresh Milk (bottled) | 7 days |
| Flavored Dairy | 14 days |
| Packaging Materials | 365+ days (no FIFO priority) |

### 7.3 Approval Workflows
| Action | Requires Approval By |
|--------|---------------------|
| Purchase Requisition | Finance/Admin |
| Wholesale Sales Order | Sales Officer/Admin |
| Farmer Payout | Finance Officer |
| Inventory Write-off | Admin |

---

## 8. Project File Structure

```
HighLandFreshApp/
├── api/                    # PHP Backend APIs (35 files)
│   ├── BaseAPI.php         # Abstract base class
│   ├── AuthAPI.php         # Authentication
│   ├── MilkCollectionAPI.php
│   ├── ProductionAPI.php
│   ├── SalesOrdersAPI.php
│   ├── PaymentsAPI.php
│   ├── FarmerPayoutAPI.php
│   └── ... (28 more APIs)
├── css/                    # Stylesheets
│   └── styles.css
├── database/               # Database migrations
│   ├── migrations/         # SQL migration files (34)
│   └── backups/            # Database backups
├── html/                   # Frontend Pages (22 files)
│   ├── login.html
│   ├── qc-dashboard.html
│   ├── production-dashboard.html
│   ├── sales-dashboard.html
│   ├── finance-dashboard.html
│   ├── warehouse-staff-dashboard.html
│   └── ... (16 more pages)
├── js/                     # JavaScript (76 files)
│   ├── auth.js
│   ├── qc-dashboard.js
│   ├── sales-orders.js
│   ├── finance-dashboard.js
│   └── ... (72 more scripts)
├── images/                 # Static assets
├── logs/                   # Application logs
├── system_context/         # Documentation (this folder)
│   ├── 0_PROJECT_SCOPE.md  # ← This document
│   ├── 1_PROJECT_BLUEPRINT.md
│   ├── 2_FIFO_OPERATIONS_GUIDE.md
│   ├── 3_MASTER_VERIFICATION_CHECKLIST.md
│   ├── 4_FUTURE_ROADMAP_AI.md
│   └── ... (5 more docs)
└── CODE_WALKTHROUGH_GUIDE.md
```

---

## 9. Out of Scope

The following are explicitly **NOT** part of this system:

| Item | Reason |
|------|--------|
| Customer Self-Service Portal | B2B model; Sales Officer handles all customer interactions |
| E-commerce/Shopping Cart | Manufacturing plant, not online store |
| Multi-Plant Support | Single plant at El Salvador City |
| Mobile Native Apps | Web-based responsive design only |
| Advanced Reporting/BI | Basic reports; advanced analytics deferred |
| Integration with External ERP | Standalone system |

---

## 10. Future Enhancements (Roadmap)

See `4_FUTURE_ROADMAP_AI.md` for detailed future plans, including:
- Advanced analytics dashboard
- Mobile-responsive optimizations
- Integration with accounting software
- Predictive inventory management
- Customer credit scoring

---

## 11. Document References

| Document | Purpose |
|----------|---------|
| `1_PROJECT_BLUEPRINT.md` | High-level architecture and pivot plan |
| `2_FIFO_OPERATIONS_GUIDE.md` | Detailed FIFO implementation guide |
| `3_MASTER_VERIFICATION_CHECKLIST.md` | Testing and QA checklist |
| `4_FUTURE_ROADMAP_AI.md` | Planned enhancements |
| `IPO_DOCUMENTATION.md` | Input-Process-Output analysis |
| `SYSTEM_OPERATION_WORKFLOW.md` | End-to-end operational workflows |
| `CODE_WALKTHROUGH_GUIDE.md` | Technical code guide for demos |
| `database_schema.md` | Complete database documentation |

---

*Document created: December 15, 2025*  
*Last updated: December 15, 2025*
