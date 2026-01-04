# FIFO Dispatch System - Operational Guide

## What is FIFO?

**FIFO = First In, First Out**

This means products that arrived FIRST (oldest) must be shipped FIRST. This prevents old products from expiring on shelves.

---

## Real-World Example

### Warehouse Shelf Scenario:

Your warehouse has **Highland Fresh Milk 1L** on the shelf:

```
Shelf Location: Dairy Cooler A3
┌─────────────────────────────────────┐
│  BATCH-20250827-5362  (Aug 27)  ← OLDEST (must use first!)
│  BATCH-20250828-7140  (Aug 28)
│  BATCH-20250829-9921  (Aug 29)
│  BATCH-20250830-1234  (Aug 30)  ← NEWEST
└─────────────────────────────────────┘
```

---

## Step-by-Step Dispatch Process

### ✅ CORRECT Workflow:

**Step 1: Check the Order**
- You see on screen: "Highland Fresh Milk 1L - Required Batch: `BATCH-20250827-5362`"

**Step 2: Go to Warehouse**
- Walk to Dairy Cooler A3
- Look for bottles with batch code `BATCH-20250827-5362` printed on them

**Step 3: Pick the Product**
- Take 10 bottles that have `BATCH-20250827-5362` on the label

**Step 4: Scan the Batch**
- Scan the barcode on one of the bottles
- System reads: `BATCH-20250827-5362`
- ✅ **Screen shows:** "✓ Correct Batch! FIFO Validated"
- ✅ **Row turns GREEN**

**Step 5: Complete Order**
- When all products validated, click "Complete Dispatch"

---

### ❌ WRONG Workflow (What Happens if You Make a Mistake):

**Step 1-2:** Same as above

**Step 3: Pick WRONG Product**
- ❌ You accidentally grab bottles from the back (newer batch)
- ❌ The bottles say `BATCH-20250829-9921` (Aug 29)

**Step 4: Scan WRONG Batch**
- You scan the barcode
- System reads: `BATCH-20250829-9921`
- ❌ **Screen shows:** "✗ WRONG BATCH - FIFO VIOLATION!"
- ❌ **Error message:**
  ```
  You scanned: BATCH-20250829-9921 ❌
  You MUST use: BATCH-20250827-5362 ✓ (Produced: Aug 27, 2025)
  
  Action Required: Put back the product you just picked.
  Go get Highland Fresh Milk 1L with batch code BATCH-20250827-5362.
  ```

**Step 5: FIX the Mistake**
- ✅ Put the newer bottles (Aug 29) BACK on the shelf
- ✅ Go get the older bottles (Aug 27) 
- ✅ Scan the correct batch: `BATCH-20250827-5362`
- ✅ Now it works! Row turns green

---

## Production FIFO (Raw Material Consumption)

The same FIFO rules apply when **Production Staff** take raw materials (Milk, Sugar) to make products.

1.  **Create Batch:** Select product to make.
2.  **Preview FIFO:** Click "Preview FIFO Batches".
3.  **System Allocation:** System automatically locks the **OLDEST** raw material batches.
4.  **Physical Picking:** Go to storage and pick the specific batches listed in the preview.
5.  **Consumption:** When batch is created, the system deducts from those specific old batches.

---

## Summary

**The FIFO system enforces this simple rule:**

> "Always ship/use the OLDEST product first, never the newest"

**Why you see "WRONG BATCH":**
- You physically picked a product with a NEWER batch code
- System is protecting you from shipping wrong inventory
- Go back to shelf, get the OLDER batch shown on screen
- Scan it → will work!

---

*Document Consolidated: December 7, 2025*
