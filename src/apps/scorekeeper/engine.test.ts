import { describe, expect, it } from 'vitest'
import { newMatch, rally, undo, nextGame, restartGame, scoreCall, servingSide, serverName, defaultSettings, type Settings } from './engine'

const doubles: Settings = {
  ...defaultSettings,
  mode: 'doubles',
  teamNames: ['Aces', 'Dinkers'],
  players: [
    ['Ana', 'Ben'],
    ['Cara', 'Dan'],
  ],
}
const singles: Settings = { ...defaultSettings, mode: 'singles', teamNames: ['Ana', 'Cara'] }

describe('doubles side-out scoring', () => {
  it('starts 0-0-2 with the right-court player of the first team serving from the right', () => {
    const m = newMatch(doubles)
    expect(scoreCall(m)).toBe('0 - 0 - 2')
    expect(m.game.serverNumber).toBe(2)
    expect(serverName(m)).toBe('Ana')
    expect(servingSide(m)).toBe('right')
  })

  it('first-server exception: a lost rally at 0-0-2 is an immediate side out', () => {
    const m = rally(newMatch(doubles), 1)
    expect(m.game.servingTeam).toBe(1)
    expect(m.game.serverNumber).toBe(1)
    expect(serverName(m)).toBe('Cara')
    expect(scoreCall(m)).toBe('0 - 0 - 1')
  })

  it('serving team scores, server switches sides, receiving team positions stay', () => {
    const m = rally(newMatch(doubles), 0)
    expect(m.game.scores).toEqual([1, 0])
    expect(serverName(m)).toBe('Ana')
    expect(servingSide(m)).toBe('left')
    expect(m.game.rightPlayer[1]).toBe(0)
  })

  it('server 1 losing passes the serve to the partner, then side out after server 2', () => {
    let m = rally(newMatch(doubles), 1) // side out to Dinkers, Cara server 1
    m = rally(m, 1) // Dinkers 1-0, Cara moves left
    m = rally(m, 0) // Cara loses -> Dan is server 2
    expect(m.game.serverNumber).toBe(2)
    expect(serverName(m)).toBe('Dan')
    expect(scoreCall(m)).toBe('1 - 0 - 2')
    expect(servingSide(m)).toBe('right') // Dan is in the right court after the swap
    m = rally(m, 0) // side out to Aces
    expect(m.game.servingTeam).toBe(0)
    expect(m.game.serverNumber).toBe(1)
    expect(scoreCall(m)).toBe('0 - 1 - 1')
  })

  it('the receiving team never scores', () => {
    const m = rally(rally(newMatch(doubles), 1), 0)
    expect(m.game.scores).toEqual([0, 0])
  })
})

describe('singles', () => {
  it('calls two numbers and serves from the side matching the server score parity', () => {
    let m = newMatch(singles)
    expect(scoreCall(m)).toBe('0 - 0')
    expect(servingSide(m)).toBe('right')
    m = rally(m, 0)
    expect(scoreCall(m)).toBe('1 - 0')
    expect(servingSide(m)).toBe('left')
    m = rally(m, 1)
    expect(m.game.servingTeam).toBe(1)
    expect(scoreCall(m)).toBe('0 - 1')
  })
})

function playTo(m: ReturnType<typeof newMatch>, team: 0 | 1, points: number) {
  for (let i = 0; i < points; i++) {
    if (m.game.servingTeam !== team) m = rally(m, team) // side out; may need two in doubles
    if (m.game.servingTeam !== team) m = rally(m, team)
    m = rally(m, team)
  }
  return m
}

describe('game end', () => {
  it('ends at 11 when leading by two', () => {
    const m = playTo(newMatch(singles), 0, 11)
    expect(m.game.winner).toBe(0)
    expect(m.matchWinner).toBe(0)
  })

  it('requires a two-point lead with win-by-two on', () => {
    let m = playTo(newMatch(singles), 0, 10)
    m = playTo(m, 1, 10)
    m = playTo(m, 0, 1) // 11-10
    expect(m.game.winner).toBeNull()
    m = playTo(m, 0, 1) // 12-10
    expect(m.game.winner).toBe(0)
  })

  it('ends at the target without win-by-two when disabled', () => {
    let m = newMatch({ ...singles, winByTwo: false })
    m = playTo(m, 0, 10)
    m = playTo(m, 1, 10)
    m = playTo(m, 0, 1)
    expect(m.game.winner).toBe(0)
  })

  it('ignores rallies once the game is over', () => {
    const m = playTo(newMatch(singles), 0, 11)
    expect(rally(m, 1)).toBe(m)
  })
})

describe('best of three', () => {
  it('tracks games and declares the match winner after two games', () => {
    let m = newMatch({ ...singles, bestOf: 3 })
    m = playTo(m, 0, 11)
    expect(m.matchWinner).toBeNull()
    expect(m.gamesWon).toEqual([1, 0])
    m = nextGame(m)
    expect(m.game.scores).toEqual([0, 0])
    expect(m.game.servingTeam).toBe(1) // first serve alternates each game
    m = playTo(m, 0, 11)
    expect(m.matchWinner).toBe(0)
    expect(m.completed).toHaveLength(2)
  })
})

describe('undo', () => {
  it('restores the previous state, including a finished game', () => {
    const a = newMatch(doubles)
    const b = rally(a, 0)
    expect(undo(b).game).toEqual(a.game)
    const done = playTo(newMatch(singles), 0, 11)
    expect(undo(done).game.winner).toBeNull()
  })

  it('is a no-op with no history', () => {
    const a = newMatch(singles)
    expect(undo(a)).toBe(a)
  })
})

describe('restartGame', () => {
  it('resets the current game to 0-0 with the original first server and can be undone', () => {
    let m = newMatch({ ...singles, bestOf: 3 })
    m = playTo(m, 0, 11)
    m = nextGame(m)
    m = playTo(m, 0, 4)
    const r = restartGame(m)
    expect(r.game.scores).toEqual([0, 0])
    expect(r.game.servingTeam).toBe(1)
    expect(r.gamesWon).toEqual([1, 0])
    expect(undo(r).game.scores).toEqual([4, 0])
  })
})
