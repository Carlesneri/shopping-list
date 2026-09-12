import type { NextRequest } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getMediaStorageClient } from "@/lib/actions/media"
import type { Readable } from "node:stream"

function guessMediaContentType(fileName: string): string {
  const ext = fileName.split(".").at(-1)?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    m3u8: "application/vnd.apple.mpegurl",
    ts: "video/MP2T",
    vtt: "text/vtt; charset=utf-8",
    srt: "application/x-subrip",
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
    opus: "audio/opus",
    wma: "audio/x-ms-wma",
  }
  return map[ext] ?? "application/octet-stream"
}

function s3ToWebStream(s3Body: Readable, signal?: AbortSignal): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const onData = (chunk: Buffer) =>
        controller.enqueue(new Uint8Array(chunk))
      const onEnd = () => controller.close()
      const onError = (err: Error) => controller.error(err)

      s3Body.on("data", onData)
      s3Body.on("end", onEnd)
      s3Body.on("error", onError)

      signal?.addEventListener(
        "abort",
        () => {
          s3Body.destroy(new Error("client aborted"))
          controller.error(new Error("client aborted"))
        },
        { once: true },
      )
    },
    cancel(reason) {
      s3Body.destroy(new Error(String(reason ?? "client cancelled")))
    },
  })
}

// GET /api/media-file?id=<mediaId>&key=<fileKey>
// Same-origin streaming proxy for in-browser playback (movi-player) with Range
// support. Auth via session cookie — avoids R2 CORS entirely.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? ""
  const key = request.nextUrl.searchParams.get("key") ?? ""

  if (!id || !key || key.includes("..") || key.trim() !== key) {
    return new Response("Parámetros inválidos", { status: 400 })
  }

  let client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"]
  let bucket: string
  try {
    const res = await getMediaStorageClient(id)
    client = res.client
    bucket = res.bucket
  } catch {
    return new Response("No autorizado", { status: 401 })
  }

  const range = request.headers.get("range") ?? undefined

  try {
    const s3Response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }),
    )
    if (!s3Response.Body) {
      return new Response("Objeto vacío", { status: 404 })
    }

    const body = s3ToWebStream(
      s3Response.Body as unknown as Readable,
      request.signal,
    )
    const headers = new Headers()
    headers.set(
      "Content-Type",
      guessMediaContentType(key.split("/").at(-1) ?? key),
    )
    headers.set("Accept-Ranges", "bytes")
    headers.set("Cache-Control", "private, max-age=3600")
    if (s3Response.ContentRange)
      headers.set("Content-Range", s3Response.ContentRange)
    if (s3Response.ContentLength !== undefined)
      headers.set("Content-Length", String(s3Response.ContentLength))
    if (s3Response.ETag) headers.set("ETag", s3Response.ETag)

    const status = s3Response.ContentRange ? 206 : 200
    return new Response(body, { status, headers })
  } catch (error) {
    console.error("[media-file] failed", error)
    return new Response("Error al reproducir el archivo", { status: 500 })
  }
}
