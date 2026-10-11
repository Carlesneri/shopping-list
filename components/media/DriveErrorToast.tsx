"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function DriveErrorToast({ message }: { message?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (!message) return
    toast.error(message.slice(0, 300))
    const url = new URL(window.location.href)
    url.searchParams.delete("drive_error")
    const next = `${url.pathname}${url.search}`
    router.replace(next, { scroll: false })
  }, [message, router])

  return null
}
