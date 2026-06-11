"use server"

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import type { AllowedUser, Role } from "@/lib/types"

function validateListInput(title: string, market: string) {
  if (!title.trim()) throw new Error("El título es requerido")
  if (!market.trim()) throw new Error("El mercado es requerido")
  return { title: title.trim(), market: market.trim() }
}

export async function createList(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const { title, market } = validateListInput(
    formData.get("title") as string,
    formData.get("market") as string,
  )

  const db = getDB()

  const docRef = db.collection("lists").doc()

  const email = session.user.email

  await docRef.set({
    title,
    market,
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    products: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  redirect(`/lists/${docRef.id}`)
}

export async function addUserToList(listId: string, email: string, role: Role) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)
  const snap = await listRef.get()

  if (!snap.exists) throw new Error("Lista no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    throw new Error("Sin permisos para añadir usuarios")
  }
  if ((data.memberEmails as string[]).includes(email)) {
    throw new Error("Este usuario ya tiene acceso")
  }

  await listRef.update({
    allowedUsers: FieldValue.arrayUnion({ email, role }),
    memberEmails: FieldValue.arrayUnion(email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/lists/${listId}/settings`)
}

export async function removeUserFromList(listId: string, email: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)
  const snap = await listRef.get()

  if (!snap.exists) throw new Error("Lista no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    throw new Error("Sin permisos para eliminar usuarios")
  }

  const target = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (target?.role === "owner")
    throw new Error("No se puede eliminar al propietario")

  await listRef.update({
    allowedUsers: (data.allowedUsers as AllowedUser[]).filter(
      (u) => u.email !== email,
    ),
    memberEmails: (data.memberEmails as string[]).filter((e) => e !== email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/lists/${listId}/settings`)
}

export async function deleteList(listId: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getDB()
  const listRef = db.collection("lists").doc(listId)
  const snap = await listRef.get()

  if (!snap.exists) throw new Error("Lista no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (caller?.role !== "owner")
    throw new Error("Solo el propietario puede eliminar la lista")

  await listRef.delete()
  redirect("/")
}
