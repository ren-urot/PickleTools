import { describe, expect, it } from 'vitest'
import { getApp } from '../../shared/apps'
import { allChecked, decodeSubmission, duplicateReferences, encodeSubmission, isOverdue, needsReplacement, newDeskOrder, ordersCSV, parseSubmissionText, withStatus, type DeskOrder } from './desk'
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

describe('submission import', () => {
  const sub = { orderId: 'PT-SK-261022-KB48', email: 'buyer@gmail.com', reference: '64557575', amount: '100', senderName: 'Juan dela Cruz', paidAt: '22/10/2026, 6:30:00 am', contact: '' }

  it('round-trips through the desk link payload (URL-safe, unicode-safe)', () => {
    const enc = encodeSubmission({ ...sub, senderName: 'Niño Peña' })
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeSubmission(enc)).toEqual({ ...sub, senderName: 'Niño Peña' })
  })

  it('rejects junk payloads', () => {
    expect(decodeSubmission('!!!')).toBeNull()
    expect(decodeSubmission(encodeSubmission({ ...sub, orderId: '' }))).toBeNull()
  })

  it('parses a Web3Forms email laid out as label/value lines', () => {
    const email = `New Form Submission
Order ID
PT-SK-261022-KB48
App
Pickleball Scorekeeper (scorekeeper)
Customer email
buyer@gmail.com
Amount paid
₱100
Reference number
64557575
Sender name
Juan dela Cruz
Payment date/time
-
Backup contact
-`
    expect(parseSubmissionText(email)).toEqual({ ...sub, paidAt: '' })
  })

  it('parses the "Label: value" email fallback format', () => {
    const email = `Order ID: PT-SK-261022-KB48
Customer email: buyer@gmail.com
Amount paid: ₱100
Reference number: 6455 7575
Sender name: Juan dela Cruz
Payment date/time: 22/10/2026, 6:30:00 am
Backup contact: -`
    expect(parseSubmissionText(email)).toEqual(sub)
  })
})

describe('newDeskOrder', () => {
  it('creates a submitted order with the app taken from the order ID', () => {
    const o = newDeskOrder({ orderId: 'pt-sk-261022-kb48', email: ' b@x.com ', reference: '6455 7575', amount: '₱100', senderName: '', paidAt: '', contact: '0917' }, 'Imported', 5)!
    expect(o).toMatchObject({ orderId: 'PT-SK-261022-KB48', slug: 'scorekeeper', email: 'b@x.com', reference: '64557575', amount: 100, status: 'submitted', notes: 'Backup contact: 0917', createdAt: 5 })
  })
  it('rejects unknown apps and malformed IDs', () => {
    const blank = { email: '', reference: '', amount: '', senderName: '', paidAt: '', contact: '' }
    expect(newDeskOrder({ ...blank, orderId: 'PT-ZZ-261022-KB48' })).toBeNull()
    expect(newDeskOrder({ ...blank, orderId: 'hello' })).toBeNull()
  })
})
