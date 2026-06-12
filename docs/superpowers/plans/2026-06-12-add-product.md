# Add Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add products to a shopping list via an inline form that animates open when the FAB is tapped, creating or reusing a global product record and appending a reference to the list.

**Architecture:** A new server action `addProductToList` handles all Firestore writes via the Admin SDK — it looks up the `productos` collection by normalized name, increments the counter if found or creates a new doc, then appends a `ListProduct` entry to the list's `products` array. The UI consists of a new `AddProductForm` client component rendered inline in `ListDetail` with a CSS `max-height` transition controlled by a `isFormOpen` boolean state.

**Tech Stack:** Next.js 16 App Router, Server Actions, Firebase Admin SDK (Firestore), Firestore client real-time listeners, Tailwind v4, Vitest, Sonner toasts.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/types.ts` | Modify | Add `Product`, `ListProduct`; update `ShoppingList.products` |
| `lib/actions/products.ts` | Create | `addProductToList` server action + `normalizeProductName` helper |
| `lib/__tests__/actions-products.test.ts` | Create | Unit tests for the products action |
| `firestore.rules` | Modify | Allow authenticated read on `productos` collection |
| `components/lists/AddProductForm.tsx` | Create | Controlled form component for adding a product |
| `components/lists/ListDetail.tsx` | Modify | FAB handler, animated form slot, product list rendering |

---

## Task 1: Update types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `Product` and `ListProduct` and update `ShoppingList`**

Replace the entire contents of `lib/types.ts` with:

```typescript
export type Role = "owner" | "admin" | "member"

export interface AllowedUser {
  email: string
  role: Role
}

export interface Product {
  id: string
  name: string
  timesSelected: number
}

export interface ListProduct {
  productId: string
  name: string
  quantity: number
}

export interface ShoppingList {
  id: string
  title: string
  market: string
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  products: ListProduct[]
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Product and ListProduct types"
```

---

## Task 2: Update Firestore rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Replace `products` rule with `productos` and allow authenticated read**

The current file has `match /products/{productId} { allow read, write: if false; }`.
Replace the entire file with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lists/{listId} {
      allow read: if request.auth != null
        && request.auth.token.email in resource.data.memberEmails;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }

    match /productos/{productId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: allow authenticated read on productos collection"
```

---

## Task 3: Create `addProductToList` server action (TDD)

**Files:**
- Create: `lib/actions/products.ts`
- Create: `lib/__tests__/actions-products.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/actions-products.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/firebase-admin", () => ({ getDB: vi.fn() }))
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ _increment: n })),
    arrayUnion: vi.fn((...args: unknown[]) => ({ _arrayUnion: args })),
  },
}))

import { auth } from "@/auth"
import { getDB } from "@/lib/firebase-admin"
import { normalizeProductName, addProductToList } from "../actions/products"

function makeDB({
  isMember = true,
  productExists = false,
}: { isMember?: boolean; productExists?: boolean } = {}) {
  const listUpdate = vi.fn().mockResolvedValue(undefined)
  const productUpdate = vi.fn().mockResolvedValue(undefined)
  const productAdd = vi.fn().mockResolvedValue({ id: "new-product-id" })

  const listGet = vi.fn().mockResolvedValue({
    exists: true,
    data: () => ({
      memberEmails: isMember ? ["user@test.com"] : ["other@test.com"],
    }),
  })

  const productQueryGet = vi.fn().mockResolvedValue(
    productExists
      ? { empty: false, docs: [{ id: "existing-id", ref: { update: productUpdate } }] }
      : { empty: true, docs: [] },
  )

  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "lists") {
        return { doc: vi.fn().mockReturnValue({ get: listGet, update: listUpdate }) }
      }
      return {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ get: productQueryGet }),
        }),
        add: productAdd,
      }
    }),
  }

  return { db, listUpdate, productUpdate, productAdd }
}

describe("normalizeProductName", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeProductName("  LECHE  ")).toBe("leche")
  })
  it("returns empty string for blank input", () => {
    expect(normalizeProductName("   ")).toBe("")
  })
})

describe("addProductToList", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("throws when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(addProductToList("list1", "leche", 1)).rejects.toThrow("No autenticado")
  })

  it("throws when caller is not a list member", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db } = makeDB({ isMember: false })
    vi.mocked(getDB).mockReturnValue(db as any)
    await expect(addProductToList("list1", "leche", 1)).rejects.toThrow("Sin acceso")
  })

  it("creates a new product when name does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db, productAdd, listUpdate } = makeDB({ productExists: false })
    vi.mocked(getDB).mockReturnValue(db as any)

    await addProductToList("list1", "  LECHE  ", 2)

    expect(productAdd).toHaveBeenCalledWith({ name: "leche", timesSelected: 1 })
    expect(listUpdate).toHaveBeenCalledWith({
      products: expect.objectContaining({ _arrayUnion: [expect.objectContaining({ name: "leche", quantity: 2 })] }),
    })
  })

  it("increments timesSelected when product already exists", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db, productUpdate, productAdd, listUpdate } = makeDB({ productExists: true })
    vi.mocked(getDB).mockReturnValue(db as any)

    await addProductToList("list1", "leche", 1)

    expect(productAdd).not.toHaveBeenCalled()
    expect(productUpdate).toHaveBeenCalledWith({ timesSelected: expect.objectContaining({ _increment: 1 }) })
    expect(listUpdate).toHaveBeenCalledWith({
      products: expect.objectContaining({
        _arrayUnion: [expect.objectContaining({ productId: "existing-id", name: "leche", quantity: 1 })],
      }),
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run lib/__tests__/actions-products.test.ts
```

Expected: all tests fail with "Cannot find module '../actions/products'".

- [ ] **Step 3: Create `lib/actions/products.ts`**

```typescript
"use server"

import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getDB } from "@/lib/firebase-admin"

export function normalizeProductName(name: string): string {
  return name.trim().toLowerCase()
}

export async function addProductToList(
  listId: string,
  name: string,
  quantity: number,
) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const normalizedName = normalizeProductName(name)
  if (!normalizedName) throw new Error("El nombre no puede estar vacío")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)
  const listSnap = await listRef.get()

  if (!listSnap.exists) throw new Error("Lista no encontrada")

  if (!(listSnap.data()!.memberEmails as string[]).includes(session.user.email)) {
    throw new Error("Sin acceso a esta lista")
  }

  const productosRef = db.collection("productos")
  const existing = await productosRef
    .where("name", "==", normalizedName)
    .limit(1)
    .get()

  let productId: string

  if (!existing.empty) {
    const doc = existing.docs[0]
    productId = doc.id
    await doc.ref.update({ timesSelected: FieldValue.increment(1) })
  } else {
    const newDoc = await productosRef.add({ name: normalizedName, timesSelected: 1 })
    productId = newDoc.id
  }

  await listRef.update({
    products: FieldValue.arrayUnion({ productId, name: normalizedName, quantity }),
  })

  revalidatePath(`/lists/${listId}`)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/__tests__/actions-products.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/products.ts lib/__tests__/actions-products.test.ts
git commit -m "feat: add addProductToList server action"
```

---

## Task 4: Create `AddProductForm` component

**Files:**
- Create: `components/lists/AddProductForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { addProductToList } from "@/lib/actions/products"
import { Button } from "@/components/ui/Button"

interface Props {
  listId: string
  onClose: () => void
}

export function AddProductForm({ listId, onClose }: Props) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await addProductToList(listId, name, quantity)
      setName("")
      setQuantity(1)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al añadir producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 border-2 border-black rounded-md bg-white">
      <h2 className="font-bold text-lg">Añadir producto</h2>
      <input
        type="text"
        list="productos-datalist"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del producto"
        required
        autoFocus
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      />
      <datalist id="productos-datalist" />
      <div className="flex items-center gap-3">
        <label className="font-semibold text-sm text-text/70">Cantidad</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          min={1}
          required
          className="border-2 border-black rounded-md px-3 py-2 w-20 font-sans focus:outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Añadiendo…" : "Añadir"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/lists/AddProductForm.tsx
git commit -m "feat: add AddProductForm component"
```

---

## Task 5: Wire everything into `ListDetail`

**Files:**
- Modify: `components/lists/ListDetail.tsx`

- [ ] **Step 1: Replace `ListDetail.tsx` with the updated version**

```typescript
"use client"
import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { FabButton } from "@/components/ui/FabButton"
import { AddProductForm } from "@/components/lists/AddProductForm"
import { IconSettings, IconPlus, IconArrowLeft, IconBasket } from "@tabler/icons-react"

interface Props {
  initialList: ShoppingList
  userEmail: string
  listId: string
}

export function ListDetail({ initialList, userEmail, listId }: Props) {
  const [list, setList] = useState<ShoppingList>(initialList)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) return

      firestoreUnsub = onSnapshot(
        doc(db, "lists", listId),
        (snap) => {
          if (!snap.exists()) { router.push("/"); return }
          const data = snap.data()
          if (!(data.memberEmails as string[]).includes(userEmail)) { router.push("/"); return }
          setList({ id: snap.id, ...data } as ShoppingList)
        },
        () => { toast.error("Error al cargar la lista"); router.push("/") },
      )
    })

    return () => { authUnsub(); firestoreUnsub?.() }
  }, [listId, userEmail, router])

  const userEntry = list.allowedUsers.find((u) => u.email === userEmail)
  const canShare = userEntry?.role === "owner" || userEntry?.role === "admin"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href="/"
        className="flex items-center gap-1 text-text/60 mb-5 hover:text-text transition-colors w-fit"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm font-medium">Mis listas</span>
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{list.title}</h1>
          <p className="text-text/50 text-sm mt-0.5">{list.market}</p>
        </div>
        {canShare && (
          <Link href={`/lists/${listId}/settings`}>
            <FabButton type="button" color="orange" size="sm">
              <IconSettings size={18} />
            </FabButton>
          </Link>
        )}
      </div>

      {/* Animated form slot */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isFormOpen ? "400px" : "0px", opacity: isFormOpen ? 1 : 0 }}
      >
        <div className="mb-6">
          <AddProductForm listId={listId} onClose={() => setIsFormOpen(false)} />
        </div>
      </div>

      {/* Product list */}
      {list.products.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {list.products.map((item, index) => (
            <li
              key={`${item.productId}-${index}`}
              className="flex items-center justify-between border-2 border-black rounded-md px-4 py-3"
            >
              <span className="font-semibold capitalize">{item.name}</span>
              <span className="text-sm text-text/50 font-medium">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-text/5 flex items-center justify-center mb-2">
            <IconBasket size={32} className="text-text/25" />
          </div>
          <p className="font-semibold text-text/40">Aún no hay productos</p>
          <p className="text-sm text-text/30">Pulsa + para añadir el primero</p>
        </div>
      )}

      <div className="fixed bottom-6 right-6">
        <FabButton type="button" color="purple" onClick={() => setIsFormOpen((v) => !v)}>
          <IconPlus size={28} />
        </FabButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/lists/ListDetail.tsx
git commit -m "feat: wire add-product form and product list into ListDetail"
```
