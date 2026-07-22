import Image from "next/image"
import Link from "next/link"
import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/Button"

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      {session ? (
        <div className="max-w-lg mx-auto w-full">
          {session.user?.name && (
            <h2 className="text-2xl font-bold mb-6">
              Hola, {session.user.name}
            </h2>
          )}
          <div className="flex flex-col gap-3 items-center">
            <Link href="/compras">
              <Button variant="secondary">Ver mis listas</Button>
            </Link>
            <Link href="/notas">
              <Button variant="purple">Mis notas</Button>
            </Link>
          </div>
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

      <Image
        src="/compale.png"
        alt="COMPALE — lista de la compra colaborativa"
        width={480}
        height={340}
        priority
        className="h-auto w-full max-w-sm object-contain"
      />
      <h1>
        <span className="text-lg font-semibold text-gray-600">
          Tu app colaborativa
        </span>
      </h1>
    </div>
  )
}
