import { useMemo, useRef, useState } from 'react'
import { AppShell, ConfirmButton } from '../../shared/AppShell'
import { isDemo } from '../../shared/demo'
import { downloadFile } from '../../shared/download'
import { useLocalState } from '../../shared/storage'
import {
  BYE,
  MAX_PLAYERS,
  byesFor,
  champion,
  elimination,
  parseTournament,
  roundName,
  roundRobin,
  standings,
  validateNames,
  validateScore,
  type Match,
  type Tournament,
} from './bracket'

/** The demo runs small events only, and no export/import/print. */
const DEMO_MAX_ENTRIES = 4

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament'

export default function App() {
  const [list, setList] = useLocalState<Tournament[]>('pt:tournament:list', [])
  const [currentId, setCurrentId] = useLocalState<string | null>('pt:tournament:current', null)
  const [creating, setCreating] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const current = list.find((t) => t.id === currentId) ?? null

  const save = (t: Tournament) => setList((prev) => (prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev]))

  const onImport = async (file: File) => {
    const t = parseTournament(await file.text())
    if (!t) {
      setImportError('That file isn’t a PickleTools tournament export.')
      return
    }
    const copy = { ...t, id: list.some((x) => x.id === t.id) ? uid() : t.id }
    save(copy)
    setCurrentId(copy.id)
    setImportError('')
  }

  return (
    <AppShell slug="tournament">
      {current ? (
        <TournamentView
          t={current}
          onChange={save}
          onBack={() => setCurrentId(null)}
          onDelete={() => {
            setList((prev) => prev.filter((x) => x.id !== current.id))
            setCurrentId(null)
          }}
        />
      ) : creating ? (
        <CreateForm
          onCancel={() => setCreating(false)}
          onCreate={(t) => {
            save(t)
            setCurrentId(t.id)
            setCreating(false)
          }}
        />
      ) : (
        <div className="space-y-4">
          <button className="btn-primary w-full py-4 text-lg" onClick={() => setCreating(true)}>
            + New tournament
          </button>
          {!isDemo() && (
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              Import tournament file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import tournament file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
            {importError && (
              <p className="text-sm text-red-700" role="alert">
                {importError}
              </p>
            )}
          </div>
          )}
          <h2 className="text-lg font-bold">Saved tournaments</h2>
          {list.length === 0 ? (
            <p className="card p-6 text-center text-ink/60">No tournaments yet.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((t) => {
                const rounds = t.format === 'single' ? elimination(t) : roundRobin(t)
                const all = rounds.flat().filter((m) => m.a !== BYE && m.b !== BYE)
                const done = all.filter((m) => m.winner).length
                return (
                  <li key={t.id}>
                    <button className="card flex w-full items-center gap-3 p-4 text-left hover:border-court-500" onClick={() => setCurrentId(t.id)}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{t.name}</span>
                        <span className="text-sm text-ink/60">
                          {t.format === 'single' ? 'Single elimination' : 'Round robin'} · {t.players.length} entries · {done}/{all.length} matches played
                        </span>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  )
}

function CreateForm({ onCreate, onCancel }: { onCreate: (t: Tournament) => void; onCancel: () => void }) {
  const [name, setName] = useState('Club Tournament')
  const [format, setFormat] = useState<Tournament['format']>('single')
  const [names, setNames] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [error, setError] = useState('')
  const entries = names.split('\n').map((n) => n.trim()).filter(Boolean)

  return (
    <form
      className="card space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        const err = isDemo() && entries.length > DEMO_MAX_ENTRIES ? `The demo supports up to ${DEMO_MAX_ENTRIES} entries. Buy the app for up to ${MAX_PLAYERS}.` : validateNames(entries)
        if (err) return setError(err)
        let players = entries
        if (shuffle) {
          players = [...entries]
          for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[players[i], players[j]] = [players[j], players[i]]
          }
        }
        onCreate({ id: uid(), name: name.trim() || 'Tournament', format, players, results: {}, createdAt: Date.now() })
      }}
    >
      <h2 className="text-lg font-bold">New tournament</h2>
      <div>
        <label className="label" htmlFor="tname">
          Name
        </label>
        <input id="tname" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <fieldset>
        <legend className="label">Format</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['single', 'Single elimination', 'Lose once and you’re out. Top seeds get byes.'],
              ['roundrobin', 'Round robin', 'Everyone plays everyone. Ranked by wins.'],
            ] as const
          ).map(([v, title, hint]) => (
            <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${format === v ? 'border-court-600 bg-court-50' : 'border-ink/15'}`}>
              <input type="radio" name="format" className="mt-1 size-5 accent-court-600" checked={format === v} onChange={() => setFormat(v)} />
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="text-sm text-ink/60">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="names">
          Players or teams <span className="font-normal text-ink/50">- one per line, in seed order</span>
        </label>
        <textarea id="names" className="input min-h-48 font-mono text-sm" value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Ana & Ben\nCara & Dan\nEli & Fay\nGio & Hana'} />
        <p className="mt-1 text-sm text-ink/60">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} (max {isDemo() ? DEMO_MAX_ENTRIES : MAX_PLAYERS}{isDemo() ? ' in the demo' : ''})
          {format === 'roundrobin' && entries.length > 1 && <> · {(entries.length * (entries.length - 1)) / 2} matches</>}
        </p>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-5 accent-court-600" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
        Random draw (ignore the order above)
      </label>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" type="submit">
          Create
        </button>
        <button className="btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function TournamentView({ t, onChange, onBack, onDelete }: { t: Tournament; onChange: (t: Tournament) => void; onBack: () => void; onDelete: () => void }) {
  const rounds = useMemo(() => (t.format === 'single' ? elimination(t) : roundRobin(t)), [t])
  const [editing, setEditing] = useState<string | null>(null)
  const winner = t.format === 'single' ? champion(rounds) : null
  const table = t.format === 'roundrobin' ? standings(t, rounds) : []
  const rrComplete = t.format === 'roundrobin' && rounds.flat().every((m) => m.winner)
  const byes = t.format === 'roundrobin' ? byesFor(t, rounds) : []

  const record = (m: Match, sa: number, sb: number) => {
    onChange({ ...t, results: { ...t.results, [m.id]: { a: m.a!, b: m.b!, sa, sb } } })
    setEditing(null)
  }
  const clear = (m: Match) => {
    const results = { ...t.results }
    delete results[m.id]
    onChange({ ...t, results })
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={onBack}>
          ‹ All tournaments
        </button>
        <span className="flex-1" />
        {!isDemo() && (
          <>
        <button className="btn-ghost" onClick={() => window.print()} title="Choose “Save as PDF” in the print dialog to export a PDF">
          Print / PDF
        </button>
        <button className="btn-ghost" onClick={() => downloadFile(`${slugify(t.name)}.json`, JSON.stringify(t, null, 2), 'application/json')}>
          Export
        </button>
          </>
        )}
      </div>

      <header>
        <h2 className="text-2xl font-black">{t.name}</h2>
        <p className="text-ink/60">
          {t.format === 'single' ? 'Single elimination' : 'Round robin'} · {t.players.length} entries
        </p>
      </header>

      {(winner || rrComplete) && (
        <div className="card border-2 border-ball bg-court-600 p-4 text-center text-white" role="status">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Champion</p>
          <p className="text-3xl font-black">🏆 {winner ?? table[0]?.name}</p>
        </div>
      )}

      {t.format === 'roundrobin' && <Standings rows={table} />}

      {t.format === 'single' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 print:overflow-visible">
          <div className="flex min-w-max gap-4 print:min-w-0 print:flex-wrap">
            {rounds.map((r, ri) => (
              <section key={ri} className="flex w-64 flex-col justify-around gap-3" aria-label={roundName(ri, rounds.length)}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink/60">{roundName(ri, rounds.length)}</h3>
                {r.map((m) => (
                  <MatchCard key={m.id} m={m} editing={editing === m.id} onEdit={() => setEditing(m.id)} onCancel={() => setEditing(null)} onSave={(a, b) => record(m, a, b)} onClear={() => clear(m)} />
                ))}
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rounds.map((r, ri) => (
            <section key={ri} className="space-y-2 break-inside-avoid">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink/60">
                Round {ri + 1}
                {byes[ri] && <span className="ml-2 font-normal normal-case">· {byes[ri]} sits out</span>}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {r.map((m) => (
                  <MatchCard key={m.id} m={m} editing={editing === m.id} onEdit={() => setEditing(m.id)} onCancel={() => setEditing(null)} onSave={(a, b) => record(m, a, b)} onClear={() => clear(m)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="no-print border-t border-ink/10 pt-4">
        <ConfirmButton message={`Delete “${t.name}” from this device?`} confirmLabel="Delete" onConfirm={onDelete}>
          Delete tournament
        </ConfirmButton>
      </div>
    </div>
  )
}

function status(m: Match): { text: string; cls: string } {
  if (m.a === BYE || m.b === BYE) return { text: 'Bye', cls: 'bg-ink/10 text-ink/60' }
  if (m.winner) return { text: 'Final', cls: 'bg-court-100 text-court-800' }
  if (m.a && m.b) return { text: 'Ready', cls: 'bg-amber-100 text-amber-900' }
  return { text: 'Waiting', cls: 'bg-ink/5 text-ink/50' }
}

function MatchCard({
  m,
  editing,
  onEdit,
  onCancel,
  onSave,
  onClear,
}: {
  m: Match
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (a: number, b: number) => void
  onClear: () => void
}) {
  const [sa, setSa] = useState(m.score ? String(m.score.a) : '')
  const [sb, setSb] = useState(m.score ? String(m.score.b) : '')
  const [err, setErr] = useState('')
  const st = status(m)
  const playable = !!m.a && !!m.b && m.a !== BYE && m.b !== BYE
  const row = (name: string | null, score: number | undefined, isWinner: boolean) => (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${isWinner ? 'font-bold' : ''} ${name === BYE ? 'italic text-ink/40' : ''}`}>
      <span className="truncate">{name ?? <span className="text-ink/40">TBD</span>}</span>
      <span className="tabular-nums">{score ?? ''}</span>
    </div>
  )

  if (editing && playable)
    return (
      <form
        className="card space-y-2 border-court-600 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          const v = validateScore(sa, sb)
          if (v) return setErr(v)
          onSave(Number(sa), Number(sb))
        }}
      >
        {[
          [m.a, sa, setSa],
          [m.b, sb, setSb],
        ].map(([name, val, set], i) => (
          <label key={i} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name as string}</span>
            <input
              className="input w-20 text-center tabular-nums"
              inputMode="numeric"
              autoFocus={i === 0}
              aria-label={`${name} score`}
              value={val as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </label>
        ))}
        {err && (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary min-h-9 flex-1 py-1.5 text-sm">Save</button>
          {m.score && (
            <button type="button" className="btn-danger min-h-9 py-1.5 text-sm" onClick={onClear}>
              Clear
            </button>
          )}
          <button type="button" className="btn-ghost min-h-9 py-1.5 text-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    )

  return (
    <div className="card break-inside-avoid overflow-hidden">
      <div className="divide-y divide-ink/10">
        {row(m.a, m.score?.a, !!m.winner && m.winner === m.a && m.b !== BYE)}
        {row(m.b, m.score?.b, !!m.winner && m.winner === m.b && m.a !== BYE)}
      </div>
      <div className="flex items-center justify-between border-t border-ink/10 bg-paper/60 px-3 py-1.5">
        <span className={`chip ${st.cls}`}>{st.text}</span>
        {playable && (
          <button className="no-print text-sm font-semibold text-court-700 hover:underline" onClick={onEdit}>
            {m.score ? 'Edit score' : 'Enter score'}
          </button>
        )}
      </div>
    </div>
  )
}

function Standings({ rows }: { rows: ReturnType<typeof standings> }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="px-3 pt-3 text-left font-bold">Standings</caption>
        <thead>
          <tr className="text-left text-xs uppercase text-ink/60">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-2 py-2 text-right">P</th>
            <th className="px-2 py-2 text-right">W</th>
            <th className="px-2 py-2 text-right">L</th>
            <th className="px-3 py-2 text-right" title="Point difference">+/−</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-t border-ink/10">
              <td className="px-3 py-2 tabular-nums">{i + 1}</td>
              <td className="px-3 py-2 font-semibold">{r.name}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.played}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.wins}</td>
              <td className="px-2 py-2 text-right tabular-nums">{r.losses}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
