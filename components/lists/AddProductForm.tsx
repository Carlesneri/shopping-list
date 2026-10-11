"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { IconPhoto, IconX } from "@tabler/icons-react"
import { addProductToList, updateProduct } from "@/lib/actions/products"
import { fetchProductSuggestions } from "@/lib/product-search/client"
import type { ProductSuggestion } from "@/lib/product-search"
import { useMediaPlayer } from "@/components/media/MediaPlayerProvider"
import { Button } from "@/components/ui/Button"
import { FabButton } from "@/components/ui/FabButton"
import type { ListProduct } from "@/lib/types"

interface Props {
  listId: string
  /** Market of the list, used for product suggestions (optional). */
  market?: string
  onClose: () => void
  productToEdit?: ListProduct | null
}

export function AddProductForm({
  listId,
  market,
  onClose,
  productToEdit,
}: Props) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  /** Text for which the suggestion panel was dismissed or consumed; the
   * panel reappears as soon as the input changes. */
  const [closedFor, setClosedFor] = useState<string | null>(null)
  // The suggestion the user picked (market id + image); cleared when the name
  // is edited by hand.
  const [picked, setPicked] = useState<ProductSuggestion | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = !!productToEdit
  const { openPlayer } = useMediaPlayer()

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name)
      setQuantity(productToEdit.quantity)
    } else {
      setName("")
      setQuantity(1)
    }
    setPicked(null)
    inputRef.current?.focus()
  }, [productToEdit])

  // Debounced product suggestions from the market's market search API. Each
  // market provider decides where its request runs: client-side (Mercadona's
  // mirror is Cloudflare-protected against server traffic) or through the
  // searchProductSuggestions server action (Decathlon). Suggestions are
  // best-effort: failures clear the list and are logged.
  useEffect(() => {
    const text = name.trim()
    if (!market || !text) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchProductSuggestions(text, market, controller.signal).then(
        (results) => {
          if (!controller.signal.aborted) setSuggestions(results)
        },
      )
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [name, market, isEditing])

  function selectSuggestion(suggestion: ProductSuggestion) {
    setName(suggestion.name)
    setPicked(suggestion)
    // Hide suggestions until the input changes again.
    setClosedFor(suggestion.name)
    setSuggestions([])
    inputRef.current?.focus()
  }

  function openImage(suggestion: ProductSuggestion) {
    const src = suggestion.images[0]
    if (!src) return
    openPlayer({
      src,
      title: suggestion.name,
      kind: "image",
      storageKey: `suggestion:${suggestion.id}`,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const pickedRef = picked
        ? { id: picked.id, image: picked.images[0] }
        : undefined
      if (isEditing && productToEdit) {
        await updateProduct(
          listId,
          productToEdit.productId,
          name,
          quantity,
          pickedRef,
        )
      } else {
        await addProductToList(listId, name, quantity, pickedRef)
      }
      onClose()
    } catch {
      toast.error(
        isEditing ? "Error al editar producto" : "Error al añadir producto",
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
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          list="productos-datalist"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            // Hand-edited names drop the picked market reference.
            setPicked(null)
          }}
          placeholder="Nombre del producto"
          required
          className={`w-full border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary ${
            picked?.images[0] ? "pr-14" : ""
          }`}
        />
        {picked?.images[0] ? (
          <button
            type="button"
            onClick={() => openImage(picked)}
            title="Ver imagen del producto"
            aria-label="Ver imagen del producto"
            className="absolute inset-y-1 right-1 aspect-square cursor-pointer overflow-hidden rounded"
          >
            {/* Market CDN image: cross-origin, next/image would need
                remotePatterns for each market domain. */}
            {/* biome-ignore lint/performance/noImgElement: external market image */}
            <img
              src={picked.images[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ) : null}
      </div>
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
      {closedFor !== name && suggestions.length > 0 ? (
        <div className="border-2 border-black/10 rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 bg-black/[0.03] text-xs text-text/50">
            <span>Sugerencias</span>
            <button
              type="button"
              onClick={() => setClosedFor(name)}
              title="Cerrar sugerencias"
              aria-label="Cerrar sugerencias"
              className="cursor-pointer rounded p-0.5 text-text/40 hover:text-text"
            >
              <IconX size={14} strokeWidth={2.5} />
            </button>
          </div>
          {/* ~3.5 rows visible (rows are exactly 60px), scroll for the rest. */}
          <ul className="max-h-[210px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.id}:${index}`}
                className="cursor-pointer border-t border-black/[0.06] hover:bg-black/[0.03] first:border-t-0"
              >
                <div className="flex h-[60px] w-full items-center gap-3 px-3 text-sm">
                  {suggestion.images[0] ? (
                    // Market CDN images: cross-origin, next/image would need
                    // remotePatterns for each market domain.
                    // biome-ignore lint/performance/noImgElement: external market image
                    <img
                      src={suggestion.images[0]}
                      alt=""
                      onClick={() => openImage(suggestion)}
                      className="h-12 w-12 shrink-0 cursor-pointer rounded object-contain"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-black/[0.05] text-text/40">
                      <IconPhoto size={20} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="min-w-0 flex-1 cursor-pointer truncate text-start"
                  >
                    {suggestion.name}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  )
}
