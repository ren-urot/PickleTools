// The bracket is always derived from (players, results). Each stored result remembers who
// played, so if an earlier result is corrected, later scores between different players are
// ignored instead of silently advancing the wrong team.

export const BYE = '- bye -'
export const MAX_PLAYERS = 64

export interface Result {
  a: string
  b: string
  sa: number
  sb: number
}

export interface Tournament {
  id: string
  name: string
  format: 'single' | 'roundrobin'
  players: string[]
  results: Record<string, Result>
  createdAt: number
}

export interface Match {
  id: string
  round: number
  index: number
  a: string | null // null = waiting for an earlier match
  b: string | null
  score: { a: number; b: number } | null
  winner: string | null
}

/** Standard seeding: 1 meets the lowest seed, and seeds 1 and 2 can only meet in the final. */
export function seedOrder(size: number): number[] {
  let order = [1]
  while (order.length < size) {
    const n = order.length * 2 + 1
    order = order.flatMap((s) => [s, n - s])
  }
  return order
}

function scoreFor(t: Tournament, id: string, a: string | null, b: string | null) {
  const r = t.results[id]
  if (!r || a == null || b == null || r.a !== a || r.b !== b) return null
  return { a: r.sa, b: r.sb }
}

export function elimination(t: Tournament): Match[][] {
  const n = t.players.length
  if (n < 2) return []
  let size = 2
  while (size < n) size *= 2
  const slots = seedOrder(size).map((s) => (s <= n ? t.players[s - 1] : BYE))

  const rounds: Match[][] = []
  let entrants: (string | null)[] = slots
  for (let round = 0; entrants.length > 1; round++) {
    const matches: Match[] = []
    for (let i = 0; i < entrants.length; i += 2) {
      const id = `E-${round}-${i / 2}`
      const a = entrants[i]
      const b = entrants[i + 1]
      let winner: string | null = null
      let score = null
      if (a === BYE && b != null) winner = b
      else if (b === BYE && a != null) winner = a
      else {
        score = scoreFor(t, id, a, b)
        if (score) winner = score.a > score.b ? a : b
      }
      matches.push({ id, round, index: i / 2, a, b, score, winner })
    }
    rounds.push(matches)
    entrants = matches.map((m) => m.winner)
  }
  return rounds
}

export function champion(rounds: Match[][]): string | null {
  return rounds.at(-1)?.[0]?.winner ?? null
}

export function roundName(round: number, total: number): string {
  const fromEnd = total - round
  if (fromEnd === 1) return 'Final'
  if (fromEnd === 2) return 'Semifinals'
  if (fromEnd === 3) return 'Quarterfinals'
  return `Round of ${2 ** fromEnd}`
}

/** Circle method: player 0 fixed, others rotate. Odd counts get a bye each round (not listed as a match). */
export function roundRobin(t: Tournament): Match[][] {
  const list: (string | null)[] = [...t.players]
  if (list.length < 2) return []
  if (list.length % 2) list.push(null)
  const n = list.length
  const rounds: Match[][] = []
  let order = list
  for (let round = 0; round < n - 1; round++) {
    const matches: Match[] = []
    for (let i = 0; i < n / 2; i++) {
      const a = order[i]
      const b = order[n - 1 - i]
      if (a == null || b == null) continue
      const id = `R-${round}-${i}`
      const score = scoreFor(t, id, a, b)
      matches.push({ id, round, index: matches.length, a, b, score, winner: score ? (score.a > score.b ? a : b) : null })
    }
    rounds.push(matches)
    order = [order[0], order[n - 1], ...order.slice(1, n - 1)]
  }
  return rounds
}

/** Players sitting out a round-robin round (odd player counts). */
export function byesFor(t: Tournament, rounds: Match[][]): string[] {
  return rounds.map((r) => {
    const playing = new Set(r.flatMap((m) => [m.a, m.b]))
    return t.players.find((p) => !playing.has(p)) ?? ''
  })
}

export interface Standing {
  name: string
  played: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  diff: number
}

export function standings(t: Tournament, rounds: Match[][]): Standing[] {
  const rows = new Map(t.players.map((name) => [name, { name, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 }]))
  for (const m of rounds.flat()) {
    if (!m.score || !m.a || !m.b) continue
    const A = rows.get(m.a)!
    const B = rows.get(m.b)!
    A.played++
    B.played++
    A.pointsFor += m.score.a
    A.pointsAgainst += m.score.b
    B.pointsFor += m.score.b
    B.pointsAgainst += m.score.a
    if (m.winner === m.a) {
      A.wins++
      B.losses++
    } else {
      B.wins++
      A.losses++
    }
  }
  const out = [...rows.values()].map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
  return out.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pointsFor - x.pointsFor || x.name.localeCompare(y.name))
}

export function validateNames(names: string[]): string | null {
  const clean = names.map((n) => n.trim()).filter(Boolean)
  if (clean.length < 2) return 'Enter at least 2 players or teams.'
  if (clean.length > MAX_PLAYERS) return `A tournament can have up to ${MAX_PLAYERS} entries.`
  const seen = new Set<string>()
  for (const n of clean) {
    const k = n.toLowerCase()
    if (seen.has(k)) return `"${n}" is entered twice. Names must be unique.`
    seen.add(k)
  }
  return null
}

export function validateScore(a: string, b: string): string | null {
  if (a.trim() === '' || b.trim() === '') return 'Enter both scores.'
  const x = Number(a)
  const y = Number(b)
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 99 || y > 99) return 'Scores must be whole numbers from 0 to 99.'
  if (x === y) return 'A match can’t end in a tie.'
  return null
}

/** Accepts a previously exported file; returns null if it isn't a valid tournament. */
export function parseTournament(json: string): Tournament | null {
  try {
    const t = JSON.parse(json) as Tournament
    if (typeof t.name !== 'string' || !['single', 'roundrobin'].includes(t.format) || !Array.isArray(t.players) || typeof t.results !== 'object') return null
    if (validateNames(t.players)) return null
    return { ...t, id: t.id || String(Date.now()), createdAt: t.createdAt || Date.now() }
  } catch {
    return null
  }
}
