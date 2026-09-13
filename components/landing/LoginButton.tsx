import { signIn } from "@/auth"
import { IconUser } from "@tabler/icons-react"

export type Accent = "primary" | "purple" | "orange" | "blue"

const buttonStyles: Record<Accent, string> = {
  primary:
    "bg-primary shadow-[0_4px_0_0_#3a8a00] hover:shadow-[0_3px_0_0_#3a8a00]",
  purple:
    "bg-purple shadow-[0_4px_0_0_#5b1fb5] hover:shadow-[0_3px_0_0_#5b1fb5]",
  orange:
    "bg-orange shadow-[0_4px_0_0_#c45c0a] hover:shadow-[0_3px_0_0_#c45c0a]",
  blue: "bg-blue shadow-[0_4px_0_0_#2e6aad] hover:shadow-[0_3px_0_0_#2e6aad]",
}

interface LoginButtonProps {
  /** Path to return to after sign-in (internal, from a fixed allowlist of routes). */
  redirectTo?: "/" | "/compras" | "/notas" | "/media"
  accent?: Accent
  label?: string
  className?: string
}

export function LoginButton({
  redirectTo = "/",
  accent = "primary",
  label = "Iniciar sesión con Google",
  className = "",
}: LoginButtonProps) {
  async function login() {
    "use server"
    await signIn("google", { redirectTo })
  }

  return (
    <form action={login} className={className}>
      <button
        type="submit"
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-white font-bold text-lg ${buttonStyles[accent]} hover:translate-y-px active:translate-y-0.5 active:shadow-none transition-all cursor-pointer`}
      >
        <IconUser size={22} strokeWidth={2.5} />
        <span>{label}</span>
      </button>
    </form>
  )
}
