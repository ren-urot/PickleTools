import { describe, expect, it } from 'vitest'
import { buildCourts, type OsmElement } from './courts'

// ~0.001° latitude ≈ 111 m
const el = (id: number, lat: number, lon: number, tags: Record<string, string>, type: OsmElement['type'] = 'way'): OsmElement =>
  type === 'node' ? { type, id, lat, lon, tags } : { type, id, center: { lat, lon }, tags }

describe('buildCourts', () => {
  it('groups unnamed courts into the named venue next to them and counts them', () => {
    const venues = buildCourts([
      el(1, 10.3, 123.9, { leisure: 'sports_centre', sport: 'pickleball', name: 'PUMPD Pickleball Cebu', 'addr:city': 'Mandaue', opening_hours: 'Mo-Su 06:00-22:00', 'contact:facebook': 'https://facebook.com/pumpd' }),
      el(2, 10.3002, 123.9001, { leisure: 'pitch', sport: 'pickleball' }),
      el(3, 10.3003, 123.9002, { leisure: 'pitch', sport: 'pickleball' }),
      el(4, 10.3004, 123.9003, { leisure: 'pitch', sport: 'pickleball;tennis', lit: 'yes', surface: 'acrylic' }),
    ])
    expect(venues).toHaveLength(1)
    expect(venues[0]).toMatchObject({
      name: 'PUMPD Pickleball Cebu',
      courts: 3,
      address: 'Mandaue',
      hours: 'Mo-Su 06:00-22:00',
      facebook: 'https://facebook.com/pumpd',
      lit: true,
      surface: 'acrylic',
    })
  })

  it('uses an explicit court count tag when present', () => {
    const [v] = buildCourts([el(1, 14.6, 121.0, { leisure: 'sports_hall', sport: 'pickleball', name: 'Stack Room', courts: '6', indoor: 'yes' })])
    expect(v).toMatchObject({ courts: 6, indoor: true })
  })

  it('leaves the court count unknown when a venue is mapped without its courts', () => {
    const [v] = buildCourts([el(1, 14.6, 121.0, { leisure: 'sports_centre', sport: 'pickleball', name: 'Club' })])
    expect(v.courts).toBeNull()
  })

  it('keeps far-apart courts as separate places and names unnamed ones by location', () => {
    const venues = buildCourts([
      el(1, 10.0, 123.0, { leisure: 'pitch', sport: 'pickleball', 'addr:barangay': 'Poblacion', 'addr:city': 'Consolacion' }),
      el(2, 10.0002, 123.0001, { leisure: 'pitch', sport: 'pickleball' }),
      el(3, 11.0, 124.0, { leisure: 'pitch', sport: 'pickleball' }),
    ])
    expect(venues).toHaveLength(2)
    expect(venues.find((v) => v.lat < 10.5)).toMatchObject({ name: 'Pickleball courts · Poblacion', courts: 2 })
    expect(venues.find((v) => v.lat > 10.5)).toMatchObject({ name: 'Pickleball court', courts: 1 })
  })

  it('finds the nearest mapped parking within 300 m', () => {
    const [v] = buildCourts([
      el(1, 10.3, 123.9, { leisure: 'pitch', sport: 'pickleball', name: 'Dink Park' }),
      el(9, 10.3009, 123.9, { amenity: 'parking' }, 'node'), // ~100 m
      el(10, 10.305, 123.9, { amenity: 'parking' }, 'node'), // ~555 m, too far
    ])
    expect(v.parking).toEqual({ distanceM: 100 })
  })

  it('reports venue parking tags and leaves parking unknown when nothing is mapped', () => {
    const [a] = buildCourts([el(1, 1, 1, { leisure: 'pitch', sport: 'pickleball', name: 'A', parking: 'surface' })])
    expect(a.parking).toEqual({ distanceM: 0 })
    const [b] = buildCourts([el(1, 1, 1, { leisure: 'pitch', sport: 'pickleball', name: 'B' })])
    expect(b.parking).toBeNull()
  })

  it('reads fee, reservation, phone and website tags; keeps private clubs labelled, drops access=no', () => {
    const venues = buildCourts([
      el(1, 5, 5, { leisure: 'pitch', sport: 'pickleball', name: 'Open Court', fee: 'no', reservation: 'required', phone: '+63 917 000 0000', website: 'https://open.example' }),
      el(2, 6, 6, { leisure: 'sports_centre', sport: 'pickleball', name: 'PUMPD Pickleball Cebu', access: 'private', indoor: 'yes' }),
      el(3, 7, 7, { leisure: 'pitch', sport: 'pickleball', name: 'Closed', access: 'no' }),
    ])
    expect(venues.map((v) => v.name)).toEqual(['Open Court', 'PUMPD Pickleball Cebu'])
    expect(venues[0]).toMatchObject({ fee: 'free', reservation: 'required', phone: '+63 917 000 0000', website: 'https://open.example', restricted: false })
    expect(venues[1]).toMatchObject({ restricted: true, indoor: true })
  })
})
