"use client"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { FabButton } from "./FabButton"
import { twMerge } from "tailwind-merge"
import { IconPlus } from "@tabler/icons-react"

type Color = "green" | "blue" | "purple" | "orange" | "pink"
type Size = "sm" | "lg"

const positionVariants = cva("absolute pointer-events-auto", {
  variants: {
    position: {
      "bottom-right": "bottom-6 right-0",
      "bottom-left": "bottom-6 left-0",
      "top-right": "top-6 right-0",
      "top-left": "top-6 left-0",
    },
  },
  defaultVariants: {
    position: "bottom-right",
  },
})

type Position = VariantProps<typeof positionVariants>["position"]

interface AddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: Color
  size?: Size
  children?: ReactNode
  ariaLabel?: string
  fixed?: boolean
  position?: Position
  href?: string
}

export function AddButton({
  color = "blue",
  size = "lg",
  className,
  children,
  ariaLabel = "Añadir",
  fixed = false,
  position = "bottom-right",
  href,
  ...props
}: AddButtonProps) {
  const fab = (
    <FabButton
      color={color}
      size={size}
      className={twMerge(className)}
      aria-label={ariaLabel}
      {...props}
    >
      {children ?? <IconPlus size={size === "sm" ? 18 : 28} />}
    </FabButton>
  )

  const button = href ? <Link href={href}>{fab}</Link> : <>{fab}</>

  if (!fixed) {
    return button
  }

  return (
    <div className="fixed inset-0 z-50 max-w-3xl mx-auto w-full pointer-events-none">
      <div className={positionVariants({ position })}>
        {button}
      </div>
    </div>
  )
}