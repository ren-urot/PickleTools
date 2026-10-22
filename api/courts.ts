// Pickleball venues in the Philippines for Court Finder. Always answers from the saved
// snapshot; refreshes it from OpenStreetMap in the background once it is a day old.
import { waitUntil } from '@vercel/functions'
import { readSnapshot, refreshFromOsm, STALE_AFTER_MS, type Snapshot } from './_courts.js'
import { json } from './_shared.js'

const respond = (s: Snapshot) =>
  new Response(JSON.stringify({ ok: true, updatedAt: s.updatedAt, source: 'OpenStreetMap contributors', venues: s.venues }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400' },
  })

export async function GET() {
  const snapshot = await readSnapshot().catch(() => null)
  if (snapshot) {
    if (Date.now() - Date.parse(snapshot.updatedAt) > STALE_AFTER_MS) waitUntil(refreshFromOsm(240000).catch(() => {}))
    return respond(snapshot)
  }
  // First ever request: nothing saved yet, so try the map once.
  try {
    return respond(await refreshFromOsm(50000))
  } catch {
    return json({ ok: false, error: 'map_unavailable' }, 503)
  }
}
