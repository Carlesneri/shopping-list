import Image from "next/image"
import Link from "next/link"
import { auth, signOut } from "@/auth"
import { IconLogout } from "@tabler/icons-react"

export async function TopBar() {
  const session = await auth()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-black/10">
      <Link href="/" className="flex items-center">
        <Image src="/logo.png" alt="COMPALE" width={120} height={40} priority />
      </Link>
      {session?.user && (
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="w-8 h-8 rounded-full border border-black/10"
            />
          )}
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              className="text-text/60 hover:text-danger transition-colors"
              aria-label="Cerrar sesión"
            >
              <IconLogout size={20} />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
