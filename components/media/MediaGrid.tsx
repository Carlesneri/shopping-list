"use client"

import { useFirestoreCollection } from "@/lib/hooks/useFirestoreCollection"
import type { MediaStorage } from "@/lib/types"
import { Loader } from "@/components/ui/Loader"
import { MediaCard } from "./MediaCard"

export function MediaGrid({
  userEmail,
  onCreateClick,
}: {
  userEmail: string
  onCreateClick?: () => void
}) {
  const { items: storages, loading } = useFirestoreCollection<MediaStorage>(
    "media",
    userEmail,
  )

  if (loading) {
    return <Loader className="py-8" />
  }

  if (storages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-text/60">Aún no tienes ningún storage.</p>
        {onCreateClick && (
          <button
            type="button"
            onClick={onCreateClick}
            className="font-bold text-blue underline underline-offset-4 hover:text-blue/80"
          >
            Añade tu primer storage
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {storages.map((storage) => (
        <MediaCard key={storage.id} media={storage} />
      ))}
    </div>
  )
}
