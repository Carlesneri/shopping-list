"use server"

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import {
  validateMediaInput,
  validateMediaConfigUpdate,
} from "@/lib/list-validation"
import { encryptSecret } from "@/lib/crypto"
import type { AllowedUser, Role } from "@/lib/types"

export async function createMediaStorage(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const { title, provider, accountId, accessKeyId, secretAccessKey, bucket } =
    validateMediaInput(
      typeof formData.get("title") === "string"
        ? (formData.get("title") as string)
        : "",
      typeof formData.get("provider") === "string"
        ? (formData.get("provider") as string)
        : "",
      typeof formData.get("accountId") === "string"
        ? (formData.get("accountId") as string)
        : "",
      typeof formData.get("accessKeyId") === "string"
        ? (formData.get("accessKeyId") as string)
        : "",
      typeof formData.get("secretAccessKey") === "string"
        ? (formData.get("secretAccessKey") as string)
        : "",
      typeof formData.get("bucket") === "string"
        ? (formData.get("bucket") as string)
        : "",
    )

  const stayValue = formData.get("stay")
  const stay = stayValue === "1"

  const db = getDB()
  const docRef = db.collection("media").doc()
  const email = session.user.email

  await docRef.set({
    title,
    provider,
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    config: {
      accountId,
      accessKeyId,
      bucket,
      secretEnc: encryptSecret(secretAccessKey),
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (!stay) {
    redirect(`/media/${docRef.id}`)
  }
}

async function getMediaDoc(mediaId: string) {
  const snap = await getDB().collection("media").doc(mediaId).get()
  if (!snap.exists) throw new Error("Storage no encontrado")
  const data = snap.data()
  if (!data) throw new Error("Storage no encontrado")
  return { ref: snap.ref, data }
}

async function requireEditor(
  data: Record<string, unknown>,
  email: string,
  action: string,
) {
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    throw new Error(`Sin permisos para ${action}`)
  }
  return caller
}

export async function updateMediaConfig(
  mediaId: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const config = validateMediaConfigUpdate(
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
  )

  const { ref, data } = await getMediaDoc(mediaId)
  await requireEditor(data, email, "editar la configuración")

  const currentSecretEnc = (data.config as { secretEnc?: string }).secretEnc
  const secretEnc = config.secretAccessKey
    ? encryptSecret(config.secretAccessKey)
    : currentSecretEnc
  if (!secretEnc) throw new Error("El secret access key es requerido")

  await ref.update({
    "config.accountId": config.accountId,
    "config.accessKeyId": config.accessKeyId,
    "config.bucket": config.bucket,
    "config.secretEnc": secretEnc,
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/media/${mediaId}`)
  revalidatePath(`/media/${mediaId}/ajustes`)
}

export async function renameMediaStorage(mediaId: string, title: string) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const trimmed = title.trim()
  if (!trimmed) throw new Error("El nombre no puede estar vacío")

  const { ref, data } = await getMediaDoc(mediaId)
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (caller?.role !== "owner")
    throw new Error("Solo el propietario puede renombrar el storage")

  await ref.update({ title: trimmed, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath(`/media/${mediaId}`)
  revalidatePath(`/media/${mediaId}/ajustes`)
}

export async function deleteMediaStorage(mediaId: string) {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("No autenticado")

  const { ref, data } = await getMediaDoc(mediaId)
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (caller?.role !== "owner")
    throw new Error("Solo el propietario puede eliminar el storage")

  await ref.delete()
  redirect("/media")
}

export async function addUserToMedia(
  mediaId: string,
  email: string,
  role: Role,
) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const { ref, data } = await getMediaDoc(mediaId)
  await requireEditor(data, session.user.email, "añadir usuarios")
  if ((data.memberEmails as string[]).includes(email)) {
    throw new Error("Este usuario ya tiene acceso")
  }

  await ref.update({
    allowedUsers: FieldValue.arrayUnion({ email, role }),
    memberEmails: FieldValue.arrayUnion(email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/media/${mediaId}/ajustes`)
}

export async function removeUserFromMedia(mediaId: string, email: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const { ref, data } = await getMediaDoc(mediaId)
  await requireEditor(data, session.user.email, "eliminar usuarios")

  const target = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (target?.role === "owner")
    throw new Error("No se puede eliminar al propietario")

  await ref.update({
    allowedUsers: (data.allowedUsers as AllowedUser[]).filter(
      (u) => u.email !== email,
    ),
    memberEmails: (data.memberEmails as string[]).filter((e) => e !== email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/media/${mediaId}/ajustes`)
}
