// Format the verbose `parkingheld` string into a single concrete address.
// `parkingheld` is typically a comma-separated list of segments like:
//   "WEST 57 STREET between 5 AVENUE and 6 AVENUE, BROADWAY between ..."
// We collapse that to the first segment as an intersection: "WEST 57 STREET & 5 AVENUE".

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, n, suf) => `${n}${suf.toLowerCase()}`)

export const formatAddress = (raw: string | undefined | null): string => {
  if (!raw) return ''
  const first = raw.split(',')[0].trim().replace(/\s+/g, ' ')
  if (!first) return ''
  const match = first.match(/^(.+?)\s+between\s+(.+?)\s+and\s+.+$/i)
  const concrete = match ? `${match[1].trim()} & ${match[2].trim()}` : first
  return titleCase(concrete)
}
