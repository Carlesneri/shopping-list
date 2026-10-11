"use client"

import { useEffect, useRef } from "react"
import { completeDriveConnect } from "@/lib/actions/media"
import { Loader } from "@/components/ui/Loader"

const submittedStates = new Set<string>()

export function DriveCallbackForm({
  code,
  state,
  oauthError,
}: {
  code: string
  state: string
  oauthError: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (submittedStates.has(state)) return
    submittedStates.add(state)
    formRef.current?.requestSubmit()
  }, [state])

  return (
    <form
      ref={formRef}
      action={completeDriveConnect}
      className="flex flex-col items-center gap-4 px-4 py-16"
    >
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="error" value={oauthError} />
      <Loader size={48} label="Conectando Google Drive…" />
      <button type="submit" className="text-sm text-text/60 underline">
        Continuar
      </button>
    </form>
  )
}
