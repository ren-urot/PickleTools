import { describe, expect, it, vi } from 'vitest'
import { getApp } from '../../shared/apps'
import { deliverySuffix, installUrl } from '../../shared/delivery'
import { ORDER_ID_RE } from '../../shared/license'
import { checkoutOrderId, clearCheckoutOrderId, makeOrderId } from './order'
import { amountMismatch, emptyForm, normalizeReference, validatePaymentForm } from './paymentForm'
import { mailtoFallback, orderSubject, submitOrder } from './submitOrder'

const valid = { ...emptyForm(), email: 'ana@gmail.com', confirmEmail: 'Ana@Gmail.com ', reference: '1234 567 890', consent: true }

describe('order IDs', () => {
  it('follow PT-<APP>-<YYMMDD>-<XXXX>', () => {
    const id = makeOrderId('SK', new Date(2026, 9, 21))
    expect(id).toMatch(/^PT-SK-261021-[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(id).toMatch(ORDER_ID_RE)
  })

  it('are reused within a checkout attempt and fresh after success', () => {
    const a = checkoutOrderId('scorekeeper', 'SK')
    expect(checkoutOrderId('scorekeeper', 'SK')).toBe(a)
    clearCheckoutOrderId('scorekeeper')
    // 1 in ~1M chance of a same-day collision with the previous random suffix.
    expect(checkoutOrderId('scorekeeper', 'SK')).not.toBe(a)
  })
})

describe('payment form validation', () => {
  it('accepts a complete form (case-insensitive email confirmation, spaced reference)', () => {
    expect(validatePaymentForm(valid)).toEqual({})
  })

  it('requires email, matching confirmation, reference and consent', () => {
    const e = validatePaymentForm({ ...emptyForm(), email: 'ana@gmail', confirmEmail: '' })
    expect(Object.keys(e).sort()).toEqual(['consent', 'email', 'reference'])
    expect(validatePaymentForm({ ...valid, confirmEmail: 'ana@gmial.com' }).confirmEmail).toMatch(/don’t match/)
  })

  it('rejects malformed references and future payment times', () => {
    expect(validatePaymentForm({ ...valid, reference: '12#4' }).reference).toBeTruthy()
    const now = Date.parse('2026-10-21T12:00:00')
    expect(validatePaymentForm({ ...valid, paidAt: '2026-10-22T12:00' }, null, now).paidAt).toMatch(/future/)
    expect(validatePaymentForm({ ...valid, paidAt: '2026-10-21T11:00' }, null, now).paidAt).toBeUndefined()
  })

  it('checks receipt type and size', () => {
    const pdf = new File(['x'], 'r.pdf', { type: 'application/pdf' })
    expect(validatePaymentForm(valid, pdf).receipt).toBeTruthy()
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'r.png', { type: 'image/png' })
    expect(validatePaymentForm(valid, big).receipt).toMatch(/5 MB/)
  })

  it('warns, without blocking, when the amount isn’t ₱100', () => {
    expect(amountMismatch({ ...valid, amount: '1,000' })).toBe(true)
    expect(validatePaymentForm({ ...valid, amount: '1,000' }).amount).toBeUndefined()
    expect(amountMismatch(valid)).toBe(false)
  })

  it('normalises references', () => {
    expect(normalizeReference(' 1234-567 890 ')).toBe('1234567890')
  })
})

describe('submission', () => {
  const app = getApp('scorekeeper')!
  const sub = { orderId: 'PT-SK-261021-7KQ4', app, values: valid }

  it('builds a scannable subject and a complete email fallback', () => {
    expect(orderSubject({ ...sub, reference: '1234567890' })).toBe('[PickleTools] PT-SK-261021-7KQ4 · Pickleball Scorekeeper · ref 1234567890')
    const body = decodeURIComponent(mailtoFallback(sub).split('body=')[1])
    expect(body).toContain('Reference number: 1234567890')
    expect(body).toContain('Customer email: ana@gmail.com')
  })

  it('reports not_configured when no access key is set', async () => {
    const r = await submitOrder(sub, vi.fn())
    expect(r).toMatchObject({ ok: false, reason: 'not_configured' })
  })
})

describe('delivery paths', () => {
  it('derive a stable unlisted suffix from the salt', async () => {
    const a = await deliverySuffix('s3cret', 'scorekeeper')
    expect(a).toMatch(/^-[0-9a-f]{10}$/)
    expect(await deliverySuffix('s3cret', 'scorekeeper')).toBe(a)
    expect(await deliverySuffix('s3cret', 'rules-quiz')).not.toBe(a)
    expect(await deliverySuffix('', 'scorekeeper')).toBe('')
    expect(await installUrl('https://x.github.io/pt/', 's3cret', 'scorekeeper')).toBe(`https://x.github.io/pt/apps/scorekeeper${a}/`)
  })
})
