// Turns raw OpenStreetMap data into pickleball venues for Court Finder (used by /api/courts).
// OSM maps venues (sports centres, clubs) and individual courts (leisure=pitch) separately,
// so nearby courts are grouped under the venue they belong to and counted.

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export interface Venue {
  id: string
  name: string
  lat: number
  lon: number
  /** Mapped or tagged court count; null when the map doesn’t say. */
  courts: number | null
  address: string
  hours: string
  phone: string
  website: string
  facebook: string
  indoor: boolean | null
  covered: boolean | null
  lit: boolean | null
  surface: string
  /** 'free' | 'paid' | '' (unknown). Actual prices are not published on the map. */
  fee: '' | 'free' | 'paid'
  reservation: string
  /** True when mapped as private/customers-only: commercial clubs often use this for pay-to-play. */
  restricted: boolean
  /** Nearest mapped parking; distanceM 0 means parking at the venue itself. null = unknown. */
  parking: { distanceM: number } | null
  osmUrl: string
}

const VENUE_RADIUS_M = 150 // unnamed courts this close belong to the venue
const CLUSTER_RADIUS_M = 80 // unnamed courts this close are one place
const PARKING_RADIUS_M = 300

export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const pos = (e: OsmElement) => (e.center ? e.center : e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null)
const yesNo = (v?: string) => (v === 'yes' ? true : v === 'no' ? false : null)
const isPickleball = (t: Record<string, string>) => /(^|;)\s*pickleball\s*(;|$)/.test(t.sport ?? '')

function address(t: Record<string, string>) {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  return [street, t['addr:barangay'] ?? t['addr:suburb'] ?? t['addr:district'], t['addr:city'], t['addr:province']].filter(Boolean).join(', ')
}

type Located = OsmElement & { p: { lat: number; lon: number }; tags: Record<string, string> }

interface Group {
  anchor: Located
  members: Located[]
}

export function buildCourts(elements: OsmElement[]): Venue[] {
  const located = elements.map((e) => ({ ...e, p: pos(e)!, tags: e.tags ?? {} })).filter((e): e is Located => !!e.p)
  const parking = located.filter((e) => e.tags.amenity === 'parking')
  // access=private is common for pay-to-play clubs, so those are kept (and labelled); only access=no is dropped.
  const places = located.filter((e) => isPickleball(e.tags) && e.tags.access !== 'no')

  // Named features become venues; unnamed courts join the nearest venue or an unnamed cluster.
  const groups: Group[] = places.filter((e) => e.tags.name).map((e) => ({ anchor: e, members: [e] }))
  for (const e of places.filter((x) => !x.tags.name)) {
    let best: Group | null = null
    let bestD = Infinity
    for (const g of groups) {
      const d = distanceM(g.anchor.p, e.p)
      const limit = g.anchor.tags.name ? VENUE_RADIUS_M : CLUSTER_RADIUS_M
      if (d <= limit && d < bestD) {
        best = g
        bestD = d
      }
    }
    if (best) best.members.push(e)
    else groups.push({ anchor: e, members: [e] })
  }

  return groups.map(({ anchor, members }) => {
    // Merge tags: the venue's own tags win, courts fill gaps (e.g. lit/surface mapped per court).
    const t: Record<string, string> = {}
    for (const m of [...members].reverse()) Object.assign(t, m.tags)
    Object.assign(t, anchor.tags)

    const pitches = members.filter((m) => m.tags.leisure === 'pitch').length
    const tagged = Number(t.courts ?? t['capacity:courts'] ?? t.capacity)
    const courts = Number.isFinite(tagged) && tagged > 0 ? tagged : pitches > 0 ? pitches : null

    let park: Venue['parking'] = t.parking && t.parking !== 'no' ? { distanceM: 0 } : null
    if (!park) {
      const d = Math.min(...parking.map((p) => distanceM(anchor.p, p.p)))
      if (d <= PARKING_RADIUS_M) park = { distanceM: Math.round(d / 10) * 10 }
    }

    const area = t['addr:barangay'] ?? t['addr:suburb'] ?? t['addr:city']
    const name = t.name ?? `${(courts ?? 1) > 1 ? 'Pickleball courts' : 'Pickleball court'}${area ? ` · ${area}` : ''}`

    return {
      id: `${anchor.type}/${anchor.id}`,
      name,
      lat: anchor.p.lat,
      lon: anchor.p.lon,
      courts,
      address: address(t),
      hours: t.opening_hours ?? '',
      phone: t.phone ?? t['contact:phone'] ?? '',
      website: t.website ?? t['contact:website'] ?? '',
      facebook: t['contact:facebook'] ?? t.facebook ?? '',
      indoor: yesNo(t.indoor),
      covered: yesNo(t.covered),
      lit: yesNo(t.lit),
      surface: t.surface ?? '',
      fee: t.fee === 'no' ? 'free' : t.fee === 'yes' ? 'paid' : '',
      reservation: t.reservation ?? '',
      restricted: t.access === 'private' || t.access === 'customers' || t.access === 'members',
      parking: park,
      osmUrl: `https://www.openstreetmap.org/${anchor.type}/${anchor.id}`,
    }
  })
}
