<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet.heat'
import {
  Chart,
  CategoryScale,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { fetchAccidents, fetchRainStatus, fetchZones, toggleRainStatus } from './api'

Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend)

const mapContainer = ref(null)
const chartCanvas = ref(null)
const accidents = ref([])
const zones = ref([])
const rainStatus = ref({ isRaining: false })
const hourFrom = ref(0)
const hourTo = ref(23)
const loading = ref(true)
const loadingRain = ref(false)
const errorMessage = ref('')

let map
let chart
let heatLayer
let zonesLayer

const selectedZoneName = 'Centro'

const selectedZone = computed(() => {
  return zones.value.find((zone) => zone.name === selectedZoneName) ?? zones.value[0] ?? null
})

const selectedZoneRisk = computed(() => selectedZone.value?.risk_level ?? 'media')

const alertClass = computed(() => {
  if (rainStatus.value.isRaining) return 'alert-danger'
  if (selectedZoneRisk.value === 'alta') return 'alert-warning'
  if (selectedZoneRisk.value === 'media') return 'alert-soft'
  return 'alert-success'
})

const alertMessage = computed(() => {
  const riskText = {
    alta: 'La zona Centro mantiene riesgo alto de siniestros.',
    media: 'La zona seleccionada mantiene un riesgo moderado.',
    baja: 'La zona seleccionada tiene riesgo bajo en este momento.',
  }[selectedZoneRisk.value]

  if (rainStatus.value.isRaining) {
    return `${riskText} Se activó lluvia simulada: reduce velocidad, evita frenadas bruscas y prioriza rutas alternas.`
  }

  return `${riskText} Condición estable sin lluvia. Mantén conducción preventiva y revisa el horario con más acumulación de incidentes.`
})

const zoneCountLabel = computed(() => `${zones.value.length} zonas modeladas`)
const accidentCountLabel = computed(() => `${accidents.value.length} accidentes visibles`)

function normalizeRange() {
  if (hourFrom.value > hourTo.value) {
    hourTo.value = hourFrom.value
  }
}

function bucketByHour(records, selector) {
  const buckets = Array.from({ length: 24 }, () => 0)
  for (const record of records) {
    const hour = Number(record.hour)
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      buckets[hour] += selector(record)
    }
  }
  return buckets
}

function riskToColor(riskLevel) {
  if (riskLevel === 'alta') return '#a31f34'
  if (riskLevel === 'media') return '#b85c00'
  return '#237843'
}

function riskToOpacity(riskLevel) {
  if (riskLevel === 'alta') return 0.35
  if (riskLevel === 'media') return 0.24
  return 0.18
}

function parseZoneGeometry(zone) {
  try {
    return JSON.parse(zone.geometry)
  } catch {
    return null
  }
}

function buildHeatPoints(records) {
  return records
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map((item) => [item.lat, item.lng, Math.max(0.2, Number(item.intensity ?? 1) / 10)])
}

function renderChart(records) {
  const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
  const accidentSeries = bucketByHour(records, () => 1)
  const severitySeries = bucketByHour(records, (record) => Number(record.intensity ?? 0))

  if (!chart) {
    chart = new Chart(chartCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Accidentes por hora',
            data: accidentSeries,
            borderColor: '#123e7a',
            backgroundColor: 'rgba(18,62,122,0.16)',
            tension: 0.32,
          },
          {
            label: 'Intensidad acumulada',
            data: severitySeries,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13,110,253,0.16)',
            tension: 0.32,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              usePointStyle: true,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Eventos' },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Intensidad' },
          },
        },
      },
    })
    return
  }

  chart.data.labels = labels
  chart.data.datasets[0].data = accidentSeries
  chart.data.datasets[1].data = severitySeries
  chart.update()
}

function renderMap(records, zoneList) {
  if (!map) {
    map = L.map(mapContainer.value, {
      zoomControl: true,
    }).setView([6.2442, -75.5812], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
  }

  if (heatLayer) {
    heatLayer.remove()
  }

  if (zonesLayer) {
    zonesLayer.remove()
  }

  heatLayer = L.heatLayer(buildHeatPoints(records), {
    radius: 28,
    blur: 20,
    maxZoom: 15,
  }).addTo(map)

  const features = zoneList
    .map((zone) => {
      const geometry = parseZoneGeometry(zone)
      if (!geometry) return null
      return {
        type: 'Feature',
        geometry,
        properties: {
          name: zone.name,
          risk_level: zone.risk_level,
        },
      }
    })
    .filter(Boolean)

  zonesLayer = L.geoJSON(features, {
    style: (feature) => {
      const riskLevel = feature?.properties?.risk_level ?? 'media'
      return {
        color: riskToColor(riskLevel),
        weight: 2,
        fillColor: riskToColor(riskLevel),
        fillOpacity: riskToOpacity(riskLevel),
      }
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties?.name ?? 'Zona'
      const risk = feature.properties?.risk_level ?? 'media'
      layer.bindPopup(`<strong>${name}</strong><br/>Riesgo: ${risk}`)
    },
  }).addTo(map)

  if (features.length > 0) {
    const bounds = zonesLayer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15))
    }
  }
}

async function loadAllData() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [accidentsResponse, zonesResponse, rainResponse] = await Promise.all([
      fetchAccidents(hourFrom.value, hourTo.value),
      fetchZones(),
      fetchRainStatus(),
    ])

    accidents.value = accidentsResponse
    zones.value = zonesResponse
    rainStatus.value = rainResponse

    await nextTick()
    renderMap(accidents.value, zones.value)
    renderChart(accidents.value)
  } catch (error) {
    errorMessage.value = 'No se pudo cargar la API de Medellín Movilidata OS. Verifica que Django esté activo en localhost:8000.'
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function refreshAccidents() {
  try {
    const records = await fetchAccidents(hourFrom.value, hourTo.value)
    accidents.value = records
    renderMap(accidents.value, zones.value)
    renderChart(accidents.value)
  } catch (error) {
    errorMessage.value = 'No se pudo actualizar el filtro horario.'
    console.error(error)
  }
}

async function handleRainToggle() {
  loadingRain.value = true
  errorMessage.value = ''

  try {
    rainStatus.value = await toggleRainStatus()
  } catch (error) {
    errorMessage.value = 'No se pudo cambiar el estado de lluvia simulada.'
    console.error(error)
  } finally {
    loadingRain.value = false
  }
}

watch([hourFrom, hourTo], () => {
  normalizeRange()
  refreshAccidents()
})

onMounted(loadAllData)

onBeforeUnmount(() => {
  chart?.destroy()
  map?.remove()
})
</script>

<template>
  <main class="container-fluid py-4 py-lg-5 hero-shell">
    <div class="row g-4 align-items-stretch">
      <div class="col-12">
        <div class="card soft-panel border-0">
          <div class="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <p class="kpi mb-2">HackData CTGI SENA 2026</p>
              <h1 class="brand-title mb-1">Medellín Movilidata OS</h1>
              <p class="mb-0 text-secondary">Dashboard PWA con Django REST, Vue 3, mapa de calor, filtro horario y alerta de lluvia simulada.</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge rounded-pill text-bg-light px-3 py-2">{{ zoneCountLabel }}</span>
              <span class="badge rounded-pill text-bg-light px-3 py-2">{{ accidentCountLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-8">
        <div class="card border-0 h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div>
                <h2 class="h5 mb-1">Mapa de calor de siniestros</h2>
                <p class="text-secondary mb-0">Zonas de Medellín con polígonos de riesgo y densidad de accidentes filtrada por hora.</p>
              </div>
              <div class="d-flex align-items-center gap-2">
                <button class="btn btn-outline-primary btn-sm" type="button" :disabled="loadingRain" @click="handleRainToggle">
                  {{ rainStatus.isRaining ? 'Quitar lluvia simulada' : 'Simular lluvia' }}
                </button>
                <span class="badge rounded-pill" :class="`badge-risk-${selectedZoneRisk}`">Zona Centro: {{ selectedZoneRisk }}</span>
              </div>
            </div>

            <div ref="mapContainer" class="map-container rounded-4 border"></div>

            <div class="mt-3 d-flex flex-wrap gap-3 text-secondary small">
              <span>Filtro actual: {{ hourFrom }}:00 - {{ hourTo }}:00</span>
              <span>Estado lluvia: {{ rainStatus.isRaining ? 'Activa' : 'Inactiva' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-4">
        <div class="card border-0 h-100">
          <div class="card-body d-flex flex-column gap-3">
            <div>
              <h2 class="h5 mb-1">Alerta de rutas inseguras</h2>
              <p class="text-secondary mb-0">La lógica base usa la zona Centro y la lluvia simulada para producir la advertencia.</p>
            </div>

            <div class="alert mb-0" :class="alertClass" role="alert">
              {{ alertMessage }}
            </div>

            <div class="bg-light rounded-4 p-3">
              <p class="mb-1 text-secondary small">Zona predefinida</p>
              <p class="mb-0 fw-semibold">{{ selectedZone?.name ?? 'Centro' }}</p>
              <p class="mb-0 text-secondary">Riesgo: {{ selectedZoneRisk }}</p>
            </div>

            <div class="bg-light rounded-4 p-3">
              <p class="mb-1 text-secondary small">Filtro horario</p>
              <label class="form-label mb-1" for="hourFrom">Desde {{ hourFrom }}:00</label>
              <input id="hourFrom" v-model="hourFrom" type="range" class="form-range" min="0" max="23" step="1" />
              <label class="form-label mb-1 mt-2" for="hourTo">Hasta {{ hourTo }}:00</label>
              <input id="hourTo" v-model="hourTo" type="range" class="form-range" min="0" max="23" step="1" />
            </div>

            <div class="small text-secondary">
              {{ errorMessage || 'La app consulta directamente la API de Django en http://localhost:8000.' }}
            </div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card border-0">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div>
                <h2 class="h5 mb-1">Tendencia horaria</h2>
                <p class="text-secondary mb-0">Conteo de accidentes y acumulado de intensidad en el horario seleccionado.</p>
              </div>
              <span class="badge text-bg-primary px-3 py-2">{{ loading ? 'Cargando datos...' : 'Actualizado desde API' }}</span>
            </div>
            <div style="height: 320px">
              <canvas ref="chartCanvas" aria-label="Gráfico de accidentes por hora"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
