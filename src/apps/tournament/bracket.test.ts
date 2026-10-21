import { describe, expect, it } from 'vitest'
import { BYE, champion, elimination, roundName, roundRobin, seedOrder, standings, validateNames, validateScore, type Tournament } from './bracket'

const t = (players: string[], format: Tournament['format'] = 'single'): Tournament => ({
  id: 'x',
  name: 'Test',
  format,
  players,
  results: {},
  createdAt: 0,
})

describe('seedOrder', () => {
  it('keeps top seeds apart', () => {
    expect(seedOrder(2)).toEqual([1, 2])
    expect(seedOrder(4)).toEqual([1, 4, 2, 3])
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
})

describe('single elimination', () => {
  it('gives byes to the top seeds and auto-advances them', () => {
    const rounds = elimination(t(['A', 'B', 'C', 'D', 'E']))
    expect(rounds).toHaveLength(3)
    const r1 = rounds[0]
    expect(r1.map((m) => [m.a, m.b])).toEqual([
      ['A', BYE],
      ['D', 'E'],
      ['B', BYE],
      ['C', BYE],
    ])
    expect(r1[0].winner).toBe('A')
    expect(r1[1].winner).toBeNull()
    expect(rounds[1][0].a).toBe('A')
    expect(rounds[1][0].b).toBeNull() // waiting for D v E
    expect(rounds[1][1]).toMatchObject({ a: 'B', b: 'C' })
  })

  it('advances winners and crowns a champion', () => {
    const tour = t(['A', 'B', 'C', 'D'])
    tour.results['E-0-0'] = { a: 'A', b: 'D', sa: 11, sb: 4 }
    tour.results['E-0-1'] = { a: 'B', b: 'C', sa: 8, sb: 11 }
    let rounds = elimination(tour)
    expect(rounds[1][0]).toMatchObject({ a: 'A', b: 'C', winner: null })
    tour.results['E-1-0'] = { a: 'A', b: 'C', sa: 9, sb: 11 }
    rounds = elimination(tour)
    expect(champion(rounds)).toBe('C')
  })

  it('ignores a stale downstream score when an earlier result changes', () => {
    const tour = t(['A', 'B', 'C', 'D'])
    tour.results['E-0-0'] = { a: 'A', b: 'D', sa: 11, sb: 4 }
    tour.results['E-0-1'] = { a: 'B', b: 'C', sa: 11, sb: 4 }
    tour.results['E-1-0'] = { a: 'A', b: 'B', sa: 11, sb: 2 }
    expect(champion(elimination(tour))).toBe('A')
    tour.results['E-0-0'] = { a: 'A', b: 'D', sa: 4, sb: 11 } // correction: D actually won
    const rounds = elimination(tour)
    expect(rounds[1][0]).toMatchObject({ a: 'D', b: 'B', winner: null, score: null })
    expect(champion(rounds)).toBeNull()
  })

  it('names rounds from the end', () => {
    expect(roundName(0, 3)).toBe('Quarterfinals')
    expect(roundName(1, 3)).toBe('Semifinals')
    expect(roundName(2, 3)).toBe('Final')
    expect(roundName(0, 5)).toBe('Round of 32')
  })
})

describe('round robin', () => {
  it('schedules everyone against everyone exactly once', () => {
    for (const n of [3, 4, 5, 6, 7, 8]) {
      const names = Array.from({ length: n }, (_, i) => `P${i}`)
      const rounds = roundRobin(t(names, 'roundrobin'))
      const pairs = new Set<string>()
      for (const r of rounds) {
        const seen = new Set<string>()
        for (const m of r) {
          expect(seen.has(m.a!) || seen.has(m.b!)).toBe(false) // nobody plays twice in a round
          seen.add(m.a!)
          seen.add(m.b!)
          pairs.add([m.a, m.b].sort().join('|'))
        }
      }
      expect(pairs.size).toBe((n * (n - 1)) / 2)
      expect(rounds).toHaveLength(n % 2 ? n : n - 1)
    }
  })

  it('ranks by wins, then point difference, then points scored', () => {
    const tour = t(['A', 'B', 'C'], 'roundrobin')
    const rounds = roundRobin(tour)
    const all = rounds.flat()
    const find = (x: string, y: string) => all.find((m) => (m.a === x && m.b === y) || (m.a === y && m.b === x))!
    const set = (x: string, y: string, sx: number, sy: number) => {
      const m = find(x, y)
      tour.results[m.id] = m.a === x ? { a: x, b: y, sa: sx, sb: sy } : { a: y, b: x, sa: sy, sb: sx }
    }
    set('A', 'B', 11, 9)
    set('B', 'C', 11, 1)
    set('C', 'A', 11, 5)
    const table = standings(tour, roundRobin(tour))
    // A and C are level on wins and difference (-4); A scored more points (16 v 12).
    expect(table.map((r) => r.name)).toEqual(['B', 'A', 'C'])
    expect(table[0]).toMatchObject({ wins: 1, losses: 1, diff: 8 })
  })
})

describe('validation', () => {
  it('requires 2+ unique, non-empty names and limits size', () => {
    expect(validateNames(['A'])).toMatch(/at least 2/)
    expect(validateNames(['A', 'a '])).toMatch(/twice/)
    expect(validateNames(['A', 'B'])).toBeNull()
    expect(validateNames(Array.from({ length: 65 }, (_, i) => `P${i}`))).toMatch(/64/)
  })

  it('rejects ties and invalid scores', () => {
    expect(validateScore('11', '11')).toMatch(/tie/)
    expect(validateScore('', '3')).toMatch(/both/)
    expect(validateScore('11', '7')).toBeNull()
  })
})
