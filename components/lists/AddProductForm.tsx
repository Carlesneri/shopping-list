"use client"

import { useState } from "react"
import { toast } from "sonner"
import { addProductToList } from "@/lib/actions/products"
import { Button } from "@/components/ui/Button"
import { FabButton } from "@/components/ui/FabButton"

interface Props {
  listId: string
  onClose: () => void
}

export function AddProductForm({ listId, onClose }: Props) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await addProductToList(listId, name, quantity)
      setName("")
      setQuantity(1)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al añadir producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 border-2 border-black rounded-md bg-white">
      <h2 className="font-bold text-lg">Añadir producto</h2>
      <input
        type="text"
        list="productos-datalist"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del producto"
        required
        autoFocus
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      />
      <datalist id="productos-datalist" />
      <div className="flex items-center gap-3">
        <label className="font-semibold text-sm text-text/70">Cantidad</label>
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
          <span className="font-bold text-lg min-w-8 text-center select-none">{quantity}</span>
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
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Añadiendo…" : "Añadir"}
        </Button>
      </div>
    </form>
  )
}
