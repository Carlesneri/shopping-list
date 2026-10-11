import type { Metadata } from "next"
import Link from "next/link"
import {
  IconDeviceTv,
  IconFolderShare,
  IconShieldLock,
  IconUpload,
} from "@tabler/icons-react"
import { LoginButton } from "@/components/landing/LoginButton"

const title = "Reproduce los vídeos y fotos de tu Google Drive online — COMPALE"
const description =
  "Convierte tu Google Drive en una biblioteca multimedia: reproduce vídeos y música en streaming, mira tus fotos y sube archivos directamente a tu Drive. Gratis, sin instalar nada y con tus datos a salvo."

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Google Drive como biblioteca multimedia",
    "reproducir vídeos de Google Drive",
    "ver fotos de Google Drive online",
    "streaming desde Google Drive",
    "subir archivos a Google Drive",
    "películas en Google Drive",
    "música en Google Drive",
    "biblioteca multimedia personal",
    "nas en la nube",
    "COMPALE Drive",
  ],
  alternates: { canonical: "/drive" },
  openGraph: {
    title: `${title} — COMPALE`,
    description,
    url: "/drive",
    images: ["/compale.png"],
  },
}

const features = [
  {
    icon: IconDeviceTv,
    title: "Streaming real",
    text: "Vídeos y música se reproducen en el navegador, sin descargarlos y con búsqueda dentro del vídeo.",
  },
  {
    icon: IconFolderShare,
    title: "Tus carpetas, tal cual",
    text: "Navega por las carpetas de tu Drive, incluidas las compartidas contigo y las unidades compartidas.",
  },
  {
    icon: IconUpload,
    title: "Subida directa",
    text: "Arrastra tus archivos y se suben a tu Drive. Tú decides si luego los ves solo aquí o en todo Google.",
  },
  {
    icon: IconShieldLock,
    title: "Acceso cifrado",
    text: "El permiso de acceso se guarda cifrado, nunca sale del servidor y puedes revocarlo cuando quieras.",
  },
]

const howTo = [
  {
    title: "Entra con tu cuenta de Google",
    text: "Un clic y dentro. COMPALE usa el mismo Google con el que ya tienes tu Drive.",
  },
  {
    title: "Añade un storage y elige Google Drive",
    text: "En la sección Media, pulsa añadir storage, ponle un nombre y selecciona Google Drive.",
  },
  {
    title: "Autoriza el acceso",
    text: "Google te pedirá permiso para conectar tu Drive. Es el permiso estándar de Google, revocable en cualquier momento.",
  },
  {
    title: "Explora y reproduce",
    text: "Verás tus carpetas con tus vídeos, fotos y música. Reproduce en streaming o sube archivos nuevos.",
  },
]

const faqs = [
  {
    q: "¿Es gratis usar mi Google Drive con COMPALE?",
    a: "Sí. COMPALE es gratis y los archivos se quedan en tu propio Google Drive, así que solo usas el espacio que ya tienes contratado con Google. No duplicamos ni almacenamos tus archivos en ningún otro sitio.",
  },
  {
    q: "¿COMPALE puede ver todos los archivos de mi Drive?",
    a: "Al conectar tu Drive, Google te pide permiso de acceso para que la app pueda listar, reproducir y subir archivos. Solo se accede a un archivo cuando tú lo abres o lo reproduces en la app, el token de acceso se guarda cifrado y puedes revocar el permiso en cualquier momento desde la página de permisos de tu cuenta de Google.",
  },
  {
    q: "¿Qué tipo de archivos puedo reproducir?",
    a: "Vídeos (mp4, mkv, mov, avi, webm…), imágenes (jpg, png, webp, gif, heic…) y audio (mp3, wav, flac, ogg…). La lista muestra solo archivos multimedia, para que veas tu biblioteca limpia y sin documentos de por medio.",
  },
  {
    q: "¿Puedo subir archivos desde COMPALE a mi Drive?",
    a: "Sí. Desde la app puedes subir vídeos, fotos y audio directamente a la carpeta que estés navegando de tu Drive, con archivos de hasta 5 GB por subida.",
  },
  {
    q: "¿Funciona con carpetas compartidas y unidades compartidas?",
    a: "Sí. COMPALE lista tanto tu propio Drive como las carpetas que otros han compartido contigo y las unidades compartidas (Shared Drives) a las que tienes acceso.",
  },
  {
    q: "¿Puedo usar solo una carpeta concreta de mi Drive?",
    a: "Navegas por todo tu Drive igual que en la app de Google, así que puedes entrar en la carpeta que uses para tus vídeos y trabajar solo ahí. Si lo prefieres, crea una carpeta específica para tu biblioteca y sube ahí tu contenido.",
  },
  {
    q: "¿Dónde se guardan mis datos?",
    a: "El permiso de acceso a tu Drive se guarda cifrado en la base de datos de COMPALE y nunca sale del servidor: ni tu contraseña ni tu token son visibles para nadie. El resto de datos (tus listas, notas y la configuración de tus storages) se guarda en Google Firebase. Puedes leer todos los detalles en nuestra política de privacidad.",
  },
  {
    q: "¿En qué se diferencia de conectar Cloudflare R2?",
    a: "Con Cloudflare R2 conectas tu propio bucket con sus credenciales, ideal si ya tienes tu infraestructura. Con Google Drive no necesitas configurar nada técnico: autorizas con tu cuenta de Google y listo. Puedes tener ambos tipos de storage en COMPALE a la vez.",
  },
  {
    q: "¿Cómo se ve mi cuota de Google Drive?",
    a: "Tus archivos se guardan en tu Drive, así que ocupan el espacio de tu plan de Google. Puedes ver tu cuota en la página de Google One, donde también puedes ampliar tu plan si lo necesitas.",
  },
  {
    q: "¿Puedo revocar el acceso más adelante?",
    a: "Sí. Puedes revocar el permiso desde tu cuenta de Google (Seguridad → Tus conexiones de terceros) o simplemente eliminar el storage dentro de COMPALE. Al hacerlo, la app deja de tener acceso a tu Drive.",
  },
]

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
}

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Cómo usar tu Google Drive como biblioteca multimedia con COMPALE",
  description,
  totalTime: "PT2M",
  step: howTo.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.title,
    text: step.text,
  })),
}

const links = [
  { href: "/media", label: "Empezar ahora: sección Media" },
  {
    href: "https://one.google.com/about/plans",
    label: "Planes y cuota de Google One",
  },
  {
    href: "https://myaccount.google.com/permissions",
    label: "Gestionar los permisos de tu cuenta de Google",
  },
  { href: "/politica-de-privacidad", label: "Política de privacidad" },
]

const cardClass =
  "rounded-2xl squircle border-2 border-black/10 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"

export default function DriveLandingPage() {
  return (
    <div className="px-4">
      {/* JSON-LD structured data for SEO, serialized from static content.
          React renders <script> children as raw text (no HTML escaping). */}
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>

      <section className="max-w-3xl mx-auto text-center pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-balance">
          Tu Google Drive, convertido en tu biblioteca multimedia personal
        </h1>
        <p className="mt-5 text-lg text-text/70 leading-relaxed max-w-2xl mx-auto">
          Conecta tu Google Drive a COMPALE y reproduce tus vídeos y tu música
          en streaming, hojea tus fotos y sube archivos nuevos directamente a tu
          Drive. Sin instalar nada, sin mover tus archivos de sitio y con el
          acceso cifrado de principio a fin.
        </p>
        <LoginButton
          redirectTo="/media"
          accent="blue"
          label="Conectar mi Google Drive"
          className="max-w-sm mx-auto mt-8"
        />
        <p className="text-xs text-text/40 mt-4">
          Gratis · Sin instalación · Con tu cuenta de Google
        </p>
      </section>

      <section className="max-w-4xl mx-auto py-12" aria-label="Ventajas">
        <h2 className="text-2xl font-bold text-center mb-8">
          Tu Drive, con superpoderes
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

      <section className="max-w-4xl mx-auto py-12" aria-label="Cómo empezar">
        <h2 className="text-2xl font-bold text-center mb-2">
          Cómo usar tu Drive como biblioteca multimedia
        </h2>
        <p className="text-text/60 text-center text-sm mb-8">
          Menos de dos minutos, sin tocar nada de configuración técnica.
        </p>
        <ol className="grid sm:grid-cols-2 gap-4 list-none">
          {howTo.map((step, index) => (
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

      <section className="max-w-4xl mx-auto py-12" aria-label="Enlaces útiles">
        <h2 className="text-2xl font-bold text-center mb-8">Enlaces útiles</h2>
        <ul className="max-w-xl mx-auto flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:border-blue-400 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="max-w-3xl mx-auto py-12"
        aria-label="Preguntas frecuentes"
      >
        <h2 className="text-2xl font-bold text-center mb-8">
          Preguntas frecuentes sobre Google Drive en COMPALE
        </h2>
        <div className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="rounded-2xl squircle border-2 border-black/10 bg-white px-5 py-4 shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
            >
              <summary className="cursor-pointer font-bold text-sm sm:text-base">
                {faq.q}
              </summary>
              <p className="mt-3 text-sm text-text/60 leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto text-center pt-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          Conecta tu Drive hoy mismo
        </h2>
        <p className="text-text/60 mb-6">
          Entra con Google, añade tu Drive como storage y empieza a reproducir
          en menos de un minuto.
        </p>
        <LoginButton
          redirectTo="/media"
          accent="blue"
          label="Conectar mi Google Drive"
          className="max-w-sm mx-auto"
        />
      </section>
    </div>
  )
}
