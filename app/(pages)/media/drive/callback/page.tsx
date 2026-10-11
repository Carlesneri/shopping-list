import type { Metadata } from "next"
import { DriveCallbackForm } from "@/components/media/DriveCallbackForm"

export const metadata: Metadata = {
  title: "Conectando Google Drive",
  robots: { index: false, follow: false },
}

export default async function DriveCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string; error?: string }>
}) {
  const { code, state, error } = await searchParams

  return (
    <DriveCallbackForm
      code={code ?? ""}
      state={state ?? ""}
      oauthError={error ?? ""}
    />
  )
}
