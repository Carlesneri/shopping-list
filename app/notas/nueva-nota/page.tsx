import { createNota } from "@/lib/actions/notas"
import { Button } from "@/components/ui/Button"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"

export default function NewNotaPage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href="/notas"
        className="flex items-center gap-1 text-text/60 mb-6 hover:text-text transition-colors"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm">Volver</span>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Nueva nota</h1>
      <form action={createNota} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
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
            placeholder="Escribe aquí tu nota..."
            className="min-h-[140px] resize-y border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
          />
        </div>

        <Button type="submit" className="mt-2">
          Crear nota
        </Button>
      </form>
    </div>
  )
}
