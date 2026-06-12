"use client"

import { useState } from "react"
import { toast } from "sonner"
import { renameList } from "@/lib/actions/lists"
import { Button } from "@/components/ui/Button"

interface Props {
  listId: string
  currentTitle: string
}

export function RenameListForm({ listId, currentTitle }: Props) {
  const [title, setTitle] = useState(currentTitle)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === currentTitle) return
    setLoading(true)
    try {
      await renameList(listId, title)
      toast.success("Nombre actualizado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="font-bold text-sm text-text/70">Nombre de la lista</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="flex-1 border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
        />
        <Button
          type="submit"
          disabled={loading || title.trim() === currentTitle || !title.trim()}
        >
          {loading ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  )
}
