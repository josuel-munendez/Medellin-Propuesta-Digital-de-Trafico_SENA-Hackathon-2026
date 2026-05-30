<script setup>
import { onBeforeUnmount, onMounted, ref, reactive } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { fetchMultipleSegments, getTrafficLevel } from '../assets/js/trafficFlow.js'
import { fetchSiataWeather } from '../services/api'

const mapContainer = ref(null)
const gpsActive = ref(false)
const gpsStatus = ref('idle')
const gpsAccuracy = ref(null)
const connectedUnits = ref(0)
const trafficLayerVisible = ref(true)
const trafficLoading = ref(false)
const lastTrafficUpdate = ref(null)
const siataWeather = reactive({
  location: 'Medellín, CO',
  condition: 'Cargando clima SIATA',
  temperature: null,
  humidity: null,
  wind_speed: null,
  source: 'siata',
})
const siataLoading = ref(false)
const siataError = ref('')

let map = null
let ownMarker = null
let watchId = null
let vehicleSimInterval = null
const vehicleMarkers = {}
const vehicleRouteIndex = {}
const trafficSourceId = 'traffic-segments'

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

function createMarkerElement(color, emoji) {
  const element = document.createElement('div')
  element.style.width = '34px'
  element.style.height = '34px'
  element.style.borderRadius = '50%'
  element.style.display = 'flex'
  element.style.alignItems = 'center'
  element.style.justifyContent = 'center'
  element.style.background = color
  element.style.color = '#fff'
  element.style.fontSize = '16px'
  element.style.boxShadow = '0 2px 10px rgba(0,0,0,0.25)'
  element.style.border = '2px solid white'
  element.textContent = emoji
  return element
}

function createOwnMarkerElement() {
  const outer = document.createElement('div')
  outer.style.position = 'relative'
  outer.style.width = '28px'
  outer.style.height = '28px'

  const pulse = document.createElement('div')
  pulse.style.position = 'absolute'
  pulse.style.top = '0'
  pulse.style.left = '0'
  pulse.style.width = '28px'
  pulse.style.height = '28px'
  pulse.style.borderRadius = '50%'
  pulse.style.background = 'rgba(13,110,253,0.28)'
  pulse.style.animation = 'pulse-dot 1.5s ease-in-out infinite'

  const pin = document.createElement('div')
  pin.style.position = 'absolute'
  pin.style.top = '6px'
  pin.style.left = '6px'
  pin.style.width = '16px'
  pin.style.height = '16px'
  pin.style.borderRadius = '50%'
  pin.style.background = '#0d6efd'
  pin.style.border = '2px solid white'
  pin.style.boxShadow = '0 2px 10px rgba(13,110,253,0.45)'

  outer.appendChild(pulse)
  outer.appendChild(pin)
  return outer
}

function buildVehicleRouteFeatures() {
  return VEHICLE_ROUTES.map((route) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: route.coords.map(([lat, lng]) => [lng, lat]),
    },
    properties: {
      id: route.id,
      label: route.label,
      color: route.color,
    },
  }))
}

function buildTrafficGeoJSON(segments) {
  return {
    type: 'FeatureCollection',
    features: segments
      .filter((segment) => Array.isArray(segment.coordinates) && segment.coordinates.length > 1)
      .map((segment, index) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: segment.coordinates.map(([lat, lng]) => [lng, lat]),
        },
        properties: {
          id: segment.id ?? index,
          name: segment.name ?? 'Tramo TomTom',
          currentSpeed: segment.currentSpeed,
          freeFlowSpeed: segment.freeFlowSpeed,
          level: segment.level ?? getTrafficLevel(segment.currentSpeed, segment.freeFlowSpeed),
          ratio: segment.ratio,
          color: segment.color || '#ef4444',
        },
      })),
  }
}

function trafficPopupContent(properties) {
  return `
    <div style="font-family:'Inter',sans-serif;min-width:190px">
      <strong style="display:block;margin-bottom:4px">🛣️ ${properties.name || 'Tramo TomTom'}</strong>
      <span style="font-size:12px;color:#475569">Velocidad actual: <strong>${properties.currentSpeed ?? '—'} km/h</strong></span><br/>
      <span style="font-size:12px;color:#475569">Velocidad libre: <strong>${properties.freeFlowSpeed ?? '—'} km/h</strong></span><br/>
      <span style="font-size:12px;color:#475569">Congestión: <strong>${properties.level || 'Desconocido'}</strong></span>
      <span style="font-size:12px;color:#475569;display:block;margin-top:6px">Fuente: TomTom Traffic</span>
    </div>
  `
}

const trafficClickHandler = (event) => {
  if (!event.features || !event.features.length) return
  const feature = event.features[0]
  if (!feature.properties) return

  new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
    .setLngLat(event.lngLat)
    .setHTML(trafficPopupContent(feature.properties))
    .addTo(map)
}

function initMap() {
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  if (!accessToken) {
    console.warn('[RealtimeTracker] VITE_MAPBOX_ACCESS_TOKEN no configurado. El mapa Mapbox puede no cargarse correctamente.')
  }
  mapboxgl.accessToken = accessToken || ''

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-75.5636, 6.2518],
    zoom: 13,
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  map.on('load', () => {
    const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY
    if (tomtomKey) {
      map.addSource('tomtom-traffic', {
        type: 'raster',
        tiles: [
          `https://api.tomtom.com/map/1/tile/flow/relative/png8/{z}/{x}/{y}.png?key=${tomtomKey}`,
        ],
        tileSize: 256,
      })
      map.addLayer({
        id: 'tomtom-traffic',
        type: 'raster',
        source: 'tomtom-traffic',
        paint: { 'raster-opacity': 0.45 },
      })
    }

    map.addSource('vehicle-routes', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: buildVehicleRouteFeatures(),
      },
    })

    map.addLayer({
      id: 'vehicle-routes-layer',
      type: 'line',
      source: 'vehicle-routes',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-opacity': 0.3,
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
    })

    map.addSource(trafficSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })

    map.addLayer({
      id: 'traffic-segments-layer',
      type: 'line',
      source: trafficSourceId,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 6,
        'line-opacity': 0.8,
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
    })

    map.on('click', 'traffic-segments-layer', trafficClickHandler)
    map.on('mouseenter', 'traffic-segments-layer', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'traffic-segments-layer', () => {
      map.getCanvas().style.cursor = ''
    })

    startVehicleSimulation()
    loadTrafficData()
  })
}

function updateTrafficLayer(segments) {
  if (!map || !map.isStyleLoaded() || !map.getSource(trafficSourceId)) return
  map.getSource(trafficSourceId).setData(buildTrafficGeoJSON(segments))
}

function startVehicleSimulation() {
  if (!map || !map.isStyleLoaded()) return

  VEHICLE_ROUTES.forEach((route) => {
    vehicleRouteIndex[route.id] = 0
    const [lat, lng] = route.coords[0]
    const marker = new mapboxgl.Marker({ element: createMarkerElement(route.color, route.icon), anchor: 'center' })
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 18 }).setHTML(`
          <div style="font-family:'Inter',sans-serif;min-width:160px">
            <strong style="display:block;margin-bottom:4px">${route.icon} ${route.label}</strong>
            <span style="font-size:12px;color:#475569">ID: <code>${route.id}</code></span><br/>
            <span style="font-size:12px;color:#475569">En ruta activa</span>
          </div>
        `)
      )
      .addTo(map)

    vehicleMarkers[route.id] = marker
  })

  connectedUnits.value = VEHICLE_ROUTES.length
  vehicleSimInterval = setInterval(() => {
    VEHICLE_ROUTES.forEach((route) => {
      const maxIdx = route.coords.length - 1
      vehicleRouteIndex[route.id] = (vehicleRouteIndex[route.id] + 1) % (maxIdx + 1)
      const [lat, lng] = route.coords[vehicleRouteIndex[route.id]]
      vehicleMarkers[route.id]?.setLngLat([lng, lat])
    })
  }, 1800)
}

function stopVehicleSimulation() {
  if (vehicleSimInterval) {
    clearInterval(vehicleSimInterval)
    vehicleSimInterval = null
  }
  Object.values(vehicleMarkers).forEach((marker) => marker.remove())
  Object.keys(vehicleMarkers).forEach((id) => delete vehicleMarkers[id])
  connectedUnits.value = 0
}

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
        ownMarker = new mapboxgl.Marker({ element: createOwnMarkerElement(), anchor: 'center' })
          .setLngLat([longitude, latitude])
          .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML('<strong>📍 Tu ubicación actual</strong><br/><small>GPS activo en este dispositivo</small>'))
          .addTo(map)
        map.flyTo({ center: [longitude, latitude], zoom: 15, speed: 0.7 })
      } else {
        ownMarker.setLngLat([longitude, latitude])
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
    ownMarker.remove()
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

async function loadSiataWeather() {
  siataLoading.value = true
  siataError.value = ''

  try {
    const payload = await fetchSiataWeather()
    siataWeather.location = payload.location || 'Medellín, CO'
    siataWeather.condition = payload.condition || 'Sin información'
    siataWeather.temperature = payload.temperature ?? null
    siataWeather.humidity = payload.humidity ?? null
    siataWeather.wind_speed = payload.wind_speed ?? null
    siataWeather.source = payload.source || 'siata'
  } catch (error) {
    siataError.value = error?.message || 'No se pudo cargar clima SIATA'
  } finally {
    siataLoading.value = false
  }
}

async function loadTrafficData() {
  trafficLoading.value = true

  try {
    const roadsRes = await fetch('/assets/data/medellin-roads.json')
    const roads = await roadsRes.json()
    const apiKey = import.meta.env.VITE_TOMTOM_API_KEY

    if (!apiKey) {
      console.warn('[RealtimeTracker] VITE_TOMTOM_API_KEY no configurada — capa de tráfico basada en TomTom deshabilitada')
      return
    }

    const results = await fetchMultipleSegments(roads, apiKey)
    const segments = results.filter(Boolean)
    updateTrafficLayer(segments)

    lastTrafficUpdate.value = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch (err) {
    console.warn('[RealtimeTracker] Error cargando datos de tráfico:', err)
  } finally {
    trafficLoading.value = false
  }
}

function toggleTrafficLayer() {
  trafficLayerVisible.value = !trafficLayerVisible.value
  if (!map || !map.isStyleLoaded()) return

  const visibility = trafficLayerVisible.value ? 'visible' : 'none'
  if (map.getLayer('traffic-segments-layer')) {
    map.setLayoutProperty('traffic-segments-layer', 'visibility', visibility)
  }
  if (map.getLayer('tomtom-traffic')) {
    map.setLayoutProperty('tomtom-traffic', 'visibility', visibility)
  }
}

onMounted(() => {
  initMap()
  loadSiataWeather()
})

onBeforeUnmount(() => {
  stopGPS()
  stopVehicleSimulation()
  if (map) {
    if (map.getLayer('traffic-segments-layer')) {
      map.off('click', 'traffic-segments-layer', trafficClickHandler)
    }
    map.remove()
  }
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

        <!-- Clima SIATA -->
        <div class="card border-0 shadow-sm mb-3 card-hover-effect">
          <div class="card-body p-3">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="fw-bold text-dark mb-0">Clima SIATA</h6>
              <span class="badge bg-info text-dark">LIVE</span>
            </div>
            <div v-if="siataLoading" class="text-center py-3">
              <div class="spinner-border text-primary" style="width:28px;height:28px"></div>
              <p class="text-muted small mt-2 mb-0">Consultando SIATA...</p>
            </div>
            <div v-else>
              <p class="mb-1 text-muted small">{{ siataWeather.location }}</p>
              <h5 class="mb-1">{{ siataWeather.temperature ?? '—' }}°C</h5>
              <p class="small mb-2 text-secondary">{{ siataWeather.condition }}</p>
              <div class="d-flex gap-2 flex-wrap small text-muted">
                <span>Humedad: {{ siataWeather.humidity ?? '—' }}%</span>
                <span>Viento: {{ siataWeather.wind_speed ?? '—' }} km/h</span>
              </div>
              <button @click="loadSiataWeather" class="btn btn-outline-primary btn-sm w-100 mt-3">Actualizar SIATA</button>
              <p class="x-small text-muted mt-2 mb-0">Origen: {{ siataWeather.source }}</p>
              <p v-if="siataError" class="text-danger small mt-2 mb-0">{{ siataError }}</p>
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
