const STORAGE_KEY = 'movilidata-accident-reports'

export function severityLabel(severity) {
  switch (severity) {
    case 'critical':
      return 'Crítico'
    case 'high':
      return 'Alto'
    case 'medium':
      return 'Medio'
    default:
      return 'Bajo'
  }
}

export function severityColor(severity) {
  switch (severity) {
    case 'critical':
      return '#dc2626'
    case 'high':
      return '#f97316'
    case 'medium':
      return '#eab308'
    default:
      return '#16a34a'
  }
}

export function normalizeIncident(raw, source = 'stored') {
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)

  return {
    id: raw.id ?? `${source}-${Math.random().toString(36).slice(2, 9)}`,
    lat,
    lng,
    hour: Number.isFinite(Number(raw.hour)) ? Number(raw.hour) : new Date().getHours(),
    intensity: Number.isFinite(Number(raw.intensity)) ? Number(raw.intensity) : 0.6,
    severity: raw.severity ?? 'medium',
    type: raw.type ?? 'Accidente vial',
    status: raw.status ?? 'reportado',
    description: raw.description ?? 'Sin descripción adicional',
    reportedAt: raw.reportedAt ?? new Date().toISOString(),
    source,
  }
}

export function buildHeatPoints(incidents) {
  return incidents
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map((item) => [item.lat, item.lng, item.intensity ?? 0.6])
}

export function loadStoredAccidents() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => normalizeIncident(item, 'local')) : []
  } catch {
    return []
  }
}

export function persistStoredAccidents(incidents) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents))
}
