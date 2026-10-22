// Court list storage for /api/courts. Players are always served the saved snapshot from
// Vercel Blob; OpenStreetMap is only contacted to refresh it, never while someone waits.
import { get, put } from '@vercel/blob'
import { buildCourts, type OsmElement, type Venue } from '../src/server/courts.js'

export interface Snapshot {
  updatedAt: string
  venues: Venue[]
}

const PATH = 'courts/latest.json'
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000

const QUERY = `[out:json][timeout:50];
area["ISO3166-1"="PH"][admin_level=2]->.ph;
nwr["sport"~"pickleball"](area.ph)->.pb;
.pb out center tags;
nwr(around.pb:300)["amenity"="parking"];
out center tags;`

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

/** Tries each mirror until one answers, within an overall time budget. */
export async function fetchOsm(budgetMs: number): Promise<OsmElement[]> {
  const deadline = Date.now() + budgetMs
  let lastError: unknown = new Error('no mirror tried')
  for (const url of MIRRORS) {
    const left = deadline - Date.now()
    if (left < 3000) break
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'PickleTools Court Finder (pickletools.vercel.app)' },
        body: 'data=' + encodeURIComponent(QUERY),
        signal: AbortSignal.timeout(Math.min(left, 40000)),
      })
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
      return ((await res.json()) as { elements: OsmElement[] }).elements
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export async function readSnapshot(): Promise<Snapshot | null> {
  const res = await get(PATH, { access: 'private', useCache: false })
  return res ? ((await new Response(res.stream).json()) as Snapshot) : null
}

export async function writeSnapshot(venues: Venue[]): Promise<Snapshot> {
  const snapshot = { updatedAt: new Date().toISOString(), venues }
  await put(PATH, JSON.stringify(snapshot), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
  return snapshot
}

export async function refreshFromOsm(budgetMs: number) {
  return writeSnapshot(buildCourts(await fetchOsm(budgetMs)))
}

/** Light shape check for snapshots uploaded by the owner's refresh script. */
export function isVenueList(x: unknown): x is Venue[] {
  return Array.isArray(x) && x.length > 0 && x.length < 10000 && x.every((v) => v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.lat === 'number' && typeof v.lon === 'number')
}
