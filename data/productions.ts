// Curated list of productions known to shoot in NYC.
// Used to guess which production a permit belongs to by matching
// borough + category + subcategory + date window.
//
// Add or update entries as productions start / wrap. Date windows
// can be loose — the matcher just checks whether the permit's
// startdatetime falls within [from, to].

export type ProductionType = 'movie' | 'series'

export type KnownProduction = {
  title: string
  type: ProductionType
  /** Boroughs the production is known to film in. Empty = any. */
  boroughs: string[]
  /** Inclusive ISO date window during which permits should be attributed. */
  window: { from: string; to: string }
  /** Permit categories that match. Empty = any. */
  categories: string[]
  /** Optional subcategory hints (case-insensitive substring match). */
  subcategories?: string[]
}

export const knownProductions: KnownProduction[] = [
  {
    title: 'Law & Order: SVU',
    type: 'series',
    boroughs: ['Manhattan', 'Queens'],
    window: { from: '2025-07-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'Law & Order',
    type: 'series',
    boroughs: ['Manhattan', 'Queens'],
    window: { from: '2025-07-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'Law & Order: Organized Crime',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn', 'Queens'],
    window: { from: '2025-07-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'FBI',
    type: 'series',
    boroughs: ['Brooklyn', 'Manhattan'],
    window: { from: '2025-07-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'FBI: Most Wanted',
    type: 'series',
    boroughs: ['Brooklyn', 'Manhattan'],
    window: { from: '2025-07-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'And Just Like That…',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-09-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'Only Murders in the Building',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2026-01-01', to: '2026-08-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'The Gilded Age',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn'],
    window: { from: '2025-08-01', to: '2026-03-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'Elsbeth',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn'],
    window: { from: '2025-07-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'The Equalizer',
    type: 'series',
    boroughs: ['Brooklyn', 'Manhattan'],
    window: { from: '2025-07-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'Power Book II: Ghost',
    type: 'series',
    boroughs: ['Brooklyn', 'Queens', 'Bronx'],
    window: { from: '2025-08-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'Power Book III: Raising Kanan',
    type: 'series',
    boroughs: ['Queens', 'Bronx', 'Brooklyn'],
    window: { from: '2025-08-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'The Penguin',
    type: 'series',
    boroughs: ['Brooklyn', 'Queens', 'Manhattan'],
    window: { from: '2025-10-01', to: '2026-08-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'Pretty Little Liars: Summer School',
    type: 'series',
    boroughs: ['Brooklyn', 'Manhattan'],
    window: { from: '2025-08-01', to: '2026-03-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'Saturday Night Live',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-09-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Variety', 'Live Show']
  },
  {
    title: 'The Tonight Show Starring Jimmy Fallon',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['Talk Show', 'Variety']
  },
  {
    title: 'Late Show with Stephen Colbert',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['Talk Show']
  },
  {
    title: 'Late Night with Seth Meyers',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['Talk Show']
  },
  {
    title: 'The Daily Show',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['Talk Show']
  },
  {
    title: 'Last Week Tonight with John Oliver',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-02-01', to: '2026-11-30' },
    categories: ['Television'],
    subcategories: ['Talk Show', 'Cable']
  },
  {
    title: 'The View',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['Talk Show']
  },
  {
    title: 'Good Morning America',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['News']
  },
  {
    title: 'Today',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['News']
  },
  {
    title: 'CBS Mornings',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-01-01', to: '2026-12-31' },
    categories: ['Television'],
    subcategories: ['News']
  },
  {
    title: 'The Real Housewives of New York City',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn'],
    window: { from: '2025-06-01', to: '2026-06-30' },
    categories: ['Television'],
    subcategories: ['Reality', 'Cable']
  },
  {
    title: 'Project Runway',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-08-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Reality', 'Cable']
  },
  {
    title: 'Top Chef',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn'],
    window: { from: '2025-08-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Reality', 'Cable']
  },
  {
    title: 'Sesame Street',
    type: 'series',
    boroughs: ['Queens'],
    window: { from: '2025-07-01', to: '2026-05-31' },
    categories: ['Television'],
    subcategories: ['Episodic series', 'Cable']
  },
  {
    title: 'Brilliant Minds',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn'],
    window: { from: '2025-07-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'High Potential (NY block)',
    type: 'series',
    boroughs: ['Manhattan'],
    window: { from: '2025-08-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  },
  {
    title: 'Watson',
    type: 'series',
    boroughs: ['Manhattan', 'Brooklyn'],
    window: { from: '2025-08-01', to: '2026-04-30' },
    categories: ['Television'],
    subcategories: ['Episodic series']
  }
]

export type ProductionGuess = {
  title: string
  type: ProductionType
  confidence: 'high' | 'medium' | 'low'
  /** Other titles that also satisfy the minimum match. */
  alternates: string[]
}

type PermitLike = {
  borough?: string
  category?: string
  subcategoryname?: string
  startdatetime?: string
}

export const guessProduction = (permit: PermitLike): ProductionGuess | null => {
  const date = permit.startdatetime ? new Date(permit.startdatetime).getTime() : NaN
  const sub = (permit.subcategoryname || '').toLowerCase()

  type Scored = { prod: KnownProduction; score: number; hits: number }
  const scored: Scored[] = []

  for (const prod of knownProductions) {
    let score = 0
    let hits = 0

    if (prod.categories.length === 0 || (permit.category && prod.categories.includes(permit.category))) {
      score += 1
      hits += 1
    } else if (prod.categories.length > 0) {
      continue // category mismatch is disqualifying
    }

    if (prod.boroughs.length === 0 || (permit.borough && prod.boroughs.includes(permit.borough))) {
      score += 2
      hits += 1
    } else if (prod.boroughs.length > 0) {
      continue
    }

    if (!Number.isNaN(date)) {
      const from = new Date(prod.window.from).getTime()
      const to = new Date(prod.window.to).getTime()
      if (date >= from && date <= to) {
        score += 1
        hits += 1
      } else {
        continue // outside window — skip
      }
    }

    if (prod.subcategories?.length && sub) {
      if (prod.subcategories.some((s) => sub.includes(s.toLowerCase()))) {
        score += 2
        hits += 1
      }
    }

    scored.push({ prod, score, hits })
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]
  const tied = scored.filter((s) => s.score === top.score)

  // Confidence:
  // - high: subcategory matched and only one candidate
  // - medium: multiple signals matched
  // - low: minimum match (borough + date only)
  let confidence: ProductionGuess['confidence'] = 'low'
  if (top.hits >= 4 && tied.length === 1) confidence = 'high'
  else if (top.hits >= 3) confidence = 'medium'

  return {
    title: top.prod.title,
    type: top.prod.type,
    confidence,
    alternates: tied.slice(1).map((s) => s.prod.title)
  }
}
