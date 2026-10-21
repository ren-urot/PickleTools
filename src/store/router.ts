import { useEffect, useState } from 'react'

// Hash routing works on any static host (GitHub Pages has no SPA fallback).

export interface Route {
  path: string
  params: URLSearchParams
}

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path: path.startsWith('/') ? path : '/', params: new URLSearchParams(query) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const href = (path: string) => `#${path}`

/** Free online demo page for an app (a separate page, not a hash route). */
export const demoHref = (slug: string) => `${import.meta.env.BASE_URL}demo/${slug}/`

export function navigate(path: string) {
  location.hash = path
}

/** Matches "/apps/:slug"-style patterns; returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/')
  const a = path.split('/')
  if (p.length !== a.length) return null
  const out: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) out[p[i].slice(1)] = decodeURIComponent(a[i])
    else if (p[i] !== a[i]) return null
  }
  return out
}
