"use client"

import { useState, useEffect } from "react"
import { IconArrowUp } from "@tabler/icons-react"
import { FabButton } from "@/components/ui/FabButton"

type FabColor = "green" | "blue" | "purple" | "orange" | "pink"

export function ScrollToTop({ color = "green" }: { color?: FabColor }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > window.innerHeight + 50)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!visible) return null

  return (
    <FabButton
      color={color}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 left-6 z-50"
      title="Volver arriba"
      aria-label="Volver arriba"
    >
      <IconArrowUp size={28} />
    </FabButton>
  )
}
