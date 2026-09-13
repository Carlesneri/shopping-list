"use client"

import { useState } from "react"
import type { StorageEntry } from "@/lib/types"
import { MediaFileList } from "./MediaFileList"
import { CreateFolderButton, NewFolderForm } from "./CreateFolderButton"
import { UploadButton } from "./UploadButton"

interface Props {
  mediaId: string
  isAdmin: boolean
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
  isAdmin,
  entries: initialEntries,
  initialError,
}: Props) {
  const [currentPath, setCurrentPath] = useState("")
  const [folderFormOpen, setFolderFormOpen] = useState(false)
  const [uploadingEntries, setUploadingEntries] = useState<StorageEntry[]>([])

  function handleUploadStart(entry: StorageEntry) {
    setUploadingEntries((prev) => [...prev, entry])
  }

  function handleUploadEnd(key: string) {
    setUploadingEntries((prev) => prev.filter((e) => e.key !== key))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text/60">
          Archivos y carpetas
        </h2>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <CreateFolderButton onClick={() => setFolderFormOpen((v) => !v)} />
            <UploadButton
              mediaId={mediaId}
              prefix={currentPath}
              onUploadStart={handleUploadStart}
              onUploadEnd={handleUploadEnd}
            />
          </div>
        ) : null}
      </div>
      {isAdmin && folderFormOpen ? (
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
        initialError={initialError}
        currentPath={currentPath}
        onPathChange={setCurrentPath}
        uploadingEntries={uploadingEntries}
      />
    </div>
  )
}
