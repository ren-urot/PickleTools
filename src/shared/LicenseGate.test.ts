import { describe, expect, it } from 'vitest'
import { tokenFrom } from './LicenseGate'

describe('tokenFrom', () => {
  const token = 'PT-SK-261022-KB48.Abc_def-1234567890xyzQ'
  it('reads the token from a full install link, a bare hash or the token itself', () => {
    expect(tokenFrom(`https://pickletools.vercel.app/apps/scorekeeper-b55c079b9c/#t=${token}`)).toBe(token)
    expect(tokenFrom(`#t=${token}`)).toBe(token)
    expect(tokenFrom(`  ${token}  `)).toBe(token)
  })
  it('ignores anything else', () => {
    expect(tokenFrom('https://pickletools.vercel.app/apps/scorekeeper-b55c079b9c/')).toBeNull()
    expect(tokenFrom('hello')).toBeNull()
    expect(tokenFrom('')).toBeNull()
  })
})
