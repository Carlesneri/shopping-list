import type { Metadata } from "next"
import { auth } from "@/auth"
import { IconDeviceMobile, IconPencil, IconUsers } from "@tabler/icons-react"
import { SectionLanding } from "@/components/landing/SectionLanding"
import type { SectionLandingConfig } from "@/components/landing/SectionLanding"
import { NotesPage } from "@/components/notas/NotesPage"
import { ScrollToTop } from "@/components/ui/ScrollToTop"

const landingConfig: SectionLandingConfig = {
  h1: "Notas que compartes, no copias",
  subtitle:
    "Escribe notas con formato —títulos, listas, negritas, enlaces— y edítalas a la vez con tu pareja, tu familia o tu equipo. Todo sincronizado al instante.",
  accent: "orange",
  features: [
    {
      icon: IconPencil,
      title: "Con formato de verdad",
      text: "Títulos, listas, negritas, citas y enlaces. Nada de texto plano aburrido.",
    },
    {
      icon: IconUsers,
      title: "Colaborativas",
      text: "Comparte cada nota con quien quieras y editad a la vez sin pisaros.",
    },
    {
      icon: IconDeviceMobile,
      title: "Siempre a mano",
      text: "Tus notas contigo en el móvil, actualizadas en tiempo real.",
    },
  ],
  steps: [
    {
      title: "Crea una nota",
      text: "Una receta, la lista de regalos, ideas para el viaje…",
    },
    {
      title: "Invita a quien quieras",
      text: "Cada nota tiene su propia lista de personas con permisos.",
    },
    {
      title: "Editad a la vez",
      text: "Los cambios aparecen al instante para todos.",
    },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Notas compartidas online, colaborativas y gratis",
    description:
      "Crea notas compartidas con formato: títulos, listas, negritas y enlaces. Edítalas a la vez con tu gente en tiempo real. Gratis con tu cuenta de Google.",
    alternates: { canonical: "/notas" },
    openGraph: {
      title: "Notas compartidas online, colaborativas y gratis — COMPALE",
      description:
        "Notas colaborativas con formato que editáis a la vez, siempre sincronizadas. Gratis y sin instalar nada.",
      url: "/notas",
      images: ["/compale.png"],
    },
  }
}

export default async function NotasPage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <SectionLanding config={landingConfig} redirectTo="/notas" />
  }

  return (
    <>
      <NotesPage userEmail={session.user.email} userName={session.user.name} />
      <ScrollToTop color="orange" />
    </>
  )
}
