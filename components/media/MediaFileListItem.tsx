"use client"

import {
  IconFile,
  IconFolder,
  IconLoader2,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react"
import type { MediaKind, StorageEntry } from "@/lib/types"
import { ActionButtons } from "./ActionButtons"
import { MoveEntryPanel } from "./MoveEntryPanel"

const MEDIA_TYPE_LABELS: Record<MediaKind, string> = {
  video: "Video",
  image: "Imagen",
  audio: "Audio",
}

const MEGABYTE = 1024 ** 2
const GIGABYTE = 1024 ** 3

// One decimal for MB/GB ("1.5 MB"), plain integer for bytes below a KB.
const sizeNumberFormatter = new Intl.NumberFormat("es", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function formatSize(bytes: number) {
  if (bytes >= GIGABYTE)
    return `${sizeNumberFormatter.format(bytes / GIGABYTE)} GB`
  if (bytes >= MEGABYTE)
    return `${sizeNumberFormatter.format(bytes / MEGABYTE)} MB`
  if (bytes >= 1024) return `${sizeNumberFormatter.format(bytes / 1024)} KB`
  return `${bytes} B`
}

function formatDate(date: Date) {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function EntryIcon({ entry }: { entry: StorageEntry }) {
  if (entry.type === "folder") {
    return <IconFolder size={20} className="shrink-0 text-blue-500" />
  }
  switch (entry.mediaKind) {
    case "video":
      return <IconVideo size={20} className="shrink-0 text-blue-600" />
    case "image":
      return <IconPhoto size={20} className="shrink-0 text-emerald-600" />
    case "audio":
      return <IconMusic size={20} className="shrink-0 text-amber-600" />
    default:
      return <IconFile size={20} className="shrink-0 text-text/70" />
  }
}

interface MediaFileListItemProps {
  mediaId: string
  entry: StorageEntry
  isSelected: boolean
  onToggleSelect: () => void
  /** An action (play/download/copy/move/delete) is running on this entry. */
  loading?: boolean
  isAdmin: boolean
  /** Placeholder row for a file that is currently being uploaded. */
  uploading?: boolean
  /** Whether this item's move panel is open (only one open at a time). */
  moveOpen?: boolean
  onMoveToggle?: () => void
  /** Destination folders for the move panel (root + ancestors + current view). */
  moveDestinations?: string[]
  /** A move of this entry is in flight. */
  moving?: boolean
  onMoveSelect?: (toPrefix: string, stagedFolders: string[]) => void
  onPlay: () => void
  onDownload: () => void
  onCopyUrl: () => void
  onDelete: () => void
  onFolderClick?: () => void
}

export function MediaFileListItem({
  mediaId,
  entry,
  isSelected,
  onToggleSelect,
  loading = false,
  isAdmin,
  uploading = false,
  moveOpen = false,
  onMoveToggle,
  moveDestinations = [],
  moving = false,
  onMoveSelect,
  onPlay,
  onDownload,
  onCopyUrl,
  onDelete,
  onFolderClick,
}: MediaFileListItemProps) {
  const isFile = entry.type === "file"
  const busy = uploading || moving

  return (
    <li
      className={`rounded-xl squircle border border-black/10 bg-white text-sm ${
        busy ? "pointer-events-none opacity-60" : ""
      }`}
      aria-disabled={busy || undefined}
    >
      <div className="flex flex-col gap-1 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <EntryIcon entry={entry} />
          {uploading ? (
            <span className="min-w-0 flex-1 truncate text-base font-medium text-start">
              {entry.name}
            </span>
          ) : isFile ? (
            <button
              type="button"
              onClick={onToggleSelect}
              className="min-w-0 flex-1 cursor-pointer truncate text-base font-medium text-start"
              aria-expanded={isSelected}
            >
              {entry.name}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFolderClick}
              className="min-w-0 flex-1 cursor-pointer truncate text-base font-medium text-start text-blue-600 hover:text-blue-800 hover:underline"
            >
              {entry.name}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isFile && entry.size !== undefined ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-xs text-text/50">
                {formatSize(entry.size)}
              </span>
              {fileExtension(entry.name) ? (
                <span className="shrink-0 rounded border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-xs text-text/50 uppercase">
                  {fileExtension(entry.name)}
                </span>
              ) : null}
            </div>
          ) : null}
          {uploading ? (
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-text/50">
              <IconLoader2 size={16} className="animate-spin" />
              Subiendo…
            </span>
          ) : (
            <ActionButtons
              entryName={entry.name}
              mediaKind={entry.mediaKind}
              isFile={isFile}
              isAdmin={isAdmin}
              loading={loading}
              onPlay={onPlay}
              onMoveToggle={() => onMoveToggle?.()}
              onDownload={onDownload}
              onCopyUrl={onCopyUrl}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
      {isFile && isSelected ? (
        <div className="border-t border-black/10 px-3 py-2">
          <dl className="flex flex-col gap-1">
            <div className="flex justify-between gap-3">
              <dt className="text-text/50">Tipo</dt>
              <dd className="truncate font-medium">
                {entry.mediaKind
                  ? MEDIA_TYPE_LABELS[entry.mediaKind]
                  : "Archivo"}
              </dd>
            </div>
            {entry.size !== undefined ? (
              <div className="flex justify-between gap-3">
                <dt className="text-text/50">Tamaño</dt>
                <dd className="font-medium">{formatSize(entry.size)}</dd>
              </div>
            ) : null}
            {entry.lastModified ? (
              <div className="flex justify-between gap-3">
                <dt className="text-text/50">Modificado</dt>
                <dd className="font-medium">
                  {formatDate(entry.lastModified)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-text/50">Ruta</dt>
              <dd className="break-all font-mono text-xs">{entry.key}</dd>
            </div>
          </dl>
        </div>
      ) : null}
      {isAdmin && moveOpen ? (
        <MoveEntryPanel
          mediaId={mediaId}
          entries={[entry]}
          folderOptions={moveDestinations}
          moving={moving}
          onMoveSelect={(toPrefix, stagedFolders) =>
            onMoveSelect?.(toPrefix, stagedFolders)
          }
        />
      ) : null}
    </li>
  )
}
