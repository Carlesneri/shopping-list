import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { FabButton } from "@/components/ui/FabButton"
import { NotasGrid } from "@/components/notas/NotasGrid"
import { IconPlus } from "@tabler/icons-react"

export default async function NotasPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="max-w-lg mx-auto w-full">
        {session.user.name && (
          <h2 className="text-2xl font-bold mb-6">Hola, {session.user.name}</h2>
        )}
        <NotasGrid userEmail={session.user.email} />
        <Link href="/notas/nueva-nota" className="fixed bottom-6 right-6">
          <FabButton type="button" color="purple">
            <IconPlus size={28} />
          </FabButton>
        </Link>
      </div>
    </div>
  )
}
