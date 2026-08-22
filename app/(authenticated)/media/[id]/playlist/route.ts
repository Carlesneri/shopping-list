import { auth } from "@/auth"
import { getMediaEntryUrl } from "@/lib/actions/media"

interface Props {
  params: Promise<{ id: string }>
}

/** Serves a .m3u playlist containing a presigned URL, as an attachment.
 * Old Android TV browsers can't download blob: URLs, but handle this fine. */
export async function GET(request: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response("No autenticado", { status: 401 })
  }

  const key = new URL(request.url).searchParams.get("key")
  if (!key) {
    return new Response("Falta el parámetro key", { status: 400 })
  }

  const { id } = await params

  try {
    const url = await getMediaEntryUrl(id, key)
    const baseName = (key.split("/").at(-1) ?? key).replace(/\.[^.]+$/, "")
    const fileName = `${baseName}.m3u`
    const body = `#EXTM3U\n#EXTINF:-1,${baseName}\n${url}\n`

    return new Response(body, {
      headers: {
        "Content-Type": "audio/x-mpegurl; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error(`[media:playlist] failed for ${id}/${key}`, error)
    return new Response("No se pudo generar el playlist", { status: 500 })
  }
}
