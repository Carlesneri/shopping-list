import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { NotesPage } from "@/components/notas/NotesPage"
import { ScrollToTop } from "@/components/ui/ScrollToTop"

export default async function NotasPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  return (
    <>
      <NotesPage userEmail={session.user.email} userName={session.user.name} />
      <ScrollToTop color="orange" />
    </>
  )
}
