"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
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
  const router = useRouter()
  const [storages, setStorages] = useState<MediaStorage[]>([])
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
        collection(db, "media"),
        where("memberEmails", "array-contains", userEmail),
      )
      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as MediaStorage[]
          docs.sort(
            (a, b) =>
              (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0) ||
              (b.updatedAt?.nanoseconds ?? 0) - (a.updatedAt?.nanoseconds ?? 0),
          )
          setStorages(docs)
          setLoading(false)
          if (docs.length === 1) {
            router.push(`/media/${docs[0].id}`)
          }
        },
        () => {
          toast.error("Error al cargar los storages")
          setLoading(false)
        },
      )
    })

    return () => {
      authUnsub()
      firestoreUnsub?.()
    }
  }, [userEmail, router])

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
