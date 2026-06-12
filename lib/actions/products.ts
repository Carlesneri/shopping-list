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
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/lists/${listId}`)
}
