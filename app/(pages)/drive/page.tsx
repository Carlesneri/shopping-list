import type { Metadata } from "next"
import {
  IconDeviceTv,
  IconFolderShare,
  IconShieldLock,
  IconUpload,
} from "@tabler/icons-react"
import { ProviderLanding } from "@/components/landing/ProviderLanding"
import type { ProviderLandingConfig } from "@/components/landing/ProviderLanding"

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

const landingConfig: ProviderLandingConfig = {
  h1: "Tu Google Drive, convertido en tu biblioteca multimedia personal",
  intro:
    "Conecta tu Google Drive a COMPALE y reproduce tus vídeos y tu música en streaming, hojea tus fotos y sube archivos nuevos directamente a tu Drive. Sin instalar nada, sin mover tus archivos de sitio y con el acceso cifrado de principio a fin.",
  loginLabel: "Conectar mi Google Drive",
  accent: "blue",
  featuresTitle: "Tu Drive, con superpoderes",
  features: [
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
  ],
  howToName: "Cómo usar tu Google Drive como biblioteca multimedia con COMPALE",
  howToTitle: "Cómo usar tu Drive como biblioteca multimedia",
  howToSubtitle:
    "Menos de dos minutos, sin tocar nada de configuración técnica.",
  howTo: [
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
  ],
  faqsTitle: "Preguntas frecuentes sobre Google Drive en COMPALE",
  faqs: [
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
  ],
  links: [
    { href: "/media", label: "Empezar ahora: sección Media" },
    {
      href: "/r2",
      label: "¿Prefieres tu propia nube? Ver la guía de Cloudflare R2",
    },
    {
      href: "https://one.google.com/about/plans",
      label: "Planes y cuota de Google One",
    },
    {
      href: "https://myaccount.google.com/permissions",
      label: "Gestionar los permisos de tu cuenta de Google",
    },
    { href: "/", label: "Descubre todo lo que ofrece COMPALE" },
    { href: "/politica-de-privacidad", label: "Política de privacidad" },
  ],
  ctaTitle: "Conecta tu Drive hoy mismo",
  ctaText:
    "Entra con Google, añade tu Drive como storage y empieza a reproducir en menos de un minuto.",
}

export default function DriveLandingPage() {
  return <ProviderLanding config={landingConfig} redirectTo="/media" />
}
