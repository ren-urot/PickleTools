import { useCallback, useEffect, useRef, useState } from 'react'

// localStorage can throw (private mode, quota, blocked site data); every access is guarded
// so the apps keep working in memory when storage is unavailable.

/**
 * When set (demo mode), storage lives only in this Map: nothing persists, and the demo can't
 * read or overwrite a paying customer's data on the same origin.
 */
let memory: Map<string, string> | null = null

export function keepStorageInMemory() {
  memory = new Map()
}

function getRaw(key: string): string | null {
  return memory ? (memory.get(key) ?? null) : localStorage.getItem(key)
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = getRaw(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    if (memory) memory.set(key, JSON.stringify(value))
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key: string) {
  try {
    if (memory) memory.delete(key)
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** useState that persists to localStorage under `key` and syncs across tabs. */
export function useLocalState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial
    return readJSON(key, fallback)
  })
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    writeJSON(key, value)
  }, [key, value])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue != null) {
        try {
          setValue(JSON.parse(e.newValue) as T)
        } catch {
          /* ignore malformed */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const reset = useCallback(() => {
    removeKey(key)
    setValue(typeof initial === 'function' ? (initial as () => T)() : initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [value, setValue, reset] as const
}
