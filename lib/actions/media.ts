"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
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
import type {
  AllowedUser,
  DriveConfig,
  Role,
  StorageEntry,
  StorageProvider,
} from "@/lib/types"
import {
  DRIVE_CALLBACK_PATH,
  DRIVE_NOT_CONNECTED_MESSAGE,
  buildDriveConsentUrl,
  createDriveState,
  deleteDriveFile,
  deleteDriveFolder,
  exchangeDriveAuthCode,
  invalidateDriveFileId,
  listDriveEntries,
  refreshDriveAccessToken,
  resolveDriveUploadParent,
  startDriveResumableUpload,
  uploadDriveFile,
  verifyDriveState,
} from "@/lib/drive"

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

/** Reads the provider of a media doc (defaulting to R2 for legacy docs). */
function docProvider(data: Record<string, unknown>): StorageProvider {
  return (data.provider as StorageProvider | undefined) ?? "cloudflare-r2"
}

async function requestOrigin() {
  const headerList = await headers()
  const origin = headerList.get("origin")
  if (origin) return origin.replace(/\/$/, "")

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  if (!host) {
    const fallback = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    if (fallback) return fallback
    throw new Error("No se pudo determinar la URL de la aplicación")
  }

  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]
  const proto =
    forwardedProto?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https")
  return `${proto}://${host}`
}

function driveErrorPath(mediaId: string | null, message: string) {
  const path = mediaId ? `/media/${mediaId}` : "/media"
  return `${path}?drive_error=${encodeURIComponent(message.slice(0, 300))}`
}

/** Builds the Google consent URL for connecting a Drive storage. */
async function buildDriveConnectUrl(mediaId: string, email: string) {
  const redirectUri = `${await requestOrigin()}${DRIVE_CALLBACK_PATH}`
  return buildDriveConsentUrl(
    redirectUri,
    createDriveState(mediaId, email, redirectUri),
  )
}

/** Starts (or restarts) the Google Drive consent flow for an existing
 * storage. Google redirects back to the callback page, which submits
 * `completeDriveConnect`. */
export async function startDriveConnect(mediaId: string) {
  const { email } = await requireAuth()

  await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "conectar Google Drive",
  )

  redirect(await buildDriveConnectUrl(mediaId, email))
}

/** Finishes the Drive consent flow started by `startDriveConnect`. The
 * callback page submits this action with the code and signed state Google
 * returned. */
export async function completeDriveConnect(formData: FormData) {
  const code = String(formData.get("code") ?? "")
  const state = String(formData.get("state") ?? "")
  const oauthError = String(formData.get("error") ?? "")

  if (code.length > 2048 || state.length > 4096) {
    redirect(
      driveErrorPath(null, "Estado de conexión inválido. Vuelve a intentarlo."),
    )
  }

  const parsed = state ? verifyDriveState(state) : null
  let email: string
  try {
    email = (await requireAuth()).email
  } catch {
    redirect(
      driveErrorPath(null, "Estado de conexión inválido. Vuelve a intentarlo."),
    )
  }

  if (!parsed || parsed.email !== email) {
    redirect(
      driveErrorPath(null, "Estado de conexión inválido. Vuelve a intentarlo."),
    )
  }

  if (oauthError === "access_denied") {
    redirect(
      driveErrorPath(parsed.mediaId, "Has cancelado la conexión con Google"),
    )
  }
  if (oauthError || !code) {
    redirect(
      driveErrorPath(parsed.mediaId, "Google no devolvió la autorización"),
    )
  }

  let ref: Awaited<ReturnType<typeof requireCallerRole>>["ref"]
  let data: Record<string, unknown>
  try {
    const access = await requireCallerRole(
      "media",
      parsed.mediaId,
      email,
      ["owner", "admin"],
      "conectar Google Drive",
    )
    ref = access.ref
    data = access.data
  } catch {
    redirect(
      driveErrorPath(parsed.mediaId, "Sin permisos para conectar Google Drive"),
    )
  }

  if (docProvider(data) !== "google-drive") {
    redirect(driveErrorPath(parsed.mediaId, "Storage no encontrado"))
  }

  let tokens: { refresh_token?: string }
  try {
    tokens = await exchangeDriveAuthCode(code, parsed.redirectUri)
  } catch (error) {
    redirect(
      driveErrorPath(
        parsed.mediaId,
        error instanceof Error
          ? error.message
          : "No se pudo completar la conexión con Google",
      ),
    )
  }

  if (!tokens.refresh_token) {
    redirect(
      driveErrorPath(
        parsed.mediaId,
        "Google no devolvió un refresh token. Revoca el acceso de la app en tu cuenta de Google y vuelve a conectarlo.",
      ),
    )
  }

  await ref.update({
    "config.refreshTokenEnc": encryptSecret(tokens.refresh_token),
    "config.connectedEmail": email,
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/media/${parsed.mediaId}`)
  revalidatePath(`/media/${parsed.mediaId}/ajustes`)
  redirect(`/media/${parsed.mediaId}`)
}

export async function createMediaStorage(formData: FormData) {
  const { email } = await requireAuth()

  const input = validateMediaInput(
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

  const s3ApiEndpoint =
    input.provider === "google-drive"
      ? ""
      : normalizeR2Endpoint(
          typeof formData.get("S3APIendpoint") === "string"
            ? (formData.get("S3APIendpoint") as string)
            : "",
          input.accountId,
        )

  const stayValue = formData.get("stay")
  const stay = stayValue === "1"

  const db = getDB()
  const docRef = db.collection("media").doc()

  await docRef.set({
    title: input.title,
    provider: input.provider,
    allowedUsers: [{ email, role: "owner" as Role }],
    memberEmails: [email],
    config:
      input.provider === "google-drive"
        ? { refreshTokenEnc: "" }
        : {
            accountId: input.accountId,
            accessKeyId: input.accessKeyId,
            bucket: input.bucket,
            S3APIendpoint: s3ApiEndpoint || undefined,
            secretEnc: encryptSecret(input.secretAccessKey),
          },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (input.provider === "google-drive") {
    // Drive needs an OAuth consent round-trip before it can be listed.
    redirect(await buildDriveConnectUrl(docRef.id, email))
  }

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

  // Only the R2 flow uses an S3 client; Drive operations branch off before
  // reaching this function, so reaching it with a Drive doc is an unsupported
  // operation (upload, move, delete, …) for now.
  if (docProvider(data) === "google-drive") {
    throw new Error(
      "Esta operación no está disponible para Google Drive todavía",
    )
  }

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
  const { email } = await requireAuth()
  const { data } = await requireMember("media", mediaId, email)

  if (docProvider(data) === "google-drive") {
    assertValidObjectPrefix(prefix, "Ruta de carpeta inválida")
    const config = (data.config as Partial<DriveConfig> | undefined) ?? {}
    const refreshToken = config.refreshTokenEnc
      ? decryptSecret(config.refreshTokenEnc)
      : ""
    if (!refreshToken) throw new Error(DRIVE_NOT_CONNECTED_MESSAGE)

    try {
      const accessToken = await refreshDriveAccessToken(refreshToken)
      return await listDriveEntries(accessToken, prefix)
    } catch (error) {
      console.error({ error })
      throw error instanceof Error
        ? error
        : new Error("No se pudo cargar el contenido de Google Drive.")
    }
  }

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
      .filter(
        (item) => item.Key && item.Key !== prefix && detectMediaKind(item.Key),
      )
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
  const { email } = await requireAuth()
  const { data } = await requireMember("media", mediaId, email)

  const trimmedKey = key.trim()
  assertValidObjectKey(trimmedKey, "Clave de archivo inválida")

  // Drive has no presigned URLs; playback and downloads go through the
  // authenticated streaming proxy route.
  if (docProvider(data) === "google-drive") {
    const params = new URLSearchParams({ key: trimmedKey })
    if (asDownload) params.set("dl", "1")
    return `/api/media/${mediaId}/file?${params.toString()}`
  }

  const { client, bucket } = await getMediaStorageClient(mediaId)

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

  if (docProvider(data) === "google-drive") {
    throw new Error(
      "La configuración de Google Drive se gestiona reconectando la cuenta",
    )
  }

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

  const { data } = await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "eliminar archivos",
  )

  const trimmedKey = key.trim()
  assertValidObjectKey(trimmedKey, "Clave de archivo inválida")

  if (docProvider(data) === "google-drive") {
    const { accessToken, refreshToken } = await driveToken(data)
    try {
      await deleteDriveFile(accessToken, trimmedKey)
    } catch (error) {
      console.error(`[drive:delete] failed for ${mediaId}/${trimmedKey}`, error)
      throw error instanceof Error
        ? error
        : new Error("No se pudo eliminar el archivo de Google Drive")
    }
    invalidateDriveFileId(refreshToken, trimmedKey)
    revalidatePath(`/media/${mediaId}`)
    return
  }

  const { client, bucket } = await getMediaStorageClient(mediaId)

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

  const { data } = await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner"],
    "eliminar carpetas",
  )

  const trimmedPrefix = prefix.trim()
  assertValidObjectKey(trimmedPrefix, "Prefijo de carpeta inválido")

  if (docProvider(data) === "google-drive") {
    const { accessToken } = await driveToken(data)
    try {
      await deleteDriveFolder(accessToken, trimmedPrefix)
    } catch (error) {
      console.error(
        `[drive:delete] failed for ${mediaId}/${trimmedPrefix}`,
        error,
      )
      throw error instanceof Error
        ? error
        : new Error("No se pudo eliminar la carpeta de Google Drive")
    }
    revalidatePath(`/media/${mediaId}`)
    return
  }

  const { client, bucket } = await getMediaStorageClient(mediaId)

  // Only an empty folder can be deleted: its zero-byte "/" marker (the S3/R2
  // directory convention) and nothing else. A couple of keys is enough to tell
  // the marker apart from real content.
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: trimmedPrefix,
      MaxKeys: 2,
    }),
  )
  const contents = response.Contents ?? []
  const hasMarker = contents.length === 1 && contents[0].Key === trimmedPrefix
  if (contents.length > 1 || (contents.length === 1 && !hasMarker)) {
    throw new Error(
      "La carpeta no está vacía: elimina su contenido antes de borrarla",
    )
  }

  if (hasMarker) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: trimmedPrefix,
      }),
    )
  }

  revalidatePath(`/media/${mediaId}`)
}

// Files at or below this size are uploaded through a Server Action; anything
// bigger uses a presigned PUT straight to R2 (avoids the Next.js action body
// limit). Keep in sync with SMALL_FILE_LIMIT in UploadButton.tsx.
const MAX_ACTION_UPLOAD_SIZE = 1024 * 1024
const MAX_TOTAL_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024
// Presigned URLs use the maximum expiry S3/R2 allows: 7 days.
const PRESIGN_EXPIRY_SECONDS = 60 * 60 * 24 * 7

async function driveToken(data: Record<string, unknown>) {
  const config = (data.config as Partial<DriveConfig> | undefined) ?? {}
  const refreshToken = config.refreshTokenEnc
    ? decryptSecret(config.refreshTokenEnc)
    : ""
  if (!refreshToken) throw new Error(DRIVE_NOT_CONNECTED_MESSAGE)
  return {
    accessToken: await refreshDriveAccessToken(refreshToken),
    refreshToken,
  }
}

function driveFileName(key: string) {
  const name = key.split("/").filter(Boolean).at(-1) ?? ""
  if (!name || name === "." || name === "..") {
    throw new Error("Clave de archivo inválida")
  }
  return name
}

export async function uploadMediaEntries(mediaId: string, formData: FormData) {
  const { email } = await requireAuth()

  const { data } = await requireCallerRole(
    "media",
    mediaId,
    email,
    ["owner", "admin"],
    "subir archivos",
  )

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

  if (docProvider(data) === "google-drive") {
    const { accessToken, refreshToken } = await driveToken(data)
    const parentId = await resolveDriveUploadParent(accessToken, prefix)
    for (const file of files) {
      const key = `${prefix}${file.name.trim()}`
      assertValidObjectKey(key, `Clave de archivo inválida: ${file.name}`)
      if (!detectMediaKind(key)) {
        throw new Error(
          `Solo se permiten archivos de vídeo, imagen o audio: ${file.name}`,
        )
      }
      if (file.size === 0)
        throw new Error(`El archivo está vacío: ${file.name}`)
      if (file.size > MAX_ACTION_UPLOAD_SIZE) {
        throw new Error(
          `El archivo debe subirse vía URL prefirmada: ${file.name}`,
        )
      }
      await uploadDriveFile(
        accessToken,
        parentId,
        driveFileName(key),
        file.type || "application/octet-stream",
        new Uint8Array(await file.arrayBuffer()),
      )
      // A re-upload replaces the Drive file: drop the cached id so playback
      // and downloads resolve the new file instead of 404-ing on the old one.
      invalidateDriveFileId(refreshToken, key)
    }
    revalidatePath(`/media/${mediaId}`)
    return
  }

  const { client, bucket } = await getMediaStorageClient(mediaId)

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
  mimeType = "application/octet-stream",
) {
  const { email } = await requireAuth()

  const { data } = await requireCallerRole(
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

  if (docProvider(data) === "google-drive") {
    const { accessToken, refreshToken } = await driveToken(data)
    const prefix = trimmedKey.slice(0, trimmedKey.lastIndexOf("/") + 1)
    const parentId = await resolveDriveUploadParent(accessToken, prefix)
    const url = await startDriveResumableUpload(
      accessToken,
      parentId,
      driveFileName(trimmedKey),
      mimeType || "application/octet-stream",
      size,
    )
    // Same reason as the small-file path: the browser PUT will (re)create the
    // file, so any cached id for this key must go.
    invalidateDriveFileId(refreshToken, trimmedKey)
    return { url }
  }

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
