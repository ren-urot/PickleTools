// Node twin of src/shared/delivery.ts - the admin desk and the build must agree
// (src/shared/delivery.test.ts checks this).
import { createHash } from 'node:crypto'

export function deliverySuffix(salt, slug) {
  if (!salt) return ''
  return `-${createHash('sha256').update(`${salt}:${slug}`).digest('hex').slice(0, 10)}`
}
