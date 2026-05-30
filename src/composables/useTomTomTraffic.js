import { ref } from 'vue'
import { fetchMultipleSegments } from '../assets/js/trafficFlow.js'

export const MEDELLIN_BBOX = {
  minLon: -75.62,
  minLat: 6.18,
  maxLon: -75.53,
  maxLat: 6.32,
}

export const DEFAULT_INCIDENT_FIELDS = '{incidents{type,geometry{type,coordinates},properties{iconCategory}}}'

export function getIncidentColor(category = '') {
  const normalized = String(category).toLowerCase()
  if (normalized.includes('accident')) return '#dc2626'
  if (normalized.includes('road') || normalized.includes('closure')) return '#f97316'
  if (normalized.includes('construction')) return '#eab308'
  return '#7c3aed'
}

export function getIncidentLabel(incident) {
  return incident?.properties?.iconCategory || incident?.type || 'Incidente'
}

export function normalizeIncidentGeometry(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) return null

  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates
    return [[lat, lon]]
  }

  if (geometry.type === 'LineString') {
    return geometry.coordinates.map(([lon, lat]) => [lat, lon])
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.flatMap((line) => line.map(([lon, lat]) => [lat, lon]))
  }

  return null
}

export function useTomTomTraffic() {
  const trafficSegments = ref([])
  const trafficIncidents = ref([])
  const trafficLoading = ref(false)
  const incidentsLoading = ref(false)
  const trafficError = ref('')
  const incidentsError = ref('')
  const lastTrafficUpdate = ref(null)
  const lastIncidentsUpdate = ref(null)

  async function loadTrafficSegments(points, apiKey, concurrency = 5) {
    trafficLoading.value = true
    trafficError.value = ''

    try {
      const results = await fetchMultipleSegments(points, apiKey, concurrency)
      trafficSegments.value = results
        .filter(Boolean)
        .map((segment) => ({
          ...segment,
          congestionPct: Math.round((1 - segment.ratio) * 100),
        }))
        .sort((a, b) => b.congestionPct - a.congestionPct)
      lastTrafficUpdate.value = new Date()
      return trafficSegments.value
    } catch (error) {
      trafficError.value = 'No fue posible cargar TomTom Traffic.'
      trafficSegments.value = []
      throw error
    } finally {
      trafficLoading.value = false
    }
  }

  async function loadTrafficIncidents(apiKey, bbox = MEDELLIN_BBOX, options = {}) {
    incidentsLoading.value = true
    incidentsError.value = ''

    const categoryFilter = options.categoryFilter || 'Accident'
    const timeValidityFilter = options.timeValidityFilter || 'present'
    const language = options.language || 'es-CO'
    const t = options.t || Date.now()
    const fields = options.fields || DEFAULT_INCIDENT_FIELDS

    try {
      const url = new URL('https://api.tomtom.com/traffic/services/5/incidentDetails')
      url.searchParams.set('key', apiKey)
      url.searchParams.set('bbox', `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
      url.searchParams.set('fields', fields)
      url.searchParams.set('language', language)
      url.searchParams.set('t', String(t))
      url.searchParams.set('categoryFilter', categoryFilter)
      url.searchParams.set('timeValidityFilter', timeValidityFilter)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`TomTom incidents HTTP ${response.status}`)
      }

      const payload = await response.json()
      const incidents = Array.isArray(payload?.incidents) ? payload.incidents : []
      trafficIncidents.value = incidents
      lastIncidentsUpdate.value = new Date()
      return incidents
    } catch (error) {
      incidentsError.value = 'No fue posible cargar incidentes TomTom.'
      trafficIncidents.value = []
      throw error
    } finally {
      incidentsLoading.value = false
    }
  }

  return {
    trafficSegments,
    trafficIncidents,
    trafficLoading,
    incidentsLoading,
    trafficError,
    incidentsError,
    lastTrafficUpdate,
    lastIncidentsUpdate,
    loadTrafficSegments,
    loadTrafficIncidents,
  }
}
