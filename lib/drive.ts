import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { detectMediaKind } from "@/lib/media-utils"
import type { StorageEntry } from "@/lib/types"

const DRIVE_API = "https://www.googleapis.com/drive/v3"
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const FOLDER_MIME = "application/vnd.google-apps.folder"
const GOOGLE_APP_MIME_PREFIX = "application/vnd.google-apps."
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive"
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly"
const FILE_ID_TTL_MS = 10 * 60 * 1000

export const DRIVE_CALLBACK_PATH = "/media/drive/callback"

export const DRIVE_NOT_CONNECTED_MESSAGE =
  "Este storage de Google Drive aún no está conectado. Conéctalo desde los ajustes."

function assertCanListExistingFiles(scope: string | undefined) {
  if (!scope) return
  const granted = scope.split(/\s+/)
  if (granted.includes(DRIVE_SCOPE) || granted.includes(DRIVE_READONLY_SCOPE)) {
    return
  }
  throw new Error(
    "Esta conexión solo ve los archivos creados por la app. Reconecta Google Drive desde los ajustes para ver también los que ya tenías.",
  )
}

function googleClient() {
  const clientId = process.env.AUTH_GOOGLE_ID
  const clientSecret = process.env.AUTH_GOOGLE_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      "Falta la configuración de Google OAuth (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)",
    )
  }
  return { clientId, clientSecret }
}

const accessTokenCache = new Map<string, { token: string; expiresAt: number }>()

function secretCacheKey(secret: string) {
  return createHash("sha256").update(secret).digest("base64url")
}

/** Exchanges a refresh token for a fresh access token. Tokens are cached until
 * shortly before expiry so playback Range requests don't hit Google OAuth. */
export async function refreshDriveAccessToken(refreshToken: string) {
  const cacheKey = secretCacheKey(refreshToken)
  const cached = accessTokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.token

  const { clientId, clientSecret } = googleClient()

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    accessTokenCache.delete(cacheKey)
    const body = await response.text()
    if (body.includes("invalid_grant")) {
      throw new Error(
        "La conexión con Google Drive ha expirado o fue revocada. Reconecta desde los ajustes del storage.",
      )
    }
    throw new Error("No se pudo renovar el acceso a Google Drive")
  }

  const data = (await response.json()) as {
    access_token?: string
    expires_in?: number
    scope?: string
  }
  if (!data.access_token) {
    throw new Error("Respuesta inesperada de Google OAuth")
  }
  assertCanListExistingFiles(data.scope)

  const expiresIn = Number(data.expires_in)
  const ttlSeconds =
    Number.isFinite(expiresIn) && expiresIn > 90 ? expiresIn - 60 : 3000
  accessTokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
  return data.access_token
}

/** Exchanges an authorization code for tokens. `redirectUri` must be the exact
 * URI sent in the consent request. */
export async function exchangeDriveAuthCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = googleClient()

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    console.error("[drive:oauth] token exchange failed", response.status)
    throw new Error("No se pudo completar la conexión con Google")
  }

  return (await response.json()) as { refresh_token?: string }
}

/** Builds the Google consent URL for the Drive scope (offline access so we
 * get a refresh token we can store). */
export function buildDriveConsentUrl(redirectUri: string, state: string) {
  const { clientId } = googleClient()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

function getStateSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET no está configurada")
  return secret
}

function signStatePayload(payload: string) {
  return createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url")
}

/** Signed, time-limited state parameter carrying the storage being connected
 * and the exact redirect URI used in the consent request. */
export function createDriveState(
  mediaId: string,
  email: string,
  redirectUri: string,
) {
  const payload = Buffer.from(
    JSON.stringify({ mediaId, email, redirectUri, ts: Date.now() }),
    "utf8",
  ).toString("base64url")
  return `${payload}.${signStatePayload(payload)}`
}

export function verifyDriveState(state: string) {
  const dot = state.lastIndexOf(".")
  if (dot <= 0) return null
  const payload = state.slice(0, dot)
  const signature = state.slice(dot + 1)

  const expected = signStatePayload(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  let parsed: {
    mediaId?: string
    email?: string
    redirectUri?: string
    ts?: number
  }
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }
  if (
    !parsed.mediaId ||
    !parsed.email ||
    !parsed.redirectUri ||
    typeof parsed.ts !== "number"
  ) {
    return null
  }
  // 10 minutes to complete the consent flow.
  if (Date.now() - parsed.ts > 10 * 60 * 1000) return null
  if (!isAllowedRedirectUri(parsed.redirectUri)) return null

  return {
    mediaId: parsed.mediaId,
    email: parsed.email,
    redirectUri: parsed.redirectUri,
  }
}

function isAllowedRedirectUri(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false
  if (url.username || url.password || url.search || url.hash) return false
  return url.pathname === DRIVE_CALLBACK_PATH
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

interface DriveFile {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  modifiedTime?: string
}

class DriveListError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function driveListError(status: number, body: string) {
  console.error(`[drive:list] ${status}`, body.slice(0, 500))
  const lower = body.toLowerCase()
  if (
    lower.includes("accessnotconfigured") ||
    lower.includes("has not been used") ||
    lower.includes("is disabled")
  ) {
    return new DriveListError(
      "Activa la API de Google Drive en el proyecto de Google Cloud y vuelve a intentarlo.",
      status,
    )
  }
  if (status === 401) {
    return new DriveListError(DRIVE_NOT_CONNECTED_MESSAGE, status)
  }
  if (status === 403) {
    return new DriveListError(
      "Google Drive rechazó el acceso. Reconecta la cuenta desde los ajustes.",
      status,
    )
  }
  return new DriveListError(
    "No se pudo cargar el contenido de Google Drive",
    status,
  )
}

async function driveFilesListOnce(
  accessToken: string,
  query: string,
  sharedDrives: boolean,
): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
      pageSize: "200",
      supportsAllDrives: "true",
    })
    // includeItemsFromAllDrives without corpora=allDrives is a 400 from Google.
    if (sharedDrives) {
      params.set("includeItemsFromAllDrives", "true")
      params.set("corpora", "allDrives")
    }
    if (pageToken) params.set("pageToken", pageToken)

    const response = await fetch(`${DRIVE_API}/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      throw driveListError(response.status, await response.text())
    }

    const data = (await response.json()) as {
      files?: DriveFile[]
      nextPageToken?: string
    }
    files.push(...(data.files ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return files
}

async function driveFilesList(
  accessToken: string,
  query: string,
): Promise<DriveFile[]> {
  try {
    return await driveFilesListOnce(accessToken, query, true)
  } catch (error) {
    // drive.file cannot search all drives; fall back to the user's own files.
    if (
      error instanceof DriveListError &&
      (error.status === 400 || error.status === 403)
    ) {
      return await driveFilesListOnce(accessToken, query, false)
    }
    throw error
  }
}

/** Resolves a path of folder names ("a/b") to a Drive folder id. Returns null
 * when any segment does not exist (same behavior as listing an unknown S3
 * prefix: an empty result, not an error). */
async function resolveDriveFolderId(
  accessToken: string,
  segments: string[],
): Promise<string | null> {
  let parentId = "root"
  for (const segment of segments) {
    const matches = await driveFilesList(
      accessToken,
      `name = '${escapeDriveQuery(segment)}' and mimeType = '${FOLDER_MIME}' and '${parentId}' in parents and trashed = false`,
    )
    const match = matches[0]
    if (!match?.id) return null
    parentId = match.id
  }
  return parentId
}

/** Lists one folder's contents, mapped to the provider-neutral StorageEntry
 * shape. `prefix` is a "/"-separated path ending in "/" ("" for the root). */
export async function listDriveEntries(
  accessToken: string,
  prefix = "",
): Promise<StorageEntry[]> {
  const segments = prefix.split("/").filter(Boolean)
  const folderId = await resolveDriveFolderId(accessToken, segments)
  if (!folderId) return []

  const files = await driveFilesList(
    accessToken,
    `'${folderId}' in parents and trashed = false`,
  )

  const entries: StorageEntry[] = []
  for (const file of files) {
    if (!file.id || !file.name) continue
    const isFolder = file.mimeType === FOLDER_MIME
    // Docs/Sheets/etc. have no media bytes, and non-media files are not shown.
    if (
      !isFolder &&
      (!detectMediaKind(`${prefix}${file.name}`) ||
        isNativeGoogleFile(file.mimeType))
    )
      continue
    const key = isFolder ? `${prefix}${file.name}/` : `${prefix}${file.name}`
    entries.push({
      key,
      name: file.name,
      type: isFolder ? "folder" : "file",
      ...(isFolder
        ? {}
        : {
            mediaKind: detectMediaKind(key),
            size: file.size ? Number(file.size) : undefined,
            lastModified: file.modifiedTime
              ? new Date(file.modifiedTime)
              : undefined,
          }),
    })
  }

  return entries.sort((left, right) => {
    if (left.type !== right.type) return left.type === "folder" ? -1 : 1
    return left.name.localeCompare(right.name)
  })
}

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]+$/
const fileIdCache = new Map<string, { id: string; expiresAt: number }>()

function isNativeGoogleFile(mimeType: string | undefined) {
  return (
    !!mimeType?.startsWith(GOOGLE_APP_MIME_PREFIX) && mimeType !== FOLDER_MIME
  )
}

function fileIdCacheKey(cacheScope: string, key: string) {
  return `${secretCacheKey(cacheScope)}:${key}`
}

/** Resolves a full file key ("videos/clip.mp4") to its Drive file id.
 * `cacheScope` (the refresh token) keeps the id across Range requests. */
export async function resolveDriveFileId(
  accessToken: string,
  key: string,
  cacheScope?: string,
): Promise<string> {
  const cachedKey = cacheScope ? fileIdCacheKey(cacheScope, key) : ""
  if (cachedKey) {
    const hit = fileIdCache.get(cachedKey)
    if (hit && hit.expiresAt > Date.now()) return hit.id
  }

  const segments = key.split("/").filter(Boolean)
  if (segments.length === 0) throw new Error("Clave de archivo inválida")

  const name = segments.at(-1)
  if (!name) throw new Error("Clave de archivo inválida")
  const parentId = await resolveDriveFolderId(
    accessToken,
    segments.slice(0, -1),
  )
  if (!parentId) throw new Error("Archivo no encontrado en Google Drive")

  const matches = await driveFilesList(
    accessToken,
    `name = '${escapeDriveQuery(name)}' and '${parentId}' in parents and trashed = false`,
  )
  const match = matches.find(
    (file) =>
      file.id &&
      DRIVE_ID_PATTERN.test(file.id) &&
      file.mimeType !== FOLDER_MIME &&
      !isNativeGoogleFile(file.mimeType),
  )
  if (!match?.id) {
    throw new Error("Archivo no encontrado en Google Drive")
  }
  if (cachedKey) {
    fileIdCache.set(cachedKey, {
      id: match.id,
      expiresAt: Date.now() + FILE_ID_TTL_MS,
    })
  }
  return match.id
}

/** Drops the cached file id for a key. Call after re-uploading or deleting a
 * file so the next fetch resolves the current file instead of 404-ing on a
 * stale id. */
export function invalidateDriveFileId(cacheScope: string, key: string) {
  fileIdCache.delete(fileIdCacheKey(cacheScope, key))
}

/** Streams a Drive file's contents. Pass the incoming Range header through so
 * video playback can seek. No timeout: the response body streams for as long
 * as the media plays. */
export async function fetchDriveFile(
  accessToken: string,
  fileId: string,
  range?: string,
): Promise<Response> {
  const params = new URLSearchParams({
    alt: "media",
    supportsAllDrives: "true",
  })
  return fetch(`${DRIVE_API}/files/${fileId}?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(range ? { Range: range } : {}),
    },
  })
}

function driveProxyError(upstream: Response, body: string): Response {
  console.error(`[drive:proxy] upstream ${upstream.status}`, body.slice(0, 500))
  const message =
    upstream.status === 401
      ? DRIVE_NOT_CONNECTED_MESSAGE
      : upstream.status === 403
        ? "Google Drive rechazó el acceso a este archivo. Reconecta la cuenta desde los ajustes."
        : upstream.status === 404
          ? "El archivo ya no está disponible en Google Drive"
          : "No se pudo obtener el archivo de Google Drive"
  // Forward auth errors so the caller can react; the rest stay a 502.
  const status = [401, 403, 404].includes(upstream.status)
    ? upstream.status
    : 502
  return new Response(message, { status })
}

const PROXY_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "etag",
  "last-modified",
  "accept-ranges",
] as const

/** Copies a Drive media response into a same-origin response the player can
 * seek. Drops upstream auth and caches nothing in shared proxies. Upstream
 * failures are mapped to a friendly message with the real status logged. */
export async function driveProxyResponse(
  upstream: Response,
  downloadName?: string,
): Promise<Response> {
  if (!upstream.ok) {
    return driveProxyError(upstream, await upstream.text())
  }

  const headers = new Headers()
  for (const name of PROXY_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes")
  headers.set("cache-control", "private, no-store")
  if (downloadName) {
    const fallback =
      downloadName.replace(/[^\w.-]+/g, "_").slice(0, 180) || "download"
    headers.set(
      "content-disposition",
      `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  })
}

/** Resolves a folder prefix to a parent id for uploads. Root is `"root"`. */
export async function resolveDriveUploadParent(
  accessToken: string,
  prefix: string,
) {
  const folderId = await resolveDriveFolderId(
    accessToken,
    prefix.split("/").filter(Boolean),
  )
  if (!folderId) throw new Error("Carpeta no encontrada en Google Drive")
  return folderId
}

async function assertDriveUpload(response: Response, action: string) {
  if (response.ok) return
  console.error(
    `[drive:${action}] ${response.status}`,
    (await response.text()).slice(0, 500),
  )
  throw new Error("No se pudo subir el archivo a Google Drive")
}

/** Multipart upload for small files. The body is sent with the metadata. */
export async function uploadDriveFile(
  accessToken: string,
  parentId: string,
  name: string,
  mimeType: string,
  body: Uint8Array,
) {
  const boundary = `drive-${randomBytes(16).toString("hex")}`
  const metadata = JSON.stringify({ name, parents: [parentId] })
  const preamble = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  )
  const ending = new TextEncoder().encode(`\r\n--${boundary}--`)
  const payload = new Uint8Array(preamble.length + body.length + ending.length)
  payload.set(preamble, 0)
  payload.set(body, preamble.length)
  payload.set(ending, preamble.length + body.length)

  const params = new URLSearchParams({
    uploadType: "multipart",
    supportsAllDrives: "true",
    fields: "id",
  })
  const response = await fetch(`${DRIVE_UPLOAD_API}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: payload,
    signal: AbortSignal.timeout(60_000),
  })
  await assertDriveUpload(response, "upload")
}

/** Starts a resumable session. The returned URL accepts a credential-free PUT,
 * same role as an R2 presigned upload URL. */
export async function startDriveResumableUpload(
  accessToken: string,
  parentId: string,
  name: string,
  mimeType: string,
  size: number,
) {
  const params = new URLSearchParams({
    uploadType: "resumable",
    supportsAllDrives: "true",
  })
  const response = await fetch(`${DRIVE_UPLOAD_API}?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify({ name, parents: [parentId] }),
    signal: AbortSignal.timeout(15_000),
  })
  await assertDriveUpload(response, "upload-session")
  const location = response.headers.get("location")
  if (!location) throw new Error("Google no devolvió la URL de subida")
  return location
}

async function driveTrash(accessToken: string, fileId: string, action: string) {
  const params = new URLSearchParams({ supportsAllDrives: "true" })
  const response = await fetch(`${DRIVE_API}/files/${fileId}?${params}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  })
  // Already gone counts as deleted (same as deleting an unknown S3 key).
  if (response.ok || response.status === 404) return
  console.error(
    `[drive:${action}] ${response.status}`,
    (await response.text()).slice(0, 500),
  )
  throw new Error(
    action === "delete-folder"
      ? "No se pudo eliminar la carpeta de Google Drive"
      : "No se pudo eliminar el archivo de Google Drive",
  )
}

/** Deletes a media file in Drive, resolving its key ("videos/clip.mp4") to the
 * file id first. */
export async function deleteDriveFile(accessToken: string, key: string) {
  const fileId = await resolveDriveFileId(accessToken, key)
  await driveTrash(accessToken, fileId, "delete-file")
}

/** Deletes an empty Drive folder ("videos/"). Refuses when the folder still
 * has children of any type (mirroring the R2 empty-folder rule — a Google Doc
 * inside counts as content even though it is not listed). A folder that does
 * not exist is a no-op, like listing an unknown prefix. */
export async function deleteDriveFolder(accessToken: string, prefix: string) {
  const folderId = await resolveDriveFolderId(
    accessToken,
    prefix.split("/").filter(Boolean),
  )
  if (!folderId) return

  const children = await driveFilesList(
    accessToken,
    `'${folderId}' in parents and trashed = false`,
  )
  if (children.length > 0) {
    throw new Error(
      "La carpeta no está vacía: elimina su contenido antes de borrarla",
    )
  }

  await driveTrash(accessToken, folderId, "delete-folder")
}
