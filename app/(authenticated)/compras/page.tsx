import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/auth"
import {
  IconArrowLeft,
  IconBolt,
  IconDeviceMobile,
  IconUsers,
} from "@tabler/icons-react"
import { SectionLanding } from "@/components/landing/SectionLanding"
import type { SectionLandingConfig } from "@/components/landing/SectionLanding"
import { AddButton } from "@/components/ui/AddButton"
import { ListGrid } from "@/components/lists/ListGrid"
import { ScrollToTop } from "@/components/ui/ScrollToTop"

const landingConfig: SectionLandingConfig = {
  h1: "Listas de la compra en equipo",
  subtitle:
    "Crea una lista de la compra, invita a tu familia o a tus compañeros de piso y comprad juntos. Cada producto marcado se actualiza al instante en el móvil de todos.",
  accent: "purple",
  features: [
    {
      icon: IconBolt,
      title: "En tiempo real",
      text: "Añade o marca productos y se sincronizan al instante con el resto del grupo.",
    },
    {
      icon: IconUsers,
      title: "Comparte con quien quieras",
      text: "Invita por email y controla quién puede editar y quién solo mirar.",
    },
    {
      icon: IconDeviceMobile,
      title: "Desde cualquier sitio",
      text: "Funciona en el móvil, la tablet y el ordenador. Sin instalar nada.",
    },
  ],
  steps: [
    {
      title: "Crea tu lista",
      text: "Una por mercado o por ocasión: la del viernes, el mercadillo…",
    },
    {
      title: "Invita a tu gente",
      text: "Comparte la lista con tu pareja, familia o compañeros de piso.",
    },
    {
      title: "Comprad juntos",
      text: "Marcad productos a la vez, incluso estando en el mismo super.",
    },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth()
  if (session?.user?.email) {
    return { robots: { index: false, follow: false } }
  }
  return {
    title: "Listas de la compra colaborativas online y gratis",
    description:
      "Crea listas de la compra compartidas con tu familia o pareja. Añade productos, márcalos en tiempo real y olvídate de las notas de papel. Gratis.",
    alternates: { canonical: "/compras" },
    openGraph: {
      title: "Listas de la compra colaborativas online y gratis — COMPALE",
      description:
        "Listas de la compra compartidas que se actualizan en tiempo real para toda la familia. Gratis y sin instalar nada.",
      url: "/compras",
      images: ["/compale.png"],
    },
  }
}

export default async function ComprasPage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <SectionLanding config={landingConfig} redirectTo="/compras" />
  }

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
