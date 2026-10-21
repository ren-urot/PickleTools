import { describe, expect, it } from 'vitest'
// @ts-expect-error - plain JS build helper without type declarations
import { deliverySuffix as nodeSuffix } from '../../scripts/delivery-suffix.mjs'
import apps from './apps.json'
import { deliverySuffix } from './delivery'

describe('delivery suffix', () => {
  it('matches between the build script and the admin desk for every app', async () => {
    for (const { slug } of apps) {
      expect(await deliverySuffix('salt-123', slug)).toBe(nodeSuffix('salt-123', slug))
    }
    expect(nodeSuffix('', 'scorekeeper')).toBe('')
  })
})
