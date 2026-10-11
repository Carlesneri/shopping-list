import { auth } from "@/auth"
import { requireMember } from "@/lib/auth-helpers"
import { decryptSecret } from "@/lib/crypto"
import {
  DRIVE_NOT_CONNECTED_MESSAGE,
  driveProxyResponse,
  fetchDriveFile,
  refreshDriveAccessToken,
  resolveDriveFileId,
} from "@/lib/drive"
import type { DriveConfig, StorageProvider } from "@/lib/types"

interface Params {
  params: Promise<{ id: string }>
}

function isFileKey(key: string) {
  return (
    !!key &&
    !key.endsWith("/") &&
    !key.split("/").some((segment) => segment === "." || segment === "..")
  )
}

function readRange(request: Request) {
  const range = request.headers.get("range")
  if (!range || !/^bytes=\d*-\d*$/.test(range)) return undefined
  return range
}

function statusFor(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (
    message === DRIVE_NOT_CONNECTED_MESSAGE ||
    message.includes("Reconecta")
  ) {
    return 409
  }
  if (message.includes("no encontrado")) return 404
  return 502
}

/**
 * Authenticated streaming proxy for Google Drive files. Drive has no presigned
 * URLs and the player fetches with Range, so this has to be a route — a server
 * action cannot be a seekable media URL. The caller's session must be a member.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params

  const session = await auth()
  const email = session?.user?.email
  if (!email) {
    return new Response("No autenticado", { status: 401 })
  }

  let data: Record<string, unknown>
  try {
    data = (await requireMember("media", id, email)).data
  } catch {
    return new Response("Sin permisos para acceder a este storage", {
      status: 403,
    })
  }

  if (
    ((data.provider as StorageProvider | undefined) ?? "cloudflare-r2") !==
    "google-drive"
  ) {
    return new Response("Operación no soportada", { status: 400 })
  }

  const url = new URL(request.url)
  const key = (url.searchParams.get("key") ?? "").trim()
  if (!isFileKey(key)) {
    return new Response("Clave de archivo inválida", { status: 400 })
  }

  const config = (data.config as Partial<DriveConfig> | undefined) ?? {}
  if (!config.refreshTokenEnc) {
    return new Response(DRIVE_NOT_CONNECTED_MESSAGE, { status: 409 })
  }

  try {
    const refreshToken = decryptSecret(config.refreshTokenEnc)
    const accessToken = await refreshDriveAccessToken(refreshToken)
    const fileId = await resolveDriveFileId(accessToken, key, refreshToken)
    const upstream = await fetchDriveFile(
      accessToken,
      fileId,
      readRange(request),
    )
    const downloadName = url.searchParams.has("dl")
      ? (key.split("/").at(-1) ?? key)
      : undefined
    return await driveProxyResponse(upstream, downloadName)
  } catch (error) {
    console.error(`[drive:proxy] failed for ${id}/${key}`, error)
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener el archivo de Google Drive"
    return new Response(message, { status: statusFor(error) })
  }
}
