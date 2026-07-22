"use server"

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import { validateNotaInput } from "@/lib/list-validation"
import type { AllowedUser, Role } from "@/lib/types"

export async function createNota(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const { title } = validateNotaInput(formData.get("title") as string)

  const db = getDB()

  const docRef = db.collection("notas").doc()

  const email = session.user.email

  await docRef.set({
    title,
    text: "",
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  redirect(`/notas/${docRef.id}`)
}

export async function addUserToNota(notaId: string, email: string, role: Role) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getDB()
  const notaRef = db.collection("notas").doc(notaId)
  const snap = await notaRef.get()

  if (!snap.exists) throw new Error("Nota no encontrada")

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

  await notaRef.update({
    allowedUsers: FieldValue.arrayUnion({ email, role }),
    memberEmails: FieldValue.arrayUnion(email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/notas/${notaId}/ajustes`)
}

export async function removeUserFromNota(notaId: string, email: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getDB()
  const notaRef = db.collection("notas").doc(notaId)
  const snap = await notaRef.get()

  if (!snap.exists) throw new Error("Nota no encontrada")

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
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const trimmed = title.trim()
  if (!trimmed) throw new Error("El nombre no puede estar vacío")

  const db = getDB()
  const notaRef = db.collection("notas").doc(notaId)
  const snap = await notaRef.get()
  if (!snap.exists) throw new Error("Nota no encontrada")

  const caller = (snap.data()!.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (caller?.role !== "owner")
    throw new Error("Solo el propietario puede renombrar la nota")

  await notaRef.update({
    title: trimmed,
    updatedAt: FieldValue.serverTimestamp(),
  })
  revalidatePath(`/notas/${notaId}`)
  revalidatePath(`/notas/${notaId}/ajustes`)
}

export async function updateNotaText(notaId: string, text: string) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const db = getDB()
  const notaRef = db.collection("notas").doc(notaId)
  const snap = await notaRef.get()
  if (!snap.exists) throw new Error("Nota no encontrada")

  const data = snap.data()!
  if (!(data.memberEmails as string[]).includes(email)) {
    throw new Error("Sin acceso a esta nota")
  }

  await notaRef.update({ text, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath(`/notas/${notaId}`)
}

export async function deleteNota(notaId: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getDB()
  const notaRef = db.collection("notas").doc(notaId)
  const snap = await notaRef.get()

  if (!snap.exists) throw new Error("Nota no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (caller?.role !== "owner")
    throw new Error("Solo el propietario puede eliminar la nota")

  await notaRef.delete()
  redirect("/")
}
