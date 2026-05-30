<script setup>
import { onBeforeUnmount, onMounted, ref, reactive } from 'vue'
import L from 'leaflet'
import { fetchMultipleSegments, getTrafficColor } from '../assets/js/trafficFlow.js'

// ─── Estado de la UI ──────────────────────────────────────────────────────────
const mapContainer = ref(null)
const gpsActive = ref(false)
const gpsStatus = ref('idle')   // 'idle' | 'searching' | 'active' | 'denied' | 'unsupported'
const gpsAccuracy = ref(null)
const connectedUnits = ref(0)

// ─── Mapa y recursos de Leaflet ───────────────────────────────────────────────
let map = null
let ownMarker = null
let watchId = null
const vehicleMarkers = {}

// ─── Rutas simuladas de vehículos en Medellín ────────────────────────────────
// Coordenadas reales de vías principales: El Poblado, Centro, Laureles, Robledo, Bello.
const VEHICLE_ROUTES = [
  {
    id: 'MIO-001',
    label: 'Bus MIO Línea 1',
    color: '#dc3545',
    icon: '🚌',
    coords: [
      [6.2476, -75.5658], [6.2512, -75.5680], [6.2548, -75.5702],
      [6.2590, -75.5721], [6.2627, -75.5737], [6.2665, -75.5750],
      [6.2698, -75.5760], [6.2730, -75.5768], [6.2760, -75.5776],
    ],
  },
  {
    id: 'METRO-002',
    label: 'Metro Línea A',
    color: '#0d6efd',
    icon: '🚇',
    coords: [
      [6.2087, -75.5717], [6.2140, -75.5700], [6.2192, -75.5682],
      [6.2246, -75.5665], [6.2300, -75.5647], [6.2354, -75.5630],
      [6.2404, -75.5612], [6.2454, -75.5594], [6.2500, -75.5577],
    ],
  },
  {
    id: 'TAXI-003',
    label: 'Taxi Zona Rosa',
    color: '#fd7e14',
    icon: '🚕',
    coords: [
      [6.2100, -75.5720], [6.2115, -75.5698], [6.2135, -75.5675],
      [6.2155, -75.5658], [6.2175, -75.5638], [6.2190, -75.5620],
      [6.2205, -75.5602], [6.2220, -75.5585], [6.2235, -75.5567],
    ],
  },
  {
    id: 'MOTO-004',
    label: 'Mensajería Laureles',
    color: '#198754',
    icon: '🛵',
    coords: [
      [6.2440, -75.5900], [6.2455, -75.5878], [6.2470, -75.5855],
      [6.2485, -75.5833], [6.2498, -75.5810], [6.2510, -75.5787],
      [6.2523, -75.5765], [6.2535, -75.5742], [6.2548, -75.5720],
    ],
  },
  {
    id: 'CAM-005',
    label: 'Camión Robledo',
    color: '#6f42c1',
    icon: '🚛',
    coords: [
      [6.2832, -75.5671], [6.2815, -75.5690], [6.2798, -75.5710],
      [6.2781, -75.5730], [6.2764, -75.5750], [6.2747, -75.5768],
      [6.2730, -75.5786], [6.2713, -75.5804], [6.2696, -75.5820],
    ],
  },
]

// Índice actual en la ruta para cada vehículo
const vehicleRouteIndex = {}
let vehicleSimInterval = null

// ─── Estado de la capa de tráfico en tiempo real ──────────────────────────────
const trafficLayerVisible = ref(true)
const trafficSegments = ref([])
let trafficLayerGroup = null
const trafficLoading = ref(false)
const lastTrafficUpdate = ref(null)
let trafficRefreshInterval = null

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createVehicleIcon(color, emoji) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color};
        border:2px solid white;
        border-radius:50%;
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: all 0.4s ease;
      ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function createOwnIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;top:0;left:0;
          width:24px;height:24px;
          border-radius:50%;
          background:rgba(13,110,253,0.25);
          animation: gps-pulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;top:4px;left:4px;
          width:16px;height:16px;
          border-radius:50%;
          background:#0d6efd;
          border:2px solid white;
          box-shadow:0 2px 6px rgba(13,110,253,0.5);
        "></div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// ─── Inicialización del Mapa ──────────────────────────────────────────────────
function initMap() {
  map = L.map(mapContainer.value, { zoomControl: true }).setView([6.2518, -75.5636], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // Líneas de rutas (trazado estático de referencia inspirado en TrafficVisualization)
  VEHICLE_ROUTES.forEach((route) => {
    L.polyline(route.coords, {
      color: route.color,
      weight: 3,
      opacity: 0.3,
      dashArray: '6, 6',
    })
      .addTo(map)
      .bindTooltip(route.label, { sticky: true })

    vehicleRouteIndex[route.id] = 0
  })
}

// ─── Simulación de vehículos (adaptado de Realtime_Tracker) ──────────────────
function startVehicleSimulation() {
  VEHICLE_ROUTES.forEach((route) => {
    const idx = vehicleRouteIndex[route.id]
    const [lat, lng] = route.coords[idx]

    const marker = L.marker([lat, lng], {
      icon: createVehicleIcon(route.color, route.icon),
      title: route.label,
    })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:160px">
          <strong style="display:block;margin-bottom:4px">${route.icon} ${route.label}</strong>
          <span style="font-size:12px;color:#64748b">ID: <code>${route.id}</code></span><br/>
          <span style="font-size:12px;color:#64748b">En ruta activa</span>
        </div>
      `)

    vehicleMarkers[route.id] = marker
  })

  connectedUnits.value = VEHICLE_ROUTES.length

  // Actualizar posición de cada vehículo a lo largo de su ruta (cada 1.8 s)
  vehicleSimInterval = setInterval(() => {
    VEHICLE_ROUTES.forEach((route) => {
      const maxIdx = route.coords.length - 1
      vehicleRouteIndex[route.id] = (vehicleRouteIndex[route.id] + 1) % (maxIdx + 1)
      const idx = vehicleRouteIndex[route.id]
      const [lat, lng] = route.coords[idx]
      vehicleMarkers[route.id]?.setLatLng([lat, lng])
    })
  }, 1800)
}

function stopVehicleSimulation() {
  if (vehicleSimInterval) {
    clearInterval(vehicleSimInterval)
    vehicleSimInterval = null
  }
  Object.values(vehicleMarkers).forEach((m) => map?.removeLayer(m))
  Object.keys(vehicleMarkers).forEach((k) => delete vehicleMarkers[k])
  connectedUnits.value = 0
}

// ─── Rastreo GPS propio (Realtime_Tracker lógica cliente) ────────────────────
function startGPS() {
  if (!navigator.geolocation) {
    gpsStatus.value = 'unsupported'
    return
  }

  gpsStatus.value = 'searching'

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords
      gpsAccuracy.value = Math.round(accuracy)
      gpsStatus.value = 'active'
      gpsActive.value = true

      if (!ownMarker) {
        ownMarker = L.marker([latitude, longitude], { icon: createOwnIcon() })
          .addTo(map)
          .bindPopup('<strong>📍 Tu ubicación actual</strong><br/><small>GPS activo en este dispositivo</small>')
        map.setView([latitude, longitude], 15)
      } else {
        ownMarker.setLatLng([latitude, longitude])
      }
    },
    (error) => {
      gpsStatus.value = error.code === 1 ? 'denied' : 'idle'
      gpsActive.value = false
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

function stopGPS() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  if (ownMarker) {
    map?.removeLayer(ownMarker)
    ownMarker = null
  }
  gpsActive.value = false
  gpsStatus.value = 'idle'
  gpsAccuracy.value = null
}

function toggleGPS() {
  if (gpsActive.value || gpsStatus.value === 'searching') {
    stopGPS()
  } else {
    startGPS()
  }
}

// ─── Capa de Tráfico en Tiempo Real ──────────────────────────────────────────
async function loadTrafficData() {
  trafficLoading.value = true
  try {
    const roadsRes = await fetch('/assets/data/medellin-roads.json')
    const roads = await roadsRes.json()

    const apiKey = import.meta.env.VITE_TOMTOM_API_KEY
    if (!apiKey) {
      console.warn('[RealtimeTracker] VITE_TOMTOM_API_KEY no configurada — capa de tráfico deshabilitada')
      trafficLoading.value = false
      return
    }

    const results = await fetchMultipleSegments(roads, apiKey)
    trafficSegments.value = results.filter(Boolean)

    // Limpiar capa anterior
    if (trafficLayerGroup) {
      map?.removeLayer(trafficLayerGroup)
    }

    trafficLayerGroup = L.layerGroup()

    trafficSegments.value.forEach((segment) => {
      if (!segment || !segment.coordinates || segment.coordinates.length < 2) return

      const polyline = L.polyline(segment.coordinates, {
        color: segment.color,
        weight: 5,
        opacity: 0.8,
      })

      const congestionPct = Math.round((1 - segment.ratio) * 100)
      polyline.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:180px">
          <strong style="display:block;margin-bottom:4px">🛣️ ${segment.name || 'Vía sin nombre'}</strong>
          <span style="font-size:12px;color:#64748b">Velocidad actual: <strong>${segment.currentSpeed} km/h</strong></span><br/>
          <span style="font-size:12px;color:#64748b">Velocidad libre: <strong>${segment.freeFlowSpeed} km/h</strong></span><br/>
          <span style="font-size:12px;color:#64748b">Congestión: <strong>${congestionPct}%</strong></span>
        </div>
      `)

      trafficLayerGroup.addLayer(polyline)
    })

    if (trafficLayerVisible.value && map) {
      trafficLayerGroup.addTo(map)
    }

    const now = new Date()
    lastTrafficUpdate.value = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (err) {
    console.warn('[RealtimeTracker] Error cargando datos de tráfico:', err)
  } finally {
    trafficLoading.value = false
  }
}

function toggleTrafficLayer() {
  trafficLayerVisible.value = !trafficLayerVisible.value
  if (trafficLayerVisible.value && trafficLayerGroup && map) {
    trafficLayerGroup.addTo(map)
  } else if (!trafficLayerVisible.value && trafficLayerGroup && map) {
    map.removeLayer(trafficLayerGroup)
  }
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────
onMounted(() => {
  initMap()
  startVehicleSimulation()
  loadTrafficData()
  trafficRefreshInterval = setInterval(loadTrafficData, 120000)
})

onBeforeUnmount(() => {
  if (trafficRefreshInterval) {
    clearInterval(trafficRefreshInterval)
    trafficRefreshInterval = null
  }
  stopGPS()
  stopVehicleSimulation()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="animate-fade-in">

    <!-- Encabezado -->
    <div class="row mb-4 align-items-center">
      <div class="col-md-8">
        <h1 class="h3 fw-bold text-dark mb-1">Rastreo en Tiempo Real</h1>
        <p class="text-muted mb-0">Visualización en vivo de unidades de tránsito y seguimiento GPS de tu dispositivo en Medellín.</p>
      </div>
      <div class="col-md-4 text-md-end mt-3 mt-md-0">
        <span class="badge rounded-pill px-3 py-2 shadow-sm"
          :class="{
            'bg-success': gpsStatus === 'active',
            'bg-warning text-dark': gpsStatus === 'searching',
            'bg-danger': gpsStatus === 'denied',
            'bg-secondary': gpsStatus === 'idle' || gpsStatus === 'unsupported',
          }">
          <span v-if="gpsStatus === 'active'" class="spinner-grow spinner-grow-sm me-1" style="animation-duration:1.5s;"></span>
          {{
            gpsStatus === 'active' ? 'GPS Activo' :
            gpsStatus === 'searching' ? 'Buscando señal...' :
            gpsStatus === 'denied' ? 'GPS Denegado' :
            gpsStatus === 'unsupported' ? 'Sin soporte GPS' :
            'GPS Inactivo'
          }}
        </span>
      </div>
    </div>

    <!-- Panel de Métricas -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="metric-card card border-0 shadow-sm text-center p-3 card-hover-effect">
          <div class="metric-value text-primary">{{ connectedUnits }}</div>
          <div class="metric-label text-muted">Unidades Activas</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="metric-card card border-0 shadow-sm text-center p-3 card-hover-effect">
          <div class="metric-value" :class="gpsStatus === 'active' ? 'text-success' : 'text-secondary'">
            {{ gpsStatus === 'active' ? '±' + gpsAccuracy + 'm' : '—' }}
          </div>
          <div class="metric-label text-muted">Precisión GPS</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="metric-card card border-0 shadow-sm text-center p-3 card-hover-effect">
          <div class="metric-value text-warning">{{ VEHICLE_ROUTES.length }}</div>
          <div class="metric-label text-muted">Rutas Monitoreadas</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="metric-card card border-0 shadow-sm text-center p-3 card-hover-effect">
          <div class="metric-value text-info">Vivo</div>
          <div class="metric-label text-muted">Estado de Telemetría</div>
        </div>
      </div>
    </div>

    <!-- Mapa Principal -->
    <div class="row g-4">
      <div class="col-lg-9">
        <div class="card border-0 shadow-sm card-hover-effect">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h5 class="fw-bold text-dark m-0">Mapa de Rastreo en Vivo — Medellín</h5>
              <div class="d-flex align-items-center flex-wrap gap-2">
                <button @click="toggleTrafficLayer" class="btn btn-sm" :class="trafficLayerVisible ? 'btn-success' : 'btn-outline-secondary'">
                  <i class="bi bi-signpost-split"></i> Tráfico en Tiempo Real
                </button>
                <span v-if="trafficLoading" class="badge bg-warning text-dark ms-2">
                  <span class="spinner-border spinner-border-sm"></span> Cargando tráfico...
                </span>
                <small v-if="lastTrafficUpdate" class="text-muted ms-2">Actualizado: {{ lastTrafficUpdate }}</small>
                <button
                  @click="toggleGPS"
                  class="btn btn-sm rounded-pill px-3 shadow-sm"
                  :class="gpsActive || gpsStatus === 'searching' ? 'btn-danger' : 'btn-primary'"
                >
                  <span v-if="gpsStatus === 'searching'" class="spinner-border spinner-border-sm me-1" role="status"></span>
                  <span v-else class="me-1">📍</span>
                  {{ gpsActive || gpsStatus === 'searching' ? 'Detener GPS' : 'Activar GPS' }}
                </button>
              </div>
            </div>
            <div class="position-relative">
              <div ref="mapContainer" class="tracker-map rounded border"></div>
              <div v-if="trafficLayerVisible" class="traffic-legend">
                <div class="legend-title">Estado del Tráfico</div>
                <div class="legend-item"><span class="legend-color" style="background:#22c55e"></span> Fluido</div>
                <div class="legend-item"><span class="legend-color" style="background:#eab308"></span> Moderado</div>
                <div class="legend-item"><span class="legend-color" style="background:#ef4444"></span> Congestionado</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Lateral: Leyenda + Estado -->
      <div class="col-lg-3">
        <!-- Card GPS propio -->
        <div class="card border-0 shadow-sm mb-3 card-hover-effect"
          :class="gpsStatus === 'active' ? 'border-start border-success border-4' : ''">
          <div class="card-body p-3">
            <h6 class="fw-bold text-dark mb-3">Tu Dispositivo</h6>
            <div v-if="gpsStatus === 'idle'" class="text-center py-2">
              <p class="text-muted small mb-2">Activa el GPS para que tu posición aparezca en el mapa en tiempo real.</p>
              <button @click="startGPS" class="btn btn-primary btn-sm rounded-pill w-100">
                📍 Activar Rastreo
              </button>
            </div>
            <div v-else-if="gpsStatus === 'searching'" class="text-center py-2">
              <div class="spinner-border text-primary mb-2" style="width:24px;height:24px"></div>
              <p class="text-muted small mb-0">Obteniendo posición GPS...</p>
            </div>
            <div v-else-if="gpsStatus === 'active'">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="live-dot bg-success"></span>
                <span class="small fw-semibold text-success">GPS Activo</span>
              </div>
              <p class="text-muted small mb-1">Precisión: <strong>±{{ gpsAccuracy }} m</strong></p>
              <button @click="stopGPS" class="btn btn-outline-danger btn-sm rounded-pill w-100 mt-2">
                Detener Rastreo
              </button>
            </div>
            <div v-else-if="gpsStatus === 'denied'">
              <div class="alert alert-warning py-2 small mb-0 border-0 rounded-3">
                <strong>Permiso denegado.</strong> Activa la geolocalización en la configuración del navegador.
              </div>
            </div>
            <div v-else-if="gpsStatus === 'unsupported'">
              <div class="alert alert-secondary py-2 small mb-0 border-0 rounded-3">
                Tu navegador no soporta geolocalización.
              </div>
            </div>
          </div>
        </div>

        <!-- Leyenda de Vehículos -->
        <div class="card border-0 shadow-sm card-hover-effect">
          <div class="card-body p-3">
            <h6 class="fw-bold text-dark mb-3">Unidades en Ruta</h6>
            <ul class="list-unstyled mb-0">
              <li v-for="route in VEHICLE_ROUTES" :key="route.id"
                class="d-flex align-items-center gap-2 mb-2 p-2 rounded-3 vehicle-row">
                <div class="vehicle-dot" :style="{ background: route.color }"></div>
                <div>
                  <div class="small fw-semibold text-dark">{{ route.icon }} {{ route.label }}</div>
                  <div class="x-small text-muted">ID: {{ route.id }}</div>
                </div>
                <span class="ms-auto badge bg-success-subtle text-success small">En ruta</span>
              </li>
            </ul>
            <div class="border-top mt-3 pt-2">
              <p class="x-small text-muted mb-0">
                <strong>Fuente:</strong> Simulación basada en Realtime_Tracker con rutas reales de Medellín.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tracker-map {
  height: 480px;
  z-index: 1;
}

.metric-card {
  border-radius: 14px;
}

.metric-value {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 0.78rem;
  font-weight: 500;
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}

.vehicle-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px white, 0 0 0 3px currentColor;
}

.vehicle-row {
  background: #f8fafc;
  transition: background 0.2s;
}

.vehicle-row:hover {
  background: #eef2ff;
}

.x-small {
  font-size: 0.72rem;
}

.card-hover-effect {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.card-hover-effect:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(21, 81, 161, 0.07) !important;
}

/* Animación del marcador GPS propio - definida globalmente en el HTML generado por L.divIcon */
:global(@keyframes gps-pulse) {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(2.5); opacity: 0; }
}

@media (max-width: 768px) {
  .tracker-map {
    height: 320px;
  }
}

.traffic-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255,255,255,0.95);
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
  font-size: 0.8rem;
}
.legend-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: #1e293b;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: #475569;
}
.legend-color {
  width: 20px;
  height: 4px;
  border-radius: 2px;
  display: inline-block;
}
</style>
