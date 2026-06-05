// Production matcher. The list of candidate productions is fetched live
// from TVMaze (see composables/useProductions.ts) so there's nothing to
// maintain in the codebase — guessProduction is a pure function over the
// passed-in list.

export type ProductionType = 'movie' | 'series'

export type Production = {
  title: string
  type: ProductionType
  imdbId: string | null
  premiered: string | null
  subcategories: string[]
  /** True when the show's name/summary mentions NYC — used as a borough proxy. */
  nycAnchored: boolean
  network: string | null
}

export type ProductionGuess = {
  title: string
  type: ProductionType
  confidence: 'high' | 'medium' | 'low'
  imdbId: string | null
  /** Other titles that scored equally. */
  alternates: string[]
}

type PermitLike = {
  category?: string
  subcategoryname?: string
  startdatetime?: string
}

export const imdbUrl = (guess: { imdbId: string | null; title: string }): string =>
  guess.imdbId
    ? `https://www.imdb.com/title/${guess.imdbId}/`
    : `https://www.imdb.com/find?q=${encodeURIComponent(guess.title)}&s=tt`

export const guessProduction = (
  permit: PermitLike,
  productions: Production[]
): ProductionGuess | null => {
  if (!productions.length) return null
  if (permit.category !== 'Television') return null

  const date = permit.startdatetime ? new Date(permit.startdatetime).getTime() : NaN
  const sub = (permit.subcategoryname || '').toLowerCase()
  if (!sub) return null

  type Scored = { prod: Production; score: number }
  const scored: Scored[] = []

  for (const prod of productions) {
    if (!prod.subcategories.some((s) => sub.includes(s.toLowerCase()))) continue

    if (!Number.isNaN(date) && prod.premiered) {
      const from = new Date(prod.premiered).getTime()
      if (date < from) continue
    }

    let score = 2 // subcategory match is the primary signal
    if (prod.nycAnchored) score += 2

    scored.push({ prod, score })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  if (!top) return null
  const tied = scored.filter((s) => s.score === top.score)

  let confidence: ProductionGuess['confidence'] = 'low'
  if (top.prod.nycAnchored && tied.length === 1) confidence = 'high'
  else if (top.prod.nycAnchored) confidence = 'medium'
  else if (tied.length <= 2) confidence = 'medium'

  return {
    title: top.prod.title,
    type: top.prod.type,
    imdbId: top.prod.imdbId,
    confidence,
    alternates: tied.slice(1, 5).map((s) => s.prod.title)
  }
}
