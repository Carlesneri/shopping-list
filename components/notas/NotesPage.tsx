"use client"

import { useState } from "react"
import Link from "next/link"
import { IconPlus, IconArrowLeft } from "@tabler/icons-react"
import { FabButton } from "@/components/ui/FabButton"
import { CreateNotaForm } from "@/components/notas/CreateNotaForm"
import { NotasGrid } from "@/components/notas/NotasGrid"

export function NotesPage({
  userEmail,
  userName,
}: {
  userEmail: string
  userName?: string | null
}) {
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 mb-4 text-text/70">
          <IconArrowLeft size={18} />
          <Link
            href="/"
            className="font-medium underline underline-offset-4 hover:text-text"
          >
            Ir al inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-3">Notas</h1>

        <div className="flex flex-col gap-8">
          {isCreating && (
            <CreateNotaForm onClose={() => setIsCreating(false)} />
          )}
          <NotasGrid
            userEmail={userEmail}
            onCreateClick={() => setIsCreating(true)}
          />
        </div>

        {!isCreating && (
          <FabButton
            type="button"
            onClick={() => setIsCreating(true)}
            className="fixed bottom-6 right-6"
            color="orange"
            aria-label="Crear nota"
          >
            <IconPlus size={28} />
          </FabButton>
        )}
      </div>
    </div>
  )
}
