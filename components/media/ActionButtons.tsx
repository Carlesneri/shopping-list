"use client"

import {
  IconDownload,
  IconFolderUp,
  IconHeadphones,
  IconLink,
  IconMaximize,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react"
import type { MediaKind } from "@/lib/types"

interface Props {
  entryName: string
  mediaKind?: MediaKind
  isFile: boolean
  isAdmin: boolean
  loading?: boolean
  onPlay: () => void
  onMoveToggle: () => void
  onDownload: () => void
  onCopyUrl: () => void
  onDelete: () => void
}

export function ActionButtons({
  entryName,
  mediaKind,
  isFile,
  isAdmin,
  loading = false,
  onPlay,
  onMoveToggle,
  onDownload,
  onCopyUrl,
  onDelete,
}: Props) {
  const isBusy = loading
  const btn =
    "shrink-0 cursor-pointer rounded-md p-1.5 transition-colors disabled:cursor-wait text-primary hover:text-primary-dark disabled:text-primary/40"

  return (
    <div className="ml-auto flex items-center">
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
          {mediaKind === "image" ? (
            <IconMaximize size={20} color="currentColor" />
          ) : mediaKind === "audio" ? (
            <IconHeadphones size={20} color="currentColor" />
          ) : (
            <IconPlayerPlay size={20} fill="currentColor" />
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
          <IconDownload size={20} color="currentColor" />
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
          <IconLink size={20} />
        </button>
      ) : null}
      {isAdmin ? (
        <button
          type="button"
          onClick={onMoveToggle}
          disabled={isBusy}
          className={btn}
          title="Mover a otra carpeta"
          aria-label={`Mover ${entryName}`}
        >
          <IconFolderUp size={20} />
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
          <IconTrash size={20} />
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
          <IconTrash size={20} />
        </button>
      ) : null}
    </div>
  )
}
