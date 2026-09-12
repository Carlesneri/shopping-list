import Image from "next/image"
import Link from "next/link"
import { IconCloud, IconFileText, IconShoppingCart } from "@tabler/icons-react"
import { LoginButton } from "@/components/landing/LoginButton"

const sections = [
  {
    href: "/compras",
    title: "Listas de la compra",
    text: "Comprad en equipo con listas que se actualizan en tiempo real.",
    icon: IconShoppingCart,
    iconBg: "bg-purple/10 text-purple",
  },
  {
    href: "/notas",
    title: "Notas compartidas",
    text: "Notas con formato que editáis a la vez, siempre sincronizadas.",
    icon: IconFileText,
    iconBg: "bg-orange/10 text-orange",
  },
  {
    href: "/media",
    title: "Tu media",
    text: "Vídeos y música de tu nube, organizados y listos para reproducir.",
    icon: IconCloud,
    iconBg: "bg-blue/10 text-blue",
  },
]

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "COMPALE",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description:
    "App colaborativa gratuita: listas de la compra compartidas, notas colaborativas y biblioteca multimedia en streaming.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
})

export function HomeLanding() {
  return (
    <div className="px-4">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static, self-produced JSON-LD for structured data
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <section className="max-w-3xl mx-auto text-center py-16 sm:py-20">
        <Image
          src="/compale.png"
          alt="COMPALE — lista de la compra colaborativa"
          width={480}
          height={340}
          priority
          className="h-auto w-full max-w-xs sm:max-w-sm mx-auto object-contain"
        />
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mt-6 text-balance">
          Tu app colaborativa
        </h1>
        <p className="mt-5 text-lg text-text/70 leading-relaxed max-w-2xl mx-auto">
          Listas de la compra compartidas, notas colaborativas y tu biblioteca
          multimedia. Todo en una app, gratis y siempre sincronizado.
        </p>
        <LoginButton className="max-w-sm mx-auto mt-8" />
        <p className="text-xs text-text/40 mt-4">
          Gratis · Sin instalación · Con tu cuenta de Google
        </p>
      </section>

      <section className="max-w-4xl mx-auto py-12" aria-label="Secciones">
        <h2 className="text-2xl font-bold text-center mb-8">
          Tres apps en una
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {sections.map((section) => {
            const IconCmp = section.icon
            return (
              <Link
                key={section.href}
                href={section.href}
                className="rounded-2xl border-2 border-black/10 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-transform"
              >
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${section.iconBg}`}
                >
                  <IconCmp size={24} strokeWidth={2.2} />
                </div>
                <h3 className="font-bold mb-1">{section.title}</h3>
                <p className="text-sm text-text/60 leading-relaxed">
                  {section.text}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="max-w-2xl mx-auto text-center py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          ¿Listo para empezar?
        </h2>
        <p className="text-text/60 mb-6">
          Entra con Google y crea tu primera lista o nota en menos de un minuto.
        </p>
        <LoginButton className="max-w-sm mx-auto" />
      </section>
    </div>
  )
}
