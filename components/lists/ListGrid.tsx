"use client"

import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { ListCard } from "./ListCard"

export function ListGrid({ userEmail }: { userEmail: string }) {
  const [lists, setLists] = useState<ShoppingList[]>([])

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) return

      const q = query(
        collection(db, "lists"),
        where("memberEmails", "array-contains", userEmail),
      )
      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          setLists(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ShoppingList[])
        },
        () => toast.error("Error al cargar las listas"),
      )
    })

    return () => {
      authUnsub()
      firestoreUnsub?.()
    }
  }, [userEmail])

  if (lists.length === 0) {
    return (
      <p className="text-center text-text/60 py-12">
        Aún no tienes listas. ¡Crea una!
      </p>
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
