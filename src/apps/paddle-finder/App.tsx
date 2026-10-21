import { useMemo, useState } from 'react'
import { AppShell } from '../../shared/AppShell'
import { DemoLimit, isDemo } from '../../shared/demo'
import { peso } from '../../config/store'
import { useLocalState } from '../../shared/storage'
import { useOnline } from '../../shared/pwa'
import { applyFilters, catalog, catalogInfo, defaultFilters, MAX_COMPARE, PRICE_CEILING, shopUrl, toggleCompare, weightClass, type Filters, type Paddle } from './filter'

type Tab = 'browse' | 'compare' | 'favorites' | 'guide'
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** The demo shows the first few matching paddles; filters and compare still work on them. */
const DEMO_PADDLES = 4

export default function App() {
  const [filters, setFilters] = useLocalState<Filters>('pt:paddle-finder:filters', defaultFilters)
  const [favs, setFavs] = useLocalState<string[]>('pt:paddle-finder:favorites', [])
  const [compare, setCompare] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('browse')
  const [notice, setNotice] = useState('')
  const results = useMemo(() => applyFilters(catalog, filters), [filters])

  const onCompare = (id: string) => {
    const next = toggleCompare(compare, id)
    if (next === compare) {
      setNotice(`You can compare up to ${MAX_COMPARE} paddles. Remove one first.`)
      setTimeout(() => setNotice(''), 3000)
    }
    setCompare(next)
  }
  const onFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const card = (p: Paddle) => <PaddleCard key={p.id} p={p} fav={favs.includes(p.id)} comparing={compare.includes(p.id)} onFav={() => onFav(p.id)} onCompare={() => onCompare(p.id)} />

  const tabs: [Tab, string][] = [
    ['browse', 'Browse'],
    ['compare', `Compare (${compare.length})`],
    ['favorites', `Saved (${favs.length})`],
    ['guide', 'Guide'],
  ]

  return (
    <AppShell slug="paddle-finder">
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-ink/5 p-1" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-10 rounded-lg px-1 text-xs font-semibold sm:text-sm ${tab === t ? 'bg-white text-court-700 shadow' : 'text-ink/70'}`}>
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {notice}
        </p>
      )}

      {tab === 'browse' && (
        <div className="space-y-4">
          <FilterPanel f={filters} set={setFilters} count={results.length} />
          {results.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-ink/70">No paddles match these filters.</p>
              <button className="btn-ghost mt-3" onClick={() => setFilters(defaultFilters())}>
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2">{(isDemo() ? results.slice(0, DEMO_PADDLES) : results).map(card)}</ul>
              {isDemo() && results.length > DEMO_PADDLES && (
                <DemoLimit slug="paddle-finder" title={`${results.length - DEMO_PADDLES} more paddles match your filters`}>Buy the app to browse the whole catalog, save favourites and use it offline.</DemoLimit>
              )}
            </>
          )}
          {compare.length > 0 && (
            <button className="btn-primary sticky bottom-4 w-full shadow-lg" onClick={() => setTab('compare')}>
              Compare {compare.length} selected
            </button>
          )}
        </div>
      )}

      {tab === 'compare' && <Compare ids={compare} onRemove={(id) => setCompare((c) => c.filter((x) => x !== id))} />}

      {tab === 'favorites' &&
        (isDemo() ? <DemoLimit slug="paddle-finder" title="Saved paddles are in the full app">Keep a shortlist of paddles to compare later.</DemoLimit> : favs.length === 0 ? <p className="card p-6 text-center text-ink/60">Tap ♡ on a paddle to save it here.</p> : <ul className="grid gap-3 sm:grid-cols-2">{catalog.filter((p) => favs.includes(p.id)).map(card)}</ul>)}

      {tab === 'guide' && <Guide />}

      <p className="mt-6 text-xs text-ink/50">
        Catalog reviewed {new Date(catalogInfo.lastReviewed).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}. {catalogInfo.note}
      </p>
    </AppShell>
  )
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const id = `f-${label.toLowerCase().replace(/\W+/g, '')}`
  return (
    <div>
      <label className="label text-xs" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="input min-h-10 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </div>
  )
}

function FilterPanel({ f, set, count }: { f: Filters; set: (f: Filters) => void; count: number }) {
  return (
    <div className="card space-y-3 p-4">
      <div>
        <label className="label flex justify-between text-xs" htmlFor="price">
          <span>Max price</span>
          <span className="tabular-nums">{peso(f.maxPrice)}</span>
        </label>
        <input id="price" type="range" min={1000} max={PRICE_CEILING} step={500} value={f.maxPrice} onChange={(e) => set({ ...f, maxPrice: Number(e.target.value) })} className="w-full accent-court-600" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Weight" value={f.weight} onChange={(weight) => set({ ...f, weight })} options={[['any', 'Any'], ['light', 'Light (< 7.6 oz)'], ['mid', 'Mid (7.6-8.2 oz)'], ['heavy', 'Heavy (> 8.2 oz)']]} />
        <Select label="Shape" value={f.shape} onChange={(shape) => set({ ...f, shape })} options={[['any', 'Any'], ['standard', 'Standard'], ['widebody', 'Widebody'], ['hybrid', 'Hybrid'], ['elongated', 'Elongated']]} />
        <Select label="Play style" value={f.style} onChange={(style) => set({ ...f, style })} options={[['any', 'Any'], ['control', 'Control'], ['all-court', 'All-court'], ['power', 'Power']]} />
        <Select label="Level" value={f.level} onChange={(level) => set({ ...f, level })} options={[['any', 'Any'], ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']]} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm text-ink/60">{count} paddles</p>
        <div className="w-44">
          <Select label="Sort" value={f.sort} onChange={(sort) => set({ ...f, sort })} options={[['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['weight', 'Lightest first']]} />
        </div>
      </div>
    </div>
  )
}

const styleChip: Record<Paddle['style'], string> = {
  power: 'bg-rose-100 text-rose-800',
  control: 'bg-sky-100 text-sky-800',
  'all-court': 'bg-court-100 text-court-800',
}

function PaddleCard({ p, fav, comparing, onFav, onCompare }: { p: Paddle; fav: boolean; comparing: boolean; onFav: () => void; onCompare: () => void }) {
  const online = useOnline()
  return (
    <li className={`card flex flex-col p-4 ${comparing ? 'ring-2 ring-court-600' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{p.brand}</p>
          <h3 className="font-bold leading-snug">{p.model}</h3>
        </div>
        {!isDemo() && (
        <button onClick={onFav} className="btn-ghost min-h-9 px-2.5" aria-pressed={fav} aria-label={fav ? `Remove ${p.model} from saved` : `Save ${p.model}`}>
          <span className={fav ? 'text-rose-600' : 'text-ink/40'}>{fav ? '♥' : '♡'}</span>
        </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`chip ${styleChip[p.style]}`}>{cap(p.style)}</span>
        <span className="chip bg-ink/5 text-ink/70">{cap(p.shape)}</span>
        <span className="chip bg-ink/5 text-ink/70">{cap(p.face)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-paper p-1.5">
          <dt className="text-xs text-ink/50">Weight</dt>
          <dd className="font-semibold tabular-nums">~{p.weightOz} oz</dd>
        </div>
        <div className="rounded-lg bg-paper p-1.5">
          <dt className="text-xs text-ink/50">Core</dt>
          <dd className="font-semibold tabular-nums">{p.thicknessMm} mm</dd>
        </div>
        <div className="rounded-lg bg-paper p-1.5">
          <dt className="text-xs text-ink/50">Approx.</dt>
          <dd className="font-semibold tabular-nums">{peso(p.pricePhp)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink/60">Good for: {p.levels.map(cap).join(', ')}</p>
      <div className="mt-3 flex gap-2">
        <button className={comparing ? 'btn-primary min-h-10 flex-1 text-sm' : 'btn-ghost min-h-10 flex-1 text-sm'} aria-pressed={comparing} onClick={onCompare}>
          {comparing ? '✓ Comparing' : '+ Compare'}
        </button>
        <a className={`btn-ghost min-h-10 flex-1 text-sm ${online ? '' : 'pointer-events-none opacity-50'}`} href={shopUrl(p)} target="_blank" rel="noopener noreferrer sponsored" aria-disabled={!online} title={online ? undefined : 'Connect to the internet to open retailer links'}>
          {p.url ? 'View at retailer ↗' : 'Find online ↗'}
        </a>
      </div>
    </li>
  )
}

function Compare({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  const list = ids.map((id) => catalog.find((p) => p.id === id)!).filter(Boolean)
  if (list.length === 0) return <p className="card p-6 text-center text-ink/60">Choose up to {MAX_COMPARE} paddles with “+ Compare” on the Browse tab.</p>
  const rows: [string, (p: Paddle) => string][] = [
    ['Brand', (p) => p.brand],
    ['Price (approx.)', (p) => peso(p.pricePhp)],
    ['Weight', (p) => `~${p.weightOz} oz (${weightClass(p.weightOz)})`],
    ['Core thickness', (p) => `${p.thicknessMm} mm`],
    ['Shape', (p) => cap(p.shape)],
    ['Face', (p) => cap(p.face)],
    ['Play style', (p) => cap(p.style)],
    ['Levels', (p) => p.levels.map(cap).join(', ')],
  ]
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr>
            <th className="w-28 p-3 text-left text-xs uppercase text-ink/50" scope="col">
              <span className="sr-only">Spec</span>
            </th>
            {list.map((p) => (
              <th key={p.id} className="p-3 text-left align-top" scope="col">
                <span className="block font-bold">{p.model}</span>
                <button className="mt-1 text-xs font-semibold text-red-700 hover:underline" onClick={() => onRemove(p.id)}>
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, get]) => (
            <tr key={label} className="border-t border-ink/10">
              <th scope="row" className="p-3 text-left text-xs font-semibold uppercase text-ink/50">
                {label}
              </th>
              {list.map((p) => (
                <td key={p.id} className="p-3 tabular-nums">
                  {get(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Guide() {
  const sections: [string, string[]][] = [
    ['Start with your level', ['Beginners: a mid-weight standard or widebody paddle with a 13-16 mm core is forgiving and easy to control.', 'Intermediate and advanced players can choose shape and weight to suit their style.']],
    ['Shape', ['Standard and widebody: the largest sweet spot and fastest hands at the kitchen.', 'Elongated: more reach and power on drives and serves, with a smaller sweet spot.', 'Hybrid: a middle ground between the two.']],
    ['Weight', ['Light (under 7.6 oz): quick hands, less power, more vibration.', 'Mid (7.6-8.2 oz): the best fit for most players.', 'Heavy (over 8.2 oz): more power and stability, but slower and harder on the elbow.']],
    ['Core thickness', ['16 mm: softer feel and more control - great for dinks and resets.', '13-14 mm: crisper and more powerful, with less forgiveness.']],
    ['Face material', ['Fiberglass: pop and power at a lower price.', 'Graphite: light and crisp with good feel.', 'Raw carbon: grips the ball for spin and control; usually the premium option.']],
    ['Before you buy', ['Make sure the paddle is on the USA Pickleball approved list if you plan to play sanctioned events.', 'Try a friend’s paddle at your club when you can.', 'Buy from authorised sellers - fakes of popular models are common online.']],
  ]
  return (
    <div className="space-y-3">
      {sections.map(([title, items]) => (
        <section key={title} className="card p-4">
          <h3 className="font-bold">{title}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/80">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
