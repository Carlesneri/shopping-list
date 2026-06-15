export function validateListInput(title: string, market: string) {
  if (!title.trim()) throw new Error("El título es requerido")
  if (!market.trim()) throw new Error("El mercado es requerido")
  return { title: title.trim(), market: market.trim() }
}
