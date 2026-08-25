import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AddButton } from "@/components/ui/AddButton"
import { ListGrid } from "@/components/lists/ListGrid"
import { ScrollToTop } from "@/components/ui/ScrollToTop"
import { IconArrowLeft } from "@tabler/icons-react"

export default async function ComprasPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 mb-4 text-text/70">
          <IconArrowLeft size={18} />
          <Link
            href="/"
            className="font-medium underline underline-offset-4 hover:text-text"
          >
            Ir al inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-3">Listas</h1>
        <ListGrid userEmail={session.user.email} />
        <AddButton color="purple" href="/compras/nueva-lista" fixed />
        <ScrollToTop color="purple" />
      </div>
    </div>
  )
}
