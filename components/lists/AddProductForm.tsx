"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { addProductToList, updateProduct } from "@/lib/actions/products"
import { Button } from "@/components/ui/Button"
import { FabButton } from "@/components/ui/FabButton"
import type { ListProduct } from "@/lib/types"

interface Props {
  listId: string
  onClose: () => void
  productToEdit?: ListProduct | null
}

export function AddProductForm({
  listId,
  onClose,
  productToEdit,
}: Props) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!productToEdit

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name)
      setQuantity(productToEdit.quantity)
    } else {
      setName("")
      setQuantity(1)
    }
    inputRef.current?.focus()
  }, [productToEdit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing && productToEdit) {
        await updateProduct(listId, productToEdit.productId, name, quantity)
      } else {
        await addProductToList(listId, name, quantity)
      }
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : isEditing ? "Error al editar producto" : "Error al añadir producto",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 border-2 border-black rounded-md bg-white"
    >
      <h2 className="font-bold text-lg">
        {isEditing ? "Editar producto" : "Añadir producto"}
      </h2>
      <input
        ref={inputRef}
        type="text"
        list="productos-datalist"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del producto"
        required
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      />
      <datalist id="productos-datalist" />
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm text-text/70">Cantidad</span>
        <div className="flex items-center gap-3">
          <FabButton
            type="button"
            color="blue"
            size="sm"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={loading || quantity <= 1}
          >
            −
          </FabButton>
          <span className="font-bold text-lg min-w-8 text-center select-none">
            {quantity}
          </span>
          <FabButton
            type="button"
            color="blue"
            size="sm"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={loading}
          >
            +
          </FabButton>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading
            ? isEditing
              ? "Guardando…"
              : "Añadiendo…"
            : isEditing
            ? "Guardar"
            : "Añadir"}
        </Button>
      </div>
    </form>
  )
}
