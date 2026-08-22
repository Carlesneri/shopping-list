import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { MediaPage } from "@/components/media/MediaPage"
import { ScrollToTop } from "@/components/ui/ScrollToTop"

export default async function MediaListPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  return (
    <>
      <MediaPage userEmail={session.user.email} />
      <ScrollToTop color="blue" />
    </>
  )
}
