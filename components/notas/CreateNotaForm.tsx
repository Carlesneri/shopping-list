"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { createNota } from "@/lib/actions/notas"
import { IconX } from "@tabler/icons-react"

export function CreateNotaForm({ onClose }: { onClose?: () => void }) {
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const isSubmitDisabled = useMemo(
    () => !title.trim() && !text.trim(),
    [title, text],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      await createNota(formData)
      if (onClose) {
        onClose()
      } else {
        setTitle("")
        setText("")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold">Crear nueva nota</h2>
          <p className="text-text/60 text-sm">
            Añade un título y/o texto para empezar.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-text/60 transition hover:text-text"
            aria-label="Cerrar formulario"
          >
            <IconX size={20} />
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <input type="hidden" name="stay" value="1" />
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ideas para la cena"
            className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="text">
            Texto
          </label>
          <textarea
            id="text"
            name="text"
            rows={6}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Describe lo que quieras recordar..."
            className="min-h-[140px] resize-y border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitDisabled || submitting}
          className="w-fit"
        >
          {submitting ? "Creando…" : "Crear nota"}
        </Button>
      </form>
    </div>
  )
}
