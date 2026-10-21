import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../shared/AppShell'
import { DemoLimit, isDemo } from '../../shared/demo'
import { beep, useWakeLock } from '../../shared/feedback'
import { useLocalState } from '../../shared/storage'
import { drills, durations, focuses, levels, type Drill, type Focus, type Level } from './drills'
import { generate, totalMinutes } from './generate'

interface Plan {
  level: Level
  focus: Focus
  minutes: number
  seed: number
}

const newSeed = () => Math.floor(Math.random() * 1e9)
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** The demo timer runs this many steps (warm-up + first rest), then asks to buy. */
const DEMO_TIMER_STEPS = 2

export default function App() {
  const [plan, setPlan] = useLocalState<Plan>('pt:drill-generator:plan', { level: 'beginner', focus: 'dinking', minutes: 30, seed: newSeed() })
  const [favs, setFavs] = useLocalState<string[]>('pt:drill-generator:favorites', [])
  const [tab, setTab] = useState<'plan' | 'favorites'>('plan')
  const [practising, setPractising] = useState(false)
  const routine = useMemo(() => generate(plan), [plan])

  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  if (practising)
    return (
      <AppShell slug="drill-generator">
        <PracticeTimer routine={routine} onExit={() => setPractising(false)} />
      </AppShell>
    )

  return (
    <AppShell slug="drill-generator">
      <div className="mb-4 flex rounded-xl bg-ink/5 p-1" role="tablist">
        {(['plan', 'favorites'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${tab === t ? 'bg-white text-court-700 shadow' : 'text-ink/70'}`}>
            {t === 'plan' ? 'Build a routine' : `Favourites (${favs.length})`}
          </button>
        ))}
      </div>

      {tab === 'plan' ? (
        <div className="space-y-4">
          <div className="card space-y-4 p-4">
            <Choice label="Skill level" options={levels} value={plan.level} onChange={(level) => setPlan({ ...plan, level, seed: newSeed() })} />
            <Choice label="Training focus" options={focuses} value={plan.focus} onChange={(focus) => setPlan({ ...plan, focus, seed: newSeed() })} />
            <Choice label="Duration (minutes)" options={durations.map(String)} value={String(plan.minutes)} onChange={(m) => setPlan({ ...plan, minutes: Number(m), seed: newSeed() })} />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">
                {cap(plan.focus)} · {plan.level}
              </h2>
              <p className="text-sm text-ink/60">
                {routine.length} blocks · about {Math.round(totalMinutes(routine))} min including rest
              </p>
            </div>
            <button className="btn-ghost" onClick={() => setPlan({ ...plan, seed: newSeed() })}>
              ↻ Shuffle
            </button>
          </div>

          <ol className="space-y-2">
            {routine.map((d, i) => (
              <DrillCard key={d.id} drill={d} index={i + 1} fav={favs.includes(d.id)} onFav={() => toggleFav(d.id)} />
            ))}
          </ol>

          <button className="btn-primary sticky bottom-4 w-full py-4 text-lg shadow-lg" onClick={() => setPractising(true)}>
            ▶ Start practice timer
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {isDemo() ? (
            <DemoLimit slug="drill-generator" title="Favourites are in the full app">Save the drills you love and come back to them any time.</DemoLimit>
          ) : favs.length === 0 ? (
            <p className="card p-6 text-center text-ink/60">Tap ☆ on any drill to save it here.</p>
          ) : (
            <ol className="space-y-2">
              {drills
                .filter((d) => favs.includes(d.id))
                .map((d, i) => (
                  <DrillCard key={d.id} drill={d} index={i + 1} fav onFav={() => toggleFav(d.id)} />
                ))}
            </ol>
          )}
        </div>
      )}
    </AppShell>
  )
}

function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={`min-h-10 rounded-full border px-4 text-sm font-semibold capitalize transition ${value === o ? 'border-court-600 bg-court-600 text-white' : 'border-ink/15 bg-white text-ink/80 hover:border-court-500'}`}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

const kindStyle: Record<Drill['kind'], string> = {
  warmup: 'bg-amber-100 text-amber-900',
  drill: 'bg-court-100 text-court-800',
  cooldown: 'bg-sky-100 text-sky-900',
}

function DrillCard({ drill, index, fav, onFav }: { drill: Drill; index: number; fav: boolean; onFav: () => void }) {
  const [open, setOpen] = useState(index <= 2)
  return (
    <li className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-bold tabular-nums">{index}</span>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="block truncate font-semibold">{drill.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
            <span className={`chip ${kindStyle[drill.kind]}`}>{drill.kind === 'warmup' ? 'Warm-up' : drill.kind === 'cooldown' ? 'Cool-down' : drill.focus.map(cap).join(' · ')}</span>
            {drill.minutes} min{drill.restSec ? ` + ${drill.restSec}s rest` : ''} · {drill.players}
          </span>
        </button>
        {!isDemo() && (
        <button onClick={onFav} className="btn-ghost min-h-10 px-3" aria-pressed={fav} aria-label={fav ? `Remove ${drill.name} from favourites` : `Save ${drill.name} to favourites`}>
          <span className={fav ? 'text-amber-500' : 'text-ink/40'}>{fav ? '★' : '☆'}</span>
        </button>
        )}
      </div>
      {open && (
        <div className="border-t border-ink/10 bg-paper/60 px-4 py-3 text-sm">
          <p className="mb-2 font-semibold">Reps: {drill.reps}</p>
          <ol className="list-decimal space-y-1 pl-5 text-ink/80">
            {drill.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </li>
  )
}

interface Phase {
  label: string
  detail: string
  seconds: number
  rest: boolean
}

function toPhases(routine: Drill[]): Phase[] {
  return routine.flatMap((d) => {
    const work: Phase = { label: d.name, detail: d.reps, seconds: d.minutes * 60, rest: false }
    return d.restSec ? [work, { label: 'Rest', detail: 'Hydrate and get ready for the next drill.', seconds: d.restSec, rest: true }] : [work]
  })
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function PracticeTimer({ routine, onExit }: { routine: Drill[]; onExit: () => void }) {
  const phases = useMemo(() => toPhases(routine), [routine])
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(phases[0].seconds)
  const [running, setRunning] = useState(false)
  const [endsAt, setEndsAt] = useState(0)
  const done = i >= phases.length
  useWakeLock(running)

  // Track a wall-clock deadline so backgrounding the tab doesn't make the timer drift.
  useEffect(() => {
    if (!running || done) return
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        beep(i + 1 >= phases.length ? 'win' : 'point')
        const next = i + 1
        setI(next)
        if (next < phases.length) {
          setLeft(phases[next].seconds)
          setEndsAt(Date.now() + phases[next].seconds * 1000)
        } else setRunning(false)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, endsAt, i, phases, done])

  const start = () => {
    setEndsAt(Date.now() + left * 1000)
    setRunning(true)
  }
  const jump = (to: number) => {
    setI(to)
    if (to < phases.length) {
      setLeft(phases[to].seconds)
      setEndsAt(Date.now() + phases[to].seconds * 1000)
    } else setRunning(false)
  }

  const p = phases[Math.min(i, phases.length - 1)]
  const pct = done ? 100 : 100 - (left / p.seconds) * 100

  if (isDemo() && i >= DEMO_TIMER_STEPS && !done)
    return (
      <div className="space-y-4">
        <DemoLimit slug="drill-generator" title="Nice warm-up! That’s the end of the demo timer">Buy the app to run full sessions with timed drills, rest periods and sound cues.</DemoLimit>
        <button className="btn-ghost w-full" onClick={onExit}>
          Back to routine
        </button>
      </div>
    )

  return (
    <div className="space-y-4">
      <div className={`card p-6 text-center ${p.rest && !done ? 'bg-sky-50' : ''}`} aria-live="polite">
        {done ? (
          <>
            <p className="text-3xl font-black">Session complete 🎉</p>
            <p className="mt-2 text-ink/70">Great work. Stretch and hydrate.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              Step {i + 1} of {phases.length}
            </p>
            <p className="mt-1 text-2xl font-bold">{p.label}</p>
            <p className="text-sm text-ink/70">{p.detail}</p>
            <p className="my-4 text-7xl font-black tabular-nums" aria-label={`${Math.floor(left / 60)} minutes ${left % 60} seconds left`}>
              {fmt(left)}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div className={`h-full transition-[width] ${p.rest ? 'bg-sky-500' : 'bg-court-600'}`} style={{ width: `${pct}%` }} />
            </div>
            {phases[i + 1] && <p className="mt-3 text-sm text-ink/60">Next: {phases[i + 1].label}</p>}
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {!done &&
          (running ? (
            <button className="btn-ball flex-1 py-4 text-lg" onClick={() => setRunning(false)}>
              ❚❚ Pause
            </button>
          ) : (
            <button className="btn-primary flex-1 py-4 text-lg" onClick={start}>
              ▶ {left === p.seconds ? 'Start' : 'Resume'}
            </button>
          ))}
        {!done && (
          <button className="btn-ghost" onClick={() => jump(i + 1)}>
            Skip ⏭
          </button>
        )}
        <button className="btn-ghost" onClick={onExit}>
          {done ? 'Back to routine' : 'Exit'}
        </button>
      </div>
    </div>
  )
}
