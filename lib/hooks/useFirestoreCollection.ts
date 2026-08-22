"use client"

import { useEffect, useState } from "react"
import {
  collection,
  query,
  where,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, clientAuth } from "@/lib/firebase-client"

export function useFirestoreCollection<T extends DocumentData>(
  collectionName: string,
  userEmail: string,
  options?: { sortField?: string; sortDirection?: "asc" | "desc" },
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) {
        setLoading(false)
        return
      }

      const q = query(
        collection(db, collectionName),
        where("memberEmails", "array-contains", userEmail),
      )

      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as unknown as T[]

          const sortField = options?.sortField ?? "updatedAt"
          const sortDir = options?.sortDirection ?? "desc"

          docs.sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[sortField] as
              | { seconds?: number; nanoseconds?: number }
              | undefined
            const bVal = (b as Record<string, unknown>)[sortField] as
              | { seconds?: number; nanoseconds?: number }
              | undefined

            const aSeconds = aVal?.seconds ?? 0
            const bSeconds = bVal?.seconds ?? 0
            const aNano = aVal?.nanoseconds ?? 0
            const bNano = bVal?.nanoseconds ?? 0

            const diff = bSeconds - aSeconds || bNano - aNano
            return sortDir === "desc" ? diff : -diff
          })

          setItems(docs)
          setLoading(false)
          setError(null)
        },
        (err) => {
          console.error(
            `[firestore] error subscribing to ${collectionName}`,
            err,
          )
          setError(err.message)
          setLoading(false)
        },
      )
    })

    return () => {
      authUnsub()
      firestoreUnsub?.()
    }
  }, [collectionName, userEmail, options?.sortField, options?.sortDirection])

  return { items, loading, error }
}
