"use client"

import { IconShare } from "@tabler/icons-react"
import { toast } from "sonner"
import { FabButton } from "@/components/ui/FabButton"
import { shareUrl } from "@/lib/share"

interface ShareButtonProps {
  path: string
  variant?: "fab" | "plain"
  color?: "green" | "blue" | "purple" | "orange" | "pink"
  size?: "sm" | "lg"
}

export function ShareButton({
  path,
  variant = "fab",
  color = "blue",
  size = "sm",
}: ShareButtonProps) {
  async function handleShare(e: React.MouseEvent) {
    // Works even when nested inside a clickable card.
    e.preventDefault()
    e.stopPropagation()

    const url = `${window.location.origin}${path}`
    try {
      const result = await shareUrl(url, {
        share: navigator.share ? navigator.share.bind(navigator) : undefined,
        clipboard: navigator.clipboard,
      })
      if (result === "copied") toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo compartir")
    }
  }

  if (variant === "plain") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartir lista"
        className="flex items-center justify-center text-text/50 hover:text-purple transition-colors cursor-pointer"
      >
        <IconShare size={18} />
      </button>
    )
  }

  return (
    <FabButton
      type="button"
      color={color}
      size={size}
      onClick={handleShare}
      aria-label="Compartir lista"
    >
      <IconShare size={18} />
    </FabButton>
  )
}
