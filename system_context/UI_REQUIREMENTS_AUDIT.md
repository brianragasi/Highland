# User Dashboard UI Requirements Audit

## Purpose
Identify UI updates needed for each user role to fully implement the **BOM Engine** (automatic cost recalculation) and **Disposal Workflow** (expiry blocking + spoilage logging).

---

## � Official User Roles (6 Total)

Per `0_PROJECT_SCOPE.md`:
1. **Admin** - User management, system configuration
2. **QC Officer** - Milk collection, quality control, accept/reject
3. **Production Supervisor** - Batch creation, material issuance, yield
4. **Warehouse Staff** - PO receiving, dispatch, FIFO validation
5. **Sales Officer** - Walk-in POS, wholesale orders, payments
6. **Finance Officer** - Farmer payouts, spoilage reports, AR

---

## 📊 Summary Matrix (Updated: Dual BOM Triggers)

| User Role | BOM Engine UI | Disposal UI | Priority |
|-----------|--------------|-------------|----------|
| **QC Officer** | 🟡 PARTIAL (Trigger A) | 🟡 PARTIAL | HIGH |
| **Warehouse Staff** | 🔴 MISSING (Trigger B) | ⚪ N/A | HIGH |
| **Finance Officer** | 🔴 MISSING (Notifications) | 🟢 Has Tab | HIGH |
| **Production Supervisor** | 🟡 PARTIAL | 🟡 PARTIAL | MEDIUM |
| **Sales Officer** | ⚪ N/A | 🔴 MISSING | MEDIUM |
| **Admin** | ⚪ N/A | ⚪ N/A | LOW |

> **Note:** BOM Engine has 2 trigger points:
> - **Trigger A (QC):** Raw milk price from `base_price_per_liter`
> - **Trigger B (Warehouse):** Other materials from PO receive

---

## ✅ Cleanup Completed (January 1, 2026)

| Item | Action Taken |
|------|--------------|
| `Warehouse Manager` role | ✅ Removed from `dashboard.js`, `SessionConfig.php`, `purchase-orders-fixed.html`, `bulk-inventory-update.html` |
| `two-tier-inventory-dashboard.html` | ✅ Deleted |
| Warehouse Staff redirect | ✅ Fixed to `warehouse-staff-dashboard.html` |
| Admin dashboard link | ✅ Updated to Warehouse Operations |
| All 6 official roles | ✅ Added to dashboard.js and SessionConfig.php |

---

## 🔴 HIGH PRIORITY Updates

### 1. Warehouse Staff Dashboard
**File:** `warehouse-staff-dashboard.html`

| Missing Feature | Description |
|-----------------|-------------|
| **New Price Input on PO Receive** | When receiving PO, must show `New Unit Cost` field to trigger BOM recalculation |
| **Price Change Alert Preview** | Before confirming, show: "This price differs from last cost (₱X → ₱Y). Affected products: [list]" |
| **Receive Modal Enhancement** | Add cost comparison section |

**Why Critical:** This is the **TRIGGER POINT** for the BOM Engine per professor's requirements.

---

### 2. Finance Officer Dashboard
**File:** `finance-dashboard.html`

| Missing Feature | Description |
|-----------------|-------------|
| **Cost Alert Notifications** | New tab/panel showing: "Sugar price increased → Choco Milk cost +₱0.25" |
| **BOM Impact Review** | View all products affected by price changes |
| **Price Approval Workflow** | Approve/adjust suggested retail prices |

**Current State:** Has Spoilage tab (✓), but no BOM cost change alerts.

---

## 🟡 MEDIUM PRIORITY Updates

### 3. Production Supervisor Dashboard
**File:** `production-dashboard.html`

| Missing Feature | Description |
|-----------------|-------------|
| **Expired Material Block** | Block batch creation if selected raw material is expired |
| **Show Production Cost** | Display BOM cost breakdown when creating batch |
| **Enhanced Wastage Logging** | Disposal button with reason codes (HIGH_ACIDITY, CONTAMINATION, etc.) |

**Current State:** Has FIFO preview, wastage reporting, but no expiry blocking or cost display.

---

### 4. QC Officer Dashboard (⭐ TRIGGER A - Raw Milk)
**File:** `qc-dashboard.html`

| Missing Feature | Description |
|-----------------|-------------|
| **BOM Trigger on Accept** | When accepting milk at new price, trigger BOM recalculation for milk-based products |
| **Price Change Preview** | Show: "This price differs from last (₱20 → ₱25/L). Affected products: [list]" |
| **Spoilage Log Integration** | Discard button should write to `spoilage_log` with reason code |
| **Reason Code Dropdown** | Add predefined codes (EXPIRED, HIGH_ACIDITY, CONTAMINATION) |

**Current State:** Has price input field, but no BOM trigger logic when price changes.

---

### 5. Sales Officer Dashboard
**File:** `sales-dashboard.html`

| Missing Feature | Description |
|-----------------|-------------|
| **Near-Expiry Stock Hiding** | Products within 24h of expiry should NOT appear in product list |
| **Updated Prices Display** | Show current selling price (after Finance approval) |

**Current State:** Shows products but no expiry-based filtering.

---

## 🟢 LOW PRIORITY Updates

### 6. Admin Dashboard
**File:** `admin-dashboard.html`

No BOM or Disposal UI needed. Admin manages users/settings only.

---

## Implementation Order (Recommended)

```
Phase 1 (BOM Triggers - Both Entry Points):
1. QC Officer - BOM trigger on milk price change (Trigger A)
2. Warehouse Staff - PO Receive with price input (Trigger B)
3. Finance Officer - Cost alert notifications

Phase 2 (Disposal Workflow):
4. QC Officer - Spoilage log with reason codes
5. Production Supervisor - Expiry blocking + disposal button

Phase 3 (Sales Protection):
6. Sales Officer - Near-expiry stock hiding
```

---

*Document Created: January 1, 2026*
