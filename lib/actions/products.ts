"use server"

import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getDB } from "@/lib/firebase-admin"
import { normalizeProductName } from "@/lib"

export async function addProductToList(
  listId: string,
  name: string,
  quantity: number,
) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const normalizedName = normalizeProductName(name)
  if (!normalizedName) throw new Error("El nombre no puede estar vacío")
  if (!Number.isFinite(quantity) || quantity < 1) throw new Error("Cantidad inválida")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)
  const listSnap = await listRef.get()

  if (!listSnap.exists) throw new Error("Lista no encontrada")

  if (
    !(listSnap.data()!.memberEmails as string[]).includes(session.user.email)
  ) {
    throw new Error("Sin acceso a esta lista")
  }

  const productDocId = normalizedName.replace(/[/.]/g, "-")
  const productRef = db.collection("productos").doc(productDocId)
  await productRef.set(
    { name: normalizedName, timesSelected: FieldValue.increment(1) },
    { merge: true },
  )
  const productId = productRef.id

  await listRef.update({
    products: FieldValue.arrayUnion({
      productId,
      name: normalizedName,
      quantity,
    }),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/lists/${listId}`)
}

export async function removeProductFromList(listId: string, productId: string) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listRef)
    if (!snap.exists) throw new Error("Lista no encontrada")
    const data = snap.data()!
    if (!(data.memberEmails as string[]).includes(email)) throw new Error("Sin acceso a esta lista")
    const products = (data.products ?? []) as { productId: string }[]
    tx.update(listRef, {
      products: products.filter((p) => p.productId !== productId),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  revalidatePath(`/lists/${listId}`)
}

export async function updateProductQuantity(
  listId: string,
  productId: string,
  delta: number,
) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(listRef)
    if (!snap.exists) throw new Error("Lista no encontrada")
    const data = snap.data()!
    if (!(data.memberEmails as string[]).includes(email)) {
      throw new Error("Sin acceso a esta lista")
    }
    const products = (data.products ?? []) as { productId: string; name: string; quantity: number }[]
    const updated = products.map((p) =>
      p.productId === productId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p,
    )
    tx.update(listRef, { products: updated, updatedAt: FieldValue.serverTimestamp() })
  })

  revalidatePath(`/lists/${listId}`)
}

