import { isDeviceCode, normalizeDeviceCode, randomBase32 } from './license'
import { readJSON, writeJSON } from './storage'

const DEVICE_KEY = 'pt:device-code'

/** The persistent code for this browser/installed app. */
export function getDeviceCode(): string {
  const existing = readJSON<string | null>(DEVICE_KEY, null)
  if (existing && isDeviceCode(existing)) return existing
  const code = normalizeDeviceCode(randomBase32(12))
  writeJSON(DEVICE_KEY, code)
  return code
}
