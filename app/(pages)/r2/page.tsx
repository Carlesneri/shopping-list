import type { Metadata } from "next"
import {
  IconDeviceTv,
  IconFolder,
  IconShieldLock,
  IconUpload,
} from "@tabler/icons-react"
import { ProviderLanding } from "@/components/landing/ProviderLanding"
import type { ProviderLandingConfig } from "@/components/landing/ProviderLanding"

const title = "Tu Cloudflare R2 como biblioteca multimedia — COMPALE"
const description =
  "Conecta tu bucket de Cloudflare R2 a COMPALE y organiza tus vídeos, series y música. Reprodúcelos en streaming desde el navegador, sube archivos y ten tu media bajo tu control. Gratis, con tus claves cifradas."

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "Cloudflare R2 multimedia",
    "reproducir vídeos de R2",
    "streaming desde Cloudflare R2",
    "biblioteca multimedia personal",
    "R2 como nas en la nube",
    "subir archivos a R2",
    "ver fotos de R2 online",
    "COMPALE Media",
  ],
  alternates: { canonical: "/r2" },
  openGraph: {
    title: `${title} — COMPALE`,
    description,
    url: "/r2",
    images: ["/compale.png"],
  },
}

const landingConfig: ProviderLandingConfig = {
  h1: "Tu nube Cloudflare R2, convertida en tu biblioteca multimedia personal",
  intro:
    "Conecta tu bucket de Cloudflare R2 a COMPALE y organiza tus vídeos, series y música. Reprodúcelos en streaming desde cualquier dispositivo, sube archivos nuevos y ten tu media bajo tu control, con las claves cifradas de principio a fin.",
  loginLabel: "Conectar mi Cloudflare R2",
  accent: "blue",
  featuresTitle: "Tu bucket, con superpoderes",
  features: [
    {
      icon: IconFolder,
      title: "Organizado",
      text: "Navega por las carpetas de tu bucket y encuentra al instante lo que quieres ver o escuchar.",
    },
    {
      icon: IconDeviceTv,
      title: "Streaming real",
      text: "Vídeos y música se reproducen en el navegador, sin descargarlos y con búsqueda dentro del vídeo.",
    },
    {
      icon: IconUpload,
      title: "Subida directa",
      text: "Arrastra tus archivos y se suben a tu bucket, en la carpeta que estés navegando.",
    },
    {
      icon: IconShieldLock,
      title: "Tus claves, cifradas",
      text: "Tus credenciales de R2 se guardan cifradas, nunca salen del servidor y puedes rotarlas cuando quieras.",
    },
  ],
  howToName:
    "Cómo usar tu Cloudflare R2 como biblioteca multimedia con COMPALE",
  howToTitle: "Cómo usar tu R2 como biblioteca multimedia",
  howToSubtitle:
    "Menos de dos minutos: solo necesitas las credenciales de tu bucket.",
  howTo: [
    {
      title: "Entra con tu cuenta de Google",
      text: "Un clic y dentro. COMPALE usa tu Google para identificar tu cuenta, nada más.",
    },
    {
      title: "Añade un storage y elige Cloudflare R2",
      text: "En la sección Media, pulsa añadir storage, ponle un nombre y pega tu Access Key, Secret Key y bucket.",
    },
    {
      title: "Sube o conecta tu contenido",
      text: "Sube archivos desde la app o usa los que ya tienes en tu bucket. COMPALE lista solo lo multimedia.",
    },
    {
      title: "Explora y reproduce",
      text: "Navega por tus carpetas y reproduce en streaming desde cualquier dispositivo.",
    },
  ],
  faqsTitle: "Preguntas frecuentes sobre Cloudflare R2 en COMPALE",
  faqs: [
    {
      q: "¿Es gratis usar mi Cloudflare R2 con COMPALE?",
      a: "Sí. COMPALE es gratis y tus archivos se quedan en tu propio bucket de R2, así que solo pagas el almacenamiento que ya tienes en Cloudflare. No duplicamos ni almacenamos tus archivos en ningún otro sitio.",
    },
    {
      q: "¿COMPALE guarda mis credenciales de R2?",
      a: "Sí, pero cifradas. El Access Key ID y el Secret Access Key se guardan cifrados en la base de datos de COMPALE y nunca salen del servidor: ni tu contraseña ni tus claves son visibles para nadie. Puedes rotar las credenciales en Cloudflare cuando quieras y actualizarlas en la página de ajustes del storage.",
    },
    {
      q: "¿Qué tipo de archivos puedo reproducir?",
      a: "Vídeos (mp4, mkv, mov, avi, webm…), imágenes (jpg, png, webp, gif, heic…) y audio (mp3, wav, flac, ogg…). La lista muestra solo archivos multimedia, para que veas tu biblioteca limpia y sin documentos de por medio.",
    },
    {
      q: "¿Puedo subir archivos desde COMPALE a mi bucket?",
      a: "Sí. Desde la app puedes subir vídeos, fotos y audio directamente a la carpeta que estés navegando de tu bucket, con archivos de hasta 5 GB por subida.",
    },
    {
      q: "¿Puedo tener varios buckets?",
      a: "Sí. Puedes crear tantos storages de R2 como quieras (por ejemplo, uno para películas y otro para música) y compartirlos con otras personas. Cada storage tiene su propia carpeta de navegación y sus ajustes.",
    },
    {
      q: "¿Cómo conecto mi bucket de R2?",
      a: "En el panel de Cloudflare, crea un token de API de R2 con permisos de lectura y escritura sobre tu bucket. Te dará un Access Key ID y un Secret Access Key: cópialos junto al nombre del bucket y pégualos en el formulario de COMPALE. Encontrarás toda la configuración en la página de ajustes del storage.",
    },
    {
      q: "¿Dónde se guardan mis datos?",
      a: "Tus archivos se quedan en tu bucket de Cloudflare y las claves de acceso se guardan cifradas en la base de datos de COMPALE. El resto de datos (tus listas, notas y la configuración de tus storages) se guarda en Google Firebase. Puedes leer todos los detalles en nuestra política de privacidad.",
    },
    {
      q: "¿En qué se diferencia de conectar Google Drive?",
      a: "Con Google Drive no necesitas configurar nada técnico: autorizas con tu cuenta y listo. Con Cloudflare R2 conectas tu propio bucket con sus credenciales, ideal si ya tienes tu infraestructura o quieres control total del almacenamiento. Puedes tener ambos tipos de storage en COMPALE a la vez.",
    },
    {
      q: "¿Puedo revocar el acceso más adelante?",
      a: "Sí. Puedes rotar o eliminar el token de R2 desde el panel de Cloudflare en cualquier momento, o simplemente eliminar el storage dentro de COMPALE. Al hacerlo, la app deja de tener acceso a tu bucket.",
    },
  ],
  links: [
    { href: "/media", label: "Empezar ahora: sección Media" },
    { href: "/drive", label: "¿Prefieres Google Drive? Ver la guía de Drive" },
    {
      href: "https://developers.cloudflare.com/r2/api/s3/tokens/",
      label: "Crear tokens de acceso para R2 (documentación de Cloudflare)",
    },
    { href: "/", label: "Descubre todo lo que ofrece COMPALE" },
    { href: "/politica-de-privacidad", label: "Política de privacidad" },
  ],
  ctaTitle: "Conecta tu R2 hoy mismo",
  ctaText:
    "Entra con Google, añade tu bucket como storage y empieza a reproducir en menos de un minuto.",
}

export default function R2LandingPage() {
  return <ProviderLanding config={landingConfig} redirectTo="/media" />
}
