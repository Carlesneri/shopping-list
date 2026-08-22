"use server"

import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import { validateListInput } from "@/lib/validation"
import {
  requireAuth,
  requireCallerRole,
} from "@/lib/auth-helpers"
import type { AllowedUser, Role } from "@/lib/types"

export async function createList(formData: FormData) {
  const { email } = await requireAuth()

  const { title, market } = validateListInput(
    formData.get("title") as string,
    formData.get("market") as string,
  )

  const db = getDB()
  const docRef = db.collection("lists").doc()

  await docRef.set({
    title,
    market,
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    products: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  redirect(`/compras/${docRef.id}`)
}

export async function addUserToList(listId: string, email: string, role: Role) {
  const { email: callerEmail } = await requireAuth()

  const validRoles: Role[] = ["member", "admin"]
  if (!validRoles.includes(role)) throw new Error("Rol inválido")

  const { ref: listRef, data } = await requireCallerRole(
    "lists",
    listId,
    callerEmail,
    ["owner", "admin"],
    "añadir usuarios",
  )

  if ((data.memberEmails as string[]).includes(email)) {
    throw new Error("Este usuario ya tiene acceso")
  }

  await listRef.update({
    allowedUsers: FieldValue.arrayUnion({ email, role }),
    memberEmails: FieldValue.arrayUnion(email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/compras/${listId}/ajustes`)
}

export async function removeUserFromList(listId: string, email: string) {
  const { email: callerEmail } = await requireAuth()
  const { ref: listRef, data } = await requireCallerRole(
    "lists",
    listId,
    callerEmail,
    ["owner", "admin"],
    "eliminar usuarios",
  )

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

  revalidatePath(`/compras/${listId}/ajustes`)
}

export async function renameList(listId: string, title: string) {
  const { email } = await requireAuth()

  const trimmed = title.trim()
  if (!trimmed) throw new Error("El nombre no puede estar vacío")

  const { ref: listRef } = await requireCallerRole(
    "lists",
    listId,
    email,
    ["owner"],
    "renombrar la lista",
  )

  await listRef.update({
    title: trimmed,
    updatedAt: FieldValue.serverTimestamp(),
  })
  revalidatePath(`/compras/${listId}`)
  revalidatePath(`/compras/${listId}/ajustes`)
}

export async function deleteList(listId: string) {
  const { email } = await requireAuth()

  const { ref: listRef } = await requireCallerRole(
    "lists",
    listId,
    email,
    ["owner"],
    "eliminar la lista",
  )

  await listRef.delete()
  redirect("/compras")
}
