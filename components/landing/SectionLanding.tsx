import type { ComponentType } from "react"
import { LoginButton, type Accent } from "@/components/landing/LoginButton"

export interface LandingFeature {
  icon: ComponentType<{
    size?: number | string
    stroke?: number
    strokeWidth?: number | string
  }>
  title: string
  text: string
}

export interface LandingStep {
  title: string
  text: string
}

export interface SectionLandingConfig {
  h1: string
  subtitle: string
  accent: Accent
  features: LandingFeature[]
  steps: LandingStep[]
}

const iconStyles: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  purple: "bg-purple/10 text-purple",
  orange: "bg-orange/10 text-orange",
  blue: "bg-blue/10 text-blue",
}

const stepStyles: Record<Accent, string> = {
  primary: "bg-primary text-white",
  purple: "bg-purple text-white",
  orange: "bg-orange text-white",
  blue: "bg-blue text-white",
}

export function SectionLanding({
  config,
  redirectTo,
}: {
  config: SectionLandingConfig
  redirectTo: "/" | "/compras" | "/notas" | "/media"
}) {
  return (
    <div className="px-4">
      <section className="max-w-3xl mx-auto text-center pt-8 pb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-balance">
          {config.h1}
        </h1>
        <p className="mt-5 text-lg text-text/70 leading-relaxed max-w-2xl mx-auto">
          {config.subtitle}
        </p>
        <LoginButton
          redirectTo={redirectTo}
          accent={config.accent}
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
        <div className="grid sm:grid-cols-3 gap-4">
          {config.features.map((feature) => {
            const IconCmp = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-2xl squircle border-2 border-black/10 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(0,0,0,0.06)]"
              >
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${iconStyles[config.accent]}`}
                >
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

      <section className="max-w-4xl mx-auto py-12" aria-label="Cómo funciona">
        <h2 className="text-2xl font-bold text-center mb-8">Cómo funciona</h2>
        <ol className="grid sm:grid-cols-3 gap-4 list-none">
          {config.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl squircle bg-black/[0.03] p-6 text-center"
            >
              <span
                className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold mb-3 ${stepStyles[config.accent]}`}
              >
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
          redirectTo={redirectTo}
          accent={config.accent}
          className="max-w-sm mx-auto"
        />
      </section>
    </div>
  )
}
