import type { ButtonHTMLAttributes, ReactNode } from "react"
import { twMerge } from "tailwind-merge"

const colorClasses = {
  green:  "bg-primary shadow-[0_4px_0_0_#3a8a00] hover:shadow-[0_3px_0_0_#3a8a00]",
  blue:   "bg-blue    shadow-[0_4px_0_0_#2e6aad] hover:shadow-[0_3px_0_0_#2e6aad]",
  purple: "bg-purple  shadow-[0_4px_0_0_#5b1fb5] hover:shadow-[0_3px_0_0_#5b1fb5]",
  orange: "bg-orange  shadow-[0_4px_0_0_#c45c0a] hover:shadow-[0_3px_0_0_#c45c0a]",
  pink:   "bg-pink    shadow-[0_4px_0_0_#b01268] hover:shadow-[0_3px_0_0_#b01268]",
} as const

const sizeClasses = {
  sm: "w-9 h-9",
  lg: "w-14 h-14",
} as const

type Color = keyof typeof colorClasses
type Size = keyof typeof sizeClasses

interface FabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: Color
  size?: Size
  children?: ReactNode
}

export function FabButton({ color = "green", size = "lg", className, ...props }: FabButtonProps) {
  return (
    <button
      className={twMerge(
        "rounded-full flex items-center justify-center text-white cursor-pointer transition-transform hover:translate-y-px active:translate-y-1 active:shadow-none",
        colorClasses[color],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
