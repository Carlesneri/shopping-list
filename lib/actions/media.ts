"use server"

import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getDB } from "@/lib/firebase-admin"
import { validateMediaInput, validateMediaConfigUpdate } from "@/lib/validation"
import { decryptSecret, encryptSecret } from "@/lib/crypto"
import {
  requireAuth,
  requireCallerRole,
  requireMember,
} from "@/lib/auth-helpers"
import type { AllowedUser, MediaKind, Role, StorageEntry } from "@/lib/types"

function detectMediaKind(key: string): MediaKind | undefined {
  const ext = key.split(".").at(-1)?.toLowerCase() ?? ""
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v", "mpeg", "mpg"].includes(ext))
    return "video"
  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "heic",
      "heif",
      "avif",
      "svg",
      "bmp",
    ].includes(ext)
  )
    return "image"
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a", "opus", "wma"].includes(ext))
    return "audio"
  return undefined
}

function normalizeR2Endpoint(value?: string) {
  if (!value) return ""

  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed) return ""

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (trimmed.includes(".r2.cloudflarestorage.com")) {
    return `https://${trimmed.replace(/^https?:\/\//i, "")}`
  }

  if (trimmed.includes(".cloudflarestorage.com")) {
    return `https://${trimmed.replace(/^https?:\/\//i, "")}`
  }

  return `https://${trimmed}.r2.cloudflarestorage.com`
}

export async function createMediaStorage(formData: FormData) {
  const { email } = await requireAuth()

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

  const s3ApiEndpoint = normalizeR2Endpoint(
    typeof formData.get("S3APIendpoint") === "string"
      ? (formData.get("S3APIendpoint") as string)
      : "",
  )

  const stayValue = formData.get("stay")
  const stay = stayValue === "1"

  const db = getDB()
  const docRef = db.collection("media").doc()

  await docRef.set({
    title,
    provider,
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    config: {
      accountId,
      accessKeyId,
      bucket,
      S3APIendpoint: s3ApiEndpoint || undefined,
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

export async function getMediaStorageClient(mediaId: string) {
  const { email } = await requireAuth()

  const { data } = await requireMember("media", mediaId, email)

  const config =
    (data.config as {
      accountId?: string
      accessKeyId?: string
      bucket?: string
      secretEnc?: string
      S3APIendpoint?: string
    }) ?? {}

  const accountId = config.accountId?.trim()
  const accessKeyId = config.accessKeyId?.trim()
  const bucket = config.bucket?.trim()
  const secretAccessKey = config.secretEnc
    ? decryptSecret(config.secretEnc)
    : ""
  const endpoint = normalizeR2Endpoint(config.S3APIendpoint)

  if (!accountId || !accessKeyId || !bucket || !secretAccessKey || !endpoint) {
    throw new Error("Falta el endpoint de Cloudflare R2")
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    maxAttempts: 1,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return { client, bucket }
}

export async function listMediaStorageEntries(
  mediaId: string,
  prefix = "",
): Promise<StorageEntry[]> {
  const { client, bucket } = await getMediaStorageClient(mediaId)

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: "/",
      }),
      { abortSignal: AbortSignal.timeout(15_000) },
    )

    const folders = (response.CommonPrefixes ?? [])
      .map((item) => item.Prefix ?? "")
      .filter(Boolean)
      .map((folderKey) => {
        const name =
          folderKey.replace(/\/$/, "").split("/").filter(Boolean).at(-1) ??
          folderKey
        return {
          key: folderKey,
          name,
          type: "folder" as const,
        }
      })

    const files = (response.Contents ?? [])
      .filter((item) => item.Key && item.Key !== prefix)
      .map((item) => {
        const key = item.Key ?? ""
        const name = key.split("/").filter(Boolean).at(-1) ?? key
        return {
          key,
          name,
          type: "file" as const,
          mediaKind: detectMediaKind(key),
          size: item.Size ?? 0,
          lastModified: item.LastModified
            ? new Date(item.LastModified)
            : undefined,
        }
      })

    return [...folders, ...files].sort((left, right) => {
      if (left.type !== right.type) return left.type === "folder" ? -1 : 1
      return left.name.localeCompare(right.name)
    })
  } catch (error) {
    console.error({ error })
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes("TimeoutError") ||
      message.includes("timeout") ||
      message.includes("NetworkingError")
    ) {
      throw new Error(
        "Timeout al conectar con el storage. Verifica tu conexión o la configuración del bucket.",
      )
    }
    if (message.includes("AccessDenied") || message.includes("403")) {
      throw new Error(
        "Acceso denegado al bucket. Verifica las credenciales o la configuración de IP.",
      )
    }
    throw new Error("No se pudo cargar el contenido del bucket.")
  }
}

export async function getMediaEntryUrl(
  mediaId: string,
  key: string,
  asDownload = false,
): Promise<string> {
  const { client, bucket } = await getMediaStorageClient(mediaId)

  const trimmedKey = key.trim()
  if (!trimmedKey || trimmedKey.includes("..")) {
    throw new Error("Clave de archivo inválida")
  }

  const fileName = trimmedKey.split("/").at(-1) ?? trimmedKey

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: trimmedKey,
      ...(asDownload
        ? {
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          }
        : {}),
    }),
    { expiresIn: 60 * 60 * 6 },
  )
}

export async function updateMediaConfig(
  mediaId: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  s3ApiEndpoint?: string,
) {
  const { email } = await requireAuth()

  const config = validateMediaConfigUpdate(
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
  )

  const { ref, data } = await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "editar la configuración",
  )

  const currentSecretEnc = (data.config as { secretEnc?: string }).secretEnc
  const currentConfig = (data.config as { S3APIendpoint?: string }) ?? {}
  const resolvedS3ApiEndpoint =
    normalizeR2Endpoint(s3ApiEndpoint) ||
    normalizeR2Endpoint(currentConfig.S3APIendpoint)
  const secretEnc = config.secretAccessKey
    ? encryptSecret(config.secretAccessKey)
    : currentSecretEnc
  if (!secretEnc) throw new Error("El secret access key es requerido")

  await ref.update({
    "config.accountId": config.accountId,
    "config.accessKeyId": config.accessKeyId,
    "config.bucket": config.bucket,
    "config.S3APIendpoint": resolvedS3ApiEndpoint || null,
    "config.secretEnc": secretEnc,
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/media/${mediaId}`)
  revalidatePath(`/media/${mediaId}/ajustes`)
}

export async function renameMediaStorage(mediaId: string, title: string) {
  const { email } = await requireAuth()

  const trimmed = title.trim()
  if (!trimmed) throw new Error("El nombre no puede estar vacío")

  const { ref } = await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner"],
    "renombrar el storage",
  )

  await ref.update({ title: trimmed, updatedAt: FieldValue.serverTimestamp() })
  revalidatePath(`/media/${mediaId}`)
  revalidatePath(`/media/${mediaId}/ajustes`)
}

export async function deleteMediaStorage(mediaId: string) {
  const { email } = await requireAuth()

  const { ref } = await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner"],
    "eliminar el storage",
  )

  await ref.delete()
  redirect("/media")
}

export async function addUserToMedia(
  mediaId: string,
  email: string,
  role: Role,
) {
  const { email: callerEmail } = await requireAuth()

  const validRoles: Role[] = ["member", "admin"]
  if (!validRoles.includes(role)) throw new Error("Rol inválido")

  const { ref, data } = await requireCallerRole(
    "media",
    mediaId,
    callerEmail,
    ["owner", "admin"],
    "añadir usuarios",
  )

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
  const { email: callerEmail } = await requireAuth()
  const { ref, data } = await requireCallerRole(
    "media",
    mediaId,
    callerEmail,
    ["owner", "admin"],
    "eliminar usuarios",
  )

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

export async function deleteMediaEntry(mediaId: string, key: string) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "eliminar archivos",
  )

  const { client, bucket } = await getMediaStorageClient(mediaId)

  const trimmedKey = key.trim()
  if (!trimmedKey || trimmedKey.includes("..")) {
    throw new Error("Clave de archivo inválida")
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: trimmedKey,
    }),
  )

  revalidatePath(`/media/${mediaId}`)
}

export async function deleteMediaFolder(mediaId: string, prefix: string) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "eliminar carpetas",
  )

  const { client, bucket } = await getMediaStorageClient(mediaId)

  const trimmedPrefix = prefix.trim()
  if (!trimmedPrefix || trimmedPrefix.includes("..")) {
    throw new Error("Prefijo de carpeta inválido")
  }

  let continuationToken: string | undefined
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: trimmedPrefix,
        ContinuationToken: continuationToken,
      }),
    )

    const objects = response.Contents ?? []
    if (objects.length > 0) {
      await Promise.all(
        objects.map((obj) =>
          client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: obj.Key!,
            }),
          ),
        ),
      )
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  revalidatePath(`/media/${mediaId}`)
}
