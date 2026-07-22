"use client"
import { useEffect, useRef, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { Nota } from "@/lib/types"
import { FabButton } from "@/components/ui/FabButton"
import { ShareButton } from "@/components/ui/ShareButton"
import { updateNotaText } from "@/lib/actions/notas"
import { IconSettings, IconArrowLeft } from "@tabler/icons-react"

interface Props {
  initialNota: Nota
  userEmail: string
  notaId: string
}

const SAVE_DEBOUNCE_MS = 800

export function NotaDetail({ initialNota, userEmail, notaId }: Props) {
  const [, setNota] = useState<Nota>(initialNota)
  const [draft, setDraft] = useState(initialNota.text ?? "")
  const [saving, setSaving] = useState(false)

  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  async function flushSave(text: string) {
    setSaving(true)
    try {
      await updateNotaText(notaId, text)
      // Confirm: if the user hasn't typed more since, mark us clean.
      if (draftRef.current === text) {
        dirtyRef.current = false
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  // Keep a live ref of the draft so flushSave always sees the latest text.
  const draftRef = useRef(draft)
  draftRef.current = draft

  function scheduleSave(text: string) {
    dirtyRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void flushSave(text)
    }, SAVE_DEBOUNCE_MS)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setDraft(value)
    scheduleSave(value)
  }

  // Flush any pending edit when the user leaves the page.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (dirtyRef.current) {
        // Fire-and-forget final save (server action keeps running).
        void updateNotaText(notaId, draftRef.current).catch(() => {})
      }
    }
  }, [notaId])

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) return

      firestoreUnsub = onSnapshot(
        doc(db, "notas", notaId),
        (snap) => {
          if (!snap.exists()) {
            router.push("/")
            return
          }
          const data = snap.data()
          if (!(data.memberEmails as string[]).includes(userEmail)) {
            router.push("/")
            return
          }
          const remoteText = (data.text as string) ?? ""
          setNota({
            id: snap.id,
            ...data,
            text: remoteText,
          } as Nota)
          // Last-write-wins reconciliation: only pull remote edits when we
          // aren't in the middle of typing an unsent change.
          if (!dirtyRef.current) {
            setDraft(remoteText)
          }
        },
        () => {
          toast.error("Error al cargar la nota")
          router.push("/")
        },
      )
    })

    return () => {
      authUnsub()
      firestoreUnsub?.()
    }
  }, [notaId, userEmail, router])

  const userEntry = initialNota.allowedUsers.find((u) => u.email === userEmail)
  const canShare = userEntry?.role === "owner" || userEntry?.role === "admin"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href="/notas"
        className="flex items-center gap-1 text-text/60 mb-5 hover:text-text transition-colors w-fit"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm font-medium">Mis notas</span>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold leading-tight">
          {initialNota.title}
        </h1>
        <div className="flex items-center gap-2">
          <ShareButton path={`/notas/${notaId}`} color="blue" />
          {canShare && (
            <Link href={`/notas/${notaId}/ajustes`}>
              <FabButton type="button" color="orange" size="sm">
                <IconSettings size={18} />
              </FabButton>
            </Link>
          )}
        </div>
      </div>

      <textarea
        value={draft}
        onChange={handleChange}
        placeholder="Escribe aquí…"
        className="w-full min-h-[60vh] resize-y border-2 border-black/15 rounded-md px-3 py-3 font-sans text-base leading-relaxed focus:outline-none focus:border-primary transition-colors"
      />

      <div className="flex items-center justify-end gap-1 mt-2 text-text/40 text-xs">
        {saving ? "Guardando…" : "Guardado"}
      </div>
    </div>
  )
}
