"use server"

import { redirect } from "next/navigation"
import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getDB } from "@/lib/firebase-admin"
import { validateMediaInput, validateMediaConfigUpdate } from "@/lib/validation"
import { decryptSecret, encryptSecret } from "@/lib/crypto"
import { detectMediaKind, MOVE_MAX_SIZE } from "@/lib/media-utils"
import {
  requireAuth,
  requireCallerRole,
  requireMember,
} from "@/lib/auth-helpers"
import type { AllowedUser, Role, StorageEntry } from "@/lib/types"

/**
 * Validates a storage object key. Blocks path traversal segments ("." / "..")
 * while still allowing file names that contain consecutive dots
 * (e.g. "whatever..mkv").
 */
function assertValidObjectKey(value: string, message: string) {
  if (
    !value ||
    value.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(message)
  }
}

/**
 * Validates a folder prefix (e.g. "videos/"). Unlike a full object key, an
 * empty prefix (the bucket root) is valid; "." / ".." segments are still
 * blocked.
 */
function assertValidObjectPrefix(value: string, message: string) {
  if (value.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error(message)
  }
}

const R2_SUFFIX = ".r2.cloudflarestorage.com"
const LEGACY_R2_SUFFIX = ".cloudflarestorage.com"

/**
 * Normalizes and validates the R2 endpoint. The host must be a Cloudflare R2
 * endpoint belonging to the user's own account (optionally with a
 * jurisdiction segment, e.g. `<account>.eu.r2.cloudflarestorage.com`) —
 * anything else is rejected so the server never contacts a foreign host
 * with the stored credentials.
 */
function normalizeR2Endpoint(value: string | undefined, accountId: string) {
  if (!value) return ""

  const trimmed = value.trim().replace(/\/+$/, "")
  if (!trimmed) return ""

  let host = trimmed
  if (/^https?:\/\//i.test(host)) {
    try {
      host = new URL(host).host
    } catch {
      return ""
    }
  } else if (!host.includes(".")) {
    // Bare account id — expand to the standard R2 endpoint.
    host = `${host}${R2_SUFFIX}`
  }

  const lowerHost = host.toLowerCase()
  const suffix = lowerHost.endsWith(R2_SUFFIX)
    ? R2_SUFFIX
    : lowerHost.endsWith(LEGACY_R2_SUFFIX)
      ? LEGACY_R2_SUFFIX
      : null
  if (!suffix) {
    throw new Error(
      "Endpoint no válido: usa el endpoint de Cloudflare R2 (https://<account-id>.r2.cloudflarestorage.com)",
    )
  }

  const account = accountId.trim().toLowerCase()
  const prefix = lowerHost.slice(0, -suffix.length)
  if (!prefix.startsWith(account)) {
    throw new Error(
      "El endpoint debe corresponder a tu account ID de Cloudflare",
    )
  }

  const rest = prefix.slice(account.length)
  if (rest !== "" && !/^\.[a-z0-9-]+$/.test(rest)) {
    throw new Error(
      "Endpoint no válido: usa el endpoint de Cloudflare R2 (https://<account-id>.r2.cloudflarestorage.com)",
    )
  }

  return `https://${lowerHost}`
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
    accountId,
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

export async function getMediaStorageClient(
  mediaId: string,
  { requestTimeoutMs = 15_000 }: { requestTimeoutMs?: number } = {},
) {
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
  const endpoint = normalizeR2Endpoint(config.S3APIendpoint, accountId ?? "")

  if (!accountId || !accessKeyId || !bucket || !secretAccessKey || !endpoint) {
    throw new Error("Falta el endpoint de Cloudflare R2")
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    maxAttempts: 1,
    // Never let a request hang: all R2 calls are user-triggered. Requests
    // exceeding the timeout are turned into errors (instead of the SDK's
    // dangling retry warning) so callers get a clear failure message.
    requestHandler: {
      requestTimeout: requestTimeoutMs,
      throwOnRequestTimeout: true,
    },
    // R2 rejects presigned URLs that include x-amz-checksum-mode (added by
    // default in recent SDK versions), so only send checksums when required.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
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
  assertValidObjectKey(trimmedKey, "Clave de archivo inválida")

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
    { expiresIn: 7 * 24 * 60 * 60 }, // 7 days
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
    normalizeR2Endpoint(s3ApiEndpoint, config.accountId) ||
    normalizeR2Endpoint(currentConfig.S3APIendpoint, config.accountId)
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
  assertValidObjectKey(trimmedKey, "Clave de archivo inválida")

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
  assertValidObjectKey(trimmedPrefix, "Prefijo de carpeta inválido")

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

// Files at or below this size are uploaded through a Server Action; anything
// bigger uses a presigned PUT straight to R2 (avoids the Next.js action body
// limit). Keep in sync with SMALL_FILE_LIMIT in UploadButton.tsx.
const MAX_ACTION_UPLOAD_SIZE = 1024 * 1024
const MAX_TOTAL_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024
// Presigned URLs use the maximum expiry S3/R2 allows: 7 days.
const PRESIGN_EXPIRY_SECONDS = 60 * 60 * 24 * 7

export async function uploadMediaEntries(mediaId: string, formData: FormData) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "subir archivos",
  )

  const { client, bucket } = await getMediaStorageClient(mediaId)

  const prefix = (formData.get("prefix") as string | null)?.trim() ?? ""
  assertValidObjectPrefix(prefix, "Ruta de carpeta inválida")

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File)
  if (files.length === 0)
    throw new Error("No se ha seleccionado ningún archivo")

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  if (totalSize > MAX_TOTAL_UPLOAD_SIZE)
    throw new Error("El tamaño total supera el límite de 10 GB")

  for (const file of files) {
    const key = `${prefix}${file.name.trim()}`
    assertValidObjectKey(key, `Clave de archivo inválida: ${file.name}`)

    if (!detectMediaKind(key))
      throw new Error(
        `Solo se permiten archivos de vídeo, imagen o audio: ${file.name}`,
      )

    if (file.size === 0) throw new Error(`El archivo está vacío: ${file.name}`)
    if (file.size > MAX_ACTION_UPLOAD_SIZE)
      throw new Error(
        `El archivo debe subirse vía URL prefirmada: ${file.name}`,
      )

    const body = new Uint8Array(await file.arrayBuffer())
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type || undefined,
        ContentLength: body.byteLength,
      }),
    )
  }

  revalidatePath(`/media/${mediaId}`)
}

/**
 * Returns a presigned PUT URL so big files go directly from the browser to
 * R2, bypassing the Next.js Server Action body limit. The URL is scoped to a
 * single object key and expires quickly.
 */
export async function getMediaUploadUrl(
  mediaId: string,
  key: string,
  size: number,
) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "subir archivos",
  )

  const trimmedKey = key.trim()
  assertValidObjectKey(trimmedKey, "Clave de archivo inválida")

  if (!detectMediaKind(trimmedKey))
    throw new Error("Solo se permiten archivos de vídeo, imagen o audio")

  if (size <= 0) throw new Error("El archivo está vacío")
  // Single-shot PUT tops out at 5 GB in R2.
  if (size > MOVE_MAX_SIZE)
    throw new Error("El archivo supera el límite de tamaño por archivo")

  const { client, bucket } = await getMediaStorageClient(mediaId)

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: trimmedKey }),
    { expiresIn: PRESIGN_EXPIRY_SECONDS },
  )

  return { url }
}

/**
 * Creates an empty "folder" by writing a zero-byte object whose key ends in
 * "/", the standard S3/R2 convention for representing directories.
 */
export async function createMediaFolder(
  mediaId: string,
  prefix: string,
  name: string,
) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "crear carpetas",
  )

  const { client, bucket } = await getMediaStorageClient(mediaId)

  const folderName = name.trim().replace(/\/+$/, "")
  if (!folderName) throw new Error("El nombre no puede estar vacío")
  if (folderName.includes("/"))
    throw new Error("El nombre no puede contener barras")

  const trimmedPrefix = prefix.trim()
  assertValidObjectPrefix(trimmedPrefix, "Ruta de carpeta inválida")

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${trimmedPrefix}${folderName}/`,
      Body: new Uint8Array(0),
      ContentLength: 0,
    }),
  )

  revalidatePath(`/media/${mediaId}`)
}

/** S3 CopySource requires the key to be URL-encoded, segment by segment. */
function encodeCopySource(bucket: string, key: string) {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`
}

const MAX_FOLDERS = 200

/**
 * Lists every folder path in the bucket (depth-first). Used by the "move"
 * picker to offer nested destinations beyond the current listing.
 */
export async function listMediaFolders(mediaId: string): Promise<string[]> {
  const { email } = await requireAuth()

  await requireMember("media", mediaId, email)

  const { client, bucket } = await getMediaStorageClient(mediaId)

  const folders: string[] = []
  const stack = [""]
  while (stack.length > 0 && folders.length < MAX_FOLDERS) {
    const prefix = stack.pop()!
    let continuationToken: string | undefined
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          Delimiter: "/",
          ContinuationToken: continuationToken,
        }),
      )

      for (const commonPrefix of response.CommonPrefixes ?? []) {
        const folder = commonPrefix.Prefix ?? ""
        if (!folder) continue
        folders.push(folder)
        if (folders.length < MAX_FOLDERS) stack.push(folder)
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined
    } while (continuationToken && folders.length < MAX_FOLDERS)
  }

  return folders.sort((a, b) => a.localeCompare(b))
}

/**
 * Moves one entry (a file or a whole folder) with an already-configured S3
 * client. S3 has no rename, so this is copy + delete. Returns false when the
 * entry is already at the destination (nothing to do).
 */
async function moveEntryWithClient(
  client: S3Client,
  bucket: string,
  fromKey: string,
  toPrefix: string,
): Promise<boolean> {
  if (fromKey.endsWith("/")) {
    if (toPrefix.startsWith(fromKey))
      throw new Error("No se puede mover una carpeta dentro de sí misma")

    const folderName = fromKey
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean)
      .at(-1)
    if (!folderName) throw new Error("Clave de origen inválida")
    const newPrefix = `${toPrefix}${folderName}/`
    if (newPrefix === fromKey) return false

    let continuationToken: string | undefined
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: fromKey,
          ContinuationToken: continuationToken,
        }),
      )

      for (const obj of response.Contents ?? []) {
        const key = obj.Key!
        if ((obj.Size ?? 0) > MOVE_MAX_SIZE)
          throw new Error(
            "La carpeta contiene archivos que superan el límite de 5 GB por archivo",
          )
        const newKey = `${newPrefix}${key.slice(fromKey.length)}`
        await client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: encodeCopySource(bucket, key),
            Key: newKey,
          }),
        )
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined
    } while (continuationToken)
    return true
  }

  const fileName = fromKey.split("/").filter(Boolean).at(-1)
  if (!fileName) throw new Error("Clave de origen inválida")
  const newKey = toPrefix + fileName
  if (newKey === fromKey) return false

  const head = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: fromKey }),
  )
  if ((head.ContentLength ?? 0) > MOVE_MAX_SIZE)
    throw new Error("El archivo supera el límite de tamaño por archivo")

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeCopySource(bucket, fromKey),
      Key: newKey,
    }),
  )
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: fromKey }))
  return true
}

/**
 * Moves a file (or a whole folder, copying object by object) to another
 * folder in the same bucket.
 */
export async function moveMediaEntry(
  mediaId: string,
  fromKey: string,
  toPrefix: string,
) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "mover archivos",
  )

  // Server-side copies of big objects/folders can legitimately take minutes,
  // so the move gets a much longer per-request timeout than reads.
  const { client, bucket } = await getMediaStorageClient(mediaId, {
    requestTimeoutMs: 300_000,
  })

  const trimmedFrom = fromKey.trim()
  assertValidObjectKey(trimmedFrom, "Clave de origen inválida")
  const trimmedTo = toPrefix.trim()
  assertValidObjectPrefix(trimmedTo, "Carpeta de destino inválida")

  await moveEntryWithClient(client, bucket, trimmedFrom, trimmedTo)

  revalidatePath(`/media/${mediaId}`)
}
