import { forwardRef, type InputHTMLAttributes } from "react"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const baseClasses =
      "w-full rounded-md border-2 border-black px-3 py-2 font-sans focus:outline-none focus:border-primary"
    const errorClasses = error ? "border-red-500" : ""
    const combinedClasses = `${baseClasses} ${errorClasses} ${className}`

    if (label) {
      return (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text/70">{label}</span>
          <input ref={ref} className={combinedClasses} {...props} />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </label>
      )
    }

    return (
      <>
        <input ref={ref} className={combinedClasses} {...props} />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </>
    )
  },
)

Input.displayName = "Input"
