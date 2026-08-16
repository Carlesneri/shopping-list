"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { createMediaStorage } from "@/lib/actions/media"
import { IconX } from "@tabler/icons-react"

const inputClass =
  "border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-blue"

export function CreateStorageForm({ onClose }: { onClose?: () => void }) {
  const [title, setTitle] = useState("")
  const [accountId, setAccountId] = useState("")
  const [accessKeyId, setAccessKeyId] = useState("")
  const [secretAccessKey, setSecretAccessKey] = useState("")
  const [bucket, setBucket] = useState("")
  const [s3ApiEndpoint, setS3ApiEndpoint] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const isSubmitDisabled =
    !title.trim() ||
    !accountId.trim() ||
    !accessKeyId.trim() ||
    !secretAccessKey.trim() ||
    !bucket.trim() ||
    !s3ApiEndpoint.trim()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      await createMediaStorage(formData)
      if (onClose) {
        onClose()
      } else {
        setTitle("")
        setAccountId("")
        setAccessKeyId("")
        setSecretAccessKey("")
        setBucket("")
        setS3ApiEndpoint("")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold">Añadir storage</h2>
          <p className="text-text/60 text-sm">
            Configura tu almacenamiento Cloudflare R2.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-text/60 transition hover:text-text"
            aria-label="Cerrar formulario"
          >
            <IconX size={20} />
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <input type="hidden" name="provider" value="cloudflare-r2" />
        <input type="hidden" name="stay" value="1" />
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Fotos de familia"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="accountId">
            Account ID
          </label>
          <input
            id="accountId"
            name="accountId"
            type="text"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="accessKeyId">
            Access Key ID
          </label>
          <input
            id="accessKeyId"
            name="accessKeyId"
            type="text"
            value={accessKeyId}
            onChange={(event) => setAccessKeyId(event.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="secretAccessKey">
            Secret Access Key
          </label>
          <input
            id="secretAccessKey"
            name="secretAccessKey"
            type="password"
            value={secretAccessKey}
            onChange={(event) => setSecretAccessKey(event.target.value)}
            placeholder="••••••••••••••••"
            className={inputClass}
            autoComplete="new-password"
          />
          <p className="text-text/50 text-xs">
            Se guarda cifrada en la base de datos.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="bucket">
            Bucket
          </label>
          <input
            id="bucket"
            name="bucket"
            type="text"
            value={bucket}
            onChange={(event) => setBucket(event.target.value)}
            placeholder="mi-bucket"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="s3ApiEndpoint">
            Endpoint R2
          </label>
          <input
            id="s3ApiEndpoint"
            name="S3APIendpoint"
            type="url"
            value={s3ApiEndpoint}
            onChange={(event) => setS3ApiEndpoint(event.target.value)}
            placeholder="https://<account>.r2.cloudflarestorage.com"
            className={inputClass}
          />
        </div>

        <Button
          type="submit"
          variant="blue"
          disabled={isSubmitDisabled || submitting}
          className="w-fit"
        >
          {submitting ? "Añadiendo…" : "Añadir storage"}
        </Button>
      </form>
    </div>
  )
}
