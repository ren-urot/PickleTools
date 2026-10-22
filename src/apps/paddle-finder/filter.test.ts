import { describe, expect, it } from 'vitest'
import { applyFilters, brands, catalog, catalogInfo, defaultFilters, isApproved, PRICE_CEILING, PRICE_FLOOR, shopUrl, toggleCompare, weightClass } from './filter'

describe('catalog data', () => {
  it('has hundreds of paddles from many brands with complete, sane specs', () => {
    expect(catalog.length).toBeGreaterThan(400)
    expect(brands.length).toBeGreaterThan(40)
    for (const p of catalog) {
      expect(['standard', 'elongated', 'hybrid', 'widebody']).toContain(p.shape)
      expect(['power', 'control', 'all-court']).toContain(p.style)
      expect(p.weightOz).toBeGreaterThan(6.5)
      expect(p.weightOz).toBeLessThan(9.5)
      expect(p.thicknessMm).toBeGreaterThanOrEqual(10)
      expect(p.thicknessMm).toBeLessThanOrEqual(20)
      expect(p.pricePhp).toBe(Math.round((p.priceUsd * catalogInfo.usdToPhp) / 100) * 100)
      expect(p.model.length).toBeGreaterThan(0)
    }
  })

  it('has unique ids and sorted brands', () => {
    expect(new Set(catalog.map((p) => p.id)).size).toBe(catalog.length)
    expect([...brands].sort((a, b) => a.localeCompare(b))).toEqual(brands)
  })
})

describe('paddle filters', () => {
  it('returns the whole catalog by default, cheapest first', () => {
    const r = applyFilters(catalog, defaultFilters())
    expect(r).toHaveLength(catalog.length)
    expect(r[0].pricePhp).toBeLessThanOrEqual(r[r.length - 1].pricePhp)
    expect(PRICE_FLOOR).toBeLessThanOrEqual(r[0].pricePhp)
    expect(PRICE_CEILING).toBeGreaterThanOrEqual(r[r.length - 1].pricePhp)
  })

  it('combines price, shape, style and brand filters', () => {
    const r = applyFilters(catalog, { ...defaultFilters(), maxPrice: 12000, shape: 'elongated', style: 'control', brand: 'JOOLA' })
    expect(r.every((p) => p.pricePhp <= 12000 && p.shape === 'elongated' && p.style === 'control' && p.brand === 'JOOLA')).toBe(true)
  })

  it('searches brand and model text, ignoring case and extra spaces', () => {
    const r = applyFilters(catalog, { ...defaultFilters(), query: '  six   zero ' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((p) => `${p.brand} ${p.model}`.toLowerCase().includes('six zero'))).toBe(true)
    expect(applyFilters(catalog, { ...defaultFilters(), query: 'zzz-no-such-paddle' })).toHaveLength(0)
  })

  it('sorts newest first', () => {
    const r = applyFilters(catalog, { ...defaultFilters(), sort: 'newest' })
    expect((r[0].year ?? 0) >= (r[r.length - 1].year ?? 0)).toBe(true)
  })

  it('classifies weight and approval', () => {
    expect([weightClass(7.4), weightClass(7.9), weightClass(8.4)]).toEqual(['light', 'mid', 'heavy'])
    expect(isApproved({ approval: 'USAP/UPA-A' })).toBe(true)
    expect(isApproved({ approval: 'Unapproved' })).toBe(false)
  })

  it('limits compare to three', () => {
    let ids = toggleCompare([], 'a')
    ids = toggleCompare(ids, 'b')
    ids = toggleCompare(ids, 'c')
    expect(toggleCompare(ids, 'd')).toEqual(['a', 'b', 'c'])
    expect(toggleCompare(ids, 'b')).toEqual(['a', 'c'])
  })

  it('falls back to a search link when there is no retailer URL', () => {
    expect(shopUrl(catalog[0])).toContain('google.com/search')
  })
})
