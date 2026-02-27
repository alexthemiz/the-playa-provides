# Spreadsheet Import — Design Doc
**Date:** 2026-02-26
**Status:** Approved

## Problem
Users with existing spreadsheets of their gear have no way to bulk-add items. Adding one at a time is a barrier to adoption for people with large collections.

## Decisions Made
- **Format support:** CSV, Excel (.xlsx/.xls), and Google Sheets exports
- **Column mapping:** Smart mapping — user sees their columns and assigns each to a gear field; app auto-suggests based on name similarity
- **Default status:** All imported items default to `Not Available` (private)
- **Duplicates:** Flag potential name matches already in inventory; user decides per-item whether to include or skip
- **Architecture:** Pure client-side parsing; no server involvement until the final Supabase bulk insert

## User Flow

### Step 1 — Upload
- "Import from Spreadsheet" button added to inventory page header, next to "Add New Item"
- Opens a modal with a drag-and-drop zone (also click-to-browse)
- Accepts: `.csv`, `.xlsx`, `.xls`
- File is parsed in the browser immediately on selection

### Step 2 — Map Columns
- Two-column layout: user's spreadsheet headers on the left, mapping dropdown on the right
- Each header shows a sample value from row 1 to help identification
- App auto-suggests mappings using synonym matching:
  - `["name", "item", "gear", "title", "item name"]` → `item_name`
  - `["desc", "description", "notes", "about"]` → `description`
  - `["condition", "cond", "state"]` → `condition`
  - `["category", "cat", "type"]` → `category`
- `item_name` is the only required mapping; all others can be set to "Skip"
- Columns not mapped to any field are ignored
- Fields auto-set (not user-mappable): `availability_status = 'Not Available'`, `user_id = auth.uid()`
- Fields not imported: `image_urls`, `location_id`, `pickup_by`, `return_by`, `damage_price`, `loss_price`, `return_terms`

### Step 3 — Review & Import
- Preview table showing all rows to be imported
- Rows where the mapped `item_name` cell is blank are silently filtered out
- Potential duplicates (case-insensitive name match against existing inventory) are flagged with a note: "These look like they might already be in your list" — individual checkboxes to include or skip each
- "Import X items" button (disabled if 0 valid rows)
- On success: modal closes, inventory reloads via `fetchMyInventory()`
- On failure: error shown inline, modal stays open, user can retry

## Inventory Table Change
- Status column (with Borrow/Keep/Private toggle buttons) moves to the leftmost data column so it's the first actionable thing users see on imported items

## Technical Plan

### New Files
- `components/ImportSpreadsheetModal.tsx` — self-contained 3-step modal

### Modified Files
- `app/inventory/page.tsx` — import button, modal wiring, column reorder
- `package.json` — add `papaparse` and `xlsx`

### Libraries
- **papaparse** — CSV parsing, browser-native, no config needed
- **xlsx** (SheetJS community) — Excel parsing, outputs same row-array format as papaparse so downstream code is format-agnostic

### Data Flow
1. File selected → detect extension → parse with correct library → `headers: string[]`, `rows: string[][]`
2. Auto-map headers using synonym list → `columnMap: Record<string, string>` (spreadsheet header → gear field name)
3. User adjusts via dropdowns → live preview updates
4. On confirm: apply `columnMap` to rows → build insert array → filter blank `item_name` rows → collision check against in-memory inventory
5. `supabase.from('gear_items').insert(insertArray)` — single bulk call
6. `fetchMyInventory()` refreshes the table

### Error Handling
| Scenario | Behaviour |
|---|---|
| Unrecognized file type | Inline error in upload zone, don't advance |
| No `item_name` column mapped | "Import" button disabled with explanatory note |
| All rows have blank item name | "Import" button disabled: "No valid rows found" |
| Supabase insert fails | Error message in modal, modal stays open |
