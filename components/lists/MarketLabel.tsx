import Image from "next/image"
import { IconShoppingCart } from "@tabler/icons-react"

/** Known market logos, matched case-insensitively against the market name.
 * `width`/`height` are the intrinsic image dimensions (aspect-ratio rendering). */
const MARKET_LOGOS: {
  match: string
  src: string
  alt: string
  width: number
  height: number
}[] = [
  {
    match: "mercadona",
    src: "/assets/mercadona.png",
    alt: "Mercadona",
    width: 960,
    height: 136,
  },
  {
    match: "leroy merlin",
    src: "/assets/leroy-merlin.webp",
    alt: "Leroy Merlin",
    width: 250,
    height: 151,
  },
  {
    match: "decathlon",
    src: "/assets/decathlon.png",
    alt: "Decathlon",
    width: 330,
    height: 96,
  },
  {
    match: "carrefour",
    src: "/assets/carrefour.png",
    alt: "Carrefour",
    width: 492,
    height: 83,
  },
  {
    match: "consum",
    src: "/assets/consum.png",
    alt: "Consum",
    width: 330,
    height: 194,
  },
]

/** Whether we have a logo for this market. */
export function marketHasLogo(market: string) {
  return MARKET_LOGOS.some(
    (entry) => market.trim().toLowerCase() === entry.match,
  )
}

/** Market name with its logo when we have one, cart icon otherwise.
 * `logoHeight` renders the full logo (aspect-ratio preserved) at that height;
 * `size` is the fallback icon size and the default logo height. */
export function MarketLabel({
  market,
  size = 14,
  logoHeight,
}: {
  market: string
  size?: number
  logoHeight?: number
}) {
  const logo = MARKET_LOGOS.find(
    (entry) => market.trim().toLowerCase() === entry.match,
  )
  if (logo) {
    const height = logoHeight ?? size
    return (
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        style={{ height, width: "auto" }}
        className="shrink-0"
      />
    )
  }
  return <IconShoppingCart size={size} />
}
