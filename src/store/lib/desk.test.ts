import { describe, expect, it } from 'vitest'
import { getApp } from '../../shared/apps'
import { allChecked, duplicateReferences, isOverdue, needsReplacement, ordersCSV, withStatus, type DeskOrder } from './desk'
import { activationEmail, installEmail, mailto } from './emails'

const base: DeskOrder = {
  orderId: 'PT-SK-261021-7KQ4',
  slug: 'scorekeeper',
  email: 'ana@gmail.com',
  reference: '1234567890',
  amount: 100,
  senderName: '',
  paidAt: '',
  notes: '',
  status: 'verifying',
  checks: { amount: false, reference: false, unique: false },
  activations: [],
  history: [],
  createdAt: 0,
}

describe('order desk', () => {
  it('flags references already used by another live order', () => {
    const orders = [base, { ...base, orderId: 'PT-MT-261021-AAAA' }, { ...base, orderId: 'PT-DG-261021-BBBB', status: 'rejected' as const }]
    expect(duplicateReferences(orders, '1234-567 890', base.orderId).map((o) => o.orderId)).toEqual(['PT-MT-261021-AAAA'])
  })

  it('requires every check before delivery', () => {
    expect(allChecked(base)).toBe(false)
    expect(allChecked({ ...base, checks: { amount: true, reference: true, unique: true } })).toBe(true)
  })

  it('marks waiting orders overdue after the promised hours', () => {
    expect(isOverdue(base, 24, 25 * 3600 * 1000)).toBe(true)
    expect(isOverdue({ ...base, status: 'verified' }, 24, 25 * 3600 * 1000)).toBe(false)
    expect(isOverdue(base, 24, 23 * 3600 * 1000)).toBe(false)
  })

  it('requires the replacement flag only for a second, different device', () => {
    expect(needsReplacement(base, 'AAAA-BBBB-CCCC')).toBe(false)
    const activated = { ...base, activations: [{ device: 'AAAA-BBBB-CCCC', code: 'x', issuedAt: 0, replacement: false }] }
    expect(needsReplacement(activated, 'AAAA-BBBB-CCCC')).toBe(false)
    expect(needsReplacement(activated, 'ZZZZ-ZZZZ-ZZZZ')).toBe(true)
  })

  it('records status history and exports CSV', () => {
    const o = withStatus(base, 'verified', 'matched')
    expect(o.history.at(-1)).toMatchObject({ status: 'verified', note: 'matched' })
    expect(ordersCSV([o]).split('\r\n')[1]).toContain('PT-SK-261021-7KQ4,scorekeeper,verified,ana@gmail.com')
  })
})

describe('emails', () => {
  const app = getApp('scorekeeper')!
  it('install email includes the link, order ID and one-device note', () => {
    const e = installEmail(base, app, 'https://x/apps/scorekeeper-abc/')
    expect(e.subject).toContain(base.orderId)
    expect(e.body).toContain('https://x/apps/scorekeeper-abc/')
    expect(e.body).toMatch(/one device/)
  })
  it('activation email carries the code and a same-device link', () => {
    const e = activationEmail(base, app, 'AAAA-BBBB-CCCC', 'PT-SK-261021-7KQ4.sig', 'https://x/apps/scorekeeper-abc/')
    expect(e.body).toContain('https://x/apps/scorekeeper-abc/#activate=PT-SK-261021-7KQ4.sig')
    expect(mailto(e)).toMatch(/^mailto:ana%40gmail\.com\?subject=/)
  })
})
