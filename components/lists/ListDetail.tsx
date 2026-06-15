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
import { updateProductQuantity, removeProductFromList, toggleProductChecked } from "@/lib/actions/products"
import { IconSettings, IconPlus, IconArrowLeft, IconBasket, IconCheck, IconTrash } from "@tabler/icons-react"

interface Props {
  initialList: ShoppingList
  userEmail: string
  listId: string
}

export function ListDetail({ initialList, userEmail, listId }: Props) {
  const [list, setList] = useState<ShoppingList>(initialList)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const router = useRouter()

  // Optimistic helper: apply `optimistic` to local state immediately, run the
  // server action, and roll back to the pre-action products on failure. The
  // onSnapshot listener remains the source of truth and reconciles on success.
  async function runOptimistic(
    optimistic: (products: ShoppingList["products"]) => ShoppingList["products"],
    action: () => Promise<void>,
    errorMessage: string,
  ) {
    let previous: ShoppingList["products"] | undefined
    setList((prev) => {
      previous = prev.products
      return { ...prev, products: optimistic(prev.products) }
    })
    try {
      await action()
    } catch (err) {
      const rollback = previous
      if (rollback) setList((prev) => ({ ...prev, products: rollback }))
      toast.error(err instanceof Error ? err.message : errorMessage)
    }
  }

  function handleToggleChecked(productId: string, current: boolean) {
    return runOptimistic(
      (products) =>
        products.map((p) =>
          p.productId === productId ? { ...p, checked: !current } : p,
        ),
      () => toggleProductChecked(listId, productId, !current),
      "Error al guardar",
    )
  }

  function handleQuantityChange(productId: string, delta: number) {
    return runOptimistic(
      (products) =>
        products.map((p) =>
          p.productId === productId
            ? { ...p, quantity: Math.max(1, p.quantity + delta) }
            : p,
        ),
      () => updateProductQuantity(listId, productId, delta),
      "Error al actualizar cantidad",
    )
  }

  function handleRemove(productId: string) {
    return runOptimistic(
      (products) => products.filter((p) => p.productId !== productId),
      () => removeProductFromList(listId, productId),
      "Error al eliminar producto",
    )
  }

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
          setList({ id: snap.id, ...data, products: data.products ?? [] } as ShoppingList)
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

      {isFormOpen && (
        <div className="mb-6">
          <AddProductForm listId={listId} onClose={() => setIsFormOpen(false)} />
        </div>
      )}

      {/* Product list */}
      {list.products.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {list.products.map((item, index) => {
            const checked = item.checked ?? false
            return (
              <li key={`${item.productId}-${index}`} className="flex items-center gap-3">
                <label className="cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleChecked(item.productId, checked)}
                    className="sr-only"
                  />
                  <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-150 ${checked ? "bg-primary border-primary" : "border-black/30 bg-white"}`}>
                    {checked && <IconCheck size={16} className="text-white" strokeWidth={3} />}
                  </div>
                </label>
                <div className={`flex-1 flex items-center justify-between border-2 border-blue rounded-md px-4 py-3 transition-opacity ${checked ? "opacity-50" : ""}`}>
                  <span className={`font-semibold capitalize transition-all ${checked ? "line-through" : ""}`}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <FabButton
                      type="button"
                      color="blue"
                      size="sm"
                      onClick={() => handleQuantityChange(item.productId, -1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </FabButton>
                    <span className="font-bold text-sm min-w-5 text-center">{item.quantity}</span>
                    <FabButton
                      type="button"
                      color="blue"
                      size="sm"
                      onClick={() => handleQuantityChange(item.productId, 1)}
                    >
                      +
                    </FabButton>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.productId)}
                  className="shrink-0 p-1.5 text-text/30 hover:text-danger transition-colors cursor-pointer"
                  aria-label="Eliminar producto"
                >
                  <IconTrash size={18} />
                </button>
              </li>
            )
          })}
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
        <FabButton type="button" color="blue" onClick={() => setIsFormOpen((v) => !v)}>
          <IconPlus size={28} />
        </FabButton>
      </div>
    </div>
  )
}
