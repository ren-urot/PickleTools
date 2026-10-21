import { useMemo, useState } from 'react'
import { AppShell, ConfirmButton } from '../../shared/AppShell'
import { DemoLimit, isDemo } from '../../shared/demo'
import { downloadFile } from '../../shared/download'
import { useLocalState } from '../../shared/storage'
import { gamesWon, result, sortRecent, stats, toRecordsCSV, validate, type Draft, type MatchRecord } from './records'

type Filter = 'all' | 'singles' | 'doubles'

const DEMO_MAX_MATCHES = 3

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export default function App() {
  const [records, setRecords] = useLocalState<MatchRecord[]>('pt:match-tracker:records', [])
  const [myName, setMyName] = useLocalState('pt:match-tracker:me', '')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)
  const [savedNote, setSavedNote] = useState('')

  const visible = useMemo(() => sortRecent(records.filter((r) => filter === 'all' || r.mode === filter)), [records, filter])
  const s = stats(visible)
  const list = showAll ? visible : visible.slice(0, 10)

  return (
    <AppShell slug="match-tracker">
      <div className="space-y-5">
        <section aria-labelledby="stats-h" className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="stats-h" className="text-lg font-bold">
              Your record
            </h2>
            <select className="input w-auto min-h-9 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by match type">
              <option value="all">All matches</option>
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </select>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            <Stat label="Played" value={s.played} />
            <Stat label="Wins" value={s.wins} />
            <Stat label="Losses" value={s.losses} />
            <Stat label="Win %" value={s.played ? `${s.winPct}%` : '-'} highlight />
            <Stat label="Games" value={`${s.gamesFor}-${s.gamesAgainst}`} />
            <Stat label="Streak" value={s.streak || '-'} />
          </dl>
          {s.played > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-red-200" role="img" aria-label={`Win rate ${s.winPct} percent`}>
              <div className="h-full bg-court-600" style={{ width: `${s.winPct}%` }} />
            </div>
          )}
        </section>

        {savedNote && (
          <p className="rounded-xl bg-court-50 p-3 text-sm font-medium text-court-800" role="status">
            {savedNote}
          </p>
        )}

        {isDemo() && records.length >= DEMO_MAX_MATCHES && !adding ? (
          <DemoLimit slug="match-tracker" title={`The demo holds ${DEMO_MAX_MATCHES} matches`}>Buy the app to log every match, keep your history and export it to CSV.</DemoLimit>
        ) : adding ? (
          <MatchForm
            myName={myName}
            onCancel={() => setAdding(false)}
            onSave={(d, me) => {
              setRecords((prev) => [...prev, { ...d, id: uid(), createdAt: Date.now() }])
              if (me.trim()) setMyName(me.trim())
              setAdding(false)
              setSavedNote(`Saved: ${result(d) === 'W' ? 'win' : 'loss'} vs ${d.them}.`)
              setTimeout(() => setSavedNote(''), 4000)
            }}
          />
        ) : (
          <button className="btn-primary w-full py-4 text-lg" onClick={() => setAdding(true)}>
            + Add completed match
          </button>
        )}

        <section aria-labelledby="hist-h">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="hist-h" className="text-lg font-bold">
              Recent matches
            </h2>
            <span className="text-sm text-ink/60">{visible.length} total</span>
          </div>
          {visible.length === 0 ? (
            <p className="card p-6 text-center text-ink/60">No matches yet. Add your first result above.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((r) => (
                <MatchRow key={r.id} r={r} onDelete={() => setRecords((prev) => prev.filter((x) => x.id !== r.id))} />
              ))}
            </ul>
          )}
          {visible.length > 10 && (
            <button className="btn-ghost mt-2 w-full" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show recent only' : `Show all ${visible.length}`}
            </button>
          )}
        </section>

        <section className="card space-y-3 p-4" aria-labelledby="data-h">
          <h2 id="data-h" className="font-bold">
            Your data
          </h2>
          <p className="text-sm text-ink/70">Records are saved only on this device and don't sync. Export a CSV to back them up or open them in a spreadsheet.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={records.length === 0 || isDemo()} title={isDemo() ? 'CSV export is in the full app' : undefined} onClick={() => downloadFile(`pickleball-matches-${today()}.csv`, toRecordsCSV(records), 'text/csv;charset=utf-8')}>
              Export CSV
            </button>
            {records.length > 0 && (
              <ConfirmButton message={`Delete all ${records.length} matches from this device? This can't be undone.`} confirmLabel="Delete all" onConfirm={() => setRecords([])}>
                Clear history
              </ConfirmButton>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2 ${highlight ? 'bg-court-600 text-white' : 'bg-ink/5'}`}>
      <dt className={`text-xs font-semibold ${highlight ? 'text-white/80' : 'text-ink/60'}`}>{label}</dt>
      <dd className="text-xl font-black tabular-nums">{value}</dd>
    </div>
  )
}

function MatchRow({ r, onDelete }: { r: MatchRecord; onDelete: () => void }) {
  const win = result(r) === 'W'
  const g = gamesWon(r)
  return (
    <li className="card flex items-center gap-3 p-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${win ? 'bg-court-600 text-white' : 'bg-red-100 text-red-700'}`} aria-label={win ? 'Win' : 'Loss'}>
        {win ? 'W' : 'L'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {r.us} <span className="font-normal text-ink/50">vs</span> {r.them}
        </p>
        <p className="text-sm text-ink/60">
          {new Date(r.date + 'T00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} · {r.mode} ·{' '}
          <span className="tabular-nums">{r.games.map((s) => `${s.us}-${s.them}`).join(', ')}</span>
          {r.games.length > 1 && <> ({g.us}-{g.them})</>}
        </p>
        {r.notes && <p className="truncate text-sm text-ink/60">{r.notes}</p>}
      </div>
      <ConfirmButton className="btn-ghost min-h-9 px-2 py-1 text-sm" message="Delete?" confirmLabel="Delete" onConfirm={onDelete}>
        <span aria-label={`Delete match vs ${r.them}`}>✕</span>
      </ConfirmButton>
    </li>
  )
}

function MatchForm({ myName, onSave, onCancel }: { myName: string; onSave: (d: Draft, me: string) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'singles' | 'doubles'>('doubles')
  const [me, setMe] = useState(myName)
  const [partner, setPartner] = useState('')
  const [opp1, setOpp1] = useState('')
  const [opp2, setOpp2] = useState('')
  const [date, setDate] = useState(today())
  const [games, setGames] = useState<{ us: string; them: string }[]>([{ us: '', them: '' }])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const join = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(' & ')

  const draft = (): Draft => ({
    mode,
    date,
    us: mode === 'doubles' ? join(me, partner) : me.trim(),
    them: mode === 'doubles' ? join(opp1, opp2) : opp1.trim(),
    games: games.map((g) => ({ us: g.us === '' ? NaN : Number(g.us), them: g.them === '' ? NaN : Number(g.them) })),
    notes: notes.trim(),
  })

  return (
    <form
      className="card space-y-4 p-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const d = draft()
        const errs = validate(d)
        setErrors(errs)
        if (errs.length === 0) onSave(d, me)
      }}
    >
      <h2 className="text-lg font-bold">Add completed match</h2>
      <div className="flex rounded-xl bg-ink/5 p-1">
        {(['singles', 'doubles'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold capitalize ${mode === m ? 'bg-white text-court-700 shadow' : 'text-ink/70'}`}>
            {m}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="You" value={me} onChange={setMe} autoComplete="name" />
        {mode === 'doubles' && <Field label="Partner" value={partner} onChange={setPartner} />}
        <Field label={mode === 'doubles' ? 'Opponent 1' : 'Opponent'} value={opp1} onChange={setOpp1} />
        {mode === 'doubles' && <Field label="Opponent 2" value={opp2} onChange={setOpp2} />}
        <div>
          <label className="label" htmlFor="date">
            Date
          </label>
          <input id="date" type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <fieldset>
        <legend className="label">Game scores (you - them)</legend>
        <div className="space-y-2">
          {games.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-sm font-semibold text-ink/60">Game {i + 1}</span>
              <input aria-label={`Game ${i + 1} your score`} inputMode="numeric" pattern="[0-9]*" className="input w-20 text-center tabular-nums" value={g.us} onChange={(e) => setGames((p) => p.map((x, j) => (j === i ? { ...x, us: e.target.value.replace(/\D/g, '').slice(0, 2) } : x)))} />
              <span aria-hidden="true">-</span>
              <input aria-label={`Game ${i + 1} opponent score`} inputMode="numeric" pattern="[0-9]*" className="input w-20 text-center tabular-nums" value={g.them} onChange={(e) => setGames((p) => p.map((x, j) => (j === i ? { ...x, them: e.target.value.replace(/\D/g, '').slice(0, 2) } : x)))} />
              {games.length > 1 && (
                <button type="button" className="btn-ghost min-h-9 px-2 text-sm" aria-label={`Remove game ${i + 1}`} onClick={() => setGames((p) => p.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {games.length < 5 && (
          <button type="button" className="btn-ghost mt-2 min-h-9 text-sm" onClick={() => setGames((p) => [...p, { us: '', them: '' }])}>
            + Add game
          </button>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">
          Notes <span className="font-normal text-ink/50">(optional)</span>
        </label>
        <input id="notes" className="input" maxLength={120} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Venue, event, what worked…" />
      </div>

      {errors.length > 0 && (
        <ul className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">
          Save match
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const id = label.toLowerCase().replace(/\W+/g, '-')
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="input" maxLength={30} value={value} autoComplete={autoComplete ?? 'off'} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
