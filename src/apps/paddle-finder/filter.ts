import data from './catalog.json'

export type Shape = 'standard' | 'elongated' | 'hybrid' | 'widebody'
export type Style = 'power' | 'control' | 'all-court'
export type WeightClass = 'light' | 'mid' | 'heavy'

export interface Paddle {
  id: string
  brand: string
  model: string
  shape: Shape
  weightOz: number
  thicknessMm: number
  style: Style
  levels: string[]
  year: number | null
  /** e.g. "USAP", "USAP/UPA-A", "UPA-A". */
  approval: string
  priceUsd: number
  pricePhp: number
  url: string
}

export const catalog = data.paddles as Paddle[]
export const catalogInfo = { lastReviewed: data.lastReviewed, note: data.note, source: data.source, usdToPhp: data.usdToPhp }
export const brands = [...new Set(catalog.map((p) => p.brand))].sort((a, b) => a.localeCompare(b))
export const MAX_COMPARE = 3

export function weightClass(oz: number): WeightClass {
  if (oz < 7.6) return 'light'
  if (oz > 8.2) return 'heavy'
  return 'mid'
}

/** Approved for USA Pickleball sanctioned play. */
export const isApproved = (p: Pick<Paddle, 'approval'>) => /USAP/.test(p.approval)

export interface Filters {
  query: string
  brand: string
  maxPrice: number
  weight: WeightClass | 'any'
  shape: Shape | 'any'
  style: Style | 'any'
  level: string
  sort: 'price-asc' | 'price-desc' | 'weight' | 'newest'
}

export const PRICE_FLOOR = Math.floor(Math.min(...catalog.map((p) => p.pricePhp)) / 1000) * 1000
export const PRICE_CEILING = Math.ceil(Math.max(...catalog.map((p) => p.pricePhp)) / 1000) * 1000

export const defaultFilters = (): Filters => ({
  query: '',
  brand: 'any',
  maxPrice: PRICE_CEILING,
  weight: 'any',
  shape: 'any',
  style: 'any',
  level: 'any',
  sort: 'price-asc',
})

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

export function applyFilters(list: Paddle[], f: Filters): Paddle[] {
  const q = normalize(f.query ?? '')
  const out = list.filter(
    (p) =>
      (!q || normalize(`${p.brand} ${p.model}`).includes(q)) &&
      (!f.brand || f.brand === 'any' || p.brand === f.brand) &&
      p.pricePhp <= f.maxPrice &&
      (f.weight === 'any' || weightClass(p.weightOz) === f.weight) &&
      (f.shape === 'any' || p.shape === f.shape) &&
      (f.style === 'any' || p.style === f.style) &&
      (f.level === 'any' || p.levels.includes(f.level)),
  )
  const by = {
    'price-asc': (a: Paddle, b: Paddle) => a.pricePhp - b.pricePhp,
    'price-desc': (a: Paddle, b: Paddle) => b.pricePhp - a.pricePhp,
    weight: (a: Paddle, b: Paddle) => a.weightOz - b.weightOz,
    newest: (a: Paddle, b: Paddle) => (b.year ?? 0) - (a.year ?? 0) || a.pricePhp - b.pricePhp,
  }[f.sort]
  return out.sort(by)
}

/** Toggle a paddle in the compare list, keeping at most MAX_COMPARE. Returns the list unchanged when full. */
export function toggleCompare(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  return ids.length >= MAX_COMPARE ? ids : [...ids, id]
}

/** Retailer link, or a web search for the model when no affiliate/retailer URL is set. */
export function shopUrl(p: Paddle) {
  return p.url || `https://www.google.com/search?q=${encodeURIComponent(`${p.brand} ${p.model} pickleball paddle Philippines`)}`
}
