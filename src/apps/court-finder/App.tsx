import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../shared/AppShell'
import { DemoLimit, isDemo } from '../../shared/demo'
import { useOnline } from '../../shared/pwa'
import { readJSON, useLocalState, writeJSON } from '../../shared/storage'
import type { Venue } from '../../server/courts'
import { directionsUrl, driveMinutes, formatDistance, formatMinutes, sortByDistance, type LatLon } from './geo'

/** Fallback when GPS is off or denied. */
const CITIES: [string, LatLon][] = [
  ['Metro Manila', { lat: 14.5995, lon: 120.9842 }],
  ['Cebu City', { lat: 10.3157, lon: 123.8854 }],
  ['Davao City', { lat: 7.1907, lon: 125.4553 }],
  ['Baguio', { lat: 16.4023, lon: 120.596 }],
  ['Iloilo City', { lat: 10.7202, lon: 122.5621 }],
  ['Bacolod', { lat: 10.6765, lon: 122.9509 }],
  ['Cagayan de Oro', { lat: 8.4542, lon: 124.6319 }],
  ['Dumaguete', { lat: 9.3068, lon: 123.3054 }],
  ['Angeles / Clark', { lat: 15.145, lon: 120.5887 }],
]
const RADII = [10, 25, 50, 0] // 0 = whole country
const DEMO_VENUES = 2
const CACHE_KEY = 'pt:court-finder:venues'

interface Here extends LatLon {
  label: string
  accuracyM?: number
}

type Load = { status: 'loading' } | { status: 'ready'; venues: Venue[]; updatedAt: string; offline?: boolean } | { status: 'error' }

function useVenues() {
  const [state, setState] = useState<Load>(() => {
    const cached = readJSON<{ venues: Venue[]; updatedAt: string } | null>(CACHE_KEY, null)
    return cached ? { status: 'ready', ...cached, offline: true } : { status: 'loading' }
  })
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/courts`)
      const data = (await res.json()) as { ok: boolean; venues: Venue[]; updatedAt: string }
      if (!data.ok) throw new Error()
      writeJSON(CACHE_KEY, { venues: data.venues, updatedAt: data.updatedAt })
      setState({ status: 'ready', venues: data.venues, updatedAt: data.updatedAt })
    } catch {
      setState((s) => (s.status === 'ready' ? { ...s, offline: true } : { status: 'error' }))
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { state, reload: load }
}

export default function App() {
  const { state, reload } = useVenues()
  const [here, setHere] = useLocalState<Here | null>('pt:court-finder:here', null)
  const [radius, setRadius] = useLocalState('pt:court-finder:radius', 25)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const online = useOnline()

  const locate = () => {
    if (!('geolocation' in navigator)) return setGeoError('This browser can’t share your location. Pick a city below.')
    setLocating(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHere({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'Your location', accuracyM: Math.round(p.coords.accuracy) })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked for this app. Allow it in your browser or phone settings, or pick a city below.'
            : 'Couldn’t get your location. Check that GPS is on, or pick a city below.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    )
  }

  const sorted = useMemo(() => (state.status === 'ready' && here ? sortByDistance(state.venues, here) : []), [state, here])
  const inRange = radius ? sorted.filter((v) => v.km <= radius) : sorted
  // Never show an empty screen: if nothing is within range, show the closest few anyway.
  const list = inRange.length ? inRange : sorted.slice(0, 5)
  const shown = isDemo() ? list.slice(0, DEMO_VENUES) : list

  return (
    <AppShell slug="court-finder">
      <div className="space-y-4">
        <section className="card space-y-3 p-4" aria-label="Your location">
          {here ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg" aria-hidden="true">📍</span>
              <p className="min-w-0 flex-1">
                <span className="font-semibold">{here.label}</span>
                {here.accuracyM ? <span className="text-sm text-ink/60"> · accurate to about {formatDistance(here.accuracyM / 1000)}</span> : null}
              </p>
              <button className="btn-ghost min-h-9 px-3 text-sm" onClick={locate} disabled={locating}>
                {locating ? 'Locating…' : '↻ Update'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-bold">Find pickleball courts near you</p>
              <p className="mt-1 text-sm text-ink/70">Uses your phone’s GPS. Your location stays on your phone.</p>
              <button className="btn-primary mt-3 w-full py-3.5 text-lg" onClick={locate} disabled={locating}>
                {locating ? 'Finding you…' : '📍 Use my location'}
              </button>
            </div>
          )}
          {geoError && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {geoError}
            </p>
          )}
          <div>
            <label className="label text-xs" htmlFor="city">
              {here ? 'Or search around a city' : 'No GPS? Pick a city'}
            </label>
            <select
              id="city"
              className="input min-h-10 py-1.5 text-sm"
              value={here && !here.accuracyM ? here.label : ''}
              onChange={(e) => {
                const c = CITIES.find(([n]) => n === e.target.value)
                if (c) setHere({ ...c[1], label: c[0] })
              }}
            >
              <option value="" disabled>
                Choose a city…
              </option>
              {CITIES.map(([n]) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
        </section>

        {here && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Search radius">
            {RADII.map((r) => (
              <button key={r} aria-pressed={radius === r} onClick={() => setRadius(r)} className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${radius === r ? 'border-court-600 bg-court-600 text-white' : 'border-ink/15 bg-white'}`}>
                {r ? `Within ${r} km` : 'All Philippines'}
              </button>
            ))}
          </div>
        )}

        {state.status === 'loading' && (
          <p className="card p-6 text-center text-ink/60" role="status">
            Loading courts…
          </p>
        )}
        {state.status === 'error' && (
          <div className="card p-6 text-center" role="alert">
            <p className="font-semibold">{online ? 'The court map is busy right now.' : 'You’re offline.'}</p>
            <p className="mt-1 text-sm text-ink/60">{online ? 'Please try again in a minute.' : 'Connect once to download the court list; after that it works offline.'}</p>
            <button className="btn-ghost mt-3" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {state.status === 'ready' && here && (
          <section aria-label="Courts">
            <p className="mb-2 text-sm text-ink/60" role="status">
              {inRange.length
                ? `${inRange.length} ${inRange.length === 1 ? 'place' : 'places'} ${radius ? `within ${radius} km` : 'in the Philippines'}, nearest first`
                : `Nothing mapped within ${radius} km. Here are the closest places.`}
            </p>
            <ul className="space-y-3">
              {shown.map((v) => (
                <VenueCard key={v.id} v={v} km={v.km} from={here.accuracyM ? here : null} />
              ))}
            </ul>
            {isDemo() && list.length > DEMO_VENUES && (
              <div className="mt-3">
                <DemoLimit slug="court-finder" title={`${list.length - DEMO_VENUES} more courts near you`}>
                  Buy the app to see every court near you, with directions, parking and contact details, plus offline access.
                </DemoLimit>
              </div>
            )}
          </section>
        )}

        {state.status === 'ready' && (
          <footer className="space-y-1 text-xs text-ink/50">
            <p>
              {state.venues.length} pickleball places mapped in the Philippines. Map data ©{' '}
              <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                OpenStreetMap contributors
              </a>
              , updated {new Date(state.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              {state.offline ? ' (saved copy)' : ''}.
            </p>
            <p>Drive times are estimates from distance; tap Directions for live traffic. Prices and open-play schedules aren’t published on the map, so ask the venue.</p>
            <p>
              Court missing or wrong?{' '}
              <a className="underline" href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer">
                Add it to OpenStreetMap
              </a>{' '}
              and it appears here after the next update.
            </p>
          </footer>
        )}
      </div>
    </AppShell>
  )
}

const yes = (b: boolean | null, label: string, no: string) => (b === null ? null : b ? label : no)

function VenueCard({ v, km, from }: { v: Venue; km: number; from: LatLon | null }) {
  const chips = [yes(v.indoor, 'Indoor', 'Outdoor'), v.indoor ? null : yes(v.covered, 'Covered', 'Open-air'), yes(v.lit, 'Lights for night play', 'No lights'), v.surface ? `Surface: ${v.surface}` : null, v.reservation === 'required' ? 'Booking required' : v.reservation === 'yes' ? 'Booking accepted' : null].filter(Boolean)
  const facebook = v.facebook && (v.facebook.startsWith('http') ? v.facebook : `https://facebook.com/${v.facebook}`)
  const contact = v.phone || facebook || v.website

  return (
    <li className="card p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug">{v.name}</h3>
          {v.address && <p className="text-sm text-ink/60">{v.address}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-black tabular-nums">{formatDistance(km)}</p>
          <p className="text-xs text-ink/60" title="Estimated from distance; tap Directions for live traffic">
            ~{formatMinutes(driveMinutes(km))} drive
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Detail label="Courts" value={v.courts ? `${v.courts}` : 'Not listed'} muted={!v.courts} />
        <Detail label="Parking" value={v.parking ? (v.parking.distanceM === 0 ? 'On site' : `${v.parking.distanceM} m away`) : 'Not mapped'} muted={!v.parking} />
        <Detail label="Price" value={v.fee === 'free' ? 'Free to play' : v.fee === 'paid' ? 'Fee charged; ask the venue' : 'Ask the venue'} muted={!v.fee} />
        <Detail label="Open play" value={contact ? 'Ask via the contact below' : 'Not published'} muted />
      </dl>
      {v.hours && <p className="mt-2 text-sm"><span className="font-semibold">Hours:</span> <span className="text-ink/75">{v.hours}</span></p>}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="chip bg-ink/5 text-ink/70">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn-primary min-h-10 flex-1 text-sm" href={directionsUrl(v, from)} target="_blank" rel="noopener noreferrer">
          Directions ↗
        </a>
        {v.phone && (
          <a className="btn-ghost min-h-10 flex-1 text-sm" href={`tel:${v.phone.replace(/[^\d+]/g, '')}`}>
            Call
          </a>
        )}
        {facebook && (
          <a className="btn-ghost min-h-10 flex-1 text-sm" href={facebook} target="_blank" rel="noopener noreferrer">
            Facebook ↗
          </a>
        )}
        {!facebook && v.website && (
          <a className="btn-ghost min-h-10 flex-1 text-sm" href={v.website} target="_blank" rel="noopener noreferrer">
            Website ↗
          </a>
        )}
      </div>
    </li>
  )
}

function Detail({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-lg bg-paper p-2">
      <dt className="text-xs text-ink/50">{label}</dt>
      <dd className={`font-semibold ${muted ? 'text-ink/50' : ''}`}>{value}</dd>
    </div>
  )
}
