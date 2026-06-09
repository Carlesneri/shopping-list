import type { ButtonHTMLAttributes } from "react"
import { twMerge } from "tailwind-merge"

type Variant = "primary" | "ghost" | "danger"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white font-bold rounded-md px-4 py-2 shadow-[0_4px_0_0_#3a8a00] hover:translate-y-px hover:shadow-[0_3px_0_0_#3a8a00] active:translate-y-1 active:shadow-none transition-transform",
  ghost:
    "bg-transparent border-2 border-primary text-primary font-bold rounded-md px-4 py-2 hover:bg-primary/10 transition-colors",
  danger:
    "bg-danger text-white font-bold rounded-md px-4 py-2 shadow-[0_4px_0_0_#b03030] hover:translate-y-px hover:shadow-[0_3px_0_0_#b03030] active:translate-y-1 active:shadow-none transition-transform",
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button className={twMerge(variants[variant], className)} {...props}>
      {children}
    </button>
  )
}
