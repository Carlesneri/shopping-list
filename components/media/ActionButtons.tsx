"use client"

import {
  IconDownload,
  IconExternalLink,
  IconHeadphones,
  IconLink,
  IconLoader2,
  IconMaximize,
  IconPlayerPlay,
  IconPlaylist,
} from "@tabler/icons-react"
import type { MediaKind } from "@/lib/types"

export type ActionKind = "play" | "vlc" | "m3u" | "download" | "copy"

interface ActionLoading {
  key: string
  action: ActionKind
}

interface Props {
  entryKey: string
  entryName: string
  mediaKind?: MediaKind
  isMkv: boolean
  isFile: boolean
  loading: ActionLoading | null
  onPlay: () => void
  onVlc: () => void
  onPlaylist: () => void
  onDownload: () => void
  onCopyUrl: () => void
}

export function ActionButtons({
  entryKey,
  entryName,
  mediaKind,
  isMkv,
  isFile,
  loading,
  onPlay,
  onVlc,
  onPlaylist,
  onDownload,
  onCopyUrl,
}: Props) {
  const loadingKind = loading?.key === entryKey ? loading.action : null

  const isBusy = loading !== null
  const btn =
    "shrink-0 cursor-pointer rounded-md p-1.5 text-blue-400 transition-colors hover:text-blue-600 disabled:cursor-wait disabled:text-blue-400/40"

  return (
    <div className="ml-auto flex items-center gap-2">
      {mediaKind && !(mediaKind === "video" && isMkv) ? (
        <button
          type="button"
          onClick={onPlay}
          disabled={isBusy}
          className={btn}
          title={
            mediaKind === "image"
              ? "Ver imagen en pantalla completa"
              : mediaKind === "audio"
                ? "Reproducir audio"
                : "Reproducir vídeo en el navegador"
          }
          aria-label={
            mediaKind === "image"
              ? `Ver ${entryName}`
              : `Reproducir ${entryName}`
          }
        >
          {loadingKind === "play" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : mediaKind === "image" ? (
            <IconMaximize size={20} />
          ) : mediaKind === "audio" ? (
            <IconHeadphones size={20} />
          ) : (
            <IconPlayerPlay size={20} fill="currentColor" />
          )}
        </button>
      ) : null}
      {mediaKind === "video" ? (
        <button
          type="button"
          onClick={onVlc}
          disabled={isBusy}
          className={btn}
          title="Abrir vídeo en VLC (reproduce MKV con subtítulos y audio)"
          aria-label={`Abrir ${entryName} en VLC`}
        >
          {loadingKind === "vlc" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconExternalLink size={20} />
          )}
        </button>
      ) : null}
      {mediaKind === "video" ? (
        <button
          type="button"
          onClick={onPlaylist}
          disabled={isBusy}
          className={btn}
          title="Descargar playlist .m3u para abrir en VLC"
          aria-label={`Descargar playlist de ${entryName}`}
        >
          {loadingKind === "m3u" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconPlaylist size={20} />
          )}
        </button>
      ) : null}
      {mediaKind ? (
        <button
          type="button"
          onClick={onDownload}
          disabled={isBusy}
          className={btn}
          title="Descargar archivo al dispositivo"
          aria-label={`Descargar ${entryName}`}
        >
          {loadingKind === "download" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconDownload size={20} />
          )}
        </button>
      ) : null}
      {isFile ? (
        <button
          type="button"
          onClick={onCopyUrl}
          disabled={isBusy}
          className={btn}
          title="Copiar URL de descarga al portapapeles"
          aria-label={`Copiar URL de ${entryName}`}
        >
          {loadingKind === "copy" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconLink size={20} />
          )}
        </button>
      ) : null}
    </div>
  )
}
