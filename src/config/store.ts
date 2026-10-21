// Everything the business owner edits before launch lives here.
// Values marked "env" can be set at build time instead (see README).

export type FormProvider = 'web3forms' | 'formspree' | 'none'

export const store = {
  businessName: 'PickleTools',
  /** Price per app in pesos. The checkout and form validate against this. */
  price: 100,
  currency: 'PHP',
  /**
   * Path (relative to the site base) of the business's REAL GoTyme QR Ph image.
   * Set to null to close payments: checkout then blocks the form and says not to pay.
   */
  qrImage: ((import.meta.env.VITE_QR_IMAGE as string | undefined) || 'payment/gotyme-qr.png') as string | null,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'ren.ensombl@gmail.com',
  /** Promise shown to customers; the admin desk highlights orders older than this. */
  verificationHours: 24,
  form: {
    provider: (import.meta.env.VITE_FORM_PROVIDER as FormProvider | undefined) ?? 'web3forms',
    /** Web3Forms access key or Formspree form id. Public by design - not a secret. */
    accessKey: import.meta.env.VITE_FORM_ACCESS_KEY ?? '',
    /** Free tiers of both providers reject file uploads; enable only on a plan that accepts them. */
    receiptUploads: import.meta.env.VITE_RECEIPT_UPLOADS === 'true',
    timeoutMs: 15000,
  },
  /** Order records kept by the business for support and refunds. */
  retentionMonths: 12,
} as const

export const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`
