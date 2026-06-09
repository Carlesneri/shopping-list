"use client"
import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { Button } from "@/components/ui/Button"
import { IconShare, IconArrowLeft } from "@tabler/icons-react"

interface Props {
  initialList: ShoppingList
  userEmail: string
  listId: string
}

export function ListDetail({ initialList, userEmail, listId }: Props) {
  const [list, setList] = useState<ShoppingList>(initialList)
  const router = useRouter()

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) return

      firestoreUnsub = onSnapshot(
        doc(db, "lists", listId),
        (snap) => {
          if (!snap.exists()) { router.push("/"); return }
          const data = snap.data()
          if (!(data.memberEmails as string[]).includes(userEmail)) { router.push("/"); return }
          setList({ id: snap.id, ...data } as ShoppingList)
        },
        () => { toast.error("Error al cargar la lista"); router.push("/") },
      )
    })

    return () => { authUnsub(); firestoreUnsub?.() }
  }, [listId, userEmail, router])

  const userEntry = list.allowedUsers.find((u) => u.email === userEmail)
  const canShare = userEntry?.role === "owner" || userEntry?.role === "admin"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href="/"
        className="flex items-center gap-1 text-text/60 mb-4 hover:text-text transition-colors"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm">Mis listas</span>
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{list.title}</h1>
        <p className="text-text/60">{list.market}</p>
      </div>
      <div className="py-12 text-center text-text/40">
        <p>Aún no hay productos</p>
      </div>
      {canShare && (
        <Link href={`/lists/${listId}/settings`} className="fixed bottom-6 right-6">
          <Button className="flex items-center gap-2">
            <IconShare size={18} />
            Compartir
          </Button>
        </Link>
      )}
    </div>
  )
}
