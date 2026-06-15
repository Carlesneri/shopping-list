import { IconUfoFilled } from "@tabler/icons-react"
import { twMerge } from "tailwind-merge"

interface LoaderProps {
  size?: number
  label?: string
  className?: string
}

export function Loader({ size = 36, label, className }: LoaderProps) {
  return (
    <div
      className={twMerge(
        "flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <IconUfoFilled size={size} className="animate-ufo text-primary" />
      {label && <p className="text-text/60">{label}</p>}
    </div>
  )
}
