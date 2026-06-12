import Image from "next/image"
import Link from "next/link"
import { auth, signOut } from "@/auth"
import { FabButton } from "@/components/ui/FabButton"
import { IconLogout } from "@tabler/icons-react"

export async function TopBar() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-black/10 shadow-sm">
      <Link href="/" className="flex items-center">
        <Image src="/logo.png" alt="COMPALE" width={120} height={40} priority />
      </Link>
      {session?.user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={36}
                height={36}
                className="rounded-full border-2 border-black/10"
              />
            )}
            {session.user.name && (
              <span className="hidden sm:block text-sm font-semibold text-text/70">
                {session.user.name.split(" ")[0]}
              </span>
            )}
          </div>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <FabButton
              type="submit"
              color="pink"
              size="sm"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <IconLogout size={16} />
            </FabButton>
          </form>
        </div>
      )}
    </header>
  )
}
