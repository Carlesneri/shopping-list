"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteNota } from "@/lib/actions/notas"
import { Button } from "@/components/ui/Button"

export function DeleteNotaButton({ notaId }: { notaId: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteNota(notaId)
      router.push("/notas")
    } catch {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="danger"
      type="button"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? "Eliminando…" : "Eliminar nota"}
    </Button>
  )
}
