"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/Button"
import { updateMediaConfig } from "@/lib/actions/media"

interface Props {
  mediaId: string
  config: {
    accountId: string
    accessKeyId: string
    bucket: string
  }
}

const inputClass =
  "border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-purple"

export function StorageConfigForm({ mediaId, config }: Props) {
  const [accountId, setAccountId] = useState(config.accountId)
  const [accessKeyId, setAccessKeyId] = useState(config.accessKeyId)
  const [secretAccessKey, setSecretAccessKey] = useState("")
  const [bucket, setBucket] = useState(config.bucket)
  const [loading, setLoading] = useState(false)

  const isSubmitDisabled =
    loading || !accountId.trim() || !accessKeyId.trim() || !bucket.trim()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    setLoading(true)
    try {
      await updateMediaConfig(
        mediaId,
        accountId,
        accessKeyId,
        secretAccessKey,
        bucket,
      )
      setSecretAccessKey("")
      toast.success("Configuración actualizada")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al guardar la configuración",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 mb-8 pb-6 border-b border-black/10"
    >
      <h2 className="font-bold text-lg">Configuración de Cloudflare R2</h2>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-sm" htmlFor="settings-accountId">
          Account ID
        </label>
        <input
          id="settings-accountId"
          type="text"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-sm" htmlFor="settings-accessKeyId">
          Access Key ID
        </label>
        <input
          id="settings-accessKeyId"
          type="text"
          value={accessKeyId}
          onChange={(event) => setAccessKeyId(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          className="font-semibold text-sm"
          htmlFor="settings-secretAccessKey"
        >
          Secret Access Key
        </label>
        <input
          id="settings-secretAccessKey"
          type="password"
          value={secretAccessKey}
          onChange={(event) => setSecretAccessKey(event.target.value)}
          placeholder="••••••••••••"
          className={inputClass}
          autoComplete="new-password"
        />
        <p className="text-text/50 text-xs">
          Dejar vacío para mantener el actual.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold text-sm" htmlFor="settings-bucket">
          Bucket
        </label>
        <input
          id="settings-bucket"
          type="text"
          value={bucket}
          onChange={(event) => setBucket(event.target.value)}
          className={inputClass}
        />
      </div>
      <Button
        type="submit"
        variant="purple"
        disabled={isSubmitDisabled}
        className="w-fit"
      >
        {loading ? "Guardando…" : "Guardar configuración"}
      </Button>
    </form>
  )
}
