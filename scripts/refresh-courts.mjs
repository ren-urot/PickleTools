// Refreshes Court Finder's saved court list from OpenStreetMap, using YOUR computer's
// connection (for when the server can't reach the map servers). Run:
//   npm run refresh-courts -- <admin password>
import { buildCourts } from '../src/server/courts.ts'

const password = process.argv[2] || process.env.ADMIN_PASSWORD
const site = process.env.SITE_URL || 'https://pickletools.vercel.app'
if (!password) {
  console.error('Usage: npm run refresh-courts -- <admin password>')
  process.exit(1)
}

const query = `[out:json][timeout:90];
area["ISO3166-1"="PH"][admin_level=2]->.ph;
nwr["sport"~"pickleball"](area.ph)->.pb;
.pb out center tags;
nwr(around.pb:300)["amenity"="parking"];
out center tags;`

let elements
for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
  try {
    console.log(`Fetching from ${new URL(url).host}…`)
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'PickleTools Court Finder refresh' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(120000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    elements = (await res.json()).elements
    break
  } catch (e) {
    console.log(`  failed: ${e.message}`)
  }
}
if (!elements) {
  console.error('✗ Every map server failed. Try again in a few minutes.')
  process.exit(1)
}

const venues = buildCourts(elements)
console.log(`Built ${venues.length} places. Uploading…`)
const res = await fetch(`${site}/api/admin`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${password}` }, body: JSON.stringify({ action: 'courts-upload', venues }) })
const out = await res.json()
console.log(out.ok ? `✓ Saved ${out.count} places (${out.updatedAt}). Court Finder shows them now.` : `✗ Upload failed: ${out.error}`)
process.exit(out.ok ? 0 : 1)
