# Highland Fresh System - Operational Workflow & Role Interaction
> **Context**: Highland Fresh Processing Plant, El Salvador City, Misamis Oriental.
> **Business Model**: Dairy Manufacturing & Distribution (Not an Online Store).

This document outlines the end-to-end operational workflow of the system, demonstrating how different user roles interact to transform raw milk into sold products.

---

## 🎭 The Cast (User Roles)

| Role | Persona | Responsibility | System Interface |
|------|---------|----------------|------------------|
| **QC Officer** | *The Gatekeeper* | Receives raw milk, tests quality, rejects bad milk. | `qc-dashboard.html` |
| **Production Supervisor** | *The Maker* | Converts raw milk into finished goods (Bottles/Cheese). | `production-dashboard.html` |
| **Sales Officer** | *The Seller* | Handles Walk-in customers and Wholesale orders. | `sales-order-form.html` |
| **Warehouse Staff** | *The Mover* | Creates requisitions, receives goods, dispatches orders (FIFO). | `warehouse-staff-dashboard.html`, `dispatch-order.html` |
| **Finance Officer** | *The Banker* | Approves & executes purchases, pays farmers, tracks costs. | `finance-dashboard.html` |

---

## 📖 Story 0: The Procurement Cycle (2-Step Finance-Executed Flow)
*How materials are ordered - the streamlined approach.*

> **Design Principle**: No Admin bottleneck. The person who controls the budget (Finance) is the same person who finalizes the order.

### Step 1: The Requisition (Warehouse Staff)

1.  **Identifying Need**: The **Warehouse Staff** notices sugar stock is low (only 5 sacks left).
2.  **System Entry**:
    *   *Interface*: `inventory-requisition.html` (accessed from `warehouse-staff-dashboard.html`)
    *   *Action*: Creates a Purchase Requisition (PR)
    *   *Input*: Quantity Needed (20 sacks), Suggested Supplier (Metro Manila Sugar Co.)
3.  **Status**: PR is created with status `Pending Approval`

### Step 2: Approval & Execution (Finance Officer)

1.  **Review**: The **Finance Officer** (Ma'am Ana) sees the pending PR on her dashboard.
    *   *Interface*: `finance-dashboard.html`
    *   *Action*: Reviews budget availability and current supplier prices.
2.  **The Decision**: She clicks **"Approve & Send"**.
3.  **System Logic** (Two simultaneous actions):
    *   Changes PR status to `APPROVED`
    *   **Automatically generates and sends the Purchase Order (PO)** to the supplier
    *   Records "Expected Unit Cost" to prepare BOM Engine for price updates

### Step 3: Receiving Goods (Warehouse Staff)

1.  **Delivery Arrives**: Supplier delivers 20 sacks of sugar.
2.  **System Entry**: 
    *   *Interface*: `warehouse-staff-dashboard.html` → "Receive Goods" modal
    *   *Action*: Enters accepted quantity and actual invoice unit cost
3.  **BOM Trigger**: System updates `raw_materials.current_cost` → BOM Engine recalculates all affected product costs
4.  **Inventory Update**: Sugar inventory increases by accepted quantity

### 📊 Role Responsibility Matrix (Procurement)

| User | Task | System Role |
|------|------|-------------|
| **Warehouse Staff** | Create Request | *Initiator*: Identifies physical stock needs |
| **Finance Officer** | Approve & Order | *Executor*: Controls budget, finalizes procurement |
| **Warehouse Staff** | Receive & Cost | *Validator*: Confirms delivery, inputs final price → triggers BOM |
| **Admin** | None | *Observer*: Monitors logs; no intervention needed |

---

## 📖 Story 1: The Morning Delivery (Raw Milk Supply Chain)
*How milk enters the system.*

1.  **7:00 AM - Delivery**: A truck from **Misamis Oriental Dairy Cooperative** arrives at the El Salvador plant.
2.  **QC Check**: The **QC Officer** logs into the system.
    *   *Action*: Opens "New Collection" form.
    *   *Input*: Enters "650 Liters", "3.8% Fat", "Alcohol Test: Passed".
    *   *System Logic*: System calculates price based on Fat % (Premium vs Standard).
3.  **Inventory Update**:
    *   The system **Increases** `Raw Milk` inventory.
    *   The system **Creates** a liability record for the Finance Officer (Farmer Payout).

---

## 📖 Story 2: The Production Run (Manufacturing)
*How raw milk becomes a product.*

1.  **9:00 AM - Planning**: The **Production Supervisor** checks the dashboard.
    *   *Insight*: Sees "Fresh Milk 1L" stock is low.
2.  **Batch Creation**:
    *   *Action*: Clicks "Create Production Batch".
    *   *Input*: Selects "Fresh Milk 1L", Quantity: 500 bottles.
    *   *System Logic (Master Recipe)*: The system loads the **pre-defined Master Recipe** (set by Finance) and auto-calculates materials needed.
    *   *System Logic (FIFO)*: The system automatically allocates the **oldest available raw milk** (from the 7:00 AM delivery) to this batch.
3.  **Completion**:
    *   *Action*: Marks batch as "Completed".
    *   *Result*: `Raw Milk` inventory decreases. `Fresh Milk 1L` inventory increases.
    *   *Labeling*: System generates a Batch Code (e.g., `BATCH-20251207-001`) with an expiry date (7 days from now).

---

## 📖 Story 2.5: The Master Recipe System (Finance-Locked Formulas)
*How production consistency is ensured - Finance controls recipes.*

> **Design Principle**: Production cannot modify recipes. The Finance Officer defines the exact ratios to ensure cost control and product consistency.

### Why This Matters

| Without Master Recipe | With Master Recipe |
|-----------------------|--------------------|
| Production could use extra sugar "to make it taste better" | Recipe is locked - exact amounts enforced |
| Cost variance unexplained | Every gram is tracked against formula |
| Quality inconsistency between batches | Same recipe = same product always |
| Material waste hidden | Any deviation is flagged as variance |

### The 3-Step Recipe Flow

#### Step 1: Recipe Definition (Finance Officer - One-Time Setup)

1.  **Interface**: Finance Dashboard → Recipe Management
2.  **Action**: Defines "Chocolate Milk 500ml" formula:
    *   0.45L Raw Milk per bottle
    *   0.02kg Sugar per bottle
    *   0.01kg Cocoa Powder per bottle
3.  **Lock**: Recipe is saved as `is_active = 1` - Production cannot modify

#### Step 2: Production Execution (Production Supervisor - Daily Operations)

1.  **Interface**: `production-dashboard.html`
2.  **Action**: Clicks "Create Production Batch"
3.  **What They See**:
    ```
    ┌─────────────────────────────────────────────────────────┐
    │  Step 1: Select Product & Quantity                      │
    │  ├── Product: [Chocolate Milk 500ml ▼]                 │
    │  └── Quantity: [200] bottles                            │
    │                                                         │
    │  Step 2: Materials Required (AUTO-CALCULATED)           │
    │  ┌─────────────────────────────────────────────────────┐ │
    │  │ 🔒 Recipe-Driven: Materials from Master Recipe      │ │
    │  │ Material      | Per Unit | Total Needed | Available │ │
    │  │ Raw Milk      | 0.45 L   | 90 L         | 650 L ✅  │ │
    │  │ Sugar         | 0.02 kg  | 4 kg         | 25 kg ✅  │ │
    │  │ Cocoa Powder  | 0.01 kg  | 2 kg         | 10 kg ✅  │ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                         │
    │  [Preview FIFO Batches] [Start Production Batch]        │
    └─────────────────────────────────────────────────────────┘
    ```
4.  **Key Point**: No "Add Raw Material" button. No manual editing. Just select product + quantity.

#### Step 3: BOM Cost Trigger (Automatic)

1.  When Warehouse Staff receives goods and inputs actual costs, the BOM Engine:
    *   Detects price changes > 5%
    *   Recalculates all product costs using the locked recipe ratios
    *   Notifies Finance Officer of cost impact

### 📊 Recipe Control Matrix

| User | Can Do | Cannot Do |
|------|--------|-----------|
| **Finance Officer** | Create/Edit/Deactivate recipes | - |
| **Production Supervisor** | View recipe, select product, set quantity | Edit recipe, add/remove materials |
| **Warehouse Staff** | View materials consumed | - |
| **Admin** | View all recipes | (Should not edit - business decision) |

---

## 📖 Story 3: The Customer Buying Experience
*How the product leaves the system.*

### Scenario A: The Walk-in Customer (Retail)
> **Context**: Mrs. Reyes, a local resident, walks into the plant's factory outlet to buy milk for her family.

1.  **Interaction**: Mrs. Reyes asks for "2 bottles of Fresh Milk".
2.  **System Entry**: The **Sales Officer** (at the counter) logs in.
    *   *Interface*: `sales-order-form.html` (Tab: "Walk-in / POS").
    *   *Action*: Scans the barcode of the bottles Mrs. Reyes picked.
3.  **Transaction**:
    *   *Payment*: Mrs. Reyes hands over cash. Sales Officer enters amount.
    *   *Receipt*: System prints a thermal receipt.
4.  **System Logic**:
    *   Inventory is **immediately deducted**.
    *   Sales revenue is recorded for the day.

### Scenario B: The Wholesale Customer (B2B)
> **Context**: The Purchasing Manager of **Gaisano Mall** calls to order 100 bottles.

1.  **Order Entry**: The **Sales Officer** takes the call.
    *   *Interface*: `sales-order-form.html` (Tab: "Wholesale").
    *   *Action*: Selects customer "Gaisano Mall", adds "100x Fresh Milk 1L".
    *   *FIFO Preview*: Clicks "Preview FIFO" to ensure enough stock exists.
    *   *Submit*: Creates Order #ORD-5501. Status: `Pending Approval`.

2.  **Approval**: The **Sales Officer** (or Admin) approves the order.
    *   *Interface*: `sales-dashboard.html`.
    *   *Action*: Reviews stock levels. Clicks "Approve for Dispatch".
    *   *Status*: Order changes to `Ready for Dispatch`.

3.  **Dispatch (The Critical FIFO Step)**: The **Warehouse Staff** takes the pick list.
    *   *Interface*: `dispatch-order.html`.
    *   *Physical Action*: Goes to the fridge.
    *   *System Check*: The system tells them: **"Pick from Batch BATCH-20251207-001 (Expiring Soon)"**.
    *   *Validation*: The Staff scans the bottle.
        *   *If Correct*: System shows "✅ Correct Batch".
        *   *If Wrong (Newer Batch)*: System screams "❌ WRONG BATCH! Use Older Stock First!".
    *   *Completion*: Order is marked `Dispatched`. Delivery Receipt (DR) is printed.

---

## ⚙️ System Logic Verification
*Does this make sense for Highland Fresh?*

1.  **No Customer Login**: Correct. A manufacturing plant doesn't have random web users logging in. The **Sales Officer** acts as the interface for the customer.
2.  **FIFO Enforcement**:
    *   *Production*: Enforced when raw materials are used.
    *   *Dispatch*: Enforced when Warehouse Staff scans items for wholesale orders.
3.  **Financial Integrity**:
    *   Farmers are paid based on **QC Data** (not just weight).
    *   Spoilage is tracked if milk expires before being sold (Finance Dashboard).

## ✅ Conclusion
The system correctly models the **Highland Fresh El Salvador** operations. It connects the **Farm** (QC) to the **Factory** (Production) to the **Market** (Sales), with strict controls (FIFO/Approvals) at every step.
