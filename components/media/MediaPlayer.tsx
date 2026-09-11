"use client"

import { useEffect, useState } from "react"
import { IconAlertTriangle, IconLoader2, IconX } from "@tabler/icons-react"
import Hls from "hls.js"
import type { MediaKind } from "@/lib/types"

export interface SubtitleOption {
  label: string
  src: string
}

interface Props {
  src: string
  title: string
  kind: MediaKind
  subtitles: SubtitleOption[]
  onClose: () => void
}

export function MediaPlayer({ src, title, kind, subtitles, onClose }: Props) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [subtitleSrc, setSubtitleSrc] = useState<string | null>(
    subtitles[0]?.src ?? null,
  )
  const [hasError, setHasError] = useState(false)
  const [hlsReady, setHlsReady] = useState(false)
  const isHls = src.includes("/api/hls") || src.endsWith(".m3u8")
  const useHlsJs = isHls && Hls.isSupported()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // HLS.js attachment for VOD seekable playback (fixes growing timeline)
  useEffect(() => {
    setHlsReady(false)
    setHasError(false)
  }, [src])

  useEffect(() => {
    if (!videoEl || kind !== "video" || !isHls || hasError) return
    const canPlay = videoEl.canPlayType("application/vnd.apple.mpegurl")
    const supported = Hls.isSupported()

    // Prefer hls.js when supported (handles auth via xhrSetup), fallback to native
    if (supported) {
      // use hls.js
    } else if (canPlay) {
      const onReady = () => setHlsReady(true)
      const onError = () => setHasError(true)
      videoEl.addEventListener("canplay", onReady, { once: true })
      videoEl.addEventListener("loadedmetadata", onReady, { once: true })
      videoEl.addEventListener("error", onError, { once: true })
      if (videoEl.readyState >= 1) setHlsReady(true)
      videoEl.play().catch(() => {})
      return () => {
        videoEl.removeEventListener("canplay", onReady)
        videoEl.removeEventListener("loadedmetadata", onReady)
        videoEl.removeEventListener("error", onError)
      }
    } else {
      setHasError(true)
      return
    }
    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      // Progressive event playlist should start at 0, not live edge
      startPosition: 0,
      liveSyncDurationCount: 1,
      liveMaxLatencyDurationCount: 2,
      // Authenticated HLS endpoint requires cookies (same-origin)
      xhrSetup: (xhr) => {
        xhr.withCredentials = true
      },
    })
    hls.attachMedia(videoEl)
    hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src))
    if (hls.media) hls.loadSource(src)

    const onManifest = (_: unknown, data: { levels?: unknown[] }) => {
      setHlsReady(true)
      // Force start at 0 for event (live) playlists
      try {
        hls.startLoad(0)
        if (videoEl.currentTime > 1) videoEl.currentTime = 0
      } catch {}
      videoEl.play().catch(() => {})
    }
    const onLevel = () => setHlsReady(true)
    hls.on(Hls.Events.MANIFEST_PARSED, onManifest)
    hls.on(Hls.Events.LEVEL_LOADED, onLevel)
    const readyTimeout = setTimeout(() => setHlsReady(true), 8000)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
          setTimeout(() => {
            if (!videoEl.readyState) setHasError(true)
          }, 10000)
        } else {
          hls.destroy()
          setHasError(true)
        }
      }
    })
    return () => {
      clearTimeout(readyTimeout)
      hls.destroy()
      hls.off(Hls.Events.MANIFEST_PARSED, onManifest)
      hls.off(Hls.Events.LEVEL_LOADED, onLevel)
    }
  }, [videoEl, src, kind, isHls, hasError])

  useEffect(() => {
    if (!videoEl) return

    for (const track of Array.from(videoEl.textTracks)) {
      track.mode = "disabled"
    }
    videoEl.querySelectorAll("track").forEach((track) => {
      track.remove()
    })
    if (!subtitleSrc) return

    const track = document.createElement("track")
    track.kind = "subtitles"
    track.src = subtitleSrc
    track.default = true
    videoEl.appendChild(track)

    const onAddTrack = (event: Event) => {
      const added = (event as TrackEvent).track
      if (added) added.mode = "showing"
    }
    videoEl.textTracks.addEventListener("addtrack", onAddTrack)
    return () => videoEl.textTracks.removeEventListener("addtrack", onAddTrack)
  }, [videoEl, subtitleSrc])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
            {title}
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
          <div className="flex max-h-[75vh] items-center justify-center bg-black p-2">
            {/* biome-ignore lint/a11y/useAltText: title is rendered in the modal header */}
            <img
              src={src}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />
          </div>
        ) : kind === "audio" ? (
          <div className="flex items-center justify-center gap-4 bg-black px-4 py-8">
            {/* biome-ignore lint/a11y/useMediaCaption: audio has no caption tracks */}
            <audio src={src} controls autoPlay className="w-full" />
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 py-10 text-center">
            <IconAlertTriangle size={32} className="text-amber-400" />
            <p className="text-sm font-medium text-white">
              No se pudo reproducir el vídeo en el navegador
            </p>
            <p className="max-w-md text-xs text-white/60">
              Usa los botones "Abrir en VLC", "Playlist" o "Descargar" del
              listado para reproducirlo en un reproductor externo.
            </p>
          </div>
        ) : (
          <div className="aspect-video w-full relative bg-black">
            {/* native <video> without crossOrigin to avoid CORS blocking on R2 presigned URLs.
                Tracks are injected via videoEl and work without CORS when crossOrigin is absent. */}
            {isHls && useHlsJs ? (
              // biome-ignore lint/a11y/useMediaCaption: captions are injected dynamically via track elements
              <video
                ref={setVideoEl}
                controls
                playsInline
                className="h-full w-full"
                onError={() => setHasError(true)}
              />
            ) : (
              // biome-ignore lint/a11y/useMediaCaption: captions are injected dynamically via track elements
              <video
                ref={setVideoEl}
                src={src}
                controls
                playsInline
                className="h-full w-full"
                onError={() => setHasError(true)}
                onCanPlay={() => isHls && setHlsReady(true)}
              />
            )}
            {isHls && !hasError && !hlsReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                <IconLoader2 size={28} className="animate-spin text-white/80" />
                <p className="text-xs text-white/70">Cargando vídeo HLS…</p>
              </div>
            ) : null}
          </div>
        )}
        {kind === "video" && !hasError && subtitles.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="text-xs text-white/60">Subtítulos</span>
            <button
              type="button"
              onClick={() => setSubtitleSrc(null)}
              className={`cursor-pointer rounded-full px-2 py-0.5 text-xs transition-colors ${
                subtitleSrc === null
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Off
            </button>
            {subtitles.map((subtitle) => (
              <button
                key={subtitle.src}
                type="button"
                onClick={() => setSubtitleSrc(subtitle.src)}
                className={`cursor-pointer rounded-full px-2 py-0.5 text-xs uppercase transition-colors ${
                  subtitleSrc === subtitle.src
                    ? "bg-white text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {subtitle.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
