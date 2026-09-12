"use client"

import { createElement, useEffect, useState } from "react"
import { IconLoader2, IconX } from "@tabler/icons-react"
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

// Loaded from public/movi-player (copied by scripts/copy-movi-player.mjs on
// predev/prebuild) so Turbopack never bundles the large WASM-based bundle.
const PLAYER_SCRIPT = "/movi-player/movi-player.js"
const PLAYER_WASM = "/movi-player/movi.wasm"

let playerScriptLoaded = false

export function MediaPlayer({ src, title, kind, subtitles, onClose }: Props) {
  const [playerLoaded, setPlayerLoaded] = useState(false)

  useEffect(() => {
    if (kind === "image") return
    if (playerScriptLoaded) {
      setPlayerLoaded(true)
      return
    }
    let active = true
    const onLoad = () => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${PLAYER_SCRIPT}"]`,
      )
      if (existing) existing.dataset.loaded = "1"
      playerScriptLoaded = true
      if (active) setPlayerLoaded(true)
    }
    const onError = () => {
      // Remove a failed attempt so the next play tries again
      const el = document.querySelector<HTMLScriptElement>(
        `script[src="${PLAYER_SCRIPT}"]`,
      )
      el?.remove()
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PLAYER_SCRIPT}"]`,
    )
    if (existing) {
      if (existing.dataset.loaded === "1") {
        playerScriptLoaded = true
        setPlayerLoaded(true)
      } else {
        existing.addEventListener("load", onLoad)
        existing.addEventListener("error", onError)
      }
      return
    }
    const script = document.createElement("script")
    script.type = "module"
    script.src = PLAYER_SCRIPT
    script.addEventListener("load", onLoad)
    script.addEventListener("error", onError)
    document.head.appendChild(script)
    return () => {
      active = false
      script.removeEventListener("load", onLoad)
      script.removeEventListener("error", onError)
    }
  }, [kind])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const tracks = subtitles.map((subtitle, i) =>
    createElement("track", {
      key: subtitle.src,
      kind: "subtitles",
      src: subtitle.src,
      label: subtitle.label,
      default: i === 0,
    }),
  )

  const player = createElement(
    "movi-player",
    {
      src,
      controls: true,
      playsinline: true,
      theme: "dark",
      fallback: "native",
      wasmurl: PLAYER_WASM,
      style:
        kind === "video"
          ? { width: "100%", height: "100%" }
          : { width: "100%" },
    },
    ...tracks,
  )

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
        ) : !playerLoaded ? (
          <div className="flex aspect-video items-center justify-center gap-3 bg-black">
            <IconLoader2 size={28} className="animate-spin text-white/80" />
            <p className="text-xs text-white/70">Cargando reproductor…</p>
          </div>
        ) : kind === "audio" ? (
          <div className="flex items-center justify-center bg-black px-4 py-8">
            {player}
          </div>
        ) : (
          <div className="relative aspect-video w-full bg-black">{player}</div>
        )}
      </div>
    </div>
  )
}
