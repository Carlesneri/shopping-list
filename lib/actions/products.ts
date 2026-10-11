"use server"

import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import { normalizeProductName } from "@/lib"
import { requireAuth, requireMember } from "@/lib/auth-helpers"
import {
  fetchMarketSuggestions,
  type ProductSuggestion,
} from "@/lib/product-search"

/** The market-catalog reference attached to a product when it was picked from
 * a suggestion. The id is always the market's product id; the image is the
 * first resolved image URL. */
export interface ProductSuggestionRef {
  id: string
  image?: string
}

/** Validates a client-supplied suggestion reference before storing it. */
function sanitizeSuggestionRef(ref?: ProductSuggestionRef | null) {
  if (!ref || typeof ref.id !== "string") return undefined
  const marketProductId = ref.id.trim().slice(0, 100)
  if (!marketProductId) return undefined
  const image =
    typeof ref.image === "string" &&
    ref.image.startsWith("https://") &&
    ref.image.length <= 1000
      ? ref.image
      : undefined
  return { marketProductId, ...(image ? { image } : {}) }
}

export async function addProductToList(
  listId: string,
  name: string,
  quantity: number,
  suggestion?: ProductSuggestionRef | null,
) {
  const { email } = await requireAuth()
  await requireMember("lists", listId, email)

  const normalizedName = normalizeProductName(name)
  if (!normalizedName) throw new Error("El nombre no puede estar vacío")
  if (!Number.isFinite(quantity) || quantity < 1)
    throw new Error("Cantidad inválida")

  const market = sanitizeSuggestionRef(suggestion)

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  const productDocId = normalizedName.replace(/[/.]/g, "-")
  const productRef = db.collection("productos").doc(productDocId)
  await productRef.set(
    {
      name: normalizedName,
      timesSelected: FieldValue.increment(1),
      ...(market ?? {}),
    },
    { merge: true },
  )
  const productId = productRef.id

  await listRef.update({
    products: FieldValue.arrayUnion({
      productId,
      name: normalizedName,
      quantity,
      ...(market ?? {}),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/compras/${listId}`)
}

export async function removeProductFromList(listId: string, productId: string) {
  const { email } = await requireAuth()

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listRef)
    if (!snap.exists) throw new Error("Lista no encontrada")
    const data = snap.data()!
    if (!(data.memberEmails as string[]).includes(email))
      throw new Error("Sin acceso a esta lista")
    const products = (data.products ?? []) as { productId: string }[]
    tx.update(listRef, {
      products: products.filter((p) => p.productId !== productId),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  revalidatePath(`/compras/${listId}`)
}

export async function toggleProductChecked(
  listId: string,
  productId: string,
  checked: boolean,
) {
  const { email } = await requireAuth()

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listRef)
    if (!snap.exists) throw new Error("Lista no encontrada")
    const data = snap.data()!
    if (!(data.memberEmails as string[]).includes(email))
      throw new Error("Sin acceso a esta lista")
    const products = (data.products ?? []) as { productId: string }[]
    tx.update(listRef, {
      products: products.map((p) =>
        p.productId === productId ? { ...p, checked } : p,
      ),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  revalidatePath(`/compras/${listId}`)
}

export async function updateProductQuantity(
  listId: string,
  productId: string,
  delta: number,
) {
  const { email } = await requireAuth()

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listRef)
    if (!snap.exists) throw new Error("Lista no encontrada")
    const data = snap.data()!
    if (!(data.memberEmails as string[]).includes(email)) {
      throw new Error("Sin acceso a esta lista")
    }
    const products = (data.products ?? []) as {
      productId: string
      name: string
      quantity: number
    }[]
    const updated = products.map((p) =>
      p.productId === productId
        ? { ...p, quantity: Math.max(1, p.quantity + delta) }
        : p,
    )
    tx.update(listRef, {
      products: updated,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  revalidatePath(`/compras/${listId}`)
}

export async function updateProduct(
  listId: string,
  productId: string,
  name: string,
  quantity: number,
  suggestion?: ProductSuggestionRef | null,
) {
  const { email } = await requireAuth()
  await requireMember("lists", listId, email)

  const normalizedName = normalizeProductName(name)
  if (!normalizedName) throw new Error("El nombre no puede estar vacío")
  if (!Number.isFinite(quantity) || quantity < 1)
    throw new Error("Cantidad inválida")

  // Only override the market reference when a new suggestion was picked;
  // otherwise the existing image/id stay untouched.
  const market = suggestion ? sanitizeSuggestionRef(suggestion) : undefined

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listRef)
    if (!snap.exists) throw new Error("Lista no encontrada")
    const data = snap.data()!
    if (!(data.memberEmails as string[]).includes(email))
      throw new Error("Sin acceso a esta lista")
    const products = (data.products ?? []) as {
      productId: string
      name: string
      quantity: number
    }[]
    const updated = products.map((p) =>
      p.productId === productId
        ? { ...p, name: normalizedName, quantity, ...(market ?? {}) }
        : p,
    )
    tx.update(listRef, {
      products: updated,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  const productDocId = normalizedName.replace(/[/.]/g, "-")
  const productRef = db.collection("productos").doc(productDocId)
  await productRef.set(
    {
      name: normalizedName,
      timesSelected: FieldValue.increment(1),
      ...(market ?? {}),
    },
    { merge: true },
  )

  revalidatePath(`/compras/${listId}`)
}

/** Product suggestions from a market's search API (Mercadona, Decathlon…).
 * The market APIs send no CORS headers, so the browser calls this action
 * instead. The target URL is built from the market allowlist in
 * lib/product-search.ts — never an open relay. */
export async function searchProductSuggestions(
  searchText: string,
  market: string,
): Promise<ProductSuggestion[]> {
  await requireAuth()

  const q = searchText.trim().slice(0, 200)
  const m = market.trim().slice(0, 50)
  if (!q || !m) return []

  return fetchMarketSuggestions(q, m)
}
