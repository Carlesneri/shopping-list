"use client"
import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { FabButton } from "@/components/ui/FabButton"
import { AddProductForm } from "@/components/lists/AddProductForm"
import { IconSettings, IconPlus, IconArrowLeft, IconBasket } from "@tabler/icons-react"

interface Props {
  initialList: ShoppingList
  userEmail: string
  listId: string
}

export function ListDetail({ initialList, userEmail, listId }: Props) {
  const [list, setList] = useState<ShoppingList>(initialList)
  const [isFormOpen, setIsFormOpen] = useState(false)
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
        className="flex items-center gap-1 text-text/60 mb-5 hover:text-text transition-colors w-fit"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm font-medium">Mis listas</span>
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{list.title}</h1>
          <p className="text-text/50 text-sm mt-0.5">{list.market}</p>
        </div>
        {canShare && (
          <Link href={`/lists/${listId}/settings`}>
            <FabButton type="button" color="orange" size="sm">
              <IconSettings size={18} />
            </FabButton>
          </Link>
        )}
      </div>

      {/* Animated form slot */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isFormOpen ? "400px" : "0px", opacity: isFormOpen ? 1 : 0 }}
      >
        <div className="mb-6">
          <AddProductForm listId={listId} onClose={() => setIsFormOpen(false)} />
        </div>
      </div>

      {/* Product list */}
      {list.products.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {list.products.map((item, index) => (
            <li
              key={`${item.productId}-${index}`}
              className="flex items-center justify-between border-2 border-black rounded-md px-4 py-3"
            >
              <span className="font-semibold capitalize">{item.name}</span>
              <span className="text-sm text-text/50 font-medium">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-text/5 flex items-center justify-center mb-2">
            <IconBasket size={32} className="text-text/25" />
          </div>
          <p className="font-semibold text-text/40">Aún no hay productos</p>
          <p className="text-sm text-text/30">Pulsa + para añadir el primero</p>
        </div>
      )}

      <div className="fixed bottom-6 right-6">
        <FabButton type="button" color="purple" onClick={() => setIsFormOpen((v) => !v)}>
          <IconPlus size={28} />
        </FabButton>
      </div>
    </div>
  )
}
