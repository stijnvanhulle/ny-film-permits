# NYC Film Permits

A small Nuxt 4 + Vue 3 app that visualises live film, television, theater and commercial shoot permits issued by the City of New York, using the [NYC Open Data Film Permits dataset](https://data.cityofnewyork.us/City-Government/Film-Permits/tg4x-b46p/about_data).

- **Table** of the 200 most recently entered permits, sorted by `enteredon DESC`.
- **Map** ([MapLibre GL](https://maplibre.org) + [Carto Dark Matter](https://github.com/CartoDB/basemap-styles) vector tiles) with borough cluster markers sized by permit count.
- **Click a row** → the map flies (pitched + bearing-shifted) to the geocoded location (via [Nominatim](https://nominatim.openstreetmap.org)) and drops a marker + dark popup with category, sub-category, address and time range.
- **Real-time**: polls every 30 s while the tab is visible, pauses when hidden, catches up on focus, flashes "New" badges + a toast for newly-arrived permits, and shows a live "Updated Xs ago" pill in the header.
- **Filters** by borough, category, and free-text location search (executed server-side via Socrata SoQL).
- **UI** built with [Nuxt UI v4](https://ui.nuxt.com).

## Stack

- Nuxt 4 (SPA, no SSR)
- Vue 3
- Nuxt UI 4 (Tailwind v4)
- MapLibre GL 5
- NYC Open Data Socrata API (no auth required)
- Nominatim (no auth required, light per-session client-side cache)

## Develop

```bash
pnpm install
pnpm dev   # http://localhost:3001
```

The dev script sets `TMPDIR=/tmp` to work around macOS's ~104-char Unix-socket path limit, which otherwise breaks Nuxt 4's vite-node socket.

## Build

```bash
pnpm build
pnpm preview
```

## Data attribution

- Permit data © City of New York, via [NYC Open Data](https://opendata.cityofnewyork.us/).
- Basemap © [CARTO](https://carto.com/attributions), © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- Geocoding © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors via Nominatim.
