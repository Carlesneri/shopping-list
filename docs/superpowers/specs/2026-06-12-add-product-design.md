# Add Product Feature — Design Spec

**Date:** 2026-06-12
**Status:** Approved

## Overview

Allow users to add products to a shopping list. Tapping the existing FAB in `ListDetail` reveals an inline form with a slide-down transition. On submit, a record is created in the global `productos` collection (reusing existing products by name) and a reference is added to the list's `products` array.

---

## Data Model

### New collection: `productos/{productId}`

```typescript
interface Product {
  id: string
  name: string          // always trimmed lowercase
  timesSelected: number // incremented each time the product is added to any list
}
```

### New type: `ListProduct` (stored inside `lists/{id}.products[]`)

```typescript
interface ListProduct {
  productId: string
  name: string    // denormalized from Product, lowercase
  quantity: number
}
```

### Updated `ShoppingList`

`products: never[]` → `products: ListProduct[]`

---

## Server Action

**File:** `lib/actions/products.ts`

**Function:** `addProductToList(listId: string, name: string, quantity: number)`

Steps:
1. Auth check — throw if no authenticated session.
2. Read `lists/{listId}` via Admin SDK and verify caller's email is in `memberEmails`.
3. Normalize: `name.trim().toLowerCase()`.
4. Query `productos` where `name == normalizedName` (limit 1).
   - **Found:** `FieldValue.increment(1)` on `timesSelected`, capture `productId`.
   - **Not found:** Create new doc `{name: normalizedName, timesSelected: 1}`, capture new `productId`.
5. `FieldValue.arrayUnion({productId, name: normalizedName, quantity})` on `lists/{listId}.products`.
6. `revalidatePath(`/lists/${listId}`)`.

---

## Firestore Rules

Add rules for the `productos` collection:
- **Read:** Any authenticated user (needed for future datalist autocomplete).
- **Write:** Blocked at client level — all writes go through Admin SDK server actions only.

```
match /databases/compale/documents {
  match /productos/{productId} {
    allow read: if request.auth != null;
    allow write: if false;
  }
}
```

---

## UI

### `components/lists/AddProductForm.tsx` (new, client component)

Props:
```typescript
{ listId: string; onClose: () => void }
```

Fields:
- **Name:** `<input type="text" list="productos-datalist" required />` + `<datalist id="productos-datalist" />` (empty for now, wired for future suggestions)
- **Quantity:** `<input type="number" defaultValue={1} min={1} required />`

Behaviour:
- On submit: calls `addProductToList`, shows loading state on button, resets form and calls `onClose` on success.
- Cancel button calls `onClose`.
- Follows existing Button component variants (primary for submit, ghost for cancel).

### `components/lists/ListDetail.tsx` (updated)

Changes:
- Add `const [isFormOpen, setIsFormOpen] = useState(false)`.
- FAB `onClick` toggles `isFormOpen`.
- Render `AddProductForm` always in the DOM, animate via CSS:
  ```css
  /* closed */  max-height: 0; opacity: 0; overflow: hidden;
  /* open */    max-height: 300px; opacity: 1;
  transition: max-height 300ms ease, opacity 200ms ease;
  ```
  Controlled by a conditional class based on `isFormOpen`.
- When `list.products.length > 0`, render a product list (name + quantity per item) above the empty state. Empty state is hidden when products exist.

---

## Files Affected

| File | Change |
|------|--------|
| `lib/types.ts` | Add `Product`, `ListProduct`; update `ShoppingList.products` |
| `lib/actions/products.ts` | New file with `addProductToList` server action |
| `firestore.rules` | Add read rule for `productos` collection |
| `components/lists/AddProductForm.tsx` | New form component |
| `components/lists/ListDetail.tsx` | Wire FAB, animate form, render product list |

---

## Out of Scope (for now)

- Datalist suggestions from `productos` collection (datalist element is ready, data fetch deferred)
- Deduplication of the same product within a single list
- Checked/completed status per list item
