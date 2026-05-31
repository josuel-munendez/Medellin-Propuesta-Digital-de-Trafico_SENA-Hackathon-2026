<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as L from 'leaflet'
import 'leaflet.heat'
import {
  buildHeatPoints,
  loadStoredAccidents,
  normalizeIncident,
  persistStoredAccidents,
  severityColor,
  severityLabel,
} from '../composables/useAccidentReports'
import { fetchAccidents, createAdminAccident } from '../services/api.js'

const TOKEN_KEY = 'movilidata-auth-token'

const mapContainer = ref(null)
const mapReady = ref(false)
const loading = ref(true)
const incidents = ref([])
const filterSeverity = ref('all')
const lastSaved = ref(null)
const apiConnected = ref(false)
const apiError = ref('')

const form = reactive({
  lat: '6.2518',
  lng: '-75.5636',
  severity: 'medium',
  type: 'Colisión leve',
  status: 'reportado',
  description: '',
})

let map = null
let heatLayer = null
let markersLayer = null

const visibleIncidents = computed(() => {
  if (filterSeverity.value === 'all') return incidents.value
  return incidents.value.filter((item) => item.severity === filterSeverity.value)
})

const totalIncidents = computed(() => incidents.value.length)
const criticalIncidents = computed(() => incidents.value.filter((item) => item.severity === 'critical' || item.severity === 'high').length)
const activeReports = computed(() => incidents.value.filter((item) => item.status !== 'resuelto').length)

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function createMarker(incident) {
  return L.circleMarker([incident.lat, incident.lng], {
    radius: incident.severity === 'critical' ? 11 : incident.severity === 'high' ? 9 : 7,
    color: '#ffffff',
    weight: 2,
    fillColor: severityColor(incident.severity),
    fillOpacity: 0.9,
  }).bindPopup(`
    <div style="font-family:'Inter',sans-serif;min-width:190px">
      <strong style="display:block;margin-bottom:4px">${incident.type}</strong>
      <div style="font-size:12px;color:#64748b;margin-bottom:4px">
        Severidad: <strong>${severityLabel(incident.severity)}</strong>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:4px">
        Estado: <strong>${incident.status}</strong>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:4px">
        Coordenadas: <code>${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}</code>
      </div>
      <div style="font-size:12px;color:#64748b">${incident.description}</div>
    </div>
  `)
}

function renderMapLayers() {
  if (!map) return

  if (heatLayer) {
    map.removeLayer(heatLayer)
  }
  if (markersLayer) {
    map.removeLayer(markersLayer)
  }

  const heatPoints = buildHeatPoints(visibleIncidents.value)
  heatLayer = L.heatLayer(heatPoints, {
    radius: 24,
    blur: 18,
    maxZoom: 15,
    minOpacity: 0.35,
    gradient: {
      0.2: '#16a34a',
      0.45: '#eab308',
      0.7: '#f97316',
      1.0: '#dc2626',
    },
  })

  markersLayer = L.layerGroup(
    visibleIncidents.value.map((incident) => createMarker(incident))
  )

  heatLayer.addTo(map)
  markersLayer.addTo(map)
}

async function loadIncidents() {
  loading.value = true
  apiError.value = ''

  try {
    // Intentar cargar desde Django API primero
    const apiAccidents = await fetchAccidents()
    apiConnected.value = true

    const normalizedApi = Array.isArray(apiAccidents)
      ? apiAccidents.map((item) => normalizeIncident({
          ...item,
          severity: item.intensity >= 8 ? 'critical' : item.intensity >= 6 ? 'high' : item.intensity >= 4 ? 'medium' : 'low',
          type: 'Accidente vial',
          status: 'reportado',
          description: `Intensidad ${item.intensity}/10 a las ${String(item.hour).padStart(2, '0')}:00`,
        }, 'api'))
      : []

    // Combinar con reportes locales del usuario
    const storedAccidents = loadStoredAccidents()
    incidents.value = [...normalizedApi, ...storedAccidents]
    lastSaved.value = storedAccidents.length ? new Date().toISOString() : null

    renderMapLayers()
  } catch (err) {
    // Fallback: cargar desde JSON estático si la API no está disponible
    apiConnected.value = false
    apiError.value = 'Django API no disponible — usando datos estáticos locales.'
    console.warn('[AccidentReporter] API fallback:', err.message)

    try {
      const baseResponse = await fetch('/assets/data/accidents.json')
      const baseAccidents = await baseResponse.json()
      const normalizedBase = Array.isArray(baseAccidents)
        ? baseAccidents.map((item) => normalizeIncident(item, 'dataset'))
        : []
      const storedAccidents = loadStoredAccidents()

      incidents.value = [...normalizedBase, ...storedAccidents]
      lastSaved.value = storedAccidents.length ? new Date().toISOString() : null

      renderMapLayers()
    } catch (fallbackError) {
      console.error('Error al cargar reportes de accidentes:', fallbackError)
    }
  } finally {
    loading.value = false
  }
}

function initMap() {
  map = L.map(mapContainer.value).setView([6.25184, -75.56359], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  mapReady.value = true
}

function resetForm() {
  form.lat = '6.2518'
  form.lng = '-75.5636'
  form.severity = 'medium'
  form.type = 'Colisión leve'
  form.status = 'reportado'
  form.description = ''
}

async function handleSubmit() {
  const lat = Number(form.lat)
  const lng = Number(form.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

  const intensity = form.severity === 'critical' ? 10 : form.severity === 'high' ? 7 : form.severity === 'medium' ? 5 : 2

  const incident = normalizeIncident(
    {
      lat,
      lng,
      severity: form.severity,
      type: form.type,
      status: form.status,
      description: form.description.trim() || 'Reporte generado desde la plataforma.',
      intensity,
      hour: new Date().getHours(),
      reportedAt: new Date().toISOString(),
    },
    'user'
  )

  // Intentar guardar en Django si hay token de admin
  const token = localStorage.getItem(TOKEN_KEY)
  if (token && apiConnected.value) {
    try {
      await createAdminAccident(token, {
        lat,
        lng,
        intensity,
        hour: new Date().getHours(),
      })
    } catch (err) {
      console.warn('[AccidentReporter] No se pudo guardar en Django:', err.message)
    }
  }

  incidents.value = [incident, ...incidents.value]
  persistStoredAccidents(incidents.value.filter((item) => item.source !== 'dataset' && item.source !== 'api'))
  renderMapLayers()
  lastSaved.value = new Date().toISOString()
  resetForm()
}

onMounted(async () => {
  initMap()
  await loadIncidents()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
  heatLayer = null
  markersLayer = null
})
</script>

<template>
  <div class="animate-fade-in">
    <div class="row mb-4 align-items-center">
      <div class="col-lg-8">
        <h1 class="h3 fw-bold text-dark mb-1">Reporte de Accidentes</h1>
        <p class="text-muted mb-0">
          Fusiona datos históricos, reportes locales y visualización en mapa para apoyar la gestión de incidentes viales.
        </p>
      </div>
      <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
        <span class="badge px-3 py-2 rounded-pill shadow-sm"
          :class="apiConnected ? 'bg-success' : 'bg-warning text-dark'">
          <span v-if="apiConnected" class="spinner-grow spinner-grow-sm me-1" style="animation-duration:1.5s;"></span>
          {{ apiConnected ? 'Conectado a Django API' : 'Modo offline (datos estáticos)' }}
        </span>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-6 col-xl-3">
        <div class="stat-card card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="stat-value text-dark">{{ totalIncidents }}</div>
            <div class="stat-label text-muted">Eventos en base</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-card card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="stat-value text-danger">{{ criticalIncidents }}</div>
            <div class="stat-label text-muted">Casos altos/críticos</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-card card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="stat-value text-warning">{{ activeReports }}</div>
            <div class="stat-label text-muted">Reportes abiertos</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-card card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="stat-value text-primary">{{ apiConnected ? 'API' : 'Local' }}</div>
            <div class="stat-label text-muted">Fuente de datos</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h5 class="fw-bold mb-1">Mapa de siniestralidad y reportes</h5>
                <p class="text-muted small mb-0">Heatmap + marcadores por severidad usando la base local del proyecto.</p>
              </div>
              <div class="d-flex align-items-center gap-2">
                <select v-model="filterSeverity" class="form-select form-select-sm" style="min-width: 160px" @change="renderMapLayers">
                  <option value="all">Todas las severidades</option>
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Medio</option>
                  <option value="low">Bajo</option>
                </select>
              </div>
            </div>
            <div ref="mapContainer" class="incident-map rounded-4 border"></div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body p-3 p-md-4">
            <h5 class="fw-bold mb-3">Nuevo reporte</h5>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-6">
                <label class="form-label small fw-semibold">Latitud</label>
                <input v-model="form.lat" type="text" class="form-control" placeholder="6.2518" />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Longitud</label>
                <input v-model="form.lng" type="text" class="form-control" placeholder="-75.5636" />
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">Tipo</label>
                <input v-model="form.type" type="text" class="form-control" placeholder="Colisión, caída, bloqueo..." />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Severidad</label>
                <select v-model="form.severity" class="form-select">
                  <option value="low">Bajo</option>
                  <option value="medium">Medio</option>
                  <option value="high">Alto</option>
                  <option value="critical">Crítico</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Estado</label>
                <select v-model="form.status" class="form-select">
                  <option value="reportado">Reportado</option>
                  <option value="en_revision">En revisión</option>
                  <option value="resuelto">Resuelto</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold">Descripción</label>
                <textarea v-model="form.description" class="form-control" rows="3" placeholder="Detalle del incidente, sentido de la vía, observaciones..."></textarea>
              </div>
              <div class="col-12 d-grid">
                <button class="btn btn-danger rounded-pill" type="submit">Registrar reporte</button>
              </div>
            </form>
            <div class="small text-muted mt-3">
              Última sincronización:
              <strong>{{ lastSaved ? formatDate(lastSaved) : 'sin datos locales' }}</strong>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-3 p-md-4">
            <h5 class="fw-bold mb-3">Incidentes visibles</h5>
            <div v-if="loading" class="text-muted small">Cargando datos...</div>
            <div v-else class="incident-list">
              <article v-for="incident in visibleIncidents.slice(0, 8)" :key="incident.id" class="incident-item">
                <div class="d-flex align-items-start gap-3">
                  <span class="incident-dot" :style="{ background: severityColor(incident.severity) }"></span>
                  <div class="flex-grow-1">
                    <div class="d-flex justify-content-between gap-2">
                      <h6 class="mb-1 fw-semibold">{{ incident.type }}</h6>
                      <span class="badge rounded-pill" :style="{ background: severityColor(incident.severity) }">{{ severityLabel(incident.severity) }}</span>
                    </div>
                    <div class="text-muted small mb-1">{{ incident.description }}</div>
                    <div class="text-muted x-small">
                      {{ incident.lat.toFixed(4) }}, {{ incident.lng.toFixed(4) }} · {{ formatDate(incident.reportedAt) }}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.incident-map {
  min-height: 520px;
  z-index: 1;
}

.stat-card {
  border-radius: 18px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  margin-top: 0.35rem;
}

.incident-list {
  display: grid;
  gap: 0.85rem;
}

.incident-item {
  padding: 0.85rem;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.incident-dot {
  width: 14px;
  height: 14px;
  margin-top: 0.35rem;
  border-radius: 999px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.9);
}

.x-small {
  font-size: 0.72rem;
}

@media (max-width: 768px) {
  .incident-map {
    min-height: 360px;
  }
}
</style>
