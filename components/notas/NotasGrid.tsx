"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
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
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) {
        setLoading(false)
        return
      }

      const q = query(
        collection(db, "notas"),
        where("memberEmails", "array-contains", userEmail),
      )
      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Nota[]
          docs.sort(
            (a, b) =>
              (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0) ||
              (b.updatedAt?.nanoseconds ?? 0) - (a.updatedAt?.nanoseconds ?? 0),
          )
          setNotas(docs)
          setLoading(false)
        },
        () => {
          toast.error("Error al cargar las notas")
          setLoading(false)
        },
      )
    })

    return () => {
      authUnsub()
      firestoreUnsub?.()
    }
  }, [userEmail])

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
