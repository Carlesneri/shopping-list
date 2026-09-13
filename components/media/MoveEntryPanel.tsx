"use client"

import { useEffect, useRef, useState } from "react"
import {
  IconCheck,
  IconFolder,
  IconFolderPlus,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"
import { listMediaFolders } from "@/lib/actions/media"
import type { StorageEntry } from "@/lib/types"

const rowButton =
  "shrink-0 cursor-pointer rounded p-1 transition-colors disabled:cursor-wait disabled:opacity-40"

// The folder tree is walked once per storage per session and cached, so
// opening the move panel again is instant instead of re-walking the bucket.
type FolderTreeCache = { folders?: string[]; promise?: Promise<string[]> }
const folderTreeCache = new Map<string, FolderTreeCache>()

function loadFolderTree(
  mediaId: string,
  onDone: (folders: string[]) => void,
  onError: () => void,
) {
  const cached = folderTreeCache.get(mediaId)
  if (cached?.promise) {
    cached.promise.then(onDone).catch(onError)
    return
  }

  const promise = listMediaFolders(mediaId)
    .then((folders) => {
      folderTreeCache.set(mediaId, { folders })
      return folders
    })
    .catch((error) => {
      // Allow retrying on the next open.
      folderTreeCache.delete(mediaId)
      throw error
    })
  folderTreeCache.set(mediaId, { promise })
  promise.then(onDone).catch(onError)
}

function parentPrefix(key: string) {
  return key.endsWith("/")
    ? key
    : key.includes("/")
      ? key.slice(0, key.lastIndexOf("/") + 1)
      : ""
}

function DestinationRow({
  path,
  label,
  disabled,
  pending,
  busy,
  requested,
  onMove,
  onAddFolder,
}: {
  path: string
  label: string
  disabled: boolean
  /** Folder staged locally — it will only be created in storage on "Mover aquí". */
  pending: boolean
  busy: boolean
  /** This row's move is in flight. */
  requested: boolean
  onMove: (path: string) => void
  onAddFolder: (path: string, name: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  if (adding) {
    return (
      <li className="flex items-center gap-1.5">
        <IconFolder size={16} className="shrink-0 text-blue-500" />
        <span className="min-w-0 truncate text-xs text-text/50">{label}</span>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onAddFolder(path, name)
              setAdding(false)
              setName("")
            }
            if (e.key === "Escape") {
              setAdding(false)
              setName("")
            }
          }}
          placeholder="Nueva carpeta…"
          className="min-w-0 flex-1 rounded border border-black/10 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            onAddFolder(path, name)
            setAdding(false)
            setName("")
          }}
          className={`${rowButton} text-primary hover:text-primary-dark`}
          aria-label="Añadir carpeta"
        >
          <IconCheck size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false)
            setName("")
          }}
          className={`${rowButton} text-text/40 hover:text-text`}
          aria-label="Cancelar"
        >
          <IconX size={16} />
        </button>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-1.5">
      <span
        className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-xs font-medium"
        title={pending ? "Se creará al pulsar «Mover aquí»" : undefined}
      >
        <IconFolder
          size={16}
          className={`shrink-0 ${pending ? "text-blue-300" : "text-blue-500"}`}
        />
        <span className="min-w-0 truncate">
          {label}
          {pending ? " (nueva)" : ""}
        </span>
      </span>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => onMove(path)}
        title={`Mover a ${label}`}
        className="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 py-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
      >
        {requested ? <IconLoader2 size={14} className="animate-spin" /> : null}
        Mover aquí
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setAdding(true)}
        className={`${rowButton} text-blue-600 hover:text-blue-800`}
        title={`Añadir carpeta dentro de ${label}`}
        aria-label={`Añadir carpeta dentro de ${label}`}
      >
        <IconFolderPlus size={16} />
      </button>
    </li>
  )
}

export function MoveEntryPanel({
  mediaId,
  entries,
  folderOptions,
  moving,
  onMoveSelect,
}: {
  mediaId: string
  /** One or more entries to move: files, folders or a mix. */
  entries: StorageEntry[]
  /** Destination folders derived from the listing already in memory:
   * root + breadcrumb ancestors + folders in the current view. */
  folderOptions: string[]
  /** A move is currently in flight for these entries. */
  moving: boolean
  /** Called with the chosen destination and the locally-staged folders. */
  onMoveSelect: (toPrefix: string, stagedFolders: string[]) => void
}) {
  const [pending, setPending] = useState<string[]>([])
  const [treeFolders, setTreeFolders] = useState<string[]>(
    () => folderTreeCache.get(mediaId)?.folders ?? [],
  )
  const [treeLoading, setTreeLoading] = useState(
    () => !folderTreeCache.get(mediaId)?.folders,
  )
  const [requested, setRequested] = useState<string | null>(null)

  // Local options (root, ancestors, current view) are available instantly; the
  // cached deep walk of the bucket merges in more destinations. The walk only
  // happens once per storage — later opens reuse the cached tree.
  useEffect(() => {
    const cached = folderTreeCache.get(mediaId)
    if (cached?.folders) {
      setTreeFolders(cached.folders)
      setTreeLoading(false)
      return
    }
    let cancelled = false
    setTreeLoading(true)
    loadFolderTree(
      mediaId,
      (folders) => {
        if (!cancelled) setTreeFolders(folders)
      },
      () => {
        if (!cancelled) setTreeLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [mediaId])

  function addFolder(path: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const newFolder = `${path}${trimmed}/`
    if (pending.includes(newFolder)) return
    setPending((prev) => [...prev, newFolder])
  }

  // A destination is disabled when it would nest any selected folder inside
  // itself. For a single entry, its own parent is also a no-op destination.
  function isDisabled(path: string) {
    if (entries.length === 1 && path === parentPrefix(entries[0].key))
      return true
    return entries.some(
      (entry) => entry.key.endsWith("/") && path.startsWith(entry.key),
    )
  }

  function handleMove(path: string) {
    setRequested(path)
    onMoveSelect(path, pending)
  }

  const destinations = [
    ...folderOptions,
    ...treeFolders.filter(
      (p) => !folderOptions.includes(p) && !pending.includes(p),
    ),
    ...pending.filter(
      (p) => !folderOptions.includes(p) && !treeFolders.includes(p),
    ),
  ].filter((path, index, all) => all.indexOf(path) === index)

  return (
    <div className="border-t border-black/10 px-3 py-2">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text/50">
        Mover a…{entries.length > 1 ? ` (${entries.length})` : null}
        {treeLoading ? (
          <IconLoader2 size={14} className="animate-spin text-text/40" />
        ) : null}
      </p>
      <ul className="flex flex-col gap-0.5">
        {destinations.map((path) => (
          <DestinationRow
            key={path || "/"}
            path={path}
            label={path === "" ? "Raíz" : path.replace(/\/$/, "")}
            disabled={isDisabled(path)}
            pending={pending.includes(path)}
            busy={moving}
            requested={moving && requested === path}
            onMove={handleMove}
            onAddFolder={addFolder}
          />
        ))}
      </ul>
    </div>
  )
}
