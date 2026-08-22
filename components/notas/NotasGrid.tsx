"use client"

import Link from "next/link"
import { useFirestoreCollection } from "@/lib/hooks/useFirestoreCollection"
import type { Nota } from "@/lib/types"
import { Loader } from "@/components/ui/Loader"
import { NotaCard } from "./NotaCard"

export function NotasGrid({
  userEmail,
  onCreateClick,
}: {
  userEmail: string
  onCreateClick?: () => void
}) {
  const { items: notas, loading } = useFirestoreCollection<Nota>(
    "notas",
    userEmail,
  )

  if (loading) {
    return <Loader className="py-8" />
  }

  if (notas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-text/60">Aún no tienes ninguna nota.</p>
        {onCreateClick ? (
          <button
            type="button"
            onClick={onCreateClick}
            className="font-bold text-orange underline underline-offset-4 hover:text-orange/80"
          >
            Crea tu primera nota
          </button>
        ) : (
          <Link
            href="/notas/nueva-nota"
            className="font-bold text-orange underline underline-offset-4 hover:text-orange/80"
          >
            Crea tu primera nota
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {notas.map((nota) => (
        <NotaCard key={nota.id} nota={nota} />
      ))}
    </div>
  )
}
