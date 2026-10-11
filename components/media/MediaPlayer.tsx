"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { getMediaEntryUrl } from "@/lib/actions/media"
import type { MediaKind } from "@/lib/types"

// Remembered playback positions: keyed by a stable media id (the presigned
// URL changes on every open, so it can't be the key).
const POSITION_PREFIX = "movi-pos:"
// Positions below this are considered "never really started".
const MIN_RESUME_SECONDS = 3

function readSavedPosition(key?: string): number {
  if (!key || typeof window === "undefined") return 0
  try {
    const raw = window.localStorage.getItem(POSITION_PREFIX + key)
    const seconds = raw ? Number.parseFloat(raw) : 0
    return Number.isFinite(seconds) && seconds >= MIN_RESUME_SECONDS
      ? seconds
      : 0
  } catch {
    return 0
  }
}

function corsRuleSnippet(): string {
  // The bucket must allow the exact origin the app is served from, since
  // presigned URLs already gate access to the files.
  const origin = window.location.origin
  return `[
  {
    "allowedOrigins": ["${origin}"],
    "allowedMethods": ["GET"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]`
}

export interface SubtitleOption {
  label: string
  src: string
}

/** Images of the current folder, so the image view can browse prev/next. */
export interface PlayerGallery {
  mediaId: string
  images: { key: string; name: string }[]
  index: number
}

interface Props {
  src: string
  title: string
  kind: MediaKind
  /** Stable identifier (e.g. `${mediaId}:${entryKey}`) used to remember the playback position. */
  storageKey?: string
  gallery?: PlayerGallery
  onClose: () => void
}

interface GalleryNav {
  index: number
  src: string
  title: string
  loading: boolean
}

export function MediaPlayer({
  src,
  title,
  kind,
  storageKey,
  gallery,
  onClose,
}: Props) {
  const [playerReady, setPlayerReady] = useState(false)
  const [corsBlocked, setCorsBlocked] = useState(false)
  // Images pop in only after the full file is fetched; until then the modal
  // would be an empty black box, so track the load explicitly.
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">(
    "loading",
  )
  // Gallery navigation (images only): the URL of each neighbor is resolved on
  // demand so no other image is fetched until the user moves to it.
  const [nav, setNav] = useState<GalleryNav | null>(() =>
    gallery ? { index: gallery.index, src, title, loading: false } : null,
  )
  const displaySrc = nav ? nav.src : src
  const displayTitle = nav ? nav.title : title
  // Reopening the player with a different file must not show the old image:
  // reset the load state when the source changes (React's render-time reset).
  const [imageSrc, setImageSrc] = useState(displaySrc)
  if (imageSrc !== displaySrc) {
    setImageSrc(displaySrc)
    setImageState("loading")
  }
  const playerRef = useRef<HTMLElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  const savedSeconds = useMemo(
    () => readSavedPosition(storageKey),
    [storageKey],
  )
  const lastTimeRef = useRef(0)
  const endedRef = useRef(false)
  const lastSaveAtRef = useRef(0)

  // Persist the last known position (called on pause, throttled on
  // timeupdate, and once when the player closes).
  const savePosition = useCallback(() => {
    if (!storageKey || endedRef.current) return
    const seconds = lastTimeRef.current
    if (seconds < MIN_RESUME_SECONDS) return
    try {
      window.localStorage.setItem(
        POSITION_PREFIX + storageKey,
        String(Math.floor(seconds)),
      )
    } catch {
      // Storage unavailable (private mode, quota) — position just isn't kept.
    }
  }, [storageKey])

  // Save when the player closes.
  useEffect(() => {
    return () => savePosition()
  }, [savePosition])

  useEffect(() => {
    let cancelled = false
    const player = playerRef.current
    if (!player) return
    player.addEventListener(
      "canplay",
      () => {
        if (!cancelled) setPlayerReady(true)
      },
      { once: true },
    )
    player.addEventListener("errordisplay", (event) => {
      if (cancelled) return
      // Reveal the player so its own error screen is visible for non-CORS
      // failures instead of an endless spinner.
      setPlayerReady(true)
      const detail = (
        event as CustomEvent<{ title?: string; message?: string }>
      ).detail
      if (
        /cors|failed to fetch/i.test(
          `${detail?.title ?? ""} ${detail?.message ?? ""}`,
        )
      ) {
        setCorsBlocked(true)
      }
    })

    // Load the player from the static copy in /public (kept in sync by
    // scripts/copy-movi-player.mjs). Importing the package directly makes the
    // bundler inline movi.wasm into a JS chunk, which corrupts the production
    // build with a syntax error.
    if (!customElements.get("movi-player")) {
      const script = document.createElement("script")
      script.type = "module"
      script.src = "/movi-player/movi-player.js"
      document.head.append(script)
    }

    return () => {
      cancelled = true
    }
  }, [])

  const canNavigate = !!gallery && gallery.images.length > 1

  const navigate = useCallback(
    async (delta: number) => {
      if (!gallery || !nav || nav.loading) return
      const count = gallery.images.length
      const index = (nav.index + delta + count) % count
      const target = gallery.images[index]
      // Keep the current image visible (dimmed) while the URL is resolved.
      setNav({ index, src: nav.src, title: target.name, loading: true })
      try {
        const url = await getMediaEntryUrl(gallery.mediaId, target.key)
        setNav((prev) =>
          prev && prev.index === index
            ? { ...prev, src: url, loading: false }
            : prev,
        )
      } catch (error) {
        console.error("[media:gallery] failed to load image", error)
        toast.error("No se pudo cargar la imagen")
        setNav((prev) =>
          prev && prev.index === index ? { ...prev, loading: false } : prev,
        )
      }
    },
    [gallery, nav],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
      if (!canNavigate) return
      if (event.key === "ArrowLeft") void navigate(-1)
      if (event.key === "ArrowRight") void navigate(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, canNavigate, navigate])

  // Track the movi-player position: update the ref on every timeupdate,
  // persist on pause (and throttled while playing), clear on end.
  useEffect(() => {
    if (kind !== "video" || !storageKey) return
    const player = playerRef.current
    if (!player) return
    const currentTime = () =>
      (player as unknown as { currentTime?: number }).currentTime ?? 0

    function onTimeUpdate() {
      lastTimeRef.current = currentTime()
      if (Date.now() - lastSaveAtRef.current > 5000) {
        lastSaveAtRef.current = Date.now()
        savePosition()
      }
    }
    function onPause() {
      lastTimeRef.current = currentTime()
      savePosition()
    }
    function onEnded() {
      endedRef.current = true
      try {
        window.localStorage.removeItem(POSITION_PREFIX + storageKey)
      } catch {
        // Ignore storage failures — worst case the video resumes near the end.
      }
    }

    player.addEventListener("timeupdate", onTimeUpdate)
    player.addEventListener("pause", onPause)
    player.addEventListener("ended", onEnded)
    // movi-player bug: after seeking, audio stays silent (stale/suspended
    // AudioContext) until the user mutes and unmutes. Toggling the element's
    // `muted` property drives the same recovery path automatically. Skipped
    // when the user has the player muted, since nothing is audible then.
    const onSeeked = () => {
      const el = player as unknown as { muted?: boolean }
      if (el.muted) return
      el.muted = true
      queueMicrotask(() => {
        el.muted = false
      })
    }
    player.addEventListener("seeked", onSeeked)
    return () => {
      player.removeEventListener("timeupdate", onTimeUpdate)
      player.removeEventListener("pause", onPause)
      player.removeEventListener("ended", onEnded)
      player.removeEventListener("seeked", onSeeked)
    }
  }, [kind, storageKey, savePosition])

  // Same tracking for the plain <audio> element.
  useEffect(() => {
    if (kind !== "audio" || !storageKey) return
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      lastTimeRef.current = audio.currentTime
      if (Date.now() - lastSaveAtRef.current > 5000) {
        lastSaveAtRef.current = Date.now()
        savePosition()
      }
    }
    const onPause = () => {
      lastTimeRef.current = audio.currentTime
      savePosition()
    }
    const onEnded = () => {
      endedRef.current = true
      try {
        window.localStorage.removeItem(POSITION_PREFIX + storageKey)
      } catch {
        // Ignore storage failures.
      }
    }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
    }
  }, [kind, storageKey, savePosition])

  useEffect(() => {
    if (kind !== "video") return

    // On touch devices, rotate to landscape → fullscreen, back to portrait → exit.
    const landscape = window.matchMedia(
      "(orientation: landscape) and (pointer: coarse)",
    )
    const container = () => videoContainerRef.current

    function onChange(event: MediaQueryListEvent) {
      if (event.matches) {
        container()
          ?.requestFullscreen()
          .catch(() => {})
      } else if (document.fullscreenElement === container()) {
        document.exitFullscreen().catch(() => {})
      }
    }

    landscape.addEventListener("change", onChange)
    return () => {
      landscape.removeEventListener("change", onChange)
      if (document.fullscreenElement === container()) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [kind])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose()
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border-2 border-black/20 bg-black">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium text-white">
            {displayTitle}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer text-white/70 transition-colors hover:text-white"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
        {kind === "image" ? (
          <div className="relative flex max-h-[75vh] min-h-48 items-center justify-center bg-black p-2">
            {imageState !== "ready" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {imageState === "loading" ? (
                  <>
                    <IconLoader2
                      size={36}
                      className="animate-spin text-white/60"
                      aria-label="Cargando"
                    />
                    <span className="sr-only">Cargando imagen</span>
                  </>
                ) : (
                  <>
                    <IconAlertCircle size={28} className="text-amber-400" />
                    <p className="text-sm text-white/70">
                      No se pudo cargar la imagen
                    </p>
                  </>
                )}
              </div>
            ) : null}
            {/* biome-ignore lint/a11y/useAltText: title is rendered in the modal header */}
            {/* biome-ignore lint/performance/noImgElement: presigned R2 image, next/image can't fetch cross-origin */}
            <img
              src={displaySrc}
              onLoad={() => setImageState("ready")}
              onError={() => setImageState("error")}
              className={`max-h-[75vh] w-auto max-w-full object-contain transition-opacity ${
                imageState === "ready" ? "opacity-100" : "opacity-0"
              }`}
            />
            {canNavigate && gallery ? (
              <>
                {nav?.loading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                    <IconLoader2
                      size={36}
                      className="animate-spin text-white/60"
                      aria-label="Cargando"
                    />
                  </div>
                ) : null}
                <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white/80">
                  {nav ? nav.index + 1 : gallery.index + 1} /{" "}
                  {gallery.images.length}
                </span>
                <button
                  type="button"
                  onClick={() => void navigate(-1)}
                  disabled={Boolean(nav?.loading)}
                  title="Imagen anterior (←)"
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/60 p-2 text-white/80 transition-colors hover:bg-black/80 hover:text-white disabled:cursor-wait disabled:opacity-50"
                >
                  <IconChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => void navigate(1)}
                  disabled={Boolean(nav?.loading)}
                  title="Imagen siguiente (→)"
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/60 p-2 text-white/80 transition-colors hover:bg-black/80 hover:text-white disabled:cursor-wait disabled:opacity-50"
                >
                  <IconChevronRight size={22} />
                </button>
              </>
            ) : null}
          </div>
        ) : kind === "audio" ? (
          <div className="flex items-center justify-center bg-black px-4 py-8">
            <audio
              ref={audioRef}
              src={src}
              controls
              autoPlay
              onLoadedMetadata={(event) => {
                if (savedSeconds > 0) {
                  event.currentTarget.currentTime = savedSeconds
                }
              }}
              className="w-full"
            />
          </div>
        ) : (
          <div
            ref={videoContainerRef}
            className="relative aspect-video max-h-[calc(100svh-5.5rem)] w-full bg-black [&:fullscreen]:aspect-auto [&:fullscreen]:h-full"
          >
            <movi-player
              ref={playerRef}
              src={src}
              controls
              autoplay
              playsinline
              // Resume from the last saved position, if any.
              startat={
                savedSeconds > 0 ? String(Math.floor(savedSeconds)) : undefined
              }
              class={`h-full w-full ${playerReady ? "" : "opacity-0"}`}
            ></movi-player>
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <IconLoader2
                  size={36}
                  className="animate-spin text-white/60"
                  aria-label="Cargando"
                />
              </div>
            )}
            {corsBlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-auto bg-black p-4 text-center">
                <IconAlertCircle size={28} className="text-amber-400" />
                <p className="text-sm font-bold text-white">
                  El navegador bloqueó el vídeo por CORS
                </p>
                <p className="max-w-md text-xs leading-relaxed text-white/70">
                  Añade esta regla CORS a tu bucket de Cloudflare R2 (Settings →
                  CORS policy) para permitir la lectura de archivos:
                </p>
                <pre className="max-w-full overflow-x-auto rounded-lg border border-white/20 bg-white/10 p-3 text-left font-mono text-[11px] leading-relaxed text-white">
                  {corsRuleSnippet()}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(corsRuleSnippet())
                      .then(() => toast.success("Regla CORS copiada"))
                      .catch(() => toast.error("No se pudo copiar"))
                  }}
                  className="cursor-pointer rounded-full border border-white/30 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
                >
                  Copiar regla
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
