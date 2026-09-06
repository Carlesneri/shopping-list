import { auth } from "@/auth"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getMediaStorageClient } from "@/lib/actions/media"
import ffmpegStatic from "ffmpeg-static"
import { spawn } from "node:child_process"
import { PassThrough } from "node:stream"
import type { Readable } from "node:stream"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const UNSUPPORTED_VIDEO_EXTS = new Set(["avi", "mkv", "mpg", "mpeg"])

function getExt(key: string): string {
  return key.split(".").at(-1)?.toLowerCase() ?? ""
}

function guessContentType(key: string, fallback?: string): string {
  if (fallback) return fallback
  const ext = getExt(key)
  switch (ext) {
    case "mp4":
    case "m4v":
      return "video/mp4"
    case "webm":
      return "video/webm"
    case "mov":
      return "video/quicktime"
    case "avi":
    case "mkv":
    case "mpg":
    case "mpeg":
      return "video/mp4"
    case "mp3":
      return "audio/mpeg"
    case "ogg":
      return "audio/ogg"
    case "wav":
      return "audio/wav"
    case "vtt":
      return "text/vtt; charset=utf-8"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}

function s3ToWebStream(s3Body: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      s3Body.on("data", (chunk: Buffer) =>
        controller.enqueue(new Uint8Array(chunk)),
      )
      s3Body.on("end", () => controller.close())
      s3Body.on("error", (err) => controller.error(err))
    },
    cancel() {
      s3Body.destroy()
    },
  })
}

function transcodeToMp4(inputStream: Readable): ReadableStream {
  const output = new PassThrough()

  const proc = spawn(ffmpegStatic!, [
    "-i", "pipe:0",
    "-c:v", "libx264",
    "-c:a", "aac",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+faststart",
    "-preset", "ultrafast",
    "-threads", "0",
    "pipe:1",
  ])

  inputStream.pipe(proc.stdin)
  proc.stdout.pipe(output)

  proc.on("error", (err) => {
    console.error("[transcode] ffmpeg error:", err.message)
    output.destroy(err)
  })

  proc.stdin.on("error", () => {})

  return s3ToWebStream(output)
}

/** On-demand transcode proxy for R2 objects.
 *  Query params: id (storage connection), key (file key in R2).
 *  For natively-supported formats serves the raw file.
 *  For unsupported formats (avi, mkv, etc.) transcodes to fMP4 via ffmpeg. */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response("No autenticado", { status: 401 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  const key = url.searchParams.get("key")

  if (!id) {
    return new Response("Falta el parámetro id", { status: 400 })
  }
  if (!key) {
    return new Response("Falta el parámetro key", { status: 400 })
  }
  if (key.includes("..")) {
    return new Response("Clave inválida", { status: 400 })
  }

  let client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"]
  let bucket: string
  try {
    const res = await getMediaStorageClient(id)
    client = res.client
    bucket = res.bucket
  } catch (e) {
    console.error("[transcode] getMediaStorageClient failed", e)
    return new Response("No se pudo autorizar el acceso al storage", {
      status: 403,
    })
  }

  const ext = getExt(key)
  const needsTranscode = UNSUPPORTED_VIDEO_EXTS.has(ext)

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(needsTranscode
        ? {}
        : { Range: request.headers.get("range") ?? undefined }),
    })

    const s3Response = await client.send(command)

    if (!s3Response.Body) {
      return new Response("Objeto vacío", { status: 404 })
    }

    let body: ReadableStream
    let status = 200
    const headers = new Headers()

    if (needsTranscode) {
      body = transcodeToMp4(s3Response.Body as unknown as Readable)
      headers.set("Content-Type", "video/mp4")
    } else {
      body = s3ToWebStream(s3Response.Body as unknown as Readable)
      const contentType = guessContentType(key, s3Response.ContentType)
      headers.set("Content-Type", contentType)
      if (s3Response.ContentRange) {
        headers.set("Content-Range", s3Response.ContentRange)
        status = 206
      }
      if (s3Response.AcceptRanges) {
        headers.set("Accept-Ranges", s3Response.AcceptRanges)
      }
      if (s3Response.ContentLength !== undefined) {
        headers.set("Content-Length", String(s3Response.ContentLength))
      }
    }

    headers.set("Access-Control-Allow-Origin", "*")
    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    )
    headers.set("Cache-Control", "private, max-age=21600")
    if (!getExt(key).endsWith("vtt")) {
      headers.set(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(key.split("/").at(-1) ?? key)}`,
      )
    }
    if (s3Response.ETag) {
      headers.set("ETag", s3Response.ETag)
    }
    if (s3Response.LastModified) {
      headers.set("Last-Modified", s3Response.LastModified.toUTCString())
    }

    return new Response(body, { status, headers })
  } catch (error) {
    console.error(`[transcode] failed for ${id}/${key}`, error)
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("NoSuchKey") || message.includes("404")) {
      return new Response("Archivo no encontrado", { status: 404 })
    }
    if (
      message.includes("TimeoutError") ||
      message.includes("timeout") ||
      message.includes("NetworkingError")
    ) {
      return new Response(
        "Timeout al conectar con el storage. Verifica tu conexión o la configuración del bucket.",
        { status: 504 },
      )
    }
    if (message.includes("AccessDenied") || message.includes("403")) {
      return new Response(
        "Acceso denegado al storage. Verifica las credenciales o la configuración de IP.",
        { status: 403 },
      )
    }
    return new Response("No se pudo obtener el archivo", { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Accept-Ranges",
    },
  })
}
