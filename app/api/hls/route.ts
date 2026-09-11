import { auth } from "@/auth"
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3"
import { getMediaStorageClient } from "@/lib/actions/media"
import { getHlsPrefix } from "@/lib/hls-utils"
import ffmpegStatic from "ffmpeg-static"
import { spawn } from "node:child_process"
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Readable } from "node:stream"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

// Progressive HLS generation state
type ProgressiveState = {
  tmpDir: string
  ready: Promise<void>
  done: Promise<void>
  uploaded: Set<string>
}
const progressiveStates = new Map<string, ProgressiveState>()
const activeTmpDirs = new Map<string, string>() // lockKey -> tmpDir for direct local serve while generating
const activeProcs = new Map<string, ReturnType<typeof spawn>>() // lockKey -> ffmpeg proc for cancellation

function isSegment(name: string): boolean {
  return name.endsWith(".ts")
}

function guessHlsContentType(fileName: string): string {
  if (fileName.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (fileName.endsWith(".ts")) return "video/MP2T"
  if (fileName.endsWith(".vtt")) return "text/vtt; charset=utf-8"
  return "application/octet-stream"
}

function rewritePlaylist(
  content: string,
  id: string,
  originalKey: string,
): string {
  const lines = content.split(/\r?\n/)
  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) return line
      // Segment / key URIs – rewrite to proxied HLS API with proper encoding
      const file = trimmed.split("?")[0].split("#")[0]
      return `/api/hls?id=${encodeURIComponent(id)}&key=${encodeURIComponent(originalKey)}&file=${encodeURIComponent(file)}`
    })
    .join("\n")
}

async function deleteHlsPrefix(
  client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"],
  bucket: string,
  prefix: string,
) {
  let token: string | undefined
  const keys: string[] = []
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    )
    for (const obj of listed.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }
    token = listed.NextContinuationToken
  } while (token)

  // Delete in batches of 1000 (S3 limit)
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    )
  }
}

async function generateAndUploadHlsProgressive(
  client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"],
  bucket: string,
  originalKey: string,
  lockKey: string,
  signal?: AbortSignal,
): Promise<{ ready: Promise<void>; done: Promise<void> }> {
  if (!ffmpegStatic) throw new Error("ffmpeg not available on server")
  const tmpDir = await mkdtemp(join(tmpdir(), "hls-"))
  activeTmpDirs.set(lockKey, tmpDir)

  let s3Body: Readable | null = null
  let resolveReady!: () => void
  let rejectReady!: (e: Error) => void
  const ready = new Promise<void>((res, rej) => {
    resolveReady = res
    rejectReady = rej
  })
  let readySettled = false
  const uploaded = new Set<string>()
  let lastPlaylistSize = -1

  // Background task that spawns ffmpeg and continuously uploads
  const done = (async () => {
    let poll: NodeJS.Timeout | null = null
    let proc: ReturnType<typeof spawn> | null = null
    try {
      if (signal?.aborted) throw new Error("client aborted before HLS start")

      const s3Response = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: originalKey }),
      )
      if (!s3Response.Body) throw new Error("Objeto vacío")

      s3Body = s3Response.Body as unknown as Readable
      const input = s3Body as unknown as Readable &
        NodeJS.ReadableStream & {
          pipe: (dest: NodeJS.WritableStream) => NodeJS.WritableStream
        }

      const segmentPattern = join(tmpDir, "seg%03d.ts")
      const playlistPath = join(tmpDir, "playlist.m3u8")

      // Helper: Put with retry for R2 429 / ServiceUnavailable (concurrent same-object PUTs)
      const putWithRetry = async (
        key: string,
        body: Buffer,
        contentType: string,
        cacheControl: string,
        attempts = 4,
      ) => {
        for (let i = 0; i < attempts; i++) {
          try {
            await client.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: cacheControl,
              }),
            )
            return
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            const code = (e as { Code?: string })?.Code ?? ""
            const isThrottle =
              code === "ServiceUnavailable" ||
              msg.includes("ServiceUnavailable") ||
              msg.includes("429") ||
              msg.includes("concurrent request rate")
            if (isThrottle && i < attempts - 1) {
              const delay = 400 * 2 ** i + Math.random() * 200
              console.warn(`[hls] Put throttled for ${key} (attempt ${i + 1}/${attempts}), retrying in ${Math.round(delay)}ms`)
              await new Promise((r) => setTimeout(r, delay))
              continue
            }
            throw e
          }
        }
      }

      // Polling uploader — progressive: upload segments as they appear, re-upload playlist each time
      // Use guard to avoid overlapping iterations (previous interval still uploading)
      let isPollUploading = false
      const inFlight = new Set<string>()
      poll = setInterval(async () => {
        if (isPollUploading) return
        isPollUploading = true
        try {
          const files = await readdir(tmpDir).catch(() => [] as string[])
          // Upload new segments sequentially
          for (const f of files) {
            if (f.endsWith(".ts") && !uploaded.has(f) && !inFlight.has(f)) {
              inFlight.add(f)
              try {
                const fullPath = join(tmpDir, f)
                const st = await stat(fullPath).catch(() => null)
                if (!st || st.size === 0) {
                  inFlight.delete(f)
                  continue
                }
                const data = await readFile(fullPath)
                await putWithRetry(
                  `${getHlsPrefix(originalKey)}${f}`,
                  data,
                  guessHlsContentType(f),
                  "private, max-age=21600",
                )
                uploaded.add(f)
              } catch (e) {
                console.warn(`[hls] poll upload ts ${f} failed`, e)
              } finally {
                inFlight.delete(f)
              }
            }
          }
          // Ready as soon as local playlist + one segment exist (don't wait for R2 upload)
          if (!readySettled && files.includes("playlist.m3u8") && files.some((f) => f.endsWith(".ts"))) {
            const firstSeg = files.find((f) => f.endsWith(".ts"))
            if (firstSeg) {
              const st = await stat(join(tmpDir, firstSeg)).catch(() => null)
              const plSt = await stat(join(tmpDir, "playlist.m3u8")).catch(() => null)
              if (st && st.size > 0 && plSt && plSt.size > 0) {
                readySettled = true
                resolveReady()
              }
            }
          }
          // Always (re)upload playlist if it exists and changed — also guarded by inFlight
          if (files.includes("playlist.m3u8") && !inFlight.has("playlist.m3u8")) {
            try {
              const plPath = join(tmpDir, "playlist.m3u8")
              const st = await stat(plPath).catch(() => null)
              if (st && st.size !== lastPlaylistSize) {
                // Mark inFlight to avoid concurrent playlist PUTs from next tick
                inFlight.add("playlist.m3u8")
                try {
                  lastPlaylistSize = st.size
                  const data = await readFile(plPath)
                  await putWithRetry(
                    `${getHlsPrefix(originalKey)}playlist.m3u8`,
                    data,
                    guessHlsContentType("playlist.m3u8"),
                    "private, max-age=15",
                  )
                } finally {
                  inFlight.delete("playlist.m3u8")
                }
              }
            } catch (e) {
              inFlight.delete("playlist.m3u8")
              console.warn(`[hls] poll upload playlist failed`, e)
            }
          }
        } catch {}
        finally {
          isPollUploading = false
        }
      }, 900)

      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error("client aborted"))
          return
        }

        const args = [
          "-fflags",
          "+genpts",
          "-i",
          "pipe:0",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-hls_time",
          "4",
          "-start_number",
          "0",
          "-hls_playlist_type",
          "event",
          "-hls_flags",
          "independent_segments",
          "-hls_segment_filename",
          segmentPattern,
          playlistPath,
        ]
        proc = spawn(ffmpegStatic!, args, {
          stdio: ["pipe", "pipe", "pipe"],
        })
        activeProcs.set(lockKey, proc)

        let stderr = ""
        let settled = false
        const cleanupProc = (err?: Error) => {
          if (settled) return
          settled = true
          try {
            if (proc) proc.kill("SIGKILL")
          } catch {}
          try {
            input.destroy(err)
          } catch {}
          try {
            proc?.stdin?.destroy()
          } catch {}
          try {
            proc?.stdout?.destroy()
          } catch {}
          try {
            proc?.stderr?.destroy()
          } catch {}
        }

        const onAbort = () => {
          // Only abort if not yet ready — after ready we keep generating for cache
          if (!readySettled) {
            cleanupProc(new Error("client aborted before ready"))
            reject(new Error("client aborted"))
          } else {
            console.warn(`[hls] client aborted after ready, continuing background transcode for ${originalKey}`)
          }
        }
        signal?.addEventListener("abort", onAbort, { once: true })

        // biome-ignore lint: proc is guaranteed non-null after spawn
        proc!.stderr!.on("data", (chunk: Buffer) => {
          stderr += chunk.toString()
        })

        proc!.on("error", (err) => {
          signal?.removeEventListener("abort", onAbort)
          activeProcs.delete(lockKey)
          cleanupProc(err)
          if (!readySettled) {
            readySettled = true
            rejectReady(err)
          }
          reject(err)
        })
        // biome-ignore lint: proc is guaranteed non-null after spawn
        proc!.on("close", (code, sig) => {
          signal?.removeEventListener("abort", onAbort)
          activeProcs.delete(lockKey)
          if (sig === "SIGKILL" && !readySettled && signal?.aborted) {
            cleanupProc(new Error("aborted"))
            const err = new Error("ffmpeg aborted by client")
            if (!readySettled) {
              readySettled = true
              rejectReady(err)
            }
            reject(err)
            return
          }
          if (code === 0) {
            cleanupProc()
            resolve()
          } else {
            const err = new Error(
              `ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`,
            )
            cleanupProc(err)
            if (!readySettled) {
              readySettled = true
              rejectReady(err)
            }
            reject(err)
          }
        })

        const readable = input as unknown as NodeJS.ReadableStream
        // biome-ignore lint: proc is guaranteed non-null after spawn
        readable.pipe(proc!.stdin!)
        proc!.stdin!.on("error", () => {})
      readable.on("error", (err) => {
          cleanupProc(err)
          try {
            proc!.kill("SIGKILL")
          } catch {}
          if (!readySettled) {
            readySettled = true
            rejectReady(err)
          }
          reject(err)
        })
        if (signal?.aborted && !readySettled) {
          cleanupProc(new Error("aborted"))
          try {
            proc!.kill("SIGKILL")
          } catch {}
        }
      })

      // ffmpeg finished — do final sweep of remaining files
      if (poll) clearInterval(poll)
      poll = null
      const files = await readdir(tmpDir).catch(() => [] as string[])
      const prefix = getHlsPrefix(originalKey)
      for (const f of files) {
        if (signal?.aborted && readySettled) {
          // After ready, ignore abort for final upload — finish cache for future views
          console.warn(`[hls] ignoring abort for final upload of ${f}`)
        }
        try {
          // Re-upload playlist finally (ensure ENDLIST) and any missing segments
          if (f.endsWith(".ts") && uploaded.has(f)) continue
          const data = await readFile(join(tmpDir, f))
          await putWithRetry(
            `${prefix}${f}`,
            data,
            guessHlsContentType(f),
            f === "playlist.m3u8" ? "private, max-age=60" : "private, max-age=21600",
          )
          if (f.endsWith(".ts")) uploaded.add(f)
        } catch (e) {
          console.warn(`[hls] final upload ${f} failed`, e)
        }
      }
      if (!readySettled) {
        // Edge: very short video where poll never fired — ensure ready
        readySettled = true
        resolveReady()
      }

    } catch (e) {
      if (poll) clearInterval(poll)
      if (!readySettled) {
        readySettled = true
        rejectReady(e instanceof Error ? e : new Error(String(e)))
      }
      throw e
    } finally {
      if (poll) clearInterval(poll as unknown as NodeJS.Timeout)
      activeProcs.delete(lockKey)
      try {
        s3Body?.destroy()
      } catch {}
      // Keep tmpDir for a short while to serve local files that may not yet be on R2?
      // We keep it in activeTmpDirs until done settles, then schedule deletion after 30s
      // to allow in-flight segment requests to be served locally.
      setTimeout(() => {
        activeTmpDirs.delete(lockKey)
        rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      }, 30000)
    }
  })()

  // Safety: if ready not resolved in 90s, fail fast (ffmpeg likely errored)
  setTimeout(() => {
    if (!readySettled) {
      readySettled = true
      const err = new Error(`HLS ready timeout for ${originalKey} — no segment produced in 90s`)
      console.error(`[hls] ${err.message}`)
      rejectReady(err)
    }
  }, 90000)

  return { ready, done }
}

async function ensureHlsReady(
  client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"],
  bucket: string,
  originalKey: string,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) throw new Error("client aborted")
  const prefix = getHlsPrefix(originalKey)
  const playlistKey = `${prefix}playlist.m3u8`

  // Compare LastModified of source vs cached HLS to invalidate stale cache
  let sourceLastModified: Date | undefined
  try {
    const headSrc = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: originalKey }),
    )
    sourceLastModified = headSrc.LastModified
  } catch {
    // Ignore – will surface as 404 later
  }
  if (signal?.aborted) throw new Error("client aborted")

  let playlistHead:
    | import("@aws-sdk/client-s3").HeadObjectCommandOutput
    | undefined
  try {
    playlistHead = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: playlistKey }),
    )
  } catch (e: unknown) {
    // Treat any error as cache miss (not found / no permission / etc.) — log and regenerate
    console.warn(`[hls] playlist head miss for ${playlistKey}:`, e instanceof Error ? e.message : String(e))
    playlistHead = undefined
  }
  if (signal?.aborted) throw new Error("client aborted")

  if (playlistHead) {
    // Check if cached playlist is complete (has ENDLIST) — partial means aborted, regenerate
    let isComplete = false
    try {
      const plObj = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: playlistKey }),
      )
      const text =
        plObj.Body && typeof (plObj.Body as unknown as { transformToString?: () => Promise<string> }).transformToString === "function"
          ? await (plObj.Body as unknown as { transformToString: () => Promise<string> }).transformToString()
          : ""
      isComplete = text.includes("#EXT-X-ENDLIST")
    } catch (e) {
      console.warn(`[hls] failed to check playlist completeness for ${originalKey}`, e)
      isComplete = false
    }

    if (!isComplete) {
      console.warn(`[hls] partial/incomplete playlist for ${originalKey} (no ENDLIST), regenerating`)
      if (signal?.aborted) throw new Error("client aborted")
      await deleteHlsPrefix(client, bucket, prefix)
      // force cache miss
    } else {
      const cachedLastModified = (
        playlistHead as { LastModified?: Date }
      ).LastModified
      if (
        sourceLastModified &&
        cachedLastModified &&
        cachedLastModified >= sourceLastModified
      ) {
        return
      }
      if (!sourceLastModified) return
      // Stale – wipe and regenerate
      if (signal?.aborted) throw new Error("client aborted")
      await deleteHlsPrefix(client, bucket, prefix)
    }
  }

  const lockKey = `${bucket}:${originalKey}`
  const existing = progressiveStates.get(lockKey)
  if (existing) {
    // Progressive generation already in progress — wait only for ready (first segment), not full done
    await existing.ready
    return
  }

  const { ready, done } = await generateAndUploadHlsProgressive(
    client,
    bucket,
    originalKey,
    lockKey,
    signal,
  )
  const state: ProgressiveState = {
    tmpDir: activeTmpDirs.get(lockKey) ?? "",
    ready,
    done,
    uploaded: new Set(),
  }
  progressiveStates.set(lockKey, state)

  // Hook done to clean up map (keep ready for future callers until done finishes)
  done
    .catch((e) => console.error(`[hls] progressive done error for ${originalKey}`, e))
    .finally(() => {
      progressiveStates.delete(lockKey)
      // activeTmpDirs cleanup is handled inside generateAndUploadHlsProgressive after 30s
    })

  // For the triggering request, wait only for ready (first segment) — progressive start in ~2-5s
  await ready
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

// GET /api/hls?id=<mediaId>&key=<fileKey>&file=playlist.m3u8 (default)
// If file is a HLS artifact, it is proxied from R2 under .hls-cache/<key>/
// If playlist not yet generated, it is transcoded to HLS (ffmpeg) and uploaded to R2 first.
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response("No autenticado", { status: 401 })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  const key = url.searchParams.get("key")
  const file = url.searchParams.get("file") || "playlist.m3u8"

  if (!id) return new Response("Falta el parámetro id", { status: 400 })
  if (!key) return new Response("Falta el parámetro key", { status: 400 })
  if (key.includes("..") || file.includes("..") || file.includes("/"))
    return new Response("Clave inválida", { status: 400 })

  let client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"]
  let bucket: string
  try {
    const res = await getMediaStorageClient(id)
    client = res.client
    bucket = res.bucket
  } catch (e) {
    console.error("[hls] getMediaStorageClient failed", e)
    return new Response("No se pudo autorizar el acceso al storage", {
      status: 403,
    })
  }

  try {
    if (request.signal.aborted) throw new Error("client aborted")
    // Ensure HLS artifacts exist (generate on cache miss or stale source)
    await ensureHlsReady(client, bucket, key, request.signal)

    if (request.signal.aborted) throw new Error("client aborted")

    const hlsKey = `${getHlsPrefix(key)}${file}`
    const lockKey = `${bucket}:${key}`

    // Progressive: if generation is still active, try to serve directly from local tmpDir
    // This allows playback to start after ~4s even before R2 upload completes
    const localTmp = activeTmpDirs.get(lockKey)
    if (localTmp) {
      try {
        const localPath = join(localTmp, file)
        const st = await stat(localPath).catch(() => null)
        if (st && st.size > 0) {
          const data = await readFile(localPath)
          if (file === "playlist.m3u8") {
            const text = data.toString("utf-8")
            const rewritten = rewritePlaylist(text, id, key)
            const headers = new Headers()
            headers.set("Content-Type", "application/vnd.apple.mpegurl")
            // For progressive, playlist is still growing — don't cache
            const isStillGenerating = progressiveStates.has(lockKey)
            headers.set("Cache-Control", isStillGenerating ? "no-cache, no-store" : "private, max-age=60")
            headers.set("Access-Control-Allow-Origin", "*")
            headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
            return new Response(rewritten, { status: 200, headers })
          }
          // Segment from local
          const headers = new Headers()
          headers.set("Content-Type", guessHlsContentType(file))
          headers.set("Access-Control-Allow-Origin", "*")
          headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
          headers.set("Cache-Control", "private, max-age=21600")
          headers.set("Content-Length", String(data.byteLength))
          return new Response(data as unknown as BodyInit, { status: 200, headers })
        }
      } catch (e) {
        console.warn(`[hls] local serve miss for ${file}, falling back to R2`, e)
      }
    }

    // Fallback: proxy from R2, with Range support for segments
    const range = request.headers.get("range") ?? undefined
    const s3Response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: hlsKey,
        Range: isSegment(file) ? range : undefined,
      }),
    )

    if (!s3Response.Body) {
      return new Response("Objeto HLS vacío", { status: 404 })
    }

    // Playlist: rewrite segment URLs to go through this authenticated proxy
    if (file === "playlist.m3u8") {
      let text: string
      if (
        typeof s3Response.Body === "object" &&
        s3Response.Body !== null &&
        "transformToString" in (s3Response.Body as unknown as Record<string, unknown>)
      ) {
        text = await (
          s3Response.Body as unknown as { transformToString: () => Promise<string> }
        ).transformToString()
      } else {
        // Fallback: stream to string
        const chunks: Buffer[] = []
        const stream = s3Response.Body as unknown as Readable
        for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
          chunks.push(Buffer.from(chunk))
        }
        text = Buffer.concat(chunks).toString("utf-8")
      }
      const rewritten = rewritePlaylist(text, id, key)
      const headers = new Headers()
      headers.set("Content-Type", "application/vnd.apple.mpegurl")
      headers.set("Cache-Control", "private, max-age=60")
      headers.set("Access-Control-Allow-Origin", "*")
      headers.set(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Type",
      )
      if (s3Response.ETag) headers.set("ETag", s3Response.ETag)
      return new Response(rewritten, { status: 200, headers })
    }

    // Segments and other files: stream directly
    const body = s3ToWebStream(s3Response.Body as unknown as Readable, request.signal)
    const headers = new Headers()
    headers.set("Content-Type", guessHlsContentType(file))
    headers.set("Access-Control-Allow-Origin", "*")
    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    )
    headers.set("Cache-Control", "private, max-age=21600")
    if (s3Response.ContentRange) headers.set("Content-Range", s3Response.ContentRange)
    if (s3Response.AcceptRanges) headers.set("Accept-Ranges", s3Response.AcceptRanges)
    if (s3Response.ContentLength !== undefined)
      headers.set("Content-Length", String(s3Response.ContentLength))
    if (s3Response.ETag) headers.set("ETag", s3Response.ETag)
    if (s3Response.LastModified)
      headers.set("Last-Modified", s3Response.LastModified.toUTCString())

    const status = s3Response.ContentRange ? 206 : 200
    return new Response(body, { status, headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      request.signal.aborted ||
      message.includes("aborted") ||
      message.includes("abort")
    ) {
      console.warn(`[hls] aborted for ${id}/${key}/${file}`)
      // Client went away — ensure no ffmpeg orphan remains (already killed via signal)
      return new Response(null, { status: 499 } as unknown as ResponseInit)
    }
    console.error(`[hls] failed for ${id}/${key}/${file}`, error)
    if (message.includes("NoSuchKey") || message.includes("404") || message.includes("NotFound")) {
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
    return new Response(
      `No se pudo generar el HLS: ${message.slice(0, 500)}`,
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response("No autenticado", { status: 401 })
  }
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  const key = url.searchParams.get("key")
  if (!id || !key) return new Response("Falta id/key", { status: 400 })
  if (key.includes("..")) return new Response("Clave inválida", { status: 400 })

  let client: Awaited<ReturnType<typeof getMediaStorageClient>>["client"]
  let bucket: string
  try {
    const res = await getMediaStorageClient(id)
    client = res.client
    bucket = res.bucket
  } catch (e) {
    return new Response("No se pudo autorizar", { status: 403 })
  }

  const lockKey = `${bucket}:${key}`
  const proc = activeProcs.get(lockKey)
  const state = progressiveStates.get(lockKey)
  const tmpDir = activeTmpDirs.get(lockKey)

  // If no active generation, nothing to cancel — still clean partial cache if exists
  if (!proc && !state && !tmpDir) {
    return new Response(null, { status: 204 })
  }

  console.log(`[hls] cancel requested for ${key} (lock ${lockKey})`)

  if (proc) {
    try {
      proc.kill("SIGKILL")
    } catch {}
    activeProcs.delete(lockKey)
  }

  // Clean up tmp dir
  if (tmpDir) {
    activeTmpDirs.delete(lockKey)
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }

  // Remove progressive state
  if (state) {
    progressiveStates.delete(lockKey)
  }

  // Keep partial cache for resume — do not delete .hls-cache/ on cancel
  // Next play will resume or reuse what was already uploaded
  console.log(`[hls] cancel kept partial cache for ${key}`)

  return new Response(null, { status: 204 })
}

export async function POST(request: Request) {
  // sendBeacon fallback for unload — same as DELETE
  return DELETE(request)
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    },
  })
}
