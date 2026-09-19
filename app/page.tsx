import Image from "next/image"
import Link from "next/link"
import { auth } from "@/auth"
import { getShortcuts } from "@/lib/actions/shortcuts"
import { ShortcutCard } from "./ShortcutCard"
import { HomeLanding } from "@/components/landing/HomeLanding"
import { IconShoppingCart, IconFileText, IconCloud } from "@tabler/icons-react"

function NavCard({
  title,
  color,
  icon: Icon,
  href,
}: {
  title: string
  color: string
  icon: typeof IconShoppingCart
  href: string
}) {
  const bgColors: Record<string, string> = {
    purple: "bg-purple hover:bg-purple/90",
    orange: "bg-orange hover:bg-orange/90",
    blue: "bg-blue hover:bg-blue/90",
  }
  const textColors: Record<string, string> = {
    purple: "text-white",
    orange: "text-white",
    blue: "text-white",
  }
  const iconColors: Record<string, string> = {
    purple: "text-white",
    orange: "text-white",
    blue: "text-white",
  }
  const shadowColors: Record<string, string> = {
    purple: "shadow-[0_4px_0_0_#5b1fb5] hover:shadow-[0_3px_0_0_#5b1fb5]",
    orange: "shadow-[0_4px_0_0_#c45c0a] hover:shadow-[0_3px_0_0_#c45c0a]",
    blue: "shadow-[0_4px_0_0_#2e6aad] hover:shadow-[0_3px_0_0_#2e6aad]",
  }

  return (
    <Link
      href={href}
      className={`relative group flex items-center gap-4 p-5 rounded-2xl ${bgColors[color] || bgColors.purple} ${textColors[color] || textColors.purple} ${shadowColors[color] || shadowColors.purple} transition-all duration-200 hover:translate-y-px active:translate-y-1 active:shadow-none w-full max-w-lg`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
        <Icon
          size={28}
          className={`${iconColors[color] || iconColors.purple}`}
          strokeWidth={2.5}
        />
      </div>
      <span className="font-bold text-lg text-left flex-1">{title}</span>
    </Link>
  )
}

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <HomeLanding />
  }
  const shortcuts = await getShortcuts()

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 pt-8 pb-16 text-center">
      <div className="max-w-lg mx-auto w-full">
        {session.user?.name && (
          <h2 className="text-2xl font-bold mb-6">Hola, {session.user.name}</h2>
        )}

        <div className="flex flex-col gap-3 items-center">
          <NavCard
            title="Mis listas"
            color="purple"
            icon={IconShoppingCart}
            href="/compras"
          />
          <NavCard
            title="Mis notas"
            color="orange"
            icon={IconFileText}
            href="/notas"
          />
          <NavCard
            title="Mi media"
            color="blue"
            icon={IconCloud}
            href="/media"
          />
        </div>

        {shortcuts.length > 0 && (
          <div className="mt-8 w-full max-w-lg">
            <h3 className="text-sm font-semibold text-text/60 mb-3 text-left uppercase tracking-wide">
              Accesos directos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shortcuts.map((shortcut) => {
                let href = ""
                if (shortcut.type === "list")
                  href = `/compras/${shortcut.targetId}`
                else if (shortcut.type === "nota")
                  href = `/notas/${shortcut.targetId}`
                else if (shortcut.type === "storage")
                  href = `/media/${shortcut.targetId}`
                return (
                  <ShortcutCard
                    key={shortcut.id}
                    title={shortcut.title}
                    color={shortcut.color}
                    iconName={shortcut.icon}
                    href={href}
                    shortcutId={shortcut.id}
                    type={shortcut.type}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Image
        src="/compale.png"
        alt="COMPALE — lista de la compra colaborativa"
        width={480}
        height={340}
        priority
        className="h-auto w-full max-w-sm object-contain"
      />
      <h1>
        <span className="text-lg font-semibold text-gray-600">
          Tu app colaborativa
        </span>
      </h1>
    </div>
  )
}
