import { describe, expect, it } from 'vitest'
import { result, stats, toRecordsCSV, validate, type MatchRecord } from './records'

const rec = (over: Partial<MatchRecord>): MatchRecord => ({
  id: Math.random().toString(36),
  date: '2026-10-01',
  mode: 'doubles',
  us: 'Ana & Ben',
  them: 'Cara & Dan',
  games: [{ us: 11, them: 7 }],
  notes: '',
  createdAt: 0,
  ...over,
})

describe('validate', () => {
  it('accepts a decisive match', () => {
    expect(validate(rec({}))).toEqual([])
  })
  it('rejects tied games and level matches', () => {
    expect(validate(rec({ games: [{ us: 9, them: 9 }] }))[0]).toMatch(/tie/)
    expect(validate(rec({ games: [{ us: 11, them: 5 }, { us: 4, them: 11 }] }))[0]).toMatch(/deciding game/)
  })
  it('requires names and a date', () => {
    expect(validate(rec({ us: ' ', them: '', date: '' }))).toHaveLength(3)
  })
})

describe('stats', () => {
  it('counts wins, losses, percentage and the current streak (newest first)', () => {
    const records = [
      rec({ date: '2026-10-01', games: [{ us: 5, them: 11 }] }),
      rec({ date: '2026-10-03', games: [{ us: 11, them: 9 }] }),
      rec({ date: '2026-10-02', games: [{ us: 11, them: 3 }] }),
    ]
    const s = stats(records)
    expect(s).toMatchObject({ played: 3, wins: 2, losses: 1, winPct: 67, streak: 'W2', pointDiff: 2 + 8 - 6 })
  })
  it('handles no records', () => {
    expect(stats([])).toMatchObject({ played: 0, winPct: 0, streak: '' })
  })
})

describe('result', () => {
  it('uses games won, not points', () => {
    expect(result(rec({ games: [{ us: 11, them: 0 }, { us: 9, them: 11 }, { us: 10, them: 12 }] }))).toBe('L')
  })
})

describe('CSV', () => {
  it('pads game columns, quotes commas and neutralises formulas', () => {
    const csv = toRecordsCSV([
      rec({ them: 'Smith, J', notes: '=HYPERLINK("x")', games: [{ us: 11, them: 2 }, { us: 3, them: 11 }, { us: 11, them: 9 }] }),
      rec({ date: '2026-09-01' }),
    ])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[0]).toBe('Date,Type,Us,Them,Result,Games (us-them),Game 1,Game 2,Game 3,Notes')
    expect(lines[1]).toContain('"Smith, J"')
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"")"`)
    expect(lines[2].split(',')).toHaveLength(10)
  })
})
