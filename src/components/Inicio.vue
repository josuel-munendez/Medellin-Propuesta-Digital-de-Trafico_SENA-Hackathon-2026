<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Chart, CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import { getWeatherData } from '../assets/js/weather'
import { useTomTomTraffic, getIncidentColor, getIncidentLabel, normalizeIncidentGeometry } from '../composables/useTomTomTraffic.js'
import { getConfiguredEnv } from '../utils/env.js'
import { fetchZones, fetchCongestionPrediction } from '../services/api.js'

Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend, Filler)
import { Chart, CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js'
import { getWeatherData } from '../assets/js/weather'
import { useTomTomTraffic, getIncidentColor, getIncidentLabel, normalizeIncidentGeometry } from '../composables/useTomTomTraffic.js'
import { getConfiguredEnv } from '../utils/env.js'
import { fetchZones, fetchCongestionPrediction } from '../services/api.js'

Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend, Filler)

const mapContainer = ref(null)
const chartCanvas = ref(null)
const weather = ref(null)
const loading = ref(true)
const mapError = ref('')
const zones = ref([])
const zonesError = ref('')
const prediction = ref(null)
const predictionError = ref('')
const apiConnected = ref(false)
const zones = ref([])
const zonesError = ref('')
const prediction = ref(null)
const predictionError = ref('')
const apiConnected = ref(false)
const {
  trafficSegments,
  trafficIncidents,
  trafficLoading,
  incidentsLoading,
  trafficError,
  incidentsError,
  loadTrafficSegments,
  loadTrafficIncidents,
} = useTomTomTraffic()

let map
let chart
let mapLoaded = false
let mapboxgl = null
let leaflet = null
let heatLayerInstance = null
let zonesLayerGroup = null
let trafficLayerGroup = null
let incidentsLayerGroup = null
let leaflet = null
let heatLayerInstance = null
let zonesLayerGroup = null
let trafficLayerGroup = null
let incidentsLayerGroup = null

const alertMessage = computed(() => {
  if (!weather.value) return 'Cargando estado climático...'
  return weather.value.rainAlert
    ? 'Alerta: se detecta lluvia o tormenta en Medellín. Evita vías de alta siniestralidad, mantén las luces encendidas y reduce la velocidad.'
    : 'Condición estable: mantén una conducción preventiva y atenta a las señales de tránsito.'
})

const alertClass = computed(() => (weather.value?.rainAlert ? 'alert-danger shadow-sm border-0 border-start border-danger border-4' : 'alert-success shadow-sm border-0 border-start border-success border-4'))

const trafficSummary = computed(() => {
  const segments = trafficSegments.value
  if (!segments.length) {
    return {
      average: 0,
      fluid: 0,
      moderate: 0,
      heavy: 0,
    }
  }

  const percentages = segments.map((segment) => segment.congestionPct)
  const average = Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)

  return {
    average,
    fluid: percentages.filter((value) => value < 35).length,
    moderate: percentages.filter((value) => value >= 35 && value < 70).length,
    heavy: percentages.filter((value) => value >= 70).length,
  }
})

const incidentSummary = computed(() => ({
  total: trafficIncidents.value.length,
  accidents: trafficIncidents.value.filter((incident) => String(incident?.properties?.iconCategory || '').toLowerCase().includes('accident')).length,
}))

function buildHourlySeries(accidents) {
  const buckets = Array.from({ length: 24 }, () => 0)

  for (const accident of accidents) {
    if (Number.isInteger(accident.hour) && accident.hour >= 0 && accident.hour <= 23) {
      buckets[accident.hour] += 1
    }
  }

  return buckets
}

function buildAccidentGeoJson(accidents) {
  return {
    type: 'FeatureCollection',
    features: accidents
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
      .map((item) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [item.lng, item.lat],
        },
        properties: {
          intensity: item.intensity ?? 0.5,
          hour: item.hour ?? null,
        },
      })),
  }
}

function buildTrafficGeoJson() {
  return {
    type: 'FeatureCollection',
    features: trafficSegments.value
      .filter((segment) => Array.isArray(segment.coordinates) && segment.coordinates.length > 1)
      .map((segment) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: segment.coordinates.map(([lat, lng]) => [lng, lat]),
        },
        properties: {
          name: segment.name || 'Vía TomTom',
          color: segment.color,
          congestionPct: segment.congestionPct,
          currentSpeed: segment.currentSpeed,
          freeFlowSpeed: segment.freeFlowSpeed,
        },
      })),
  }
}

function buildIncidentGeoJson() {
  return {
    type: 'FeatureCollection',
    features: trafficIncidents.value
      .map((incident) => {
        const geometry = normalizeIncidentGeometry(incident?.geometry)
        if (!geometry) return null

        const isPoint = geometry.length === 1
        return {
          type: 'Feature',
          geometry: {
            type: isPoint ? 'Point' : 'LineString',
            coordinates: isPoint
              ? [geometry[0][1], geometry[0][0]]
              : geometry.map(([lat, lng]) => [lng, lat]),
          },
          properties: {
            label: getIncidentLabel(incident),
            color: getIncidentColor(incident?.properties?.iconCategory || incident?.type),
          },
        }
      })
      .filter(Boolean),
  }
}

async function initMapbox(accidents) {
  if (!mapboxgl) {
    const [mapboxModule] = await Promise.all([
      import('mapbox-gl'),
      import('mapbox-gl/dist/mapbox-gl.css'),
    ])
    mapboxgl = mapboxModule.default
  }

  const token = getConfiguredEnv('VITE_MAPBOX_ACCESS_TOKEN')
  if (token) {
    mapboxgl.accessToken = token
  } else {
    mapError.value = 'Configura VITE_MAPBOX_ACCESS_TOKEN para usar estilos oficiales de Mapbox.'
  }

  map = new mapboxgl.Map({
    container: mapContainer.value,
    center: [-75.56359, 6.25184],
    zoom: 11.8,
    style: token
      ? 'mapbox://styles/mapbox/navigation-day-v1'
      : {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: 'OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
  })

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

  map.on('error', (event) => {
    console.warn('[Mapbox] Error cargando el mapa:', event?.error || event)
    mapError.value = 'No fue posible cargar el estilo de Mapbox. El resto del panel sigue disponible.'
  })

  map.on('load', () => {
    mapLoaded = true
    addAccidentLayer(buildAccidentGeoJson(accidents))
    renderApiMapLayers()
  })
}

function addAccidentLayer(accidentData) {
  if (!mapLoaded || map.getSource('accidents')) return

  map.addSource('accidents', {
    type: 'geojson',
    data: accidentData,
  })

  map.addLayer({
    id: 'accidents-heat',
    type: 'heatmap',
    source: 'accidents',
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.75, 15, 1.7],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 16, 15, 32],
      'heatmap-opacity': 0.82,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(22,163,74,0)',
        0.3, '#22c55e',
        0.55, '#eab308',
        0.78, '#f97316',
        1, '#dc2626',
      ],
    },
  })
}

function renderApiMapLayers() {
  if (!mapLoaded || !map) return

  const trafficData = buildTrafficGeoJson()
  const incidentData = buildIncidentGeoJson()

  if (!trafficData.features.length && !incidentData.features.length) return

  try {
    if (map.getSource('traffic-segments')) {
      map.getSource('traffic-segments').setData(trafficData)
    } else {
      map.addSource('traffic-segments', { type: 'geojson', data: trafficData })
      map.addLayer({
        id: 'traffic-lines',
        type: 'line',
        source: 'traffic-segments',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['get', 'congestionPct'], 0, 3, 100, 8],
          'line-opacity': 0.9,
        },
      })
    }

    if (map.getSource('traffic-incidents')) {
      map.getSource('traffic-incidents').setData(incidentData)
    } else {
      map.addSource('traffic-incidents', { type: 'geojson', data: incidentData })
      map.addLayer({
        id: 'incident-lines',
        type: 'line',
        source: 'traffic-incidents',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-dasharray': [2, 1],
        },
      })
      map.addLayer({
        id: 'incident-points',
        type: 'circle',
        source: 'traffic-incidents',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
    }
  } catch (e) {
    console.warn('[Inicio] Error rendering Mapbox layers:', e)
  }
}

async function initLeafletMap(accidents) {
  if (!leaflet) {
    try {
      const [L, heat] = await Promise.all([
        import('leaflet'),
        import('leaflet.heat'),
      ])
      leaflet = L
      if (typeof heat.default === 'function') {
        heat.default(L)
      }
    } catch (importErr) {
      console.warn('[Inicio] Leaflet import failed:', importErr?.message || importErr)
      throw new Error('Leaflet could not be loaded')
    }
  }

  if (!leaflet || !mapContainer.value) {
    throw new Error('Leaflet or container not available')
  }

  map = leaflet.map(mapContainer.value, {
    center: [6.25184, -75.56359],
    zoom: 12,
    zoomControl: true,
  })

  leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OpenStreetMap contributors',
      maxZoom: 19,
    })
    .addTo(map)

  map.on('load', () => {
    mapLoaded = true
    addAccidentHeatLayer(buildAccidentGeoJson(accidents))
    addZonesGeoLayer()
    renderTrafficLayers()
  })

  // Leaflet fires 'load' synchronously when map is created, trigger layers after next tick
  setTimeout(() => {
    mapLoaded = true
    addAccidentHeatLayer(buildAccidentGeoJson(accidents))
    addZonesGeoLayer()
    renderTrafficLayers()
  }, 200)
}

function addAccidentHeatLayer(accidentData) {
  if (!mapLoaded || heatLayerInstance) return

  const points = accidentData.features.map((f) => {
    const intensity = f.properties?.intensity ?? 0.5
    return [f.geometry.coordinates[1], f.geometry.coordinates[0], intensity]
  })

  if (points.length && leaflet.heatLayer) {
    heatLayerInstance = leaflet
      .heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
        max: 1.0,
        gradient: { 0: '#16a34a', 0.3: '#22c55e', 0.55: '#eab308', 0.78: '#f97316', 1: '#dc2626' },
      })
      .addTo(map)
  }
}

function addZonesGeoLayer() {
  if (!mapLoaded || !zones.value.length || zonesLayerGroup) return

  const riskColors = { alta: '#dc2626', media: '#eab308', baja: '#22c55e' }

  const features = zones.value
    .filter((z) => {
      try {
        const geom = typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry
        return geom && geom.type && geom.coordinates
      } catch { return false }
    })
    .map((z) => {
      const geom = typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry
      return {
        type: 'Feature',
        geometry: geom,
        properties: { name: z.name, risk_level: z.risk_level },
      }
    })

  if (!features.length) return

  zonesLayerGroup = leaflet
    .geoJSON(
      { type: 'FeatureCollection', features },
      {
        style: (feature) => ({
          color: riskColors[feature.properties?.risk_level] || '#64748b',
          fillColor: riskColors[feature.properties?.risk_level] || '#64748b',
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.6,
        }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindTooltip(feature.properties.name, {
              permanent: true,
              direction: 'center',
              className: 'zone-label',
            })
          }
        },
      },
    )
    .addTo(map)
}

function renderTrafficLayers() {
  if (!mapLoaded) return

  const trafficData = buildTrafficGeoJson()
  const incidentData = buildIncidentGeoJson()

  if (trafficLayerGroup) {
    trafficLayerGroup.remove()
  }
  trafficLayerGroup = leaflet
    .geoJSON(trafficData, {
      style: (feature) => ({
        color: feature.properties?.color || '#22c55e',
        weight: Math.max(3, (feature.properties?.congestionPct || 0) / 20),
        opacity: 0.9,
      }),
    })
    .addTo(map)

  if (incidentsLayerGroup) {
    incidentsLayerGroup.remove()
  }
  incidentsLayerGroup = leaflet
    .geoJSON(incidentData, {
      pointToLayer: (feature, latlng) =>
        leaflet.circleMarker(latlng, {
          radius: 7,
          fillColor: feature.properties?.color || '#eab308',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }),
      style: (feature) => {
        if (feature.geometry?.type === 'LineString') {
          return {
            color: feature.properties?.color || '#eab308',
            weight: 5,
            dashArray: '6,3',
            opacity: 0.9,
          }
        }
        return {}
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.label) {
          layer.bindPopup(feature.properties.label)
        }
      },
    })
    .addTo(map)
}
    })
    map.addLayer({
      id: 'incident-points',
      type: 'circle',
      source: 'traffic-incidents',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 7,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    })
  }
  if (trafficLayerGroup) {
    trafficLayerGroup.remove()
  }
  trafficLayerGroup = leaflet
    .geoJSON(trafficData, {
      style: (feature) => ({
        color: feature.properties?.color || '#22c55e',
        weight: Math.max(3, (feature.properties?.congestionPct || 0) / 20),
        opacity: 0.9,
      }),
    })
    .addTo(map)

  if (incidentsLayerGroup) {
    incidentsLayerGroup.remove()
  }
  incidentsLayerGroup = leaflet
    .geoJSON(incidentData, {
      pointToLayer: (feature, latlng) =>
        leaflet.circleMarker(latlng, {
          radius: 7,
          fillColor: feature.properties?.color || '#eab308',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }),
      style: (feature) => {
        if (feature.geometry?.type === 'LineString') {
          return {
            color: feature.properties?.color || '#eab308',
            weight: 5,
            dashArray: '6,3',
            opacity: 0.9,
          }
        }
        return {}
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.label) {
          layer.bindPopup(feature.properties.label)
        }
      },
    })
    .addTo(map)
}

onMounted(async () => {
  try {
    const [accidentsResponse, roadsResponse, weatherData] = await Promise.all([
      fetch('/assets/data/accidents.json'),
      fetch('/assets/data/medellin-roads.json'),
      getWeatherData(),
    ])

    const accidents = await accidentsResponse.json()
    const roads = await roadsResponse.json()
    const apiKey = getConfiguredEnv('VITE_TOMTOM_API_KEY')

    weather.value = weatherData

    // Cargar zonas de riesgo desde Django API
    try {
      const zonesData = await fetchZones()
      zones.value = Array.isArray(zonesData) ? zonesData : []
      apiConnected.value = true
    } catch (err) {
      zonesError.value = 'Zonas no disponibles (Django API)'
      console.warn('[Inicio] Zonas API:', err.message)
    }

    // Mapbox como primario, Leaflet como fallback
    let mapInitialized = false
    try {
      await initMapbox(accidents)
      mapInitialized = true
    } catch (err) {
      console.warn('[Inicio] Mapbox init failed, trying Leaflet:', err?.message || err)
      mapError.value = 'Mapbox no disponible, usando Leaflet como respaldo.'
    }
    if (!mapInitialized) {
      try {
        await initLeafletMap(accidents)
        mapInitialized = true
      } catch (err2) {
        console.warn('[Inicio] Leaflet also failed:', err2?.message || err2)
        mapError.value = 'No fue posible cargar el mapa. El resto del panel sigue disponible.'
      }
    }

    // Configurar gráfica interactiva
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
    const accidentsSeries = buildHourlySeries(accidents)

    chart = new Chart(chartCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Accidentes por hora',
            data: accidentsSeries,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              font: {
                family: "'Inter', sans-serif",
                weight: '500'
              }
            }
          },
          tooltip: {
            padding: 12,
            backgroundColor: 'rgba(30, 42, 53, 0.95)',
            titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            cornerRadius: 8,
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: "'Inter', sans-serif" }
            }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Cantidad de Incidentes', font: { family: "'Inter', sans-serif", weight: '600' } },
            ticks: {
              font: { family: "'Inter', sans-serif" }
            }
          },
        },
      },
    })

    // Cargar datos de tráfico TomTom
    if (!apiKey) {
      trafficSegments.value = []
      trafficIncidents.value = []
    } else {
      const [trafficResult, incidentsResult] = await Promise.allSettled([
        loadTrafficSegments(roads, apiKey),
        loadTrafficIncidents(apiKey),
      ])
      if (trafficResult.status === 'rejected') {
        console.warn('[Inicio] Traffic segments:', trafficResult.reason?.message)
      }
      if (incidentsResult.status === 'rejected') {
        console.warn('[Inicio] Incidents:', incidentsResult.reason?.message)
      }
      // Render layers on whichever map is active
      if (mapInitialized) {
        try {
          if (typeof mapboxgl !== 'undefined' && mapboxgl && mapboxgl.Map && map instanceof mapboxgl.Map) {
            renderApiMapLayers()
          } else {
            renderTrafficLayers()
          }
        } catch (e) {
          renderTrafficLayers()
        }
      }
    }

    // Cargar predicción de congestión desde Django
    try {
      const currentHour = new Date().getHours()
      const predictionData = await fetchCongestionPrediction(currentHour)
      prediction.value = predictionData
    } catch (err) {
      predictionError.value = 'Predicción no disponible'
      console.warn('[Inicio] Predicción:', err.message)
    }
  } catch (error) {
    console.error('Error al inicializar el dashboard de inicio:', error)
    trafficError.value = 'No fue posible cargar TomTom Traffic.'
    incidentsError.value = 'No fue posible cargar TomTom Incidents.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  chart?.destroy()
  map?.remove()
  mapLoaded = false
})

</script>

<template>
  <div class="animate-fade-in">
    <!-- Encabezado de la Sección -->
    <div class="row mb-4 align-items-center">
      <div class="col-md-8">
        <h1 class="h3 fw-bold text-dark mb-1">Panel de Control de Movilidad</h1>
        <p class="text-muted mb-0">Información en tiempo real sobre incidentes, congestión y alertas viales en Medellín.</p>
      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
      <div class="col-md-4 text-md-end mt-3 mt-md-0">
        <span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm">
          <span class="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true" style="animation-duration: 1.5s;"></span>
          Monitoreo Activo
        </span>
        <div class="d-flex gap-2 justify-content-md-end flex-wrap">
          <span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm">
            <span class="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true" style="animation-duration: 1.5s;"></span>
            Monitoreo Activo
          </span>
          <span v-if="apiConnected" class="badge bg-success px-3 py-2 rounded-pill shadow-sm">
            Django API ✓
          </span>
        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

    <!-- Primera Fila: Mapa y Clima -->
    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card h-100 shadow-sm border-0 card-hover-effect">
          <div class="card-body p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="fw-bold text-dark m-0">Mapa Operativo Mapbox</h5>
              <span class="text-muted small"><i class="bi bi-geo-alt-fill me-1"></i>Accidentes, tráfico e incidentes</span>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            <div v-if="mapError" class="alert alert-warning py-2 small mb-3 border-0">
              {{ mapError }}
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            <div v-if="mapError" class="alert alert-warning py-2 small mb-3 border-0">
  {{ mapError }}
</div>
<div ref="mapContainer" class="map-container rounded border shadow-inner">
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
          
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

      <div class="col-lg-4">
        <div class="card h-100 shadow-sm border-0 card-hover-effect card-gradient-bg">
          <div class="card-body p-4 d-flex flex-column justify-content-between">
            <div>
              <h5 class="fw-bold text-dark mb-4">Reporte SIATA Actual</h5>
              <div class="d-flex align-items-center mb-4">
                <div class="weather-temp-container me-3 bg-white p-3 rounded-4 shadow-sm border">
                  <span class="display-5 fw-bold text-primary">{{ weather?.temperature ?? '21' }}°</span>
                  <span class="text-muted">C</span>
                
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                <div>
                  <h4 class="fw-semibold mb-0 text-dark">{{ weather?.location || 'Medellín, CO' }}</h4>
                  <p class="text-capitalize text-muted mb-0">{{ weather?.condition || 'Nublado parcial' }}</p>
                
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              
              <div class="alert mt-3" :class="alertClass" role="alert">
                <div class="d-flex">
                  <div class="me-2">
                    <svg v-if="weather?.rainAlert" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-exclamation-triangle-fill text-danger" viewBox="0 0 16 16">
                      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-check-circle-fill text-success" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                  
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                  <div>
                    {{ alertMessage }}
                  
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

            <div class="mt-4 pt-3 border-top">
              <p class="text-muted small mb-0">
                <i class="bi bi-info-circle me-1"></i>
                Fuente: {{ weather?.source === 'siata' ? 'SIATA en vivo' : 'respaldo local por falta de respuesta SIATA' }}.
                <span v-if="weather?.rainfallForecast !== null"> Lluvia: {{ weather.rainfallForecast }}%</span>
                <span v-if="weather?.rainfallForecast != null"> Lluvia: {{ weather.rainfallForecast }}%</span>
              </p>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
          
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

    <!-- Segunda Fila: Gráfico de Tendencias Horarias (Chart.js) -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card shadow-sm border-0 card-hover-effect">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <div>
                <h5 class="fw-bold text-dark mb-1">Tendencias Horarias Consolidadas</h5>
                <p class="text-muted small mb-0">Comparativa entre incidencias registradas y niveles promedio de congestión vehicular.</p>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              <div class="d-flex gap-2">
                <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded">
                  Accidentalidad
                </span>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded">
                  Congestión %
                </span>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            <div class="chart-container" style="position: relative; height: 320px; width: 100%">
              <canvas ref="chartCanvas" aria-label="Gráfico interactivo de tráfico y accidentes"></canvas>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            <div v-if="loading" class="d-flex align-items-center justify-content-center mt-3 py-4">
              <div class="spinner-border text-primary me-2" role="status">
                <span class="visually-hidden">Cargando...</span>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              <span class="text-muted">Cargando visualizaciones analíticas...</span>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
          
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

    <!-- Tercera Fila: Flujos TomTom en Tiempo Real -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card shadow-sm border-0 card-hover-effect">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
              <div>
                <h5 class="fw-bold text-dark mb-1">Flujos de Tráfico TomTom en Tiempo Real</h5>
                <p class="text-muted small mb-0">
                  Datos en vivo de velocidad y congestión tomados desde
                  <span class="badge bg-secondary-subtle text-secondary border">TomTom Traffic API</span>
                </p>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              <div class="d-flex gap-2 flex-wrap align-items-center">
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill">
                  Promedio {{ trafficSummary.average }}%
                </span>
                <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill">
                  Críticas {{ trafficSummary.heavy }}
                </span>
                <span class="badge bg-dark-subtle text-dark border border-dark-subtle px-3 py-2 rounded-pill">
                  Incidentes {{ incidentSummary.total }}
                </span>
                <span v-if="trafficLoading" class="badge bg-warning text-dark px-3 py-2 rounded-pill">
                  Cargando TomTom...
                </span>
                <span v-if="incidentsLoading" class="badge bg-info text-dark px-3 py-2 rounded-pill">
                  Cargando incidentes...
                </span>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

            <div class="routes-chart-area">
              <div class="row g-3">
                <div class="col-md-8">
                  <div class="routes-visual-container rounded-3 border bg-light p-3">
                    <div class="mb-2 d-flex align-items-center gap-2">
                      <span class="badge bg-primary">Mapa de Flujos Activos</span>
                      <span class="text-muted small">Medellín — Segmentos TomTom</span>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div v-if="trafficError" class="alert alert-warning py-2 small mb-3 border-0">
                      {{ trafficError }}
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div v-if="incidentsError" class="alert alert-warning py-2 small mb-3 border-0">
                      {{ incidentsError }}
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div v-if="!trafficLoading && !trafficSegments.length" class="text-muted small py-3">
                      No hay segmentos TomTom disponibles en este momento.
                    <div v-if="!trafficLoading && !trafficSegments.length" class="text-muted small py-3">
                      <i class="bi bi-info-circle me-1"></i>Datos de tráfico en tiempo real requieren clave TomTom API.
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div v-for="(route, idx) in trafficSegments.slice(0, 10)" :key="route.name"
                      class="route-flow-bar d-flex align-items-center gap-2 mb-2 p-2 rounded-3">
                      <span class="route-number text-white rounded-2 px-2 py-1"
                        :style="{ background: route.congestionPct >= 85 ? '#dc2626' : route.congestionPct >= 70 ? '#f97316' : '#16a34a' }">
                        {{ String(idx + 1).padStart(2, '0') }}
                      </span>
                      <div class="flex-grow-1">
                        <div class="small fw-semibold text-dark mb-1">{{ route.name || 'Vía TomTom' }}
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                        <div class="text-muted x-small mb-1">
                          {{ route.currentSpeed }} km/h vs {{ route.freeFlowSpeed }} km/h libres
                        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                        <div class="progress" style="height:6px;">
                          <div class="progress-bar progress-bar-striped progress-bar-animated"
                            :class="route.congestionPct >= 85 ? 'bg-danger' : route.congestionPct >= 70 ? 'bg-warning' : 'bg-success'"
                            :style="{ width: route.congestionPct + '%' }"
                            role="progressbar"
                            :aria-valuenow="route.congestionPct"
                            aria-valuemin="0" aria-valuemax="100">
                          
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <span class="fw-bold small"
                        :class="route.congestionPct >= 85 ? 'text-danger' : route.congestionPct >= 70 ? 'text-warning' : 'text-success'">
                        {{ route.congestionPct }}%
                      </span>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                  
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

                <div class="col-md-4">
                  <div class="h-100 d-flex flex-column gap-3">
                    <div class="card border-0 bg-danger-subtle p-3 text-center rounded-4">
                      <div class="fs-1 fw-black text-danger">{{ trafficSummary.heavy }}
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div class="small text-danger fw-semibold">Rutas en Nivel Crítico (&ge;85%)
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div class="card border-0 bg-primary-subtle p-3 text-center rounded-4">
                      <div class="fs-1 fw-black text-primary">
                        {{ trafficSummary.average }}%
                      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div class="small text-primary fw-semibold">Congestión Promedio
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div class="card border-0 bg-info-subtle p-3 text-center rounded-4">
                      <div class="fs-1 fw-black text-info">{{ incidentSummary.accidents }}
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div class="small text-info fw-semibold">Incidentes tipo accidente
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div class="card border-0 bg-secondary-subtle p-3 rounded-4">
                      <p class="x-small text-secondary mb-1">
                        <strong>Fuente técnica:</strong> TomTom Traffic API <code>flowSegmentData</code> sobre
                        puntos estratégicos de Medellín, sin usar la capa estática anterior.
                      </p>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    <div class="card border-0 bg-white p-3 rounded-4 shadow-sm">
                      <div class="small fw-semibold mb-2">Incidentes recientes
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div v-if="trafficIncidents.length === 0" class="text-muted x-small">
                        No se detectaron incidentes activos en el bbox actual.
                      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <ul v-else class="list-unstyled mb-0 incident-mini-list">
                        <li v-for="incident in trafficIncidents.slice(0, 4)" :key="incident?.properties?.id || incident.type">
                          <span class="incident-mini-dot" :style="{ background: getIncidentColor(incident?.properties?.iconCategory) }"></span>
                          <span class="x-small text-dark">
                            {{ getIncidentLabel(incident) }}
                          </span>
                        </li>
                      </ul>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

                    <!-- Predicción de congestión desde Django -->
                    <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
                      <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div class="x-small text-muted mb-2">
                        Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
                      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
                        <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
                        <span class="badge rounded-pill small"
                          :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
                          {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
                        </span>
                      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

                    <!-- Zonas de riesgo desde Django -->
                    <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
                      <div class="small fw-semibold mb-2">Zonas de riesgo (Django)
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                      <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
                        <span class="x-small">{{ zone.name }}</span>
                        <span class="badge rounded-pill small"
                          :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
                          {{ zone.risk_level }}
                        </span>
                      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                  
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
                
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
              
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
            
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>

          
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
        
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
      
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
    
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
  
  <!-- Predicción de congestión desde Django -->
  <div v-if="prediction" class="card border-0 bg-dark-subtle p-3 rounded-4">
    <div class="small fw-semibold mb-2 text-dark">Predicción IA (próximas 2h)</div>
    <div class="x-small text-muted mb-2">
      Método: <code>{{ prediction.method }}</code> · Hora base: {{ prediction.base_hour }}:00
    </div>
    <div v-for="item in prediction.forecast" :key="item.hour" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ String(item.hour).padStart(2, '0') }}:00</span>
      <span class="badge rounded-pill small"
        :class="item.risk_level === 'alta' ? 'bg-danger' : item.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ item.predicted_accidents }} acc. · {{ item.risk_level }}
      </span>
    </div>
  </div>

  <!-- Zonas de riesgo desde Django -->
  <div v-if="zones.length" class="card border-0 bg-light p-3 rounded-4">
    <div class="small fw-semibold mb-2">Zonas de riesgo (Django)</div>
    <div v-for="zone in zones" :key="zone.id" class="d-flex justify-content-between align-items-center mb-1">
      <span class="x-small">{{ zone.name }}</span>
      <span class="badge rounded-pill small"
        :class="zone.risk_level === 'alta' ? 'bg-danger' : zone.risk_level === 'media' ? 'bg-warning text-dark' : 'bg-success'">
        {{ zone.risk_level }}
      </span>
    </div>
  </div>
</div>
</template>

<style scoped>
.map-container {
  height: 400px;
  z-index: 1;
}

.chart-container {
  height: 320px;
}

.shadow-inner {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.card-hover-effect {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.card-hover-effect:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(21, 81, 161, 0.08) !important;
}

.card-gradient-bg {
  background: linear-gradient(145deg, #ffffff 0%, #f9fbfd 100%);
}

.weather-temp-container {
  min-width: 90px;
  text-align: center;
}

.incident-mini-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.incident-mini-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .map-container {
    height: 300px;
  }
}
</style>
