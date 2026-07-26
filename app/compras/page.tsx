import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { FabButton } from "@/components/ui/FabButton"
import { ListGrid } from "@/components/lists/ListGrid"
import { IconPlus } from "@tabler/icons-react"

export default async function ComprasPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="max-w-lg mx-auto w-full">
        <h1 className="text-3xl font-bold mb-3">Compras</h1>
        <ListGrid userEmail={session.user.email} />
        <Link href="/compras/nueva-lista" className="fixed bottom-6 right-6">
          <FabButton type="button" color="purple">
            <IconPlus size={28} />
          </FabButton>
        </Link>
      </div>
    </div>
  )
}
