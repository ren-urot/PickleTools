import { describe, expect, it } from 'vitest'
import { applyFilters, catalog, defaultFilters, shopUrl, toggleCompare, weightClass } from './filter'

describe('paddle filters', () => {
  it('returns the whole catalog by default, cheapest first', () => {
    const r = applyFilters(catalog, defaultFilters())
    expect(r).toHaveLength(catalog.length)
    expect(r[0].pricePhp).toBeLessThanOrEqual(r[1].pricePhp)
  })

  it('combines price, shape and style filters', () => {
    const r = applyFilters(catalog, { ...defaultFilters(), maxPrice: 12000, shape: 'elongated', style: 'control' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((p) => p.pricePhp <= 12000 && p.shape === 'elongated' && p.style === 'control')).toBe(true)
  })

  it('classifies weight', () => {
    expect([weightClass(7.4), weightClass(7.9), weightClass(8.4)]).toEqual(['light', 'mid', 'heavy'])
  })

  it('limits compare to three', () => {
    let ids = toggleCompare([], 'a')
    ids = toggleCompare(ids, 'b')
    ids = toggleCompare(ids, 'c')
    expect(toggleCompare(ids, 'd')).toEqual(['a', 'b', 'c'])
    expect(toggleCompare(ids, 'b')).toEqual(['a', 'c'])
  })

  it('falls back to a search link and has unique ids', () => {
    expect(shopUrl(catalog[0])).toContain('google.com/search')
    expect(new Set(catalog.map((p) => p.id)).size).toBe(catalog.length)
  })
})
