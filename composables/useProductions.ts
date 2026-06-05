import type { Production } from '~/data/productions'

type TvMazeShow = {
  id: number
  name: string
  type: string
  status: string
  premiered: string | null
  network: { name?: string; country?: { code?: string } | null } | null
  webChannel: { name?: string; country?: { code?: string } | null } | null
  externals: { imdb: string | null }
  genres: string[]
  summary: string | null
}

const NYC_HINTS = /\b(new york|nyc|brooklyn|manhattan|queens|bronx|staten island|harlem)\b/i

const subcategoriesFor = (show: TvMazeShow): string[] => {
  const t = (show.type || '').toLowerCase()
  const out = new Set<string>()
  if (t.includes('scripted')) {
    out.add('Episodic series')
    out.add('Cable')
  }
  if (t.includes('reality')) out.add('Reality')
  if (t.includes('talk')) out.add('Talk Show')
  if (t.includes('variety') || t.includes('award') || t.includes('sports')) {
    out.add('Variety')
    out.add('Live Show')
  }
  if (t.includes('news')) out.add('News')
  if (t.includes('game')) out.add('Game Show')
  if (t.includes('documentary')) out.add('Documentary')
  // Late night and live talk shows often labeled Variety on TVMaze
  if (/\b(late night|tonight show|saturday night live|snl)\b/i.test(show.name)) {
    out.add('Variety')
    out.add('Live Show')
    out.add('Talk Show')
  }
  return Array.from(out)
}

const toProduction = (show: TvMazeShow): Production | null => {
  const networkCountry =
    show.network?.country?.code ?? show.webChannel?.country?.code ?? null
  if (networkCountry && networkCountry !== 'US') return null
  const subcategories = subcategoriesFor(show)
  if (subcategories.length === 0) return null
  const summary = (show.summary || '').replace(/<[^>]+>/g, '')
  const nycAnchored = NYC_HINTS.test(summary) || NYC_HINTS.test(show.name)
  return {
    title: show.name,
    type: 'series',
    imdbId: show.externals?.imdb ?? null,
    premiered: show.premiered,
    subcategories,
    nycAnchored,
    network: show.network?.name ?? show.webChannel?.name ?? null
  }
}

const fetchDay = async (date: string): Promise<TvMazeShow[]> => {
  try {
    const items = await $fetch<Array<{ show: TvMazeShow }>>(
      `https://api.tvmaze.com/schedule?country=US&date=${date}`,
      { retry: 1 }
    )
    return items.map((i) => i.show).filter(Boolean)
  } catch {
    return []
  }
}

const productionsState = ref<Production[]>([])
const pendingState = ref(false)
const errorState = ref<unknown>(null)
let loadPromise: Promise<void> | null = null

export const useProductions = () => {
  const load = async () => {
    if (productionsState.value.length > 0) return
    if (loadPromise) return loadPromise
    pendingState.value = true
    errorState.value = null
    loadPromise = (async () => {
      try {
        // Past 14 days of US schedule captures weekly returning series too.
        const today = new Date()
        const dates: string[] = []
        for (let i = 0; i < 14; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          dates.push(d.toISOString().slice(0, 10))
        }
        const all = await Promise.all(dates.map(fetchDay))
        const seen = new Map<number, Production>()
        for (const day of all) {
          for (const show of day) {
            if (!show || seen.has(show.id)) continue
            const prod = toProduction(show)
            if (prod) seen.set(show.id, prod)
          }
        }
        productionsState.value = Array.from(seen.values())
      } catch (e) {
        errorState.value = e
      } finally {
        pendingState.value = false
      }
    })()
    return loadPromise
  }

  return {
    productions: productionsState,
    pending: pendingState,
    error: errorState,
    load
  }
}
