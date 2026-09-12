import type { Metadata } from "next"
import { auth } from "@/auth"
import { IconDeviceTv, IconFolder, IconShieldLock } from "@tabler/icons-react"
import { SectionLanding } from "@/components/landing/SectionLanding"
import type { SectionLandingConfig } from "@/components/landing/SectionLanding"
import { MediaPage } from "@/components/media/MediaPage"
import { ScrollToTop } from "@/components/ui/ScrollToTop"

const landingConfig: SectionLandingConfig = {
  h1: "Tu media, en la nube y bajo tu control",
  subtitle:
    "Conecta tu propio almacenamiento Cloudflare R2 y organiza tus vídeos, series y música. Reprodúcelos en streaming desde cualquier dispositivo, con tus claves cifradas y a salvo.",
  accent: "blue",
  features: [
    {
      icon: IconFolder,
      title: "Organizado",
      text: "Navega por carpetas y encuentra al instante lo que quieres ver o escuchar.",
    },
    {
      icon: IconDeviceTv,
      title: "Streaming real",
      text: "Reproduce vídeos y música sin descargarlos, adaptados a tu conexión.",
    },
    {
      icon: IconShieldLock,
      title: "Tus claves, cifradas",
      text: "Tus credenciales se guardan cifradas y nunca salen del servidor.",
    },
  ],
  steps: [
    {
      title: "Conecta tu nube",
      text: "Enlaza tu bucket de Cloudflare R2 en un par de minutos.",
    },
    {
      title: "Sube tu contenido",
      text: "Vídeos, música, fotos… con las herramientas que ya usas.",
    },
    {
      title: "Reproduce donde sea",
      text: "Streaming desde el navegador, en casa o fuera de ella.",
    },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth()
  if (session?.user?.email) {
    return { robots: { index: false, follow: false } }
  }
  return {
    title: "Tu biblioteca multimedia en streaming, con tu propia nube",
    description:
      "Conecta tu Cloudflare R2 y disfruta de tus vídeos y música organizados y en streaming desde cualquier dispositivo. Tus claves, cifradas.",
    alternates: { canonical: "/media" },
    openGraph: {
      title: "Tu biblioteca multimedia en streaming — COMPALE",
      description:
        "Vídeos y música de tu propia nube, organizados y listos para reproducir en streaming. Bajo tu control.",
      url: "/media",
      images: ["/compale.png"],
    },
  }
}

export default async function MediaListPage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <SectionLanding config={landingConfig} redirectTo="/media" />
  }

  return (
    <>
      <MediaPage userEmail={session.user.email} />
      <ScrollToTop color="blue" />
    </>
  )
}
