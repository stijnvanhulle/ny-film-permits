<script setup lang="ts">
import { h, onBeforeUnmount, onMounted, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import FilmMap from '~/components/FilmMap.vue'
import { guessProduction } from '~/data/productions'

type Permit = {
  eventid: string
  eventtype: string
  startdatetime: string
  enddatetime: string
  enteredon: string
  eventagency: string
  parkingheld: string
  borough: string
  communityboard_s_?: string
  policeprecinct_s_?: string
  category: string
  subcategoryname: string
  country: string
  zipcode_s_?: string
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const search = ref('')
const borough = ref<string | undefined>()
const category = ref<string | undefined>()
const startDate = ref('')
const endDate = ref('')
const selected = ref<Permit | null>(null)
const sorting = ref<{ id: string; desc: boolean }[]>([
  { id: 'enteredon', desc: true }
])

const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
const categories = [
  'Film',
  'Television',
  'Theater',
  'Commercial',
  'Still Photography',
  'Documentary',
  'Music Video',
  'Student'
]

// Real-time
const POLL_MS = 30_000
const lastFetchedAt = ref<number | null>(null)
const now = ref(Date.now())
const isVisible = ref(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true)
const seenIds = ref<Set<string>>(new Set())
const recentlyAddedIds = ref<Set<string>>(new Set())
const newCount = ref(0)
const toast = useToast()

const params = computed(() => {
  const where: string[] = []
  if (borough.value) where.push(`borough='${borough.value}'`)
  if (category.value) where.push(`category='${category.value}'`)
  if (search.value)
    where.push(`upper(parkingheld) like upper('%${search.value.replace(/'/g, "''")}%')`)
  // Range overlap: include permits that are active at any point in the selected window,
  // not just those whose start falls inside it.
  if (startDate.value) where.push(`enddatetime >= '${startDate.value}T00:00:00.000'`)
  if (endDate.value) where.push(`startdatetime <= '${endDate.value}T23:59:59.999'`)
  // When a date window is active, long-range permits entered months ago would be
  // pushed past the row cap by more-recently-entered shorter permits. Switch the
  // sort to startdatetime so all window-overlapping permits surface.
  const hasDateFilter = !!(startDate.value || endDate.value)
  const qs = new URLSearchParams({
    $limit: hasDateFilter ? '1000' : '200',
    $order: hasDateFilter ? 'startdatetime ASC' : 'enteredon DESC'
  })
  if (where.length) qs.set('$where', where.join(' AND '))
  return qs.toString()
})

const { data, pending, error, refresh } = await useFetch<Permit[]>(
  () => `https://data.cityofnewyork.us/resource/tg4x-b46p.json?${params.value}`,
  { server: false, default: () => [] }
)

// Detect newly-arrived permits between refreshes
watch(
  data,
  (next, prev) => {
    if (!next) return
    const justArrived: string[] = []
    if (seenIds.value.size === 0) {
      // First load — seed the set, don't flash everything as "new"
      for (const p of next) seenIds.value.add(p.eventid)
    } else {
      for (const p of next) {
        if (!seenIds.value.has(p.eventid)) {
          seenIds.value.add(p.eventid)
          justArrived.push(p.eventid)
        }
      }
    }
    lastFetchedAt.value = Date.now()
    if (justArrived.length) {
      newCount.value = justArrived.length
      for (const id of justArrived) recentlyAddedIds.value.add(id)
      // Clear the flash after a bit
      setTimeout(() => {
        for (const id of justArrived) recentlyAddedIds.value.delete(id)
      }, 12_000)
      toast.add({
        title: `${justArrived.length} new permit${justArrived.length === 1 ? '' : 's'}`,
        description: 'Updated from NYC Open Data',
        icon: 'i-lucide-radio',
        color: 'primary'
      })
      // Reset the new-badge after a short window
      setTimeout(() => (newCount.value = 0), 8_000)
    }
  },
  { deep: false }
)

// Reset the seen-set when filters change so we don't flash old rows that just re-entered the page
watch([search, borough, category, startDate, endDate], () => {
  seenIds.value.clear()
  recentlyAddedIds.value.clear()
  newCount.value = 0
  refresh()
})

// Polling: only while the tab is visible
let pollHandle: number | null = null
const startPolling = () => {
  if (pollHandle != null) return
  pollHandle = window.setInterval(() => {
    if (!pending.value) refresh()
  }, POLL_MS)
}
const stopPolling = () => {
  if (pollHandle != null) {
    window.clearInterval(pollHandle)
    pollHandle = null
  }
}
const onVis = () => {
  isVisible.value = document.visibilityState === 'visible'
  if (isVisible.value) {
    startPolling()
    refresh() // immediate catch-up on tab focus
  } else {
    stopPolling()
  }
}

// Clock for "updated Xs ago"
let clockHandle: number | null = null

onMounted(() => {
  document.addEventListener('visibilitychange', onVis)
  startPolling()
  clockHandle = window.setInterval(() => (now.value = Date.now()), 1000)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVis)
  stopPolling()
  if (clockHandle != null) window.clearInterval(clockHandle)
})

const updatedAgo = computed(() => {
  if (!lastFetchedAt.value) return ''
  const s = Math.max(0, Math.round((now.value - lastFetchedAt.value) / 1000))
  if (s < 60) return `Updated ${s}s ago`
  const m = Math.floor(s / 60)
  return `Updated ${m}m ago`
})

const formatDate = (s: string) =>
  s ? new Date(s).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : ''

const boroughColor = (
  b: string
): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    Manhattan: 'primary',
    Brooklyn: 'success',
    Queens: 'warning',
    Bronx: 'error',
    'Staten Island': 'info'
  }
  return map[b] ?? 'neutral'
}

const sortHeader = (label: string) => ({ column }: any) => {
  const sorted = column.getIsSorted()
  const icon =
    sorted === 'asc'
      ? 'i-lucide-arrow-up'
      : sorted === 'desc'
        ? 'i-lucide-arrow-down'
        : 'i-lucide-arrow-up-down'
  return h(
    UButton,
    {
      color: 'neutral',
      variant: 'ghost',
      size: 'xs',
      label,
      icon,
      trailing: true,
      class: '-mx-2',
      onClick: () => column.toggleSorting(sorted === 'asc')
    }
  )
}

const columns: TableColumn<Permit>[] = [
  {
    accessorKey: 'eventid',
    header: sortHeader('ID'),
    cell: ({ row }: any) => {
      const isNew = recentlyAddedIds.value.has(row.original.eventid)
      return h('span', { class: 'inline-flex items-center gap-2' }, [
        h('span', { class: 'font-mono text-xs opacity-60' }, row.original.eventid),
        isNew
          ? h(
              'span',
              {
                class:
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary/15 text-primary border border-primary/30'
              },
              'New'
            )
          : null
      ])
    }
  },
  {
    accessorKey: 'category',
    header: sortHeader('Category'),
    cell: ({ row }: any) =>
      h(UBadge, { variant: 'subtle', color: 'neutral' }, () => row.original.category || '—')
  },
  {
    accessorKey: 'subcategoryname',
    header: sortHeader('Subcategory'),
    cell: ({ row }: any) => h('span', {}, row.original.subcategoryname || '—')
  },
  {
    id: 'production',
    accessorFn: (row: Permit) => guessProduction(row)?.title ?? '',
    header: sortHeader('Production'),
    cell: ({ row }: any) => {
      const guess = guessProduction(row.original)
      if (!guess) return h('span', { class: 'text-muted' }, '—')
      const color =
        guess.confidence === 'high'
          ? 'success'
          : guess.confidence === 'medium'
            ? 'warning'
            : 'neutral'
      const title = guess.alternates.length
        ? `Best guess. Also possible: ${guess.alternates.join(', ')}`
        : `Best guess (${guess.confidence} confidence)`
      return h('div', { class: 'flex items-center gap-2', title }, [
        h('span', { class: 'truncate max-w-[200px]' }, guess.title),
        h(
          UBadge,
          { variant: 'subtle', color, size: 'xs' },
          () => guess.confidence
        )
      ])
    }
  },
  {
    accessorKey: 'borough',
    header: sortHeader('Borough'),
    cell: ({ row }: any) =>
      h(
        UBadge,
        { variant: 'soft', color: boroughColor(row.original.borough) },
        () => row.original.borough
      )
  },
  {
    accessorKey: 'parkingheld',
    header: sortHeader('Location'),
    cell: ({ row }: any) => {
      const raw = row.original.parkingheld || ''
      const address = formatAddress(raw)
      const query = encodeURIComponent(
        [address || raw, row.original.borough, 'New York, NY'].filter(Boolean).join(', ')
      )
      const href = `https://www.google.com/maps/search/?api=1&query=${query}`
      return h('div', { class: 'flex items-center gap-2 max-w-md' }, [
        h('span', { class: 'truncate', title: raw }, address || '—'),
        h(
          'a',
          {
            href,
            target: '_blank',
            rel: 'noopener noreferrer',
            title: 'Open in Google Maps',
            'aria-label': 'Open in Google Maps',
            class:
              'shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-muted hover:text-primary hover:bg-primary/10 transition-colors',
            onClick: (e: MouseEvent) => e.stopPropagation()
          },
          [
            h(resolveComponent('UIcon'), {
              name: 'i-lucide-external-link',
              class: 'w-3.5 h-3.5'
            })
          ]
        )
      ])
    }
  },
  {
    accessorKey: 'enteredon',
    header: sortHeader('Entered'),
    cell: ({ row }: any) =>
      h(
        'span',
        { class: 'text-sm whitespace-nowrap text-muted' },
        formatDate(row.original.enteredon)
      )
  },
  {
    accessorKey: 'startdatetime',
    header: sortHeader('Start'),
    cell: ({ row }: any) =>
      h('span', { class: 'text-sm whitespace-nowrap' }, formatDate(row.original.startdatetime))
  },
  {
    accessorKey: 'enddatetime',
    header: sortHeader('End'),
    cell: ({ row }: any) =>
      h('span', { class: 'text-sm whitespace-nowrap' }, formatDate(row.original.enddatetime))
  }
]

const onRowSelect = (_event: Event, row: any) => {
  selected.value = row.original
}

const rowClass = (row: any) =>
  recentlyAddedIds.value.has(row.original.eventid)
    ? 'bg-primary/5 ring-1 ring-inset ring-primary/30 transition-colors duration-700'
    : ''

// Resizable split between map and table
const mapHeight = ref(360)
const isDragging = ref(false)
const MIN_MAP = 160
const MIN_TABLE_AREA = 240

const onResizeStart = (e: PointerEvent) => {
  e.preventDefault()
  isDragging.value = true
  const target = e.target as HTMLElement
  target.setPointerCapture(e.pointerId)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}
const onResizeMove = (e: PointerEvent) => {
  if (!isDragging.value) return
  const headerOffset = 65 // approx header height
  const next = e.clientY - headerOffset
  const max = window.innerHeight - headerOffset - MIN_TABLE_AREA
  mapHeight.value = Math.max(MIN_MAP, Math.min(max, next))
}
const onResizeEnd = (e: PointerEvent) => {
  if (!isDragging.value) return
  isDragging.value = false
  const target = e.target as HTMLElement
  if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  mapHeight.value = Math.max(MIN_MAP, Math.round(window.innerHeight * 0.4))
})
</script>

<template>
  <div class="flex flex-col h-screen">
    <header class="border-b border-default px-6 py-4 flex items-center gap-3">
      <UIcon name="i-lucide-film" class="text-2xl text-primary" />
      <div>
        <h1 class="text-xl font-bold">NYC Film Permits</h1>
        <p class="text-sm text-muted">
          Live data from NYC Open Data — click a row to view the location on the map
        </p>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span class="relative flex h-2 w-2">
            <span
              v-if="isVisible"
              class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              :class="pending ? 'bg-warning' : 'bg-success'"
            />
            <span
              class="relative inline-flex rounded-full h-2 w-2"
              :class="isVisible ? (pending ? 'bg-warning' : 'bg-success') : 'bg-neutral-400'"
            />
          </span>
          <span>{{ isVisible ? (pending ? 'Refreshing…' : 'Live') : 'Paused' }}</span>
          <span v-if="updatedAgo" class="opacity-60">· {{ updatedAgo }}</span>
        </div>
        <UBadge v-if="newCount" variant="solid" color="primary">
          +{{ newCount }} new
        </UBadge>
        <UBadge variant="soft" color="neutral">
          {{ data?.length ?? 0 }} permits
        </UBadge>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          :loading="pending"
          @click="refresh()"
        />
      </div>
    </header>

    <div
      class="border-b border-default relative shrink-0"
      :style="{ height: mapHeight + 'px' }"
    >
      <FilmMap
        :selected="selected"
        :permits="data ?? []"
        @select="(p: Permit) => (selected = p)"
      />
    </div>

    <div
      class="h-1.5 cursor-row-resize bg-default hover:bg-primary/40 transition-colors relative group shrink-0"
      :class="{ 'bg-primary/50': isDragging }"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize map and table"
      @pointerdown="onResizeStart"
      @pointermove="onResizeMove"
      @pointerup="onResizeEnd"
      @pointercancel="onResizeEnd"
    >
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 rounded-full bg-muted/40 group-hover:bg-primary/60 transition-colors"
        :class="{ 'bg-primary': isDragging }"
      />
    </div>

    <div class="px-6 py-3 flex flex-wrap gap-3 items-center border-b border-default shrink-0">
      <UInput
        v-model="search"
        placeholder="Search location…"
        icon="i-lucide-search"
        class="flex-1 min-w-[220px] max-w-md"
      />
      <USelect v-model="borough" :items="boroughs" placeholder="All boroughs" class="w-44" />
      <USelect v-model="category" :items="categories" placeholder="All categories" class="w-48" />
      <div class="flex items-center gap-2">
        <UInput v-model="startDate" type="date" class="w-40" :ui="{ base: 'cursor-pointer' }" />
        <span class="text-xs text-muted">to</span>
        <UInput v-model="endDate" type="date" class="w-40" :ui="{ base: 'cursor-pointer' }" />
      </div>
      <UButton
        v-if="borough || category || search || startDate || endDate"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        @click="() => { borough = undefined; category = undefined; search = ''; startDate = ''; endDate = '' }"
      >
        Clear
      </UButton>
    </div>

    <div class="flex-1 overflow-auto">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        title="Failed to load permits"
        :description="String(error)"
        class="m-4"
      />
      <UTable
        v-else
        v-model:sorting="sorting"
        :data="data ?? []"
        :columns="columns"
        :loading="pending"
        :on-select="onRowSelect"
        :ui="{ tr: rowClass }"
        sticky
      >
        <template #empty>
          <div class="text-center py-8 text-muted">No permits found</div>
        </template>
      </UTable>
    </div>
  </div>
</template>
