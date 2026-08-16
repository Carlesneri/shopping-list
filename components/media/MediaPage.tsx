"use client"

import { useState } from "react"
import Link from "next/link"
import { IconPlus, IconArrowLeft } from "@tabler/icons-react"
import { FabButton } from "@/components/ui/FabButton"
import { CreateStorageForm } from "@/components/media/CreateStorageForm"
import { MediaGrid } from "@/components/media/MediaGrid"

export function MediaPage({ userEmail }: { userEmail: string }) {
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
        <h1 className="text-3xl font-bold mb-3">Storages</h1>
        <p className="text-text/60 text-sm mb-6">
          Añade almacenamiento en la nube, de momento solo Cloudflare R2.
        </p>

        <div className="flex flex-col gap-8 text-start">
          {isCreating && (
            <CreateStorageForm onClose={() => setIsCreating(false)} />
          )}
          <MediaGrid
            userEmail={userEmail}
            onCreateClick={() => setIsCreating(true)}
          />
        </div>

        {!isCreating && (
          <FabButton
            type="button"
            onClick={() => setIsCreating(true)}
            className="fixed bottom-6 right-6"
            color="purple"
            aria-label="Añadir storage"
          >
            <IconPlus size={28} />
          </FabButton>
        )}
      </div>
    </div>
  )
}
