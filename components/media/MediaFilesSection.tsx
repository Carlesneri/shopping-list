"use client"

import { useRef, useState } from "react"
import type { StorageProvider, StorageEntry } from "@/lib/types"
import { MediaFileList } from "./MediaFileList"
import { CreateFolderButton, NewFolderForm } from "./CreateFolderButton"
import { UploadButton } from "./UploadButton"

interface Props {
  mediaId: string
  provider: StorageProvider
  isAdmin: boolean
  isOwner: boolean
  entries: StorageEntry[]
  initialError?: string | null
}

/**
 * Header (title + admin actions) and file list for a media storage. Owns the
 * current folder path so uploads and folder creation are prefixed with the
 * folder being browsed.
 */
export function MediaFilesSection({
  mediaId,
  provider,
  isAdmin,
  isOwner,
  entries: initialEntries,
  initialError,
}: Props) {
  const canUpload = isAdmin
  const canCreateFolder = isAdmin && provider === "cloudflare-r2"
  const [currentPath, setCurrentPath] = useState("")
  const [folderFormOpen, setFolderFormOpen] = useState(false)
  const [uploadingEntries, setUploadingEntries] = useState<StorageEntry[]>([])
  // Set by MediaFileList: inserts a committed upload into the list locally.
  const commitRef = useRef<(entry: StorageEntry) => void>(() => {})

  function handleUploadStart(entry: StorageEntry) {
    setUploadingEntries((prev) => [...prev, entry])
  }

  function handleUploadEnd(key: string, entry?: StorageEntry) {
    setUploadingEntries((prev) => prev.filter((e) => e.key !== key))
    if (entry) commitRef.current(entry)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text/60">
          Archivos y carpetas
        </h2>
        {canUpload || canCreateFolder ? (
          <div className="flex items-center gap-2">
            {canCreateFolder ? (
              <CreateFolderButton
                onClick={() => setFolderFormOpen((v) => !v)}
              />
            ) : null}
            {canUpload ? (
              <UploadButton
                mediaId={mediaId}
                prefix={currentPath}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {canCreateFolder && folderFormOpen ? (
        <NewFolderForm
          mediaId={mediaId}
          prefix={currentPath}
          onDone={() => setFolderFormOpen(false)}
        />
      ) : null}
      <MediaFileList
        mediaId={mediaId}
        entries={initialEntries}
        isAdmin={isAdmin}
        isOwner={isOwner}
        provider={provider}
        initialError={initialError}
        currentPath={currentPath}
        onPathChange={setCurrentPath}
        uploadingEntries={uploadingEntries}
        onCommitReady={(commit) => {
          commitRef.current = commit
        }}
      />
    </div>
  )
}
