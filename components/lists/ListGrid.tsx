"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { Loader } from "@/components/ui/Loader"
import { ListCard } from "./ListCard"

export function ListGrid({ userEmail }: { userEmail: string }) {
  const [lists, setLists] = useState<ShoppingList[]>([])
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
        collection(db, "lists"),
        where("memberEmails", "array-contains", userEmail),
      )
      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ShoppingList[]
          docs.sort(
            (a, b) =>
              (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0) ||
              (b.updatedAt?.nanoseconds ?? 0) - (a.updatedAt?.nanoseconds ?? 0),
          )
          setLists(docs)
          setLoading(false)
        },
        () => {
          toast.error("Error al cargar las listas")
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
    return (
      <Loader className="py-8" />
    )
  }

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-text/60">Aún no tienes ninguna lista.</p>
        <Link
          href="/lists/new"
          className="font-bold text-purple underline underline-offset-4 hover:text-purple/80"
        >
          Crea tu primera lista
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  )
}
