import Link from "next/link"
import { IconHeart } from "@tabler/icons-react"

export function Footer() {
  return (
    <footer className="mt-auto py-4 px-4 text-center text-sm text-text/60 font-mono max-w-[768px] mx-auto w-full">
      Hecho con{" "}
      <IconHeart
        size={14}
        className="inline text-danger fill-danger"
        aria-hidden
      />{" "}
      por Anna y Joan ·{" "}
      <Link
        href="/politica-de-privacidad"
        className="underline underline-offset-2 hover:text-text"
      >
        Privacidad
      </Link>
    </footer>
  )
}
