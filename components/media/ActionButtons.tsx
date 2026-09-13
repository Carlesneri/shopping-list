"use client"

import {
  IconDownload,
  IconExternalLink,
  IconHeadphones,
  IconLink,
  IconLoader2,
  IconMaximize,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react"
import type { MediaKind } from "@/lib/types"

export type ActionKind = "play" | "vlc" | "download" | "copy" | "delete"

interface ActionLoading {
  key: string
  action: ActionKind
}

interface Props {
  entryKey: string
  entryName: string
  mediaKind?: MediaKind
  isFile: boolean
  isAdmin: boolean
  loading: ActionLoading | null
  onPlay: () => void
  onVlc: () => void
  onDownload: () => void
  onCopyUrl: () => void
  onDelete: () => void
}

export function ActionButtons({
  entryKey,
  entryName,
  mediaKind,
  isFile,
  isAdmin,
  loading,
  onPlay,
  onVlc,
  onDownload,
  onCopyUrl,
  onDelete,
}: Props) {
  const loadingKind = loading?.key === entryKey ? loading.action : null
  const isBusy = loadingKind !== null
  const btn = "shrink-0 cursor-pointer rounded-md p-1.5 transition-colors disabled:cursor-wait text-primary hover:text-primary/80 disabled:text-primary/40"

  return (
    <div className="ml-auto flex items-center gap-2">
      {mediaKind ? (
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
            <IconMaximize size={20} color="currentColor" />
          ) : mediaKind === "audio" ? (
            <IconHeadphones size={20} color="currentColor" />
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
            <IconExternalLink size={20} color="currentColor" />
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
            <IconDownload size={20} color="currentColor" />
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
      {isFile && isAdmin ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          className="shrink-0 cursor-pointer rounded-md p-1.5 text-red-400 transition-colors hover:text-red-600 disabled:cursor-wait disabled:text-red-400/40"
          title="Eliminar archivo del storage"
          aria-label={`Eliminar ${entryName}`}
        >
          {loadingKind === "delete" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconTrash size={20} />
          )}
        </button>
      ) : null}
      {!isFile && isAdmin ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          className="shrink-0 cursor-pointer rounded-md p-1.5 text-red-400 transition-colors hover:text-red-600 disabled:cursor-wait disabled:text-red-400/40"
          title="Eliminar carpeta y todo su contenido"
          aria-label={`Eliminar ${entryName}`}
        >
          {loadingKind === "delete" ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconTrash size={20} />
          )}
        </button>
      ) : null}
    </div>
  )
}
