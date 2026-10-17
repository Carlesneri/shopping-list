import type { Metadata } from "next"
import Link from "next/link"
import {
  IconArrowRight,
  IconBrandGoogleDrive,
  IconCloudUpload,
  IconDeviceTv,
  IconFolder,
  IconShieldLock,
} from "@tabler/icons-react"
import { auth } from "@/auth"
import { LoginButton } from "@/components/landing/LoginButton"
import { DriveErrorToast } from "@/components/media/DriveErrorToast"
import { MediaPage } from "@/components/media/MediaPage"
import { ScrollToTop } from "@/components/ui/ScrollToTop"

const title = "Tu biblioteca multimedia en streaming, con tu propia nube"
const description =
  "Conecta tu Google Drive o tu Cloudflare R2 y disfruta de tus vídeos, fotos y música organizados y en streaming desde cualquier dispositivo. Gratis, con tus datos a salvo."

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "biblioteca multimedia personal",
    "streaming de vídeos online",
    "reproducir vídeos de Google Drive",
    "streaming desde Cloudflare R2",
    "ver fotos online",
    "música en streaming",
    "nas en la nube",
    "COMPALE Media",
  ],
  alternates: { canonical: "/media" },
  openGraph: {
    title: `${title} — COMPALE`,
    description:
      "Vídeos, fotos y música de tu propia nube, organizados y listos para reproducir en streaming. Bajo tu control.",
    url: "/media",
    images: ["/compale.png"],
  },
}

const features = [
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
    icon: IconCloudUpload,
    title: "Subida directa",
    text: "Arrastra tus archivos y súbelos a tu nube desde el navegador.",
  },
  {
    icon: IconShieldLock,
    title: "Tus claves, cifradas",
    text: "Tus credenciales y tokens se guardan cifrados y nunca salen del servidor.",
  },
]

const providers = [
  {
    href: "/drive",
    icon: IconBrandGoogleDrive,
    title: "Google Drive",
    description:
      "No necesitas configurar nada técnico: autorizas con tu cuenta de Google y tu Drive se convierte en tu biblioteca. Ideal si ya guardas tus vídeos y fotos ahí.",
    highlights: [
      "Autorización en un clic, sin credenciales",
      "Carpetas compartidas y unidades compartidas",
      "Usas el espacio de tu plan de Google",
    ],
  },
  {
    href: "/r2",
    icon: IconCloudUpload,
    title: "Cloudflare R2",
    description:
      "Conecta tu propio bucket con sus credenciales y ten control total del almacenamiento. Ideal si ya tienes tu infraestructura en Cloudflare.",
    highlights: [
      "Tu bucket, tus claves, tu control",
      "Varios buckets como storages separados",
      "Claves guardadas cifradas y rotables",
    ],
  },
]

const steps = [
  {
    title: "Conecta tu nube",
    text: "Google Drive en un clic o tu bucket de Cloudflare R2 con sus credenciales.",
  },
  {
    title: "Sube tu contenido",
    text: "Vídeos, música, fotos… arrástralos desde el navegador o usa los que ya tienes.",
  },
  {
    title: "Reproduce donde sea",
    text: "Streaming desde el navegador, en casa o fuera de ella.",
  },
]

const cardClass =
  "rounded-2xl squircle border-2 border-black/10 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"

function MediaGeneralLanding() {
  return (
    <div className="px-4">
      <section className="max-w-3xl mx-auto text-center pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-balance">
          Tu media, en la nube y bajo tu control
        </h1>
        <p className="mt-5 text-lg text-text/70 leading-relaxed max-w-2xl mx-auto">
          Conecta tu Google Drive o tu bucket de Cloudflare R2 y organiza tus
          vídeos, fotos y música. Reprodúcelos en streaming desde cualquier
          dispositivo, con tus datos a salvo y sin mover tus archivos de sitio.
        </p>
        <LoginButton
          redirectTo="/media"
          accent="blue"
          className="max-w-sm mx-auto mt-8"
        />
        <p className="text-xs text-text/40 mt-4">
          Gratis · Sin instalación · Con tu cuenta de Google
        </p>
      </section>

      <section className="max-w-4xl mx-auto py-12" aria-label="Funciones">
        <h2 className="text-2xl font-bold text-center mb-8">
          Todo lo que necesitas
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feature) => {
            const IconCmp = feature.icon
            return (
              <article key={feature.title} className={cardClass}>
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-blue/10 text-blue">
                  <IconCmp size={24} strokeWidth={2.2} />
                </div>
                <h3 className="font-bold mb-1">{feature.title}</h3>
                <p className="text-sm text-text/60 leading-relaxed">
                  {feature.text}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section
        className="max-w-4xl mx-auto py-12"
        aria-label="Elige tu proveedor"
      >
        <h2 className="text-2xl font-bold text-center mb-2">
          Elige tu proveedor
        </h2>
        <p className="text-text/60 text-center text-sm mb-8">
          Conecta el almacenamiento que ya usas. Puedes tener ambos a la vez.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {providers.map((provider) => {
            const IconCmp = provider.icon
            return (
              <Link
                key={provider.href}
                href={provider.href}
                className="rounded-2xl squircle border-2 border-black/10 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.06)] hover:border-blue-400 transition-colors"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-blue/10 text-blue">
                  <IconCmp size={24} strokeWidth={2.2} />
                </div>
                <h3 className="font-bold text-lg">{provider.title}</h3>
                <p className="mt-2 text-sm text-text/60 leading-relaxed">
                  {provider.description}
                </p>
                <ul className="mt-4 flex flex-col gap-1.5 text-sm text-text/70 text-left list-none">
                  {provider.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <span aria-hidden className="text-blue font-bold">
                        ·
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue">
                  Ver la guía
                  <IconArrowRight size={16} strokeWidth={2.5} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto py-12" aria-label="Cómo funciona">
        <h2 className="text-2xl font-bold text-center mb-8">Cómo funciona</h2>
        <ol className="grid sm:grid-cols-3 gap-4 list-none">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl squircle bg-black/[0.03] p-6 text-center"
            >
              <span className="inline-flex w-8 h-8 items-center justify-center rounded-full font-bold mb-3 bg-blue text-white">
                {index + 1}
              </span>
              <h3 className="font-bold mb-1">{step.title}</h3>
              <p className="text-sm text-text/60 leading-relaxed">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-2xl mx-auto text-center pt-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          ¿Listo para probarlo?
        </h2>
        <p className="text-text/60 mb-6">
          Entra con Google y empieza en menos de un minuto.
        </p>
        <LoginButton
          redirectTo="/media"
          accent="blue"
          className="max-w-sm mx-auto"
        />
      </section>
    </div>
  )
}

export default async function MediaListPage({
  searchParams,
}: {
  searchParams: Promise<{ drive_error?: string }>
}) {
  const { drive_error: driveError } = await searchParams
  const session = await auth()
  if (!session?.user?.email) {
    return (
      <>
        <DriveErrorToast message={driveError} />
        <MediaGeneralLanding />
      </>
    )
  }

  return (
    <>
      <DriveErrorToast message={driveError} />
      <MediaPage userEmail={session.user.email} />
      <ScrollToTop color="blue" />
    </>
  )
}
