import type { Metadata } from "next"

/**
 * Default for nested app pages: private content must never be indexed.
 * The public landing pages (/compras, /notas, /media when signed out)
 * override this in their own `generateMetadata`.
 *
 * NOTE: no redirect here — unauthenticated visitors get the public landing
 * pages; every page under this group enforces its own session/membership.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
