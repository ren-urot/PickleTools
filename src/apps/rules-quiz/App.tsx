import { useMemo, useState, type ReactNode } from 'react'
import { AppShell } from '../../shared/AppShell'
import { DemoLimit, isDemo } from '../../shared/demo'
import { useLocalState } from '../../shared/storage'
import { CONTENT_REVIEWED, quiz as fullQuiz, rules as allRules, type Question } from './content'

// The demo covers the first sections and a short quiz.
const DEMO_SECTIONS = 3
const DEMO_QUESTIONS = 5
const rules = () => (isDemo() ? allRules.slice(0, DEMO_SECTIONS) : allRules)
const quizPool = () => (isDemo() ? fullQuiz.slice(0, DEMO_QUESTIONS * 2) : fullQuiz)
const quizLength = () => (isDemo() ? DEMO_QUESTIONS : fullQuiz.length)

type Tab = 'rules' | 'quiz' | 'print'

export default function App() {
  const [tab, setTab] = useState<Tab>('rules')
  return (
    <AppShell slug="rules-quiz">
      <div className="no-print mb-4 grid grid-cols-3 gap-1 rounded-xl bg-ink/5 p-1" role="tablist">
        {(
          [
            ['rules', 'Rules'],
            ['quiz', 'Quiz'],
            ['print', 'Quick reference'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-10 rounded-lg text-sm font-semibold ${tab === t ? 'bg-white text-court-700 shadow' : 'text-ink/70'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'rules' && <Rules />}
      {tab === 'quiz' && <Quiz />}
      {tab === 'print' && (isDemo() ? <DemoLimit slug="rules-quiz" title="The printable guide is in the full app">A one-page quick reference to keep in your bag.</DemoLimit> : <QuickRef />)}
      <p className="mt-6 text-xs text-ink/50">
        Content reviewed {CONTENT_REVIEWED} against the USA Pickleball rulebook fundamentals. Local and tournament rules may differ; the official rulebook takes precedence.
      </p>
    </AppShell>
  )
}

function highlight(text: string, q: string): ReactNode {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-ball px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function Rules() {
  const [q, setQ] = useState('')
  const term = q.trim()
  const results = useMemo(
    () =>
      rules()
        .map((s) => ({ ...s, points: term && !s.title.toLowerCase().includes(term.toLowerCase()) ? s.points.filter((p) => p.toLowerCase().includes(term.toLowerCase())) : s.points }))
        .filter((s) => s.points.length > 0),
    [term],
  )

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 -mx-1 bg-paper/95 px-1 py-1 backdrop-blur">
        <label className="sr-only" htmlFor="search">
          Search rules
        </label>
        <input id="search" type="search" className="input" placeholder="Search rules - e.g. kitchen, serve, score" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!term && (
        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {rules().map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip min-h-8 bg-white px-3 text-sm text-court-700 ring-1 ring-ink/10 hover:ring-court-500">
              {s.title}
            </a>
          ))}
        </nav>
      )}
      {!term && <CourtDiagram />}
      {results.length === 0 && <p className="card p-6 text-center text-ink/60">No rules match “{term}”.</p>}
      {results.map((s) => (
        <section key={s.id} id={s.id} className="card scroll-mt-32 p-4">
          <h2 className="text-lg font-bold">{s.title}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink/85">
            {s.points.map((p) => (
              <li key={p}>{highlight(p, term)}</li>
            ))}
          </ul>
        </section>
      ))}
      {isDemo() && (
        <DemoLimit slug="rules-quiz" title={`${allRules.length - DEMO_SECTIONS} more sections in the full app`}>Kitchen rules, faults, line calls and terms, plus the full ${fullQuiz.length}-question quiz.</DemoLimit>
      )}
    </div>
  )
}

function CourtDiagram() {
  // 20 ft × 44 ft at 10 px per ft; kitchen 7 ft from the net.
  return (
    <figure className="card p-4">
      <svg viewBox="-60 -10 320 460" className="mx-auto h-auto w-full max-w-xs" role="img" aria-labelledby="court-title">
        <title id="court-title">Pickleball court: 20 by 44 feet, with a 7-foot non-volley zone on each side of the net and left and right service courts.</title>
        <rect x="0" y="0" width="200" height="440" fill="#1f7a4d" stroke="#fff" strokeWidth="3" />
        <rect x="0" y="150" width="200" height="140" fill="#2c9a5f" />
        <line x1="0" y1="150" x2="200" y2="150" stroke="#fff" strokeWidth="3" />
        <line x1="0" y1="290" x2="200" y2="290" stroke="#fff" strokeWidth="3" />
        <line x1="100" y1="0" x2="100" y2="150" stroke="#fff" strokeWidth="3" />
        <line x1="100" y1="290" x2="100" y2="440" stroke="#fff" strokeWidth="3" />
        <line x1="-8" y1="220" x2="208" y2="220" stroke="#d9f02b" strokeWidth="5" />
        <g fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="Inter Variable, system-ui, sans-serif">
          <text x="100" y="190">KITCHEN</text>
          <text x="100" y="262">KITCHEN</text>
          <text x="50" y="80">Service</text>
          <text x="150" y="80">Service</text>
          <text x="50" y="370">Service</text>
          <text x="150" y="370">Service</text>
        </g>
        <g fill="#10201a" fontSize="11" fontFamily="Inter Variable, system-ui, sans-serif">
          <text x="212" y="224">Net</text>
          <text x="-6" y="188" textAnchor="end">7 ft</text>
          <text x="-6" y="440" textAnchor="end">Baseline</text>
          <text x="100" y="456" textAnchor="middle">20 ft</text>
          <text x="236" y="340" textAnchor="middle" transform="rotate(90 236 340)">44 ft</text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-ink/60">The kitchen lines are part of the kitchen.</figcaption>
    </figure>
  )
}

function shuffled<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function Quiz() {
  const [best, setBest] = useLocalState('pt:rules-quiz:best', 0)
  const [questions, setQuestions] = useState<Question[]>(() => shuffled(quizPool()).slice(0, quizLength()))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const done = i >= questions.length
  const score = answers.filter(Boolean).length

  const restart = () => {
    setQuestions(shuffled(quizPool()).slice(0, quizLength()))
    setI(0)
    setPicked(null)
    setAnswers([])
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="card space-y-3 p-6 text-center" role="status">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">Your score</p>
        <p className="text-6xl font-black tabular-nums">
          {score}/{questions.length}
        </p>
        <p className="text-ink/70">{pct >= 90 ? 'Rules expert! 🏆' : pct >= 70 ? 'Solid - you’re ready for open play.' : 'Good start. Review the rules and try again.'}</p>
        <p className="text-sm text-ink/60">Best: {Math.max(best, score)}/{questions.length}</p>
        <button className="btn-primary" onClick={restart}>
          Try again
        </button>
      </div>
    )
  }

  const q = questions[i]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-ink/60">
        <span>
          Question {i + 1} of {questions.length}
        </span>
        <span className="tabular-nums">Score: {score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full bg-court-600 transition-[width]" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>
      <fieldset className="card space-y-3 p-4">
        <legend className="sr-only">Question {i + 1}</legend>
        <p className="text-lg font-bold">{q.q}</p>
        <div className="space-y-2">
          {q.options.map((o, k) => {
            const state = picked == null ? 'idle' : k === q.answer ? 'right' : k === picked ? 'wrong' : 'idle'
            return (
              <button
                key={o}
                disabled={picked != null}
                onClick={() => {
                  setPicked(k)
                  setAnswers((a) => [...a, k === q.answer])
                }}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-4 py-2 text-left font-medium transition ${
                  state === 'right' ? 'border-court-600 bg-court-50' : state === 'wrong' ? 'border-red-500 bg-red-50' : 'border-ink/10 bg-white hover:border-court-500'
                } disabled:cursor-default`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-bold">{state === 'right' ? '✓' : state === 'wrong' ? '✕' : String.fromCharCode(65 + k)}</span>
                {o}
              </button>
            )
          })}
        </div>
        {picked != null && (
          <div className={`rounded-xl p-3 text-sm ${picked === q.answer ? 'bg-court-50 text-court-900' : 'bg-red-50 text-red-900'}`} role="status">
            <strong>{picked === q.answer ? 'Correct. ' : 'Not quite. '}</strong>
            {q.why}
          </div>
        )}
      </fieldset>
      {picked != null && (
        <button
          className="btn-primary w-full"
          autoFocus
          onClick={() => {
            const next = i + 1
            if (next >= questions.length) setBest((b) => Math.max(b, score))
            setI(next)
            setPicked(null)
          }}
        >
          {i + 1 < questions.length ? 'Next question →' : 'See my score'}
        </button>
      )}
    </div>
  )
}

function QuickRef() {
  const essentials: [string, string][] = [
    ['Court', '20 × 44 ft · net 36 in at sides, 34 in at centre · kitchen 7 ft'],
    ['Serve', 'Underhand, diagonal, beyond the kitchen · one attempt · net serves that land in are live'],
    ['Kitchen line on serve', 'Fault. All other lines are in.'],
    ['Two-bounce rule', 'Serve bounces, return bounces, then volleys are allowed'],
    ['Scoring', 'Only the serving side scores · to 11, win by 2'],
    ['Doubles call', 'Server score - receiver score - server # · start at 0-0-2'],
    ['Singles side', 'Even score → right court · odd → left'],
    ['Kitchen', 'No volleys while touching it, or falling into it after a volley · bounced balls are fine'],
    ['Line calls', 'Call your own side · if unsure, it’s in'],
  ]
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <p className="text-sm text-ink/70">One page to keep in your bag. Choose “Save as PDF” in the print dialog for a digital copy.</p>
        <button className="btn-primary shrink-0" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <article className="card p-5 print:border-0 print:p-0">
        <h2 className="text-2xl font-black">Pickleball Quick Reference</h2>
        <dl className="mt-3 divide-y divide-ink/10">
          {essentials.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-bold">{k}</dt>
              <dd className="text-ink/85">{v}</dd>
            </div>
          ))}
        </dl>
      </article>
    </div>
  )
}
