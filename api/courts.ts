// Pickleball venues in the Philippines from OpenStreetMap, plus parking within 300 m.
// The whole country is small (dozens of venues), so the app downloads it once and sorts by
// distance on the phone; the CDN caches this response so OSM's free servers aren't hammered.
import { buildCourts, type OsmElement } from '../src/server/courts.js'
import { json } from './_shared.js'

const QUERY = `[out:json][timeout:60];
area["ISO3166-1"="PH"][admin_level=2]->.ph;
nwr["sport"~"pickleball"](area.ph)->.pb;
.pb out center tags;
nwr(around.pb:300)["amenity"="parking"];
out center tags;`

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']

async function fetchOsm(): Promise<OsmElement[]> {
  let lastError: unknown
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'PickleTools Court Finder (pickletools.vercel.app)' },
        body: 'data=' + encodeURIComponent(QUERY),
        signal: AbortSignal.timeout(45000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return ((await res.json()) as { elements: OsmElement[] }).elements
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export async function GET() {
  try {
    const venues = buildCourts(await fetchOsm())
    return new Response(JSON.stringify({ ok: true, updatedAt: new Date().toISOString(), source: 'OpenStreetMap contributors', venues }), {
      headers: {
        'content-type': 'application/json',
        // Fresh for 12 h at the edge, then served stale for up to a week while refreshing.
        'cache-control': 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=604800',
      },
    })
  } catch {
    return json({ ok: false, error: 'map_unavailable' }, 503)
  }
}
