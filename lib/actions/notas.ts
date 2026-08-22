"use server"

import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import { validateNotaInput } from "@/lib/validation"
import {
  requireAuth,
  requireCallerRole,
  requireMember,
} from "@/lib/auth-helpers"
import type { AllowedUser, Role } from "@/lib/types"

export async function createNota(formData: FormData) {
  const { email } = await requireAuth()

  const titleValue = formData.get("title")
  const textValue = formData.get("text")
  const stayValue = formData.get("stay")
  const { title } = validateNotaInput(
    typeof titleValue === "string" ? titleValue : "",
  )
  const text = typeof textValue === "string" ? textValue.trim() : ""
  const stay = stayValue === "1"

  if (!title && !text)
    throw new Error("El título o el contenido son requeridos")

  const db = getDB()
  const docRef = db.collection("notas").doc()

  await docRef.set({
    title,
    text,
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (!stay) {
    redirect(`/notas/${docRef.id}`)
  }
}

export async function addUserToNota(notaId: string, email: string, role: Role) {
  const { email: callerEmail } = await requireAuth()

  const validRoles: Role[] = ["member", "admin"]
  if (!validRoles.includes(role)) throw new Error("Rol inválido")

  const { ref: notaRef, data } = await requireCallerRole(
    "notas",
    notaId,
    callerEmail,
    ["owner", "admin"],
    "añadir usuarios",
  )

  if ((data.memberEmails as string[]).includes(email)) {
    throw new Error("Este usuario ya tiene acceso")
  }

  await notaRef.update({
    allowedUsers: FieldValue.arrayUnion({ email, role }),
    memberEmails: FieldValue.arrayUnion(email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/notas/${notaId}/ajustes`)
}

export async function removeUserFromNota(notaId: string, email: string) {
  const { email: callerEmail } = await requireAuth()
  const { ref: notaRef, data } = await requireCallerRole(
    "notas",
    notaId,
    callerEmail,
    ["owner", "admin"],
    "eliminar usuarios",
  )

  const target = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (target?.role === "owner")
    throw new Error("No se puede eliminar al propietario")

  await notaRef.update({
    allowedUsers: (data.allowedUsers as AllowedUser[]).filter(
      (u) => u.email !== email,
    ),
    memberEmails: (data.memberEmails as string[]).filter((e) => e !== email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/notas/${notaId}/ajustes`)
}

export async function renameNota(notaId: string, title: string) {
  const { email } = await requireAuth()

  const trimmed = title.trim()
  if (!trimmed) throw new Error("El nombre no puede estar vacío")

  const { ref: notaRef } = await requireCallerRole(
    "notas",
    notaId,
    email,
    ["owner"],
    "renombrar la nota",
  )

  await notaRef.update({
    title: trimmed,
    updatedAt: FieldValue.serverTimestamp(),
  })
  revalidatePath(`/notas/${notaId}`)
  revalidatePath(`/notas/${notaId}/ajustes`)
}

export async function updateNotaText(notaId: string, text: string) {
  const { email } = await requireAuth()
  const { ref: notaRef } = await requireMember("notas", notaId, email)

  await notaRef.update({ text, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath(`/notas/${notaId}`)
}

export async function deleteNota(notaId: string) {
  const { email } = await requireAuth()

  const { ref: notaRef } = await requireCallerRole(
    "notas",
    notaId,
    email,
    ["owner"],
    "eliminar la nota",
  )

  await notaRef.delete()
  redirect("/notas")
}
