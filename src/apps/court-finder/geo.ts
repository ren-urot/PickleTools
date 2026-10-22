export interface LatLon {
  lat: number
  lon: number
}

export function kmBetween(a: LatLon, b: LatLon) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// Roads are ~40% longer than a straight line, and Philippine city traffic averages
// roughly 18 km/h for short trips; longer trips use more highway (~35 km/h).
// Shown as an estimate; the Directions button gives Google's live time.
const ROAD_FACTOR = 1.4

export function driveMinutes(km: number) {
  const roadKm = km * ROAD_FACTOR
  const speed = roadKm < 8 ? 18 : roadKm < 25 ? 25 : 35
  return Math.max(2, Math.round((roadKm / speed) * 60))
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 100) * 10} m`
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

export function directionsUrl(to: LatLon, from?: LatLon | null) {
  const p = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lon}`, travelmode: 'driving' })
  if (from) p.set('origin', `${from.lat},${from.lon}`)
  return `https://www.google.com/maps/dir/?${p}`
}

export function sortByDistance<T extends LatLon>(items: T[], from: LatLon): (T & { km: number })[] {
  return items.map((v) => ({ ...v, km: kmBetween(from, v) })).sort((a, b) => a.km - b.km)
}
