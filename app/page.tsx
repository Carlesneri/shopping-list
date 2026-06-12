import Image from "next/image"
import Link from "next/link"
import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/Button"
import { FabButton } from "@/components/ui/FabButton"
import { ListGrid } from "@/components/lists/ListGrid"
import { IconPlus } from "@tabler/icons-react"

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Image
        src="/compale.png"
        alt="COMPALE — lista de la compra colaborativa"
        width={480}
        height={340}
        priority
        className="w-full max-w-sm"
      />
      {session ? (
        <div className="px-4 py-6 max-w-lg mx-auto w-full">
          <ListGrid userEmail={session.user?.email!} />
          <Link href="/lists/new" className="fixed bottom-6 right-6">
            <FabButton type="button" color="purple">
              <IconPlus size={28} />
            </FabButton>
          </Link>
        </div>
      ) : (
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/" })
          }}
        >
          <Button type="submit" className="text-lg px-8 py-3">
            Iniciar sesión con Google
          </Button>
        </form>
      )}
    </div>
  )
}
