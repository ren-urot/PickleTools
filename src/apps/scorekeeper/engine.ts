// Side-out scoring per the USA Pickleball rulebook:
// - only the serving side scores;
// - doubles: each side has two servers except the very first service turn of a game
//   ("0-0-2", first-server exception); after a point the server switches courts with partner;
// - singles: server serves from the right when their score is even, left when odd.

export type Team = 0 | 1
export type Mode = 'singles' | 'doubles'

export interface Settings {
  mode: Mode
  target: 11 | 15 | 21
  winByTwo: boolean
  bestOf: 1 | 3
  teamNames: [string, string]
  /** Doubles only: [team][player]; player 0 starts in the right court. */
  players: [[string, string], [string, string]]
  firstServingTeam: Team
  sound: boolean
  voice: boolean
}

export interface Game {
  scores: [number, number]
  servingTeam: Team
  serverNumber: 1 | 2
  /** Index of the player standing in the right court, per team (doubles). */
  rightPlayer: [0 | 1, 0 | 1]
  /** Index (within servingTeam) of the current server (doubles). */
  serverPlayer: 0 | 1
  winner: Team | null
}

export interface Match {
  settings: Settings
  game: Game
  gameNumber: number
  gamesWon: [number, number]
  completed: { scores: [number, number]; winner: Team }[]
  matchWinner: Team | null
  past: Omit<Match, 'past'>[]
}

export const defaultSettings: Settings = {
  mode: 'doubles',
  target: 11,
  winByTwo: true,
  bestOf: 1,
  teamNames: ['Team A', 'Team B'],
  players: [
    ['Player 1', 'Player 2'],
    ['Player 3', 'Player 4'],
  ],
  firstServingTeam: 0,
  sound: true,
  voice: false,
}

const UNDO_LIMIT = 300

function freshGame(settings: Settings, servingTeam: Team): Game {
  return {
    scores: [0, 0],
    servingTeam,
    serverNumber: settings.mode === 'doubles' ? 2 : 1,
    rightPlayer: [0, 0],
    serverPlayer: 0,
    winner: null,
  }
}

export function newMatch(settings: Settings): Match {
  return {
    settings,
    game: freshGame(settings, settings.firstServingTeam),
    gameNumber: 1,
    gamesWon: [0, 0],
    completed: [],
    matchWinner: null,
    past: [],
  }
}

const other = (t: Team): Team => (t === 0 ? 1 : 0)

function snapshot(m: Match): Match['past'] {
  const { past, ...rest } = m
  return [...past.slice(-(UNDO_LIMIT - 1)), rest]
}

function gameWinner(scores: [number, number], s: Settings): Team | null {
  for (const t of [0, 1] as Team[]) {
    const lead = scores[t] - scores[other(t)]
    if (scores[t] >= s.target && (!s.winByTwo || lead >= 2)) return t
  }
  return null
}

/** Record the outcome of one rally won by `winner`. Returns the same object if nothing can change. */
export function rally(m: Match, winner: Team): Match {
  if (m.game.winner !== null) return m
  const s = m.settings
  const g: Game = { ...m.game, scores: [...m.game.scores], rightPlayer: [...m.game.rightPlayer] }

  if (winner === g.servingTeam) {
    g.scores[winner]++
    if (s.mode === 'doubles') g.rightPlayer[winner] = g.rightPlayer[winner] === 0 ? 1 : 0
  } else if (s.mode === 'doubles' && g.serverNumber === 1) {
    g.serverNumber = 2
    g.serverPlayer = g.serverPlayer === 0 ? 1 : 0
  } else {
    g.servingTeam = winner
    g.serverNumber = 1
    // After a side out the player in the right court serves first.
    g.serverPlayer = g.rightPlayer[winner]
  }

  g.winner = gameWinner(g.scores, s)
  const next: Match = { ...m, game: g, past: snapshot(m) }
  if (g.winner !== null) {
    const gamesWon: [number, number] = [...m.gamesWon]
    gamesWon[g.winner]++
    next.gamesWon = gamesWon
    next.completed = [...m.completed, { scores: g.scores, winner: g.winner }]
    if (gamesWon[g.winner] >= Math.ceil(s.bestOf / 2)) next.matchWinner = g.winner
  }
  return next
}

/** The first serve alternates between games: odd games start with the configured team. */
function firstServerOf(gameNumber: number, s: Settings): Team {
  return gameNumber % 2 === 1 ? s.firstServingTeam : other(s.firstServingTeam)
}

/** Start the next game of a best-of-3. */
export function nextGame(m: Match): Match {
  if (m.game.winner === null || m.matchWinner !== null) return m
  return { ...m, game: freshGame(m.settings, firstServerOf(m.gameNumber + 1, m.settings)), gameNumber: m.gameNumber + 1, past: snapshot(m) }
}

/** Restart the current, unfinished game at 0-0 (undoable). Finished games are left alone. */
export function restartGame(m: Match): Match {
  if (m.game.winner !== null) return m
  return { ...m, game: freshGame(m.settings, firstServerOf(m.gameNumber, m.settings)), past: snapshot(m) }
}

export function undo(m: Match): Match {
  if (m.past.length === 0) return m
  const prev = m.past[m.past.length - 1]
  return { ...prev, past: m.past.slice(0, -1) }
}

export function servingSide(m: Match): 'right' | 'left' {
  const g = m.game
  if (m.settings.mode === 'singles') return g.scores[g.servingTeam] % 2 === 0 ? 'right' : 'left'
  return g.rightPlayer[g.servingTeam] === g.serverPlayer ? 'right' : 'left'
}

export function serverName(m: Match): string {
  const g = m.game
  if (m.settings.mode === 'singles') return m.settings.teamNames[g.servingTeam]
  return m.settings.players[g.servingTeam][g.serverPlayer]
}

/** Score as called aloud: server score - receiver score [- server number]. */
export function scoreCall(m: Match): string {
  const g = m.game
  const parts = [g.scores[g.servingTeam], g.scores[other(g.servingTeam)]]
  if (m.settings.mode === 'doubles') parts.push(g.serverNumber)
  return parts.join(' - ')
}

/** Player positions for the court diagram: [team][court side] -> name. */
export function courtPositions(m: Match): Record<Team, { right: string; left: string }> {
  const pos = (t: Team) => {
    if (m.settings.mode === 'singles') return { right: m.settings.teamNames[t], left: '' }
    const r = m.game.rightPlayer[t]
    return { right: m.settings.players[t][r], left: m.settings.players[t][r === 0 ? 1 : 0] }
  }
  return { 0: pos(0), 1: pos(1) }
}
