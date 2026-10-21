import data from './apps.json'

export type AppMeta = (typeof data)[number]
export type AppSlug = 'scorekeeper' | 'match-tracker' | 'drill-generator' | 'tournament' | 'paddle-finder' | 'rules-quiz'

export const apps = data as AppMeta[]

export function getApp(slug: string): AppMeta | undefined {
  return apps.find((a) => a.slug === slug)
}
