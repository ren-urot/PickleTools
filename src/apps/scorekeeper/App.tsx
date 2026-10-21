import { useEffect, useRef, useState } from 'react'
import { AppShell, ConfirmButton } from '../../shared/AppShell'
import { DemoLimit, isDemo } from '../../shared/demo'
import { useLocalState } from '../../shared/storage'
import {
  courtPositions,
  defaultSettings,
  newMatch,
  nextGame,
  rally,
  restartGame,
  scoreCall,
  serverName,
  servingSide,
  undo,
  type Match,
  type Settings,
  type Team,
} from './engine'
import { announce, beep, useWakeLock } from '../../shared/feedback'

export default function App() {
  const [settings, setSettings] = useLocalState<Settings>('pt:scorekeeper:settings', defaultSettings)
  const [match, setMatch] = useLocalState<Match | null>('pt:scorekeeper:match', null)
  // The demo allows one complete game per visit.
  const [demoFinished, setDemoFinished] = useState(false)
  useEffect(() => {
    if (isDemo() && match?.game.winner != null) setDemoFinished(true)
  }, [match])

  return (
    <AppShell slug="scorekeeper">
      {demoFinished && !match ? (
        <DemoLimit slug="scorekeeper" title="That was your free demo game">Buy the app to score unlimited games and best-of-3 matches.</DemoLimit>
      ) : match ? (
        <Scoreboard match={match} setMatch={setMatch} onExit={() => setMatch(null)} />
      ) : (
        <Setup
          settings={settings}
          onStart={(s) => {
            setSettings(s)
            setMatch(newMatch(s))
          }}
        />
      )}
    </AppShell>
  )
}

function Setup({ settings, onStart }: { settings: Settings; onStart: (s: Settings) => void }) {
  const [s, setS] = useState<Settings>(settings)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }))
  const doubles = s.mode === 'doubles'

  const setPlayer = (t: Team, i: 0 | 1, v: string) =>
    setS((p) => {
      const players = p.players.map((row) => [...row]) as Settings['players']
      players[t][i] = v
      return { ...p, players }
    })
  const setTeam = (t: Team, v: string) =>
    setS((p) => {
      const teamNames = [...p.teamNames] as Settings['teamNames']
      teamNames[t] = v
      return { ...p, teamNames }
    })

  const clean = (v: string, fallback: string) => v.trim() || fallback

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        onStart({
          ...s,
          teamNames: [clean(s.teamNames[0], doubles ? 'Team A' : 'Player 1'), clean(s.teamNames[1], doubles ? 'Team B' : 'Player 2')],
          players: [
            [clean(s.players[0][0], 'Player 1'), clean(s.players[0][1], 'Player 2')],
            [clean(s.players[1][0], 'Player 3'), clean(s.players[1][1], 'Player 4')],
          ],
        })
      }}
    >
      <h2 className="text-2xl font-bold">New match</h2>

      <Segmented
        label="Mode"
        value={s.mode}
        options={[
          ['singles', 'Singles'],
          ['doubles', 'Doubles'],
        ]}
        onChange={(v) => set('mode', v)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {([0, 1] as Team[]).map((t) => (
          <fieldset key={t} className="card space-y-3 p-4">
            <legend className="sr-only">{doubles ? `Team ${t + 1}` : `Player ${t + 1}`}</legend>
            <div>
              <label className="label" htmlFor={`team-${t}`}>
                {doubles ? `Team ${t + 1} name` : `Player ${t + 1}`}
              </label>
              <input id={`team-${t}`} className="input" maxLength={24} value={s.teamNames[t]} onChange={(e) => setTeam(t, e.target.value)} />
            </div>
            {doubles &&
              ([0, 1] as const).map((i) => (
                <div key={i}>
                  <label className="label" htmlFor={`p-${t}-${i}`}>
                    {i === 0 ? 'Starts in right court' : 'Starts in left court'}
                  </label>
                  <input id={`p-${t}-${i}`} className="input" maxLength={20} value={s.players[t][i]} onChange={(e) => setPlayer(t, i, e.target.value)} />
                </div>
              ))}
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="radio" name="first" className="size-5 accent-court-600" checked={s.firstServingTeam === t} onChange={() => set('firstServingTeam', t)} />
              Serves first
            </label>
          </fieldset>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented
          label="Play to"
          value={String(s.target)}
          options={[
            ['11', '11'],
            ['15', '15'],
            ['21', '21'],
          ]}
          onChange={(v) => set('target', Number(v) as Settings['target'])}
        />
        <Segmented
          label="Match"
          value={String(s.bestOf)}
          options={[
            ['1', 'One game'],
            ['3', 'Best of 3'],
          ]}
          onChange={(v) => set('bestOf', Number(v) as Settings['bestOf'])}
        />
      </div>

      <div className="card divide-y divide-ink/10">
        <Toggle label="Win by two" hint="Game continues until one side leads by 2." checked={s.winByTwo} onChange={(v) => set('winByTwo', v)} />
        <Toggle label="Sound" hint="Short tone on each rally." checked={s.sound} onChange={(v) => set('sound', v)} />
        <Toggle label="Spoken score" hint="Announces the score after each rally." checked={s.voice} onChange={(v) => set('voice', v)} />
      </div>

      <button type="submit" className="btn-primary w-full py-4 text-lg">
        Start match
      </button>
    </form>
  )
}

function Scoreboard({ match, setMatch, onExit }: { match: Match; setMatch: (m: Match) => void; onExit: () => void }) {
  const s = match.settings
  const g = match.game
  const call = scoreCall(match)
  const feedbackKey = `${match.gameNumber}|${call}|${g.winner}`
  const lastKey = useRef(feedbackKey)
  useWakeLock(true)

  // Feedback after the state changes, so undo and rally both announce the new score.
  // The ref starts at the current key so reopening the app mid-match stays silent.
  useEffect(() => {
    if (lastKey.current === feedbackKey) return
    lastKey.current = feedbackKey
    if (s.sound) beep(g.winner !== null ? 'win' : 'point')
    if (s.voice) announce(g.winner !== null ? `Game, ${s.teamNames[g.winner]}. ${g.scores[g.winner]} to ${g.scores[g.winner === 0 ? 1 : 0]}` : call.replace(/-/g, ','))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackKey])

  const pos = courtPositions(match)
  const side = servingSide(match)
  const gameOver = g.winner !== null

  return (
    <div className="space-y-4">
      <div className="card p-4 text-center" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          {s.bestOf === 3 ? `Game ${match.gameNumber} · ` : ''}Score call
        </p>
        <p className="text-5xl font-black tabular-nums sm:text-6xl">{call}</p>
        <p className="mt-1 text-sm text-ink/70">
          <strong>{serverName(match)}</strong> serves from the <strong>{side}</strong>
          {s.mode === 'doubles' && <> · server {g.serverNumber}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as Team[]).map((t) => {
          const serving = g.servingTeam === t
          return (
            <button
              key={t}
              type="button"
              disabled={gameOver}
              onClick={() => setMatch(rally(match, t))}
              className={`relative flex min-h-48 flex-col items-center justify-center rounded-2xl border-4 p-3 text-center transition active:scale-[0.98] disabled:opacity-60 ${
                serving ? 'border-ball bg-court-600 text-white' : 'border-transparent bg-court-800 text-white/90'
              }`}
              aria-label={`Rally won by ${s.teamNames[t]}`}
            >
              {serving && (
                <span className="absolute right-3 top-3 size-4 rounded-full bg-ball shadow" title="Serving" aria-hidden="true" />
              )}
              <span className="line-clamp-2 text-base font-bold">{s.teamNames[t]}</span>
              <span className="text-7xl font-black tabular-nums">{g.scores[t]}</span>
              {s.bestOf === 3 && <span className="text-xs text-white/70">Games won: {match.gamesWon[t]}</span>}
              <span className="mt-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{serving ? 'Serving · tap if they win the rally' : 'Tap if they win the rally'}</span>
            </button>
          )
        })}
      </div>

      {s.mode === 'doubles' && <Court positions={pos} servingTeam={g.servingTeam} serverName={serverName(match)} names={s.teamNames} />}

      {gameOver && (
        <div className="card border-2 border-ball p-4 text-center" role="status">
          <p className="text-xl font-black">
            {match.matchWinner !== null ? `${s.teamNames[match.matchWinner]} win the match!` : `${s.teamNames[g.winner!]} win game ${match.gameNumber}`}
          </p>
          <p className="mt-1 text-ink/70">
            {match.completed.map((c, i) => (
              <span key={i} className="mx-1 tabular-nums">
                {c.scores[0]}-{c.scores[1]}
              </span>
            ))}
          </p>
          {isDemo() ? (
            <div className="mt-4">
              <DemoLimit slug="scorekeeper" title="End of the demo game">Buy the app to keep scoring: unlimited games, best-of-3 matches and saved progress.</DemoLimit>
            </div>
          ) : (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {match.matchWinner === null ? (
              <button className="btn-primary" onClick={() => setMatch(nextGame(match))}>
                Start game {match.gameNumber + 1}
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setMatch(newMatch(s))}>
                Rematch
              </button>
            )}
          </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost flex-1" onClick={() => setMatch(undo(match))} disabled={match.past.length === 0}>
          ↶ Undo
        </button>
        <ConfirmButton className="btn-ghost flex-1" message="Restart this game at 0-0?" confirmLabel="Restart" onConfirm={() => setMatch(restartGame(match))}>
          New game
        </ConfirmButton>
        <ConfirmButton className="btn-danger flex-1" message="End this match and return to setup?" confirmLabel="End match" onConfirm={onExit}>
          Reset
        </ConfirmButton>
      </div>
    </div>
  )
}

function Court({
  positions,
  servingTeam,
  serverName,
  names,
}: {
  positions: ReturnType<typeof courtPositions>
  servingTeam: Team
  serverName: string
  names: [string, string]
}) {
  // Each team viewed from its own baseline: "right" is the right-hand court for that team.
  const cell = (name: string) => (
    <div className={`flex min-h-12 items-center justify-center truncate rounded-lg px-2 text-sm font-semibold ${name === serverName ? 'bg-ball text-ink' : 'bg-white/15 text-white'}`}>
      {name === serverName && <span className="sr-only">Server: </span>}
      {name}
    </div>
  )
  return (
    <figure className="card overflow-hidden p-3">
      <div className="rounded-xl bg-court-700 p-2">
        <p className="mb-1 text-center text-xs font-semibold text-white/70">{names[1]}</p>
        <div className="grid grid-cols-2 gap-2">
          {cell(positions[1].right)}
          {cell(positions[1].left)}
        </div>
        <div className="my-2 h-1 rounded bg-white/80" aria-hidden="true" />
        <div className="grid grid-cols-2 gap-2">
          {cell(positions[0].left)}
          {cell(positions[0].right)}
        </div>
        <p className="mt-1 text-center text-xs font-semibold text-white/70">{names[0]}</p>
      </div>
      <figcaption className="mt-2 text-center text-xs text-ink/60">
        Court positions · {names[servingTeam]} serving · highlighted player serves
      </figcaption>
    </figure>
  )
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex rounded-xl bg-ink/5 p-1">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition ${value === v ? 'bg-white text-court-700 shadow' : 'text-ink/70'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2">
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink/60">{hint}</span>
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 rounded-full bg-ink/20 transition peer-checked:bg-court-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ball-dark after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" aria-hidden="true" />
    </label>
  )
}
