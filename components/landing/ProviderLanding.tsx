import Link from "next/link"
import { LoginButton, type Accent } from "@/components/landing/LoginButton"
import type {
  LandingFeature,
  LandingStep,
} from "@/components/landing/SectionLanding"

export interface LandingLink {
  href: string
  label: string
}

export interface ProviderLandingConfig {
  h1: string
  intro: string
  loginLabel: string
  featuresTitle: string
  features: LandingFeature[]
  howToName: string
  howToTitle: string
  howToSubtitle: string
  howTo: LandingStep[]
  faqsTitle: string
  faqs: { q: string; a: string }[]
  links: LandingLink[]
  ctaTitle: string
  ctaText: string
  accent: Accent
}

const cardClass =
  "rounded-2xl squircle border-2 border-black/10 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"

export function ProviderLanding({
  config,
  redirectTo,
}: {
  config: ProviderLandingConfig
  redirectTo: "/" | "/compras" | "/notas" | "/media"
}) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: config.howToName,
    description: config.intro,
    totalTime: "PT2M",
    step: config.howTo.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
    })),
  }

  return (
    <div className="px-4">
      {/* JSON-LD structured data for SEO, serialized from static content.
          React renders <script> children as raw text (no HTML escaping). */}
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>

      <section className="max-w-3xl mx-auto text-center pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-balance">
          {config.h1}
        </h1>
        <p className="mt-5 text-lg text-text/70 leading-relaxed max-w-2xl mx-auto">
          {config.intro}
        </p>
        <LoginButton
          redirectTo={redirectTo}
          accent={config.accent}
          label={config.loginLabel}
          className="max-w-sm mx-auto mt-8"
        />
        <p className="text-xs text-text/40 mt-4">
          Gratis · Sin instalación · Con tu cuenta de Google
        </p>
      </section>

      <section className="max-w-4xl mx-auto py-12" aria-label="Ventajas">
        <h2 className="text-2xl font-bold text-center mb-8">
          {config.featuresTitle}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {config.features.map((feature) => {
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
          {config.howToTitle}
        </h2>
        <p className="text-text/60 text-center text-sm mb-8">
          {config.howToSubtitle}
        </p>
        <ol className="grid sm:grid-cols-2 gap-4 list-none">
          {config.howTo.map((step, index) => (
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

      <section
        className="max-w-3xl mx-auto py-12"
        aria-label="Preguntas frecuentes"
      >
        <h2 className="text-2xl font-bold text-center mb-8">
          {config.faqsTitle}
        </h2>
        <div className="flex flex-col gap-4">
          {config.faqs.map((faq) => (
            <details key={faq.q} className={cardClass}>
              <summary className="cursor-pointer font-bold text-sm sm:text-base">
                {faq.q}
              </summary>
              <p className="mt-3 text-sm text-text/60 leading-relaxed text-left">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto py-12" aria-label="Enlaces útiles">
        <h2 className="text-2xl font-bold text-center mb-8">Enlaces útiles</h2>
        <ul className="max-w-xl mx-auto flex flex-col gap-2">
          {config.links.map((link) => (
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

      <section className="max-w-2xl mx-auto text-center pt-8 pb-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          {config.ctaTitle}
        </h2>
        <p className="text-text/60 mb-6">{config.ctaText}</p>
        <LoginButton
          redirectTo={redirectTo}
          accent={config.accent}
          label={config.loginLabel}
          className="max-w-sm mx-auto"
        />
      </section>
    </div>
  )
}
