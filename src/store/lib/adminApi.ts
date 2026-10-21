// Order desk → /api/admin (see api/admin.ts). The password is the ADMIN_PASSWORD env variable.

export interface Activation {
  device: string
  at: number
}

type Body = { action: 'ping' } | { action: 'approve' | 'status' | 'reset'; orderId: string }

export type AdminResult<T> = ({ ok: true } & T) | { ok: false; error: string; message: string }

const messages: Record<string, string> = {
  wrong_password: 'Wrong admin password.',
  not_configured: 'The server isn’t set up yet (missing secrets on Vercel).',
  bad_order: 'That order ID isn’t valid.',
  network: 'Couldn’t reach the server. Check your internet connection.',
}

export async function adminCall<T = object>(password: string, body: Body): Promise<AdminResult<T>> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/admin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${password}` },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({ ok: false, error: 'not_configured' }))) as { ok: boolean; error?: string; message?: string }
    if (data.ok) return data as AdminResult<T>
    const error = data.error ?? 'unknown'
    return { ok: false, error, message: messages[error] ?? data.message ?? 'Something went wrong.' }
  } catch {
    return { ok: false, error: 'network', message: messages.network }
  }
}
