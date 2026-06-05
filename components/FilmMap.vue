<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import maplibregl, { Map as MLMap, Marker, Popup } from 'maplibre-gl'
import { guessProduction } from '~/data/productions'

type Permit = {
  eventid: string
  borough: string
  parkingheld: string
  category: string
  subcategoryname: string
  startdatetime: string
  enddatetime: string
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const props = defineProps<{
  permits: Permit[]
  selected: Permit | null
}>()

const emit = defineEmits<{ select: [Permit] }>()

const mapEl = ref<HTMLElement | null>(null)
const map = shallowRef<MLMap | null>(null)
const boroughMarkers = shallowRef<Marker[]>([])
const selectedMarker = shallowRef<Marker | null>(null)
const selectedPopup = shallowRef<Popup | null>(null)
const status = ref<string>('')
const mapReady = ref(false)

const BOROUGH_CENTERS: Record<string, [number, number]> = {
  Manhattan: [-73.9712, 40.7831],
  Brooklyn: [-73.9442, 40.6782],
  Queens: [-73.7949, 40.7282],
  Bronx: [-73.8648, 40.8448],
  'Staten Island': [-74.1502, 40.5795]
}

const CATEGORY_COLOR: Record<string, string> = {
  Film: '#ef4444',
  Television: '#3b82f6',
  Theater: '#a855f7',
  Commercial: '#f59e0b',
  'Still Photography': '#10b981',
  Documentary: '#06b6d4',
  'Music Video': '#ec4899',
  Student: '#6366f1'
}

const geocodeCache = new Map<string, [number, number] | null>()

const cleanLocationQuery = (raw: string): string => {
  if (!raw) return ''
  const first = raw.split(/\bbetween\b|,/i)[0].trim()
  return first.replace(/\s+/g, ' ')
}

const geocode = async (raw: string, borough: string): Promise<[number, number] | null> => {
  const q = cleanLocationQuery(raw)
  if (!q) return null
  const key = `${q}|${borough}`
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null
  const fullQuery = `${q}, ${borough}, New York, NY, USA`
  try {
    const res = await $fetch<Array<{ lat: string; lon: string }>>(
      'https://nominatim.openstreetmap.org/search',
      {
        params: { q: fullQuery, format: 'json', limit: 1, countrycodes: 'us' },
        headers: { 'Accept-Language': 'en' }
      }
    )
    const hit = res?.[0]
    if (!hit) {
      geocodeCache.set(key, null)
      return null
    }
    const coords: [number, number] = [parseFloat(hit.lon), parseFloat(hit.lat)]
    geocodeCache.set(key, coords)
    return coords
  } catch {
    geocodeCache.set(key, null)
    return null
  }
}

const buildBoroughEl = (borough: string, count: number) => {
  const el = document.createElement('div')
  const size = Math.min(72, 28 + Math.sqrt(count) * 4)
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:9999px;
    background: radial-gradient(circle at 30% 30%, rgba(125,211,252,0.98), rgba(56,189,248,0.85) 55%, rgba(14,165,233,0.55));
    border: 2px solid rgba(241,245,249,0.9);
    box-shadow: 0 4px 18px rgba(56,189,248,0.55), 0 0 0 6px rgba(56,189,248,0.18);
    display:flex;align-items:center;justify-content:center;
    color:#0f172a;font-weight:800;font-size:${Math.max(11, size/4.5)}px;
    font-family: ui-sans-serif, system-ui;
    cursor:pointer;transition:transform 150ms ease;
    text-shadow: 0 1px 0 rgba(255,255,255,0.4);
  `
  el.textContent = String(count)
  el.title = `${borough} · ${count} permit${count === 1 ? '' : 's'}`
  el.addEventListener('mouseenter', () => (el.style.transform = 'scale(1.08)'))
  el.addEventListener('mouseleave', () => (el.style.transform = 'scale(1)'))
  return el
}

const buildSelectedEl = (color: string) => {
  const el = document.createElement('div')
  el.style.cssText = `
    width:22px;height:22px;border-radius:9999px;
    background:${color};
    border:3px solid white;
    box-shadow: 0 0 0 4px ${color}55, 0 4px 12px rgba(0,0,0,0.4);
    position:relative;
  `
  const pulse = document.createElement('div')
  pulse.style.cssText = `
    position:absolute;inset:-8px;border-radius:9999px;
    background:${color};opacity:0.35;
    animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite;
  `
  el.appendChild(pulse)
  if (!document.getElementById('film-ping-keyframes')) {
    const style = document.createElement('style')
    style.id = 'film-ping-keyframes'
    style.textContent = `@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }`
    document.head.appendChild(style)
  }
  return el
}

const drawBoroughMarkers = () => {
  if (!map.value) return
  for (const m of boroughMarkers.value) m.remove()
  boroughMarkers.value = []

  const counts = new Map<string, number>()
  for (const p of props.permits) {
    if (!p.borough) continue
    counts.set(p.borough, (counts.get(p.borough) ?? 0) + 1)
  }

  for (const [borough, center] of Object.entries(BOROUGH_CENTERS)) {
    const count = counts.get(borough) ?? 0
    if (!count) continue
    const el = buildBoroughEl(borough, count)
    el.addEventListener('click', () => {
      const first = props.permits.find((p) => p.borough === borough)
      if (first) emit('select', first)
    })
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(center)
      .addTo(map.value!)
    boroughMarkers.value.push(marker)
  }
}

const focusSelected = async () => {
  if (!map.value || !mapReady.value || !props.selected) return

  if (selectedMarker.value) {
    selectedMarker.value.remove()
    selectedMarker.value = null
  }
  if (selectedPopup.value) {
    selectedPopup.value.remove()
    selectedPopup.value = null
  }

  const sel = props.selected
  const borough = sel.borough
  const fallback = BOROUGH_CENTERS[borough]
  status.value = 'Locating…'

  const coords = (await geocode(sel.parkingheld, borough)) ?? fallback
  if (!coords) {
    status.value = 'Location unknown'
    return
  }

  status.value = ''
  const color = CATEGORY_COLOR[sel.category] ?? '#0ea5e9'

  const fmt = (s: string) => (s ? new Date(s).toLocaleString() : '')
  const dateLine = [fmt(sel.startdatetime), fmt(sel.enddatetime)].filter(Boolean).join(' → ')
  const production = guessProduction(sel)
  const productionHtml = production
    ? `<div style="font-size:12px;margin-bottom:4px;display:flex;align-items:center;gap:6px"><span style="opacity:0.6">Production:</span><span style="font-weight:600">${escapeHtml(production.title)}</span><span style="font-size:10px;opacity:0.6;text-transform:uppercase;letter-spacing:0.04em">${production.confidence}</span></div>`
    : ''
  const displayAddress = formatAddress(sel.parkingheld)
  const mapsQuery = encodeURIComponent(
    [displayAddress || sel.parkingheld, sel.borough, 'New York, NY'].filter(Boolean).join(', ')
  )
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`
  const locationHtml = displayAddress
    ? `<a href="${mapsHref}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(sel.parkingheld)}" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:11px;color:#7dd3fc;text-decoration:none"><span style="text-decoration:underline">${escapeHtml(displayAddress)}</span><span aria-hidden="true">↗</span></a>`
    : ''
  const html = `
    <div style="min-width:220px;font-family:ui-sans-serif,system-ui">
      <div style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${color}22;color:${color};font-size:11px;font-weight:600;margin-bottom:6px">${escapeHtml(sel.category)}</div>
      <div style="font-weight:600;margin-bottom:4px">${escapeHtml(sel.subcategoryname || '—')}</div>
      ${productionHtml}
      <div style="font-size:11px;opacity:0.6">${escapeHtml(dateLine)}</div>
      ${locationHtml}
    </div>
  `

  selectedMarker.value = new maplibregl.Marker({ element: buildSelectedEl(color), anchor: 'center' })
    .setLngLat(coords)
    .addTo(map.value)

  selectedPopup.value = new maplibregl.Popup({
    offset: 22,
    closeButton: true,
    closeOnClick: false,
    maxWidth: '320px'
  })
    .setLngLat(coords)
    .setHTML(html)
    .addTo(map.value)

  map.value.flyTo({
    center: coords,
    zoom: 15.5,
    pitch: 55,
    bearing: -18,
    speed: 1.1,
    curve: 1.5,
    essential: true
  })
}

const initMap = () => {
  if (!mapEl.value) return

  const styleUrl = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

  map.value = new maplibregl.Map({
    container: mapEl.value,
    style: styleUrl,
    center: [-73.97, 40.74],
    zoom: 10.5,
    pitch: 35,
    bearing: -10,
    attributionControl: { compact: true }
  })

  if (import.meta.dev) (window as any).__mlmap = map.value

  map.value.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
  map.value.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

  map.value.on('load', () => {
    // 3D buildings extrusion
    const m = map.value!
    const layers = m.getStyle().layers ?? []
    const labelLayer = layers.find(
      (l: any) => l.type === 'symbol' && l.layout && l.layout['text-field']
    )?.id

    // Dark-matter uses "carto" as the source name; OpenFreeMap uses "openmaptiles".
    const buildingSource = m.getSource('openmaptiles')
      ? 'openmaptiles'
      : m.getSource('carto')
        ? 'carto'
        : null
    if (buildingSource) {
      m.addLayer(
        {
          id: '3d-buildings',
          source: buildingSource,
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#475569',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.5,
              ['coalesce', ['get', 'render_height'], 10]
            ],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.75
          }
        },
        labelLayer
      )
    }

    mapReady.value = true
    const nudge = () => {
      m.resize()
      // Re-set the camera to its current pose to force tile coverage recomputation
      m.jumpTo({ center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() })
      m.triggerRepaint()
    }
    requestAnimationFrame(nudge)
    setTimeout(nudge, 200)
    drawBoroughMarkers()
    if (props.selected) focusSelected()
  })

  // When the container resizes, sync the canvas and nudge tile fetching.
  // MapLibre can miss the first tile fetch when the canvas starts at 0×0
  // (happens during HMR or in headless rendering), so we re-pose the camera
  // to force a coverage recompute.
  const kick = () => {
    const m = map.value
    if (!m) return
    m.resize()
    if (mapReady.value) {
      m.jumpTo({ center: m.getCenter(), zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() })
    }
    m.triggerRepaint()
  }
  const ro = new ResizeObserver(kick)
  ro.observe(mapEl.value)
  ;(map.value as any).__ro = ro

  const onWindowResize = () => kick()
  window.addEventListener('resize', onWindowResize)
  ;(map.value as any).__onResize = onWindowResize

  const onVis = () => {
    if (document.visibilityState === 'visible') {
      kick()
      requestAnimationFrame(kick)
    }
  }
  document.addEventListener('visibilitychange', onVis)
  ;(map.value as any).__onVis = onVis

  // Self-heal: while tiles haven't loaded for the visible viewport, keep
  // kicking the camera. Some headless contexts size the canvas after map
  // init without firing a useful resize event, and MapLibre only fetches
  // tiles in response to camera changes.
  let healPolls = 0
  const heal = window.setInterval(() => {
    healPolls++
    const m = map.value
    if (!m || !mapEl.value) {
      window.clearInterval(heal); return
    }
    if (m.loaded() && m.isStyleLoaded()) {
      window.clearInterval(heal); return
    }
    if (mapEl.value.clientWidth > 0) {
      kick()
    }
    if (healPolls > 60) window.clearInterval(heal) // give up after 30s
  }, 500)
}

onMounted(() => {
  if (mapEl.value) initMap()
})

onBeforeUnmount(() => {
  for (const m of boroughMarkers.value) m.remove()
  selectedMarker.value?.remove()
  selectedPopup.value?.remove()
  const anyMap = map.value as any
  anyMap?.__ro?.disconnect()
  if (anyMap?.__onVis) document.removeEventListener('visibilitychange', anyMap.__onVis)
  if (anyMap?.__onResize) window.removeEventListener('resize', anyMap.__onResize)
  map.value?.remove()
})

watch(() => props.permits, drawBoroughMarkers, { deep: false })
watch(() => props.selected, focusSelected)
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="mapEl" class="h-full w-full" />
    <div
      v-if="status"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-md bg-elevated text-default text-xs shadow-md border border-default"
    >
      {{ status }}
    </div>
  </div>
</template>

<style>
.maplibregl-popup-content {
  background: rgb(17 24 39 / 0.92);
  color: rgb(241 245 249);
  border: 1px solid rgb(51 65 85);
  border-radius: 10px;
  padding: 12px 14px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
.maplibregl-popup-tip {
  border-top-color: rgb(17 24 39 / 0.92) !important;
  border-bottom-color: rgb(17 24 39 / 0.92) !important;
}
.maplibregl-popup-close-button {
  color: rgb(148 163 184);
  font-size: 18px;
  padding: 2px 6px;
}
</style>
