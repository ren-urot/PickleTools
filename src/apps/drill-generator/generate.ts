import { drills, type Drill, type Focus, type Level } from './drills'

export interface Options {
  level: Level
  focus: Focus
  minutes: number
  seed: number
}

/** Small seeded PRNG so "shuffle" is reproducible and testable. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const cost = (d: Drill) => d.minutes + d.restSec / 60

export const totalMinutes = (routine: Drill[]) => routine.reduce((n, d) => n + cost(d), 0)

const FOCUS_SHARE = 0.7
const MIN_SHORTENED = 4

/**
 * Builds warm-up → drills → cool-down that fits within `minutes`.
 * About 70% of drill time goes to the chosen focus; the rest rounds out the session.
 * If a gap of 4+ minutes remains, one more drill is added in a shortened form.
 */
export function generate({ level, focus, minutes, seed }: Options): Drill[] {
  const rand = mulberry32(seed)
  const short = minutes <= 15
  const warmups = drills.filter((d) => d.kind === 'warmup' && d.levels.includes(level))
  const warm = { ...warmups[Math.floor(rand() * warmups.length)] }
  const cool = { ...drills.find((d) => d.kind === 'cooldown')! }
  if (short) {
    warm.minutes = 3
    cool.minutes = 2
  }

  let remaining = minutes - cost(warm) - cost(cool)
  const pool = drills.filter((d) => d.kind === 'drill' && d.levels.includes(level))
  const focused = shuffle(pool.filter((d) => d.focus.includes(focus)), rand)
  const others = shuffle(pool.filter((d) => !d.focus.includes(focus)), rand)
  const picked: Drill[] = []
  const used = new Set<string>()
  const budget = remaining
  let focusedTime = 0

  const take = (d: Drill) => {
    picked.push(d)
    used.add(d.id)
    remaining -= cost(d)
    if (d.focus.includes(focus)) focusedTime += d.minutes
  }

  for (const d of focused) if (cost(d) <= remaining && focusedTime < budget * FOCUS_SHARE) take(d)
  for (const d of others) if (!used.has(d.id) && cost(d) <= remaining) take(d)
  for (const d of focused) if (!used.has(d.id) && cost(d) <= remaining) take(d)

  if (remaining >= MIN_SHORTENED) {
    const spare = [...focused, ...others].find((d) => !used.has(d.id))
    if (spare) {
      const mins = Math.floor(remaining - spare.restSec / 60)
      if (mins >= MIN_SHORTENED - 1) take({ ...spare, minutes: mins, reps: `${spare.reps} (shortened to ${mins} min)` })
    }
  }

  // Focus drills first while players are fresh, then the supporting work.
  const ordered = [...picked.filter((d) => d.focus.includes(focus)), ...picked.filter((d) => !d.focus.includes(focus))]
  return [warm, ...ordered, cool]
}
