import type { ReactNode } from 'react'
import { getApp } from '../../shared/apps'

// Illustrated previews only - the paid app code is never loaded on the store.

function Phone({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-64 rounded-[2.2rem] border-[10px] border-ink bg-paper shadow-xl" role="img" aria-label={`Illustrated preview of ${title}`}>
      <div className="flex items-center gap-2 rounded-t-[1.4rem] px-3 py-2 text-xs font-bold text-white" style={{ background: color }}>
        <span className="size-2.5 rounded-full bg-ball" aria-hidden="true" />
        {title}
      </div>
      <div className="h-96 space-y-2 overflow-hidden p-3 text-[11px]" aria-hidden="true">
        {children}
      </div>
    </div>
  )
}

const Box = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`rounded-xl bg-white p-2 shadow-sm ${className}`}>{children}</div>

const screens: Record<string, ReactNode> = {
  scorekeeper: (
    <>
      <Box className="text-center">
        <p className="text-ink/50">SCORE CALL</p>
        <p className="text-3xl font-black">4 - 2 - 1</p>
        <p className="text-ink/60">Ana serves from the right</p>
      </Box>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border-2 border-ball bg-court-600 py-6 text-center text-white">
          <p className="font-bold">Aces</p>
          <p className="text-4xl font-black">4</p>
        </div>
        <div className="rounded-xl bg-court-800 py-6 text-center text-white/90">
          <p className="font-bold">Dinkers</p>
          <p className="text-4xl font-black">2</p>
        </div>
      </div>
      <div className="rounded-xl bg-court-700 p-2">
        <div className="grid grid-cols-2 gap-1">
          <span className="rounded bg-white/15 py-2 text-center text-white">Cara</span>
          <span className="rounded bg-white/15 py-2 text-center text-white">Dan</span>
        </div>
        <div className="my-1 h-0.5 bg-white" />
        <div className="grid grid-cols-2 gap-1">
          <span className="rounded bg-white/15 py-2 text-center text-white">Ben</span>
          <span className="rounded bg-ball py-2 text-center font-bold">Ana</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center font-semibold">
        <span className="rounded-lg bg-white py-2">↶ Undo</span>
        <span className="rounded-lg bg-white py-2">New game</span>
        <span className="rounded-lg bg-white py-2 text-red-700">Reset</span>
      </div>
    </>
  ),
  'match-tracker': (
    <>
      <Box>
        <p className="font-bold">Your record</p>
        <div className="mt-1 grid grid-cols-3 gap-1 text-center">
          {[['Played', '24'], ['Wins', '15'], ['Win %', '63%']].map(([k, v]) => (
            <div key={k} className={`rounded-lg p-1 ${k === 'Win %' ? 'bg-court-600 text-white' : 'bg-ink/5'}`}>
              <p className="opacity-70">{k}</p>
              <p className="text-lg font-black">{v}</p>
            </div>
          ))}
        </div>
      </Box>
      <div className="rounded-xl bg-court-600 py-2 text-center font-bold text-white">+ Add completed match</div>
      {[['W', 'vs Cara & Dan', '11-7, 11-9'], ['L', 'vs Eli & Fay', '8-11'], ['W', 'vs Gio', '11-4'], ['W', 'vs Hana & Ivo', '11-9, 6-11, 11-8']].map(([r, who, s]) => (
        <Box key={who} className="flex items-center gap-2">
          <span className={`flex size-6 items-center justify-center rounded-full font-black ${r === 'W' ? 'bg-court-600 text-white' : 'bg-red-100 text-red-700'}`}>{r}</span>
          <span className="flex-1">
            <b>{who}</b>
            <br />
            <span className="text-ink/50">{s}</span>
          </span>
        </Box>
      ))}
    </>
  ),
  'drill-generator': (
    <>
      <Box>
        <p className="font-bold">Training focus</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {['serving', 'dinking', 'volleying', 'footwork'].map((f) => (
            <span key={f} className={`rounded-full px-2 py-0.5 ${f === 'dinking' ? 'bg-court-600 text-white' : 'bg-ink/5'}`}>{f}</span>
          ))}
        </div>
      </Box>
      {[['1', 'Mini-tennis rally', '5 min'], ['2', 'Cross-court dinks', '8 min'], ['3', 'Dink triangle', '8 min'], ['4', 'Third-shot drops', '10 min']].map(([n, name, t]) => (
        <Box key={n} className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-ink/5 font-bold">{n}</span>
          <span className="flex-1 font-semibold">{name}</span>
          <span className="text-ink/50">{t}</span>
        </Box>
      ))}
      <Box className="text-center">
        <p className="text-ink/50">Cross-court dinks</p>
        <p className="text-3xl font-black">6:42</p>
        <div className="mt-1 h-1.5 rounded bg-ink/10"><div className="h-full w-1/3 rounded bg-court-600" /></div>
      </Box>
    </>
  ),
  tournament: (
    <>
      <p className="font-bold">Club Open · Single elimination</p>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col justify-around gap-2">
          {[['Ana & Ben', '11', 'Cara & Dan', '6'], ['Eli & Fay', '9', 'Gio & Hana', '11']].map(([a, sa, b, sb]) => (
            <Box key={a} className="space-y-0.5">
              <p className="flex justify-between font-bold">{a}<span>{sa}</span></p>
              <p className="flex justify-between text-ink/60">{b}<span>{sb}</span></p>
            </Box>
          ))}
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <Box className="space-y-0.5 ring-2 ring-amber-300">
            <p>Ana & Ben</p>
            <p>Gio & Hana</p>
            <p className="text-amber-800">Ready · Enter score</p>
          </Box>
        </div>
      </div>
      <Box>
        <p className="font-bold">Standings (round robin)</p>
        {[['1', 'Ana', '3-0'], ['2', 'Cara', '2-1'], ['3', 'Eli', '1-2']].map(([n, p, r]) => (
          <p key={n} className="flex justify-between border-t border-ink/10 py-0.5">
            <span>{n}. {p}</span>
            <span>{r}</span>
          </p>
        ))}
      </Box>
    </>
  ),
  'paddle-finder': (
    <>
      <Box className="space-y-1">
        <p className="flex justify-between"><b>Max price</b><span>₱8,000</span></p>
        <div className="h-1.5 rounded bg-ink/10"><div className="h-full w-1/2 rounded bg-court-600" /></div>
        <div className="flex gap-1">
          <span className="rounded bg-ink/5 px-1.5">Mid weight</span>
          <span className="rounded bg-ink/5 px-1.5">Hybrid</span>
          <span className="rounded bg-ink/5 px-1.5">Control</span>
        </div>
      </Box>
      {[['Six Zero', 'Double Black Diamond Control 16', 'Control', '~8.1 oz'], ['Vatic Pro', 'PRISM Flash 16mm', 'All-court', '~8.0 oz'], ['Paddletek', 'Bantam TS-5 Pro', 'Control', '~7.9 oz']].map(([b, m, s, w]) => (
        <Box key={m}>
          <p className="text-ink/50">{b}</p>
          <p className="font-bold">{m}</p>
          <p className="mt-0.5 flex gap-1">
            <span className="rounded bg-sky-100 px-1.5">{s}</span>
            <span className="rounded bg-ink/5 px-1.5">{w}</span>
          </p>
        </Box>
      ))}
    </>
  ),
  'rules-quiz': (
    <>
      <div className="rounded-xl border border-ink/20 bg-white px-2 py-1.5 text-ink/40">Search rules - kitchen</div>
      <Box>
        <p className="font-bold">Non-volley zone (kitchen)</p>
        <p className="mt-1 text-ink/70">You may not volley while touching the <mark className="bg-ball">kitchen</mark> or its line…</p>
      </Box>
      <Box className="space-y-1">
        <p className="text-ink/50">Question 3 of 15</p>
        <p className="font-bold">A serve lands on the kitchen line. What is the call?</p>
        <p className="rounded-lg border border-ink/10 p-1">A · In - lines are always in</p>
        <p className="rounded-lg border-2 border-court-600 bg-court-50 p-1">✓ Fault</p>
        <p className="rounded-lg border border-ink/10 p-1">C · Replay the serve</p>
        <p className="rounded-lg bg-court-50 p-1 text-court-900">Correct. On a serve the kitchen line counts as the kitchen.</p>
      </Box>
    </>
  ),
}

export function Preview({ slug }: { slug: string }) {
  const app = getApp(slug)!
  return (
    <div className="rounded-2xl bg-gradient-to-br from-court-100 to-paper p-6">
      <Phone title={app.shortName} color={app.color}>
        {screens[slug]}
      </Phone>
    </div>
  )
}
