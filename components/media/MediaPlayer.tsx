"use client"

import { useEffect, useState } from "react"
import ReactPlayer from "react-player"
import { IconAlertTriangle, IconX } from "@tabler/icons-react"
import type { MediaKind } from "@/lib/types"
import { isVideoNativelyUnsupported } from "@/lib/media-utils"

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
  const isUnsupportedVideo =
    kind === "video" && isVideoNativelyUnsupported(title)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

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
        ) : isUnsupportedVideo || hasError ? (
          <div className="flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 py-10 text-center">
            <IconAlertTriangle size={32} className="text-amber-400" />
            <p className="text-sm font-medium text-white">
              {isUnsupportedVideo
                ? `El formato ${title.split(".").pop()?.toUpperCase()} no se puede reproducir directamente en el navegador`
                : "No se pudo reproducir el vídeo en el navegador"}
            </p>
            <p className="max-w-md text-xs text-white/60">
              Este formato no es compatible con la reproducción HTML5. Usa los
              botones “Abrir en VLC”, “Playlist” o “Descargar” del listado para
              reproducirlo en un reproductor externo.
            </p>
          </div>
        ) : (
          <div className="aspect-video w-full">
            <ReactPlayer
              ref={setVideoEl}
              src={src}
              crossOrigin="anonymous"
              controls
              playing
              width="100%"
              height="100%"
              onError={() => setHasError(true)}
            />
          </div>
        )}
        {kind === "video" && !isUnsupportedVideo && !hasError && subtitles.length > 0 ? (
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
