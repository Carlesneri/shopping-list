"use client"

import { useEffect } from "react"
import { IconAlertCircle, IconDatabase, IconX, IconVideo } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"

interface Props {
  fileName: string
  onApprove: () => void
  onDeny: () => void
  onClose: () => void
}

export function HlsConsentDialog({
  fileName,
  onApprove,
  onDeny,
  onClose,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Permitir caché HLS"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-black/10 bg-white shadow-[0_8px_0_0_#0001] animate-[scale_0.15s_ease-out]">
        {/* Header — matches app's bold header style (like MediaPlayer) */}
        <div className="flex items-center justify-between gap-3 bg-blue px-5 py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              <IconVideo size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-bold leading-none">Transcodificación necesaria</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white/80 transition-colors hover:bg-white/15 hover:text-white border border-white/10"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {/* File pill — matches list item style */}
          <div className="flex items-start gap-3 rounded-2xl border-2 border-black/10 bg-zinc-50 px-4 py-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white border-2 border-black/10 text-text/60">
              <IconVideo size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-text/50">Archivo</p>
              <p className="mt-1 break-all font-mono text-xs font-medium text-text leading-relaxed">
                {fileName}
              </p>
            </div>
          </div>

          {/* Info card — uses app's card style with colored border */}
          <div className="rounded-2xl border-2 border-blue/15 bg-blue/[0.04] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue text-white shadow-[0_3px_0_0_#2e6aad]">
                <IconDatabase size={16} />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold leading-snug text-text">
                  Se creará una caché HLS en tu bucket
                </p>
                <p className="text-xs leading-relaxed text-text/70">
                  Para mostrar la <span className="font-bold text-text">duración completa</span> y permitir <span className="font-bold text-text">buscar</span> en vídeos{" "}
                  <span className="rounded bg-white px-1 py-0.5 font-mono text-[11px] border border-black/10">avi / mkv / mpg</span>, se genera una versión{" "}
                  <span className="font-bold text-blue">HLS</span> progresiva.
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-white border-2 border-black/10 px-3 py-2">
                  <span className="font-mono text-[11px] font-bold text-text/60">R2</span>
                  <span className="font-mono text-xs text-text break-all">.hls-cache/&lt;ruta-del-vídeo&gt;/</span>
                </div>
                <div className="flex gap-2 rounded-xl bg-amber-50 border-2 border-amber-200 px-3 py-2.5">
                  <IconAlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-xs leading-relaxed text-amber-900">
                    <span className="font-bold">Ocupa espacio adicional</span> (~mismo tamaño que el vídeo). Se elimina al borrar el vídeo o puedes borrar <span className="font-mono bg-white px-1 rounded border border-amber-200">.hls-cache/</span> manualmente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs font-medium text-text/50">
            ¿Permitir el uso de caché para este vídeo?
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 bg-zinc-50 px-5 py-4 border-t-2 border-black/5">
          <button
            type="button"
            onClick={onDeny}
            className="cursor-pointer rounded-2xl border-2 border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-text/70 transition-all hover:bg-zinc-50 hover:text-text active:translate-y-px"
          >
            Cancelar
          </button>
          <Button variant="blue" onClick={onApprove} className="px-6 py-2.5 text-sm shadow-[0_4px_0_0_#2e6aad]">
            Permitir y continuar
          </Button>
        </div>
      </div>
    </div>
  )
}
