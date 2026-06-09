import { IconHeart } from "@tabler/icons-react"

export function Footer() {
  return (
    <footer className="mt-auto py-4 px-4 text-center text-sm text-text/60 font-mono">
      Hecho con{" "}
      <IconHeart size={14} className="inline text-danger fill-danger" aria-hidden />{" "}
      por Anna y Joan
    </footer>
  )
}
