import type { ButtonHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { twMerge } from "tailwind-merge"

// Full literal class strings (incl. arbitrary `shadow-[…]` values) so Tailwind's
// JIT scanner can detect them — shadow shades match the palette in globals.css.
export const buttonVariants = cva(
  "font-bold rounded-md px-4 py-2 cursor-pointer transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-[0_4px_0_0_#3a8a00] hover:translate-y-px hover:shadow-[0_3px_0_0_#3a8a00] active:translate-y-1 active:shadow-none",
        secondary:
          "bg-secondary text-white shadow-[0_4px_0_0_#a14fd0] hover:translate-y-px hover:shadow-[0_3px_0_0_#a14fd0] active:translate-y-1 active:shadow-none",
        danger:
          "bg-danger text-white shadow-[0_4px_0_0_#b03030] hover:translate-y-px hover:shadow-[0_3px_0_0_#b03030] active:translate-y-1 active:shadow-none",
        warning:
          "bg-warning text-text shadow-[0_4px_0_0_#cc9e00] hover:translate-y-px hover:shadow-[0_3px_0_0_#cc9e00] active:translate-y-1 active:shadow-none",
        blue: "bg-blue text-white shadow-[0_4px_0_0_#2e6aad] hover:translate-y-px hover:shadow-[0_3px_0_0_#2e6aad] active:translate-y-1 active:shadow-none",
        purple:
          "bg-purple text-white shadow-[0_4px_0_0_#5b1fb5] hover:translate-y-px hover:shadow-[0_3px_0_0_#5b1fb5] active:translate-y-1 active:shadow-none",
        orange:
          "bg-orange text-white shadow-[0_4px_0_0_#c45c0a] hover:translate-y-px hover:shadow-[0_3px_0_0_#c45c0a] active:translate-y-1 active:shadow-none",
        pink: "bg-pink text-white shadow-[0_4px_0_0_#b01268] hover:translate-y-px hover:shadow-[0_3px_0_0_#b01268] active:translate-y-1 active:shadow-none",
        ghost:
          "bg-transparent border-2 border-primary text-primary hover:bg-primary/10 transition-colors",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({
  variant,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(buttonVariants({ variant }), className)}
      {...props}
    >
      {children}
    </button>
  )
}
