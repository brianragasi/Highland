# Highland Fresh - Future Roadmap & AI Integration

**Purpose:** Identify high-impact opportunities for DeepSeek AI integration and future system enhancements.
**Date Created:** December 7, 2025

---

## 📊 EXECUTIVE SUMMARY

The system is now stable with the "Manufacturing Plant" pivot and FIFO enforcement. The next phase focuses on **Intelligence** and **Optimization**.

---

## 🏆 TOP 5 FIFO AI INTEGRATIONS (Ranked by Business Impact)

### 1. ⭐⭐⭐⭐⭐ AI FIFO Spoilage Predictor & Prevention Engine
**Location:** `html/finance-dashboard.html` (FIFO Compliance Tab)  
**User:** Finance Officer  
**Business Impact:** **HIGHEST** - Directly prevents financial losses

**Concept:**
*   **Spoilage Forecast:** Predicts which batches will expire in the next 7 days based on current stock and sales velocity.
*   **Root Cause Analysis:** Analyzes FIFO bypass incidents to find patterns (e.g., "Shift B always bypasses FIFO").
*   **Savings Opportunity:** Recommends actions (e.g., "Put Choco Milk on sale to clear expiring stock").

### 2. ⭐⭐⭐⭐⭐ AI Production FIFO Optimizer
**Location:** `html/production-dashboard.html` (Create Batch Modal)  
**User:** Production Supervisor  
**Business Impact:** **VERY HIGH** - Optimizes raw material usage

**Concept:**
*   **Smart Scheduling:** Recommends what to produce based on *aging raw milk*.
*   **Example:** "Raw Milk Batch #123 is 40 hours old. Produce Yogurt NOW to save it."

### 3. ⭐⭐⭐⭐ AI Dispatch FIFO Assistant
**Location:** `html/dispatch-order.html`  
**User:** Warehouse Staff  
**Business Impact:** **HIGH** - Prevents FIFO violations at dispatch

**Concept:**
*   **Intelligent Guidance:** If a user scans the wrong batch, the AI explains *why* and *where* the correct batch is.
*   **Example:** "You scanned Batch B (New). Please use Batch A (Old) located at Shelf 3 to prevent spoilage."

### 4. ⭐⭐⭐⭐ AI Raw Milk Aging Prioritizer
**Location:** `html/qc-dashboard.html`  
**User:** QC Officer  
**Business Impact:** **HIGH** - Prevents raw material spoilage

**Concept:**
*   **Prioritization:** Ranks raw milk batches by urgency (Age + Quality).
*   **Actionable Alerts:** "Batch X is critical. Process within 4 hours."

### 5. ⭐⭐⭐ AI Sales Order FIFO Allocator
**Location:** `html/sales-order-form.html`  
**User:** Sales Officer  
**Business Impact:** **MEDIUM-HIGH** - Smart batch allocation for orders

**Concept:**
*   **Expiry-Aware Allocation:** Warns if an allocated batch will expire before the delivery date.
*   **Example:** "Warning: Batch allocated for Gaisano expires in 2 days. Delivery is in 3 days. Swap batch?"

---

## 🧹 PENDING CLEANUP TASKS

1.  **Remove Customer Portal Files:**
    *   `customer-login.html`, `customer-dashboard.html`, `customer-cart.html`
    *   `CustomerAuthAPI.php`, `CustomerOrdersAPI.php`
    *   *Reason:* Business model is B2B/Manufacturing, not B2C E-commerce.

2.  **Database Optimization:**
    *   Archive old `sales` table records if they don't match the new schema.
    *   Ensure all `products` have `is_active` flags set correctly.

---

*Document Consolidated: December 7, 2025*
