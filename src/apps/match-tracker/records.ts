import { toCSV } from '../../shared/download'

export interface GameScore {
  us: number
  them: number
}

export interface MatchRecord {
  id: string
  date: string // YYYY-MM-DD
  mode: 'singles' | 'doubles'
  us: string // "Ana" or "Ana & Ben"
  them: string
  games: GameScore[]
  notes: string
  createdAt: number
}

export type Draft = Omit<MatchRecord, 'id' | 'createdAt'>

export function gamesWon(m: Pick<MatchRecord, 'games'>) {
  let us = 0
  let them = 0
  for (const g of m.games) {
    if (g.us > g.them) us++
    else if (g.them > g.us) them++
  }
  return { us, them }
}

export function result(m: Pick<MatchRecord, 'games'>): 'W' | 'L' {
  const w = gamesWon(m)
  return w.us > w.them ? 'W' : 'L'
}

/** Returns a list of human-readable problems; empty means the draft can be saved. */
export function validate(d: Draft): string[] {
  const errors: string[] = []
  if (!d.us.trim()) errors.push('Enter your name or team.')
  if (!d.them.trim()) errors.push('Enter the opponent name or team.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) errors.push('Enter the match date.')
  if (d.games.length === 0) errors.push('Add at least one game score.')
  d.games.forEach((g, i) => {
    if (!Number.isInteger(g.us) || !Number.isInteger(g.them) || g.us < 0 || g.them < 0 || g.us > 99 || g.them > 99)
      errors.push(`Game ${i + 1}: scores must be whole numbers from 0 to 99.`)
    else if (g.us === g.them) errors.push(`Game ${i + 1}: a game can't end in a tie.`)
  })
  if (errors.length === 0) {
    const w = gamesWon(d)
    if (w.us === w.them) errors.push('Games are level - add the deciding game so the match has a winner.')
  }
  return errors
}

export interface Stats {
  played: number
  wins: number
  losses: number
  winPct: number // 0-100, rounded
  gamesFor: number
  gamesAgainst: number
  pointDiff: number
  streak: string // e.g. "W3", "" when no matches
}

export function stats(records: MatchRecord[]): Stats {
  const sorted = sortRecent(records)
  let wins = 0
  let gamesFor = 0
  let gamesAgainst = 0
  let pointDiff = 0
  for (const r of sorted) {
    if (result(r) === 'W') wins++
    const g = gamesWon(r)
    gamesFor += g.us
    gamesAgainst += g.them
    for (const s of r.games) pointDiff += s.us - s.them
  }
  let streak = ''
  if (sorted.length) {
    const first = result(sorted[0])
    let n = 0
    while (n < sorted.length && result(sorted[n]) === first) n++
    streak = `${first}${n}`
  }
  const played = records.length
  return {
    played,
    wins,
    losses: played - wins,
    winPct: played ? Math.round((wins / played) * 100) : 0,
    gamesFor,
    gamesAgainst,
    pointDiff,
    streak,
  }
}

/** Newest match first; same-day matches by entry time. */
export function sortRecent(records: MatchRecord[]) {
  return [...records].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
}

export function toRecordsCSV(records: MatchRecord[]) {
  const maxGames = Math.max(1, ...records.map((r) => r.games.length))
  const header = ['Date', 'Type', 'Us', 'Them', 'Result', 'Games (us-them)']
  for (let i = 1; i <= maxGames; i++) header.push(`Game ${i}`)
  header.push('Notes')
  const rows = sortRecent(records).map((r) => {
    const g = gamesWon(r)
    const games = r.games.map((s) => `${s.us}-${s.them}`)
    while (games.length < maxGames) games.push('')
    return [r.date, r.mode, r.us, r.them, result(r) === 'W' ? 'Win' : 'Loss', `${g.us}-${g.them}`, ...games, r.notes]
  })
  return toCSV([header, ...rows])
}
