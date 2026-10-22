import { describe, expect, it } from 'vitest'
import { directionsUrl, driveMinutes, formatDistance, kmBetween, sortByDistance } from './geo'

const cebu = { lat: 10.3157, lon: 123.8854 }
const mandaue = { lat: 10.3236, lon: 123.9223 }

describe('geo', () => {
  it('measures straight-line distance', () => {
    expect(kmBetween(cebu, mandaue)).toBeGreaterThan(3.9)
    expect(kmBetween(cebu, mandaue)).toBeLessThan(4.3)
    expect(kmBetween(cebu, cebu)).toBe(0)
  })

  it('estimates city drive time with a road factor and traffic speed, never under 2 minutes', () => {
    expect(driveMinutes(0.1)).toBe(2)
    expect(driveMinutes(4)).toBeGreaterThanOrEqual(15) // ~5.6 km of road at city speed
    expect(driveMinutes(4)).toBeLessThanOrEqual(25)
    expect(driveMinutes(40)).toBeLessThan(150)
    expect(driveMinutes(40)).toBeGreaterThan(driveMinutes(10))
  })

  it('formats distances', () => {
    expect(formatDistance(0.35)).toBe('350 m')
    expect(formatDistance(4.26)).toBe('4.3 km')
    expect(formatDistance(57.2)).toBe('57 km')
  })

  it('builds a Google Maps directions link from the user to the venue', () => {
    const url = new URL(directionsUrl({ lat: 10.32, lon: 123.92 }, cebu))
    expect(url.hostname).toBe('www.google.com')
    expect(url.searchParams.get('destination')).toBe('10.32,123.92')
    expect(url.searchParams.get('origin')).toBe('10.3157,123.8854')
    expect(url.searchParams.get('travelmode')).toBe('driving')
    expect(new URL(directionsUrl({ lat: 1, lon: 2 })).searchParams.get('origin')).toBeNull()
  })

  it('sorts venues nearest first', () => {
    const list = sortByDistance([{ id: 'far', lat: 14.6, lon: 121 }, { id: 'near', lat: 10.32, lon: 123.92 }], cebu)
    expect(list.map((v) => v.id)).toEqual(['near', 'far'])
    expect(list[0].km).toBeLessThan(list[1].km)
  })
})
