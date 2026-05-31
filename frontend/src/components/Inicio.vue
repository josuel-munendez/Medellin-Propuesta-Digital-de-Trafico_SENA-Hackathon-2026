<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet.heat'
import {
  CategoryScale,
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import {
  fetchAccidents,
  fetchCongestionPrediction,
  fetchWeather,
  fetchZones,
  toggleRain,
} from '../services/api'

Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend)

const mapContainer = ref(null)
const chartCanvas = ref(null)
const accidents = ref([])
const zones = ref([])
const weather = ref({
  location: 'Medellín, CO',
  condition: 'Cargando clima',
  temperature: 22,
  isRaining: false,
  source: 'backend',
})
const prediction = ref(null)
const selectedZone = ref(null)
const hourFrom = ref(0)
const hourTo = ref(23)
const loading = ref(true)
const loadingRain = ref(false)
const errorMessage = ref('')

let map
let chart
let heatLayer
let zonesLayer
let weatherInterval

const activeZone = computed(() => selectedZone.value ?? zones.value.find((zone) => zone.risk_level === 'alta') ?? zones.value[0] ?? null)
const activeRisk = computed(() => activeZone.value?.risk_level ?? 'media')
const zoneCountLabel = computed(() => `${zones.value.length} zonas modeladas`)
const accidentCountLabel = computed(() => `${accidents.value.length} accidentes visibles`)
const forecastLabel = computed(() => {
  const forecast = prediction.value?.forecast ?? []
  if (!forecast.length) return 'Sin pronóstico disponible'
  return forecast.map((item) => `${item.hour}:00 ${item.risk_level}`).join(' · ')
})

const alertClass = computed(() => {
  if (weather.value.isRaining && activeRisk.value === 'alta') return 'alert-danger'
  if (activeRisk.value === 'alta') return 'alert-warning'
  if (activeRisk.value === 'media') return 'alert-soft'
  return 'alert-success'
})

const alertMessage = computed(() => {
  const zoneName = activeZone.value?.name ?? 'zona seleccionada'
  const riskText = {
    alta: `${zoneName} tiene riesgo alto.`,
    media: `${zoneName} tiene riesgo medio.`,
    baja: `${zoneName} tiene riesgo bajo.`,
  }[activeRisk.value]

  if (weather.value.isRaining && activeRisk.value === 'alta') {
    return `${riskText} Hay lluvia activa: evita esta ruta, reduce velocidad y prioriza corredores alternos.`
  }

  if (weather.value.isRaining) {
    return `${riskText} Hay lluvia activa: conduce con distancia preventiva y revisa el mapa de calor.`
  }

  return `${riskText} No hay lluvia reportada; usa el filtro horario para revisar la franja más crítica.`
})

function normalizeRange(changedField) {
  if (hourFrom.value > hourTo.value) {
    if (changedField === 'from') {
      hourTo.value = hourFrom.value
    } else {
      hourFrom.value = hourTo.value
    }
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
  if (riskLevel === 'alta') return 0.34
  if (riskLevel === 'media') return 0.24
  return 0.18
}

function parseZoneGeometry(zone) {
  try {
    return typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry
  } catch {
    return null
  }
}

function buildHeatPoints(records) {
  return records
    .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
    .map((item) => [Number(item.lat), Number(item.lng), Math.max(0.2, Number(item.intensity ?? 1) / 10)])
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
            backgroundColor: 'rgba(18,62,122,0.14)',
            tension: 0.32,
          },
          {
            label: 'Intensidad acumulada',
            data: severitySeries,
            borderColor: '#b85c00',
            backgroundColor: 'rgba(184,92,0,0.14)',
            tension: 0.32,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { usePointStyle: true } } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Eventos' } },
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

  chart.data.datasets[0].data = accidentSeries
  chart.data.datasets[1].data = severitySeries
  chart.update()
}

function renderMap(records, zoneList) {
  if (!map) {
    map = L.map(mapContainer.value, { zoomControl: true }).setView([6.2442, -75.5812], 12)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map)
  }

  heatLayer?.remove()
  zonesLayer?.remove()

  heatLayer = L.heatLayer(buildHeatPoints(records), { radius: 28, blur: 20, maxZoom: 15 }).addTo(map)

  const features = zoneList
    .map((zone) => {
      const geometry = parseZoneGeometry(zone)
      if (!geometry) return null
      return {
        type: 'Feature',
        geometry,
        properties: { id: zone.id, name: zone.name, risk_level: zone.risk_level },
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
      layer.on('click', () => {
        selectedZone.value = zoneList.find((zone) => zone.id === feature.properties?.id) ?? null
      })
    },
  }).addTo(map)

  if (features.length > 0) {
    const bounds = zonesLayer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15))
    }
  }
}

async function loadWeather() {
  weather.value = await fetchWeather()
}

async function loadPrediction() {
  prediction.value = await fetchCongestionPrediction(hourFrom.value)
}

async function loadAllData() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [accidentsResponse, zonesResponse, weatherResponse, predictionResponse] = await Promise.all([
      fetchAccidents(hourFrom.value, hourTo.value),
      fetchZones(),
      fetchWeather(),
      fetchCongestionPrediction(hourFrom.value),
    ])

    accidents.value = accidentsResponse
    zones.value = zonesResponse
    weather.value = weatherResponse
    prediction.value = predictionResponse
    selectedZone.value = zonesResponse.find((zone) => zone.risk_level === 'alta') ?? zonesResponse[0] ?? null

    await nextTick()
    renderMap(accidents.value, zones.value)
    renderChart(accidents.value)
  } catch (error) {
    errorMessage.value = 'No se pudo cargar la API de Urbanlytics. Verifica Django en localhost:8000 y MySQL activo.'
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function refreshAccidents(changedField) {
  normalizeRange(changedField)
  try {
    const [records] = await Promise.all([
      fetchAccidents(hourFrom.value, hourTo.value),
      loadPrediction(),
    ])
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
    weather.value = await toggleRain()
  } catch (error) {
    errorMessage.value = 'No se pudo cambiar el estado de lluvia simulada.'
    console.error(error)
  } finally {
    loadingRain.value = false
  }
}

watch(hourFrom, () => refreshAccidents('from'))
watch(hourTo, () => refreshAccidents('to'))

onMounted(() => {
  loadAllData()
  weatherInterval = setInterval(() => {
    loadWeather().catch((error) => console.error(error))
  }, 600000)
})

onBeforeUnmount(() => {
  if (weatherInterval) clearInterval(weatherInterval)
  chart?.destroy()
  map?.remove()
})
</script>

<template>
  <div class="animate-fade-in">
    <section class="hero-landing border shadow-sm mb-4 overflow-hidden">
      <div class="card-body p-4 p-lg-5 position-relative">
        <div class="row align-items-center g-4">
          <div class="col-lg-7">
            <span class="badge rounded-pill bg-light text-primary px-3 py-2 mb-3 shadow-sm">Urbanlytics · SENA Hackathon 2026</span>
            <h1 class="display-6 fw-bold text-dark mb-3 hero-title">Dashboard de riesgo vial para Medellín</h1>
            <p class="lead text-secondary mb-4">Mapa de calor, zonas críticas, clima y pronóstico simple para decidir rutas más seguras.</p>
            <div class="d-flex flex-wrap gap-2">
              <span class="hero-pill">Heatmap Leaflet</span>
              <span class="hero-pill">Filtro horario</span>
              <span class="hero-pill">Clima real</span>
              <span class="hero-pill">PWA offline</span>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="row g-3">
              <div class="col-6">
                <div class="mini-kpi border h-100">
                  <p class="text-muted small mb-1">Zonas</p>
                  <p class="fw-bold mb-0 small-display">{{ zoneCountLabel }}</p>
                </div>
              </div>
              <div class="col-6">
                <div class="mini-kpi border h-100">
                  <p class="text-muted small mb-1">Accidentes</p>
                  <p class="fw-bold mb-0 small-display">{{ accidentCountLabel }}</p>
                </div>
              </div>
              <div class="col-12">
                <div class="hero-accent text-white">
                  <p class="mb-2 small opacity-75">Zona activa</p>
                  <h3 class="h4 fw-bold mb-2">{{ activeZone?.name ?? 'Sin zona' }}</h3>
                  <p class="mb-0 opacity-75">Riesgo {{ activeRisk }} · {{ weather.isRaining ? 'lluvia activa' : 'sin lluvia' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card h-100 shadow-sm border-0 card-hover-effect">
          <div class="card-body p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
              <div>
                <h5 class="fw-bold text-dark m-0">Mapa de calor y zonas de riesgo</h5>
                <span class="text-muted small">Haz clic en un polígono para simular tu zona actual</span>
              </div>
              <span class="badge bg-primary px-3 py-2 rounded-pill">Medellín 6.2442, -75.5812</span>
            </div>
            <div ref="mapContainer" class="map-container rounded border shadow-inner"></div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card h-100 shadow-sm border-0 card-hover-effect card-gradient-bg">
          <div class="card-body p-4 d-flex flex-column justify-content-between gap-3">
            <div>
              <h5 class="fw-bold text-dark mb-4">Clima y alerta de ruta</h5>
              <div class="d-flex align-items-center mb-4">
                <div class="weather-temp-container me-3 bg-white p-3 rounded border">
                  <span class="display-5 fw-bold text-primary">{{ Math.round(weather.temperature ?? 22) }}°</span>
                  <span class="text-muted">C</span>
                </div>
                <div>
                  <h4 class="fw-semibold mb-0 text-dark">{{ weather.location }}</h4>
                  <p class="text-capitalize text-muted mb-0">{{ weather.condition }}</p>
                  <span class="badge bg-light text-secondary border">Fuente: {{ weather.source }}</span>
                </div>
              </div>

              <div class="alert mt-3" :class="alertClass" role="alert">
                {{ alertMessage }}
              </div>
            </div>

            <div class="d-grid gap-2">
              <button class="btn btn-outline-primary" type="button" @click="loadWeather">
                Actualizar clima
              </button>
              <button class="btn btn-primary" type="button" :disabled="loadingRain" @click="handleRainToggle">
                {{ weather.isRaining ? 'Quitar lluvia simulada' : 'Simular lluvia' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card shadow-sm border-0 card-hover-effect">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <div>
                <h5 class="fw-bold text-dark mb-1">Accidentes por hora</h5>
                <p class="text-muted small mb-0">El filtro consulta `/api/accidents/` y actualiza mapa + gráfico.</p>
              </div>
              <div class="d-flex gap-2">
                <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded">Accidentalidad</span>
                <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 rounded">Intensidad</span>
              </div>
            </div>

            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label for="hourFrom" class="form-label fw-semibold">Desde {{ hourFrom }}:00</label>
                <input id="hourFrom" v-model.number="hourFrom" class="form-range" type="range" min="0" max="23" />
              </div>
              <div class="col-md-6">
                <label for="hourTo" class="form-label fw-semibold">Hasta {{ hourTo }}:00</label>
                <input id="hourTo" v-model.number="hourTo" class="form-range" type="range" min="0" max="23" />
              </div>
            </div>

            <div class="chart-container">
              <canvas ref="chartCanvas" aria-label="Gráfico de accidentes por hora"></canvas>
            </div>

            <div class="d-flex flex-wrap gap-3 mt-4">
              <div class="kpi-pill">{{ zoneCountLabel }}</div>
              <div class="kpi-pill">{{ accidentCountLabel }}</div>
              <div class="kpi-pill">Filtro {{ hourFrom }}:00 - {{ hourTo }}:00</div>
            </div>

            <p v-if="loading" class="text-muted mt-3 mb-0">Cargando visualizaciones...</p>
            <p v-if="errorMessage" class="text-danger mt-3 mb-0">{{ errorMessage }}</p>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-sm border-0 card-hover-effect h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Pronóstico de congestión</h5>
            <p class="text-muted mb-3">Regresión lineal simple sobre accidentes históricos por hora.</p>
            <div class="forecast-panel">
              <p class="mb-2 fw-semibold">Próximas 2 horas</p>
              <p class="mb-0">{{ forecastLabel }}</p>
            </div>
            <button class="btn btn-outline-primary w-100 mt-3" type="button" @click="loadPrediction">
              Recalcular pronóstico
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-landing {
  position: relative;
  background: #ffffff;
  border-radius: 8px;
}

.hero-title {
  max-width: 15ch;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: rgba(18, 62, 122, 0.08);
  color: #123e7a;
  font-weight: 700;
  font-size: 0.9rem;
}

.mini-kpi,
.hero-accent,
.forecast-panel {
  border-radius: 8px;
  padding: 1rem;
}

.mini-kpi {
  background: rgba(255, 255, 255, 0.92);
}

.small-display {
  font-size: 1.35rem;
}

.hero-accent {
  background: linear-gradient(135deg, #123e7a 0%, #0d6efd 100%);
}

.map-container {
  height: 420px;
  z-index: 1;
}

.chart-container {
  position: relative;
  height: 320px;
  width: 100%;
}

.shadow-inner {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.card-hover-effect {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover-effect:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(21, 81, 161, 0.08) !important;
}

.card-gradient-bg {
  background: linear-gradient(145deg, #ffffff 0%, #f9fbfd 100%);
}

.weather-temp-container {
  min-width: 90px;
  text-align: center;
}

.forecast-panel {
  background: rgba(18, 62, 122, 0.08);
  color: #123e7a;
}

@media (max-width: 768px) {
  .map-container {
    height: 320px;
  }

  .chart-container {
    height: 280px;
  }
}
</style>
