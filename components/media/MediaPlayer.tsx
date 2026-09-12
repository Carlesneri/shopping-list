"use client"

import { useEffect, useRef, useState } from "react"
import { IconAlertCircle, IconLoader2, IconX } from "@tabler/icons-react"
import { toast } from "sonner"
import type { MediaKind } from "@/lib/types"

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

interface Props {
  src: string
  title: string
  kind: MediaKind
  onClose: () => void
}

export function MediaPlayer({ src, title, kind, onClose }: Props) {
  const [playerReady, setPlayerReady] = useState(false)
  const [corsBlocked, setCorsBlocked] = useState(false)
  const playerRef = useRef<HTMLElement>(null)

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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

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
            {/* biome-ignore lint/performance/noImgElement: presigned R2 image, next/image can't fetch cross-origin */}
            <img
              src={src}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />
          </div>
        ) : kind === "audio" ? (
          <div className="flex items-center justify-center bg-black px-4 py-8">
            <audio src={src} controls className="w-full" />
          </div>
        ) : (
          <div className="relative aspect-video w-full bg-black">
            <movi-player
              ref={playerRef}
              src={src}
              controls
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
                  Añade esta regla CORS a tu bucket de Cloudflare R2 (Settings
                  → CORS policy) para permitir la lectura de archivos:
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
