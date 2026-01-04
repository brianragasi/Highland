# Highland Fresh System - IPO Documentation
## Input-Process-Output Analysis

**Document Version:** 1.0  
**Date:** December 9, 2025  
**System:** Highland Fresh Dairy Manufacturing Management System  
**Location:** El Salvador City, Misamis Oriental, Philippines

---

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles](#user-roles)
3. [Input Sources](#input-sources)
4. [Processing Logic](#processing-logic)
5. [Output & Reports](#output--reports)
6. [Database Schema](#database-schema)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Overview

Highland Fresh is a **Dairy Manufacturing Management System** that handles the complete production cycle from raw milk collection to finished goods sales. The system is designed for a manufacturing plant environment (not e-commerce).

### Core Modules:
| Module | Primary User | Purpose |
|--------|--------------|---------|
| QC Dashboard | Production Supervisor | Milk collection, quality testing, acceptance |
| Production Dashboard | Production Supervisor | Batch creation, material issuance, FIFO |
| Sales Dashboard | Sales Officer | Walk-in POS, wholesale orders, FIFO dispatch |
| Finance Dashboard | Finance Officer | Farmer payouts, spoilage tracking, inventory at risk |
| Inventory Dashboard | Warehouse Staff | Stock levels, raw materials, finished goods |
| Admin Dashboard | Admin | User management, system configuration |

---

## User Roles

| Role | Access Level | Key Responsibilities |
|------|--------------|---------------------|
| **Admin** | Full | User management, system configuration, all dashboards |
| **Production Supervisor** | Production + QC | Milk collection, quality control, batch creation |
| **Sales Officer** | Sales | Walk-in sales (POS), wholesale orders, receipts |
| **Warehouse Staff** | Inventory | Stock management, dispatch, FIFO validation |
| **Finance Officer** | Finance | Farmer payouts, spoilage reports, financial tracking |

---

## Input Sources

### 1. QC Dashboard Inputs

#### 1.1 Milk Collection Form
| Field | Data Type | Source | Validation |
|-------|-----------|--------|------------|
| RMR Number | Auto-generated | System | Format: RMR-YYYYMMDD-XXX |
| Collection Date | Date | User Input | Required, ≤ Today |
| Supplier/Farmer | Dropdown | `suppliers` table | Required, Dairy Cooperative or Individual Farm |
| Milk Type | Dropdown | Enum | Cow, Goat, Buffalo |
| Liters Delivered | Decimal | User Input | Required, > 0 |
| Liters Rejected | Decimal | User Input | Optional, ≤ Liters Delivered |
| Sediment Test | Text | User Input | Pass/Fail |
| Titratable Acidity | Decimal | User Input | Numeric |
| Fat Content (%) | Decimal | User Input | 0-100 |
| Alcohol Test | Boolean | User Input | Passed/Failed |
| Base Price per Liter | Decimal | User Input | ≥ 0 |
| Quality Premium | Decimal | User Input | Optional bonus |
| Transport Fee | Decimal | User Input | Deduction |

**Output:** Creates record in `milk_daily_collections` table

#### 1.2 Milk Acceptance
| Field | Data Type | Source |
|-------|-----------|--------|
| Collection ID | Integer | Selected from pending list |
| Liters Accepted | Decimal | System/User (Delivered - Rejected) |
| Quality Bonus | Decimal | User Input |

**Output:** 
- Updates `milk_daily_collections`
- Creates `raw_material_batches` record (Raw Milk with 48h expiry)
- Updates `raw_materials` quantity

---

### 2. Production Dashboard Inputs

#### 2.1 Create Production Batch
| Field | Data Type | Source | Validation |
|-------|-----------|--------|------------|
| Finished Product | Dropdown | `products` table | Required |
| Planned Quantity | Integer | User Input | Required, > 0 |
| Raw Materials | Multi-select | `raw_materials` table | At least one |
| Quantity per Material | Decimal | User Input | > 0 |
| Operator Name | Text | User Input | Required |
| Production Date | Date | User Input | Required |
| Production Notes | Text | User Input | Optional |

**Processing:** FIFO allocation of oldest raw material batches

**Output:** Creates `production_batches` record

#### 2.2 Complete Production Batch
| Field | Data Type | Source |
|-------|-----------|--------|
| Batch ID | Integer | Selected from active batches |
| Actual Yield | Decimal | User Input |
| Waste Quantity | Decimal | User Input |
| Waste Reason | Dropdown | Spillage, Quality Issue, etc. |

**Output:**
- Updates `production_batches` status to Completed
- Deducts from `raw_material_batches`
- Adds to finished goods inventory
- Creates `production_wastage_logs` if waste > 0

---

### 3. Sales Dashboard Inputs

#### 3.1 Walk-in Sale (POS)
| Field | Data Type | Source |
|-------|-----------|--------|
| Products | Multi-select | `products` table |
| Quantity per Product | Integer | User Input |
| Payment Method | Dropdown | Cash, Card, GCash |
| Amount Tendered | Decimal | User Input |

**Processing:** Immediate FIFO deduction from `production_batches`

**Output:**
- Creates `sales` record with status 'Completed'
- Creates `sale_items` records
- Deducts inventory immediately
- Generates receipt with batch codes

#### 3.2 Wholesale Order
| Field | Data Type | Source |
|-------|-----------|--------|
| Customer | Dropdown | `customers` table |
| Products | Multi-select | Product catalog |
| Quantity per Product | Integer | User Input |
| Payment Terms | Dropdown | Net 7, Net 15, Net 30 |
| Delivery Date | Date | User Input |

**Processing:** FIFO batch reservation

**Output:**
- Creates `sales` record with status 'Pending Approval'
- Creates `sale_items` records
- Awaits dispatch

---

### 4. Finance Dashboard Inputs

#### 4.1 Farmer Payout Generation
| Field | Data Type | Source |
|-------|-----------|--------|
| Supplier/Farmer | Dropdown | `suppliers` table |
| Period Start | Date | User Input |
| Period End | Date | User Input |

**Processing:** Aggregates `milk_daily_collections` for period

**Output:**
- Creates `farmer_payouts` record
- Calculates: Gross = (Liters × Price + Quality Premium) - Transport

#### 4.2 Spoilage Log
| Field | Data Type | Source |
|-------|-----------|--------|
| Product | Dropdown | `products` or `raw_materials` |
| Quantity | Decimal | User Input |
| Reason | Dropdown | Expired, Damaged, Quality Fail |
| Batch Code | Text | User Input |

**Output:** Creates `spoilage_log` record

---

### 5. Inventory Dashboard Inputs

#### 5.1 Purchase Requisition
| Field | Data Type | Source |
|-------|-----------|--------|
| Raw Material | Dropdown | `raw_materials` |
| Quantity Requested | Decimal | User Input |
| Urgency | Dropdown | Normal, Urgent |
| Notes | Text | User Input |

**Output:** Creates `purchase_requisitions` record

#### 5.2 Purchase Order
| Field | Data Type | Source |
|-------|-----------|--------|
| Supplier | Dropdown | `suppliers` |
| Items | Multi-select | `raw_materials` |
| Quantity per Item | Decimal | User Input |
| Unit Cost | Decimal | From supplier pricing |
| Expected Delivery | Date | User Input |

**Output:** Creates `purchase_orders` and `purchase_order_items` records

---

### 6. Admin Dashboard Inputs

#### 6.1 User Management
| Field | Data Type | Validation |
|-------|-----------|------------|
| Username | Text | Unique, 4-50 chars |
| Password | Text | Min 8 chars |
| Full Name | Text | Required |
| Email | Email | Valid format |
| Role | Dropdown | From `user_roles` |
| Is Active | Boolean | Default: true |

**Output:** Creates/updates `users` record

#### 6.2 Supplier Management
| Field | Data Type | Validation |
|-------|-----------|------------|
| Name | Text | Required, unique |
| Supplier Type | Dropdown | Dairy Cooperative, Individual Farm, Packaging, Ingredient |
| Contact Person | Text | Optional |
| Phone | Text | Optional |
| Email | Email | Optional |
| Address | Text | Optional |

**Output:** Creates/updates `suppliers` record

---

## Processing Logic

### 1. FIFO (First In, First Out)
```
Priority: ORDER BY received_date ASC, batch_id ASC

When consuming materials:
1. Get all batches with current_quantity > 0
2. Sort by received_date (oldest first)
3. Allocate from oldest batch until quantity met
4. If batch depleted, move to next oldest
5. Lock allocated batches during transaction
```

### 2. Expiry Timer
| Material Type | Expiry Period |
|---------------|---------------|
| Raw Milk | 48 hours |
| Finished Dairy Products | 7-14 days |
| Packaging Materials | 365+ days |

### 3. Quality Control Flow
```
Milk Delivered → QC Test → ACCEPT or REJECT
     ↓                          ↓
If ACCEPT:                 If REJECT:
- Add to Raw Milk inventory   - Log rejection reason
- Start 48h expiry timer      - No inventory impact
- Create Farmer Payable       - Notify Finance
```

### 4. Production Flow
```
Select Product → Issue Materials (FIFO) → Physical Processing → Complete Batch
                       ↓                                            ↓
               Deduct from oldest              Create finished goods with
               raw_material_batches           new batch code + expiry date
```

---

## Output & Reports

### 1. Dashboards

| Dashboard | Key Metrics Displayed |
|-----------|----------------------|
| **QC Dashboard** | Pending collections, Aging alerts, Today's statistics |
| **Production Dashboard** | Active batches, Raw milk inventory, Completed today |
| **Sales Dashboard** | Today's sales, Pending orders, FIFO alerts |
| **Finance Dashboard** | Inventory at risk, Expired batches, Pending payouts |
| **Inventory Dashboard** | Stock levels, Low stock alerts, Reorder points |

### 2. Generated Documents

| Document | Trigger | Content |
|----------|---------|---------|
| **Receipt** | Walk-in sale | Products, qty, batch codes, total, payment |
| **Delivery Receipt (DR)** | Wholesale dispatch | Customer, products, batches, driver signature |
| **Farmer Payout Voucher** | Payout approval | Farmer, period, liters, deductions, net amount |
| **Production Batch Label** | Batch completion | Batch code, product, qty, expiry date |

### 3. Reports

| Report | Data Source | Purpose |
|--------|-------------|---------|
| Spoilage Report | `spoilage_log` | Track losses by reason/period |
| FIFO Compliance | `raw_material_consumption` | Verify oldest-first usage |
| Farmer Payout Summary | `farmer_payouts` | Payment tracking by farmer |
| Production Efficiency | `production_batches` | Yield vs. waste analysis |
| Inventory Valuation | `raw_material_batches`, `production_batches` | Asset value calculation |

---

## Database Schema

### Core Tables (50 total)

#### Transaction Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `milk_daily_collections` | Raw milk intake | rmr_number, liters_delivered, supplier_id |
| `raw_material_batches` | Material inventory by batch | batch_code, quantity, expiry_date |
| `production_batches` | Finished goods production | batch_number, product_id, yield |
| `sales` | Sales transactions | sale_id, customer_id, total_amount |
| `sale_items` | Line items per sale | product_id, quantity, batch_id |
| `farmer_payouts` | Farmer payments | supplier_id, net_amount, status |
| `spoilage_log` | Waste tracking | product_id, quantity, reason |

#### Master Data Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `suppliers` | Farmers & suppliers | name, supplier_type, contact |
| `raw_materials` | Ingredients & packaging | name, category, reorder_level |
| `products` | Finished goods catalog | name, price, unit |
| `customers` | Wholesale customers | name, payment_terms |
| `users` | System users | username, role_id |
| `user_roles` | Role definitions | role_name, permissions |

---

## Data Flow Diagrams

### Overall System Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HIGHLAND FRESH DATA FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FARMERS/SUPPLIERS                       CUSTOMERS                       │
│       │                                       ↑                          │
│       ▼                                       │                          │
│  ┌─────────┐    ┌────────────┐    ┌────────────┐    ┌─────────┐        │
│  │   QC    │───▶│ PRODUCTION │───▶│   SALES    │───▶│ FINANCE │        │
│  │Dashboard│    │ Dashboard  │    │ Dashboard  │    │Dashboard│        │
│  └─────────┘    └────────────┘    └────────────┘    └─────────┘        │
│       │              │                   │               │              │
│       ▼              ▼                   ▼               ▼              │
│  ┌─────────┐    ┌────────────┐    ┌────────────┐    ┌─────────┐        │
│  │milk_    │    │production_ │    │   sales    │    │farmer_  │        │
│  │daily_   │───▶│ batches    │───▶│ sale_items │    │payouts  │        │
│  │collections   └────────────┘    └────────────┘    └─────────┘        │
│  └─────────┘          │                   │               ↑              │
│       │               ▼                   ▼               │              │
│       └───────▶┌──────────────┐    ┌────────────┐        │              │
│                │raw_material_ │    │ spoilage_  │────────┘              │
│                │   batches    │    │    log     │                       │
│                └──────────────┘    └────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### FIFO Material Flow
```
Raw Material Batches (sorted by received_date ASC):
┌──────────────────────────────────────────────────────────────┐
│ Batch 1 (Oldest) → Batch 2 → Batch 3 → Batch 4 (Newest)     │
│      ↓                                                       │
│ Production consumes from LEFT (oldest first)                 │
│      ↓                                                       │
│ Sales dispatches from LEFT (oldest finished goods first)     │
└──────────────────────────────────────────────────────────────┘
```

---

## Appendix A: API Endpoints

| API | Key Operations |
|-----|---------------|
| `MilkCollectionAPI.php` | getCollections, createCollection, acceptMilk |
| `ProductionAPI.php` | get_production_batches, issue_materials_and_create_batch, complete_production_batch |
| `SalesOrdersAPI.php` | createWalkInSale, createOrder, previewFifoBatches |
| `FarmerPayoutAPI.php` | generatePayout, approvePayout, getPayoutDetails |
| `RawMaterialsAPI.php` | get_all, get_batches_for_material |
| `SpoilageReportAPI.php` | logSpoilage, getInventoryAtRisk, getExpiredBatches |

---

## Appendix B: Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5 |
| Backend | PHP 7.4+ |
| Database | MySQL / MariaDB |
| Web Server | Apache (XAMPP) |
| AJAX | Axios |
| Icons | Bootstrap Icons |

---

*Document End*
