import { describe, expect, it } from 'vitest'
import { drills, durations, focuses, levels } from './drills'
import { generate, totalMinutes } from './generate'

describe('generate', () => {
  it('fits every level × focus × duration within the time budget and starts/ends correctly', () => {
    for (const level of levels)
      for (const focus of focuses)
        for (const minutes of durations) {
          const r = generate({ level, focus, minutes, seed: 7 })
          expect(r[0].kind).toBe('warmup')
          expect(r[r.length - 1].kind).toBe('cooldown')
          const t = totalMinutes(r)
          expect(t).toBeLessThanOrEqual(minutes)
          expect(t).toBeGreaterThanOrEqual(minutes * 0.75)
          expect(r.every((d) => d.levels.includes(level))).toBe(true)
        }
  })

  it('weights the chosen focus', () => {
    const r = generate({ level: 'intermediate', focus: 'dinking', minutes: 60, seed: 1 }).filter((d) => d.kind === 'drill')
    const focused = r.filter((d) => d.focus.includes('dinking')).reduce((n, d) => n + d.minutes, 0)
    const total = r.reduce((n, d) => n + d.minutes, 0)
    expect(focused / total).toBeGreaterThanOrEqual(0.6)
  })

  it('is deterministic for a seed and varies across seeds', () => {
    const a = generate({ level: 'beginner', focus: 'serving', minutes: 45, seed: 3 }).map((d) => d.id)
    const b = generate({ level: 'beginner', focus: 'serving', minutes: 45, seed: 3 }).map((d) => d.id)
    expect(a).toEqual(b)
    const variants = new Set([1, 2, 3, 4, 5, 6].map((seed) => generate({ level: 'beginner', focus: 'serving', minutes: 45, seed }).map((d) => d.id).join()))
    expect(variants.size).toBeGreaterThan(1)
  })

  it('never repeats a drill within a session', () => {
    const r = generate({ level: 'advanced', focus: 'volleying', minutes: 90, seed: 9 })
    expect(new Set(r.map((d) => d.id)).size).toBe(r.length)
  })

  it('library ids are unique', () => {
    expect(new Set(drills.map((d) => d.id)).size).toBe(drills.length)
  })
})
