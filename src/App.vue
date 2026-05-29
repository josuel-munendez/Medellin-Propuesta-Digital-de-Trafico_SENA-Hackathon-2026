<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet.heat'
import { Chart, CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { getWeatherData } from './assets/js/weather'

Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend)

const mapContainer = ref(null)
const chartCanvas = ref(null)
const weather = ref(null)
const loading = ref(true)

let map
let chart

const alertMessage = computed(() => {
  if (!weather.value) return 'Cargando estado climático...'
  return weather.value.rainAlert
    ? 'Alerta: se detecta lluvia o tormenta. Evita vías con historial de incidentes y reduce la velocidad.'
    : 'Condición estable: mantén conducción preventiva y revisa la ocupación de las vías.'
})

const alertClass = computed(() => (weather.value?.rainAlert ? 'alert-danger' : 'alert-success'))

function buildHourlySeries(accidents) {
  const buckets = Array.from({ length: 24 }, () => 0)

  for (const accident of accidents) {
    if (Number.isInteger(accident.hour) && accident.hour >= 0 && accident.hour <= 23) {
      buckets[accident.hour] += 1
    }
  }

  return buckets
}

onMounted(async () => {
  const [accidentsResponse, trafficResponse, weatherData] = await Promise.all([
    fetch('/assets/data/accidents.json'),
    fetch('/assets/data/traffic.json'),
    getWeatherData(),
  ])

  const accidents = await accidentsResponse.json()
  const traffic = await trafficResponse.json()

  weather.value = weatherData

  map = L.map(mapContainer.value).setView([6.25184, -75.56359], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  const heatPoints = accidents
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map((item) => [item.lat, item.lng, item.intensity ?? 0.5])

  L.heatLayer(heatPoints, { radius: 24, blur: 18, maxZoom: 14 }).addTo(map)

  const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
  const accidentsSeries = buildHourlySeries(accidents)
  const trafficSeries = traffic.hourlyCongestion ?? []

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Accidentes por hora',
          data: accidentsSeries,
          borderColor: '#d9534f',
          backgroundColor: 'rgba(217,83,79,0.2)',
          tension: 0.3,
        },
        {
          label: 'Congestión (%)',
          data: trafficSeries,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13,110,253,0.2)',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Accidentes' },
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Congestión (%)' },
        },
      },
    },
  })

  loading.value = false
})

onBeforeUnmount(() => {
  chart?.destroy()
  map?.remove()
})
</script>

<template>
  <main class="container-fluid py-4 px-3 px-md-4">
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h1 class="brand-title mb-1">Medellín Movilidata OS</h1>
        <p class="mb-0 text-secondary">Dashboard de movilidad urbana para HackData CTGI SENA 2026</p>
      </div>
      <img src="/assets/img/logo-placeholder.svg" alt="Logo Medellín Movilidata OS" width="56" height="56" />
    </div>

    <div class="row g-4">
      <div class="col-12 col-xl-8">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h2 class="h5 mb-3">Mapa de calor de siniestros</h2>
            <div ref="mapContainer" class="map-container rounded border"></div>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-4">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <h2 class="h5 mb-3">Clima y alerta de seguridad</h2>
            <p class="card-value mb-1">{{ weather?.location || 'Medellín, CO' }}</p>
            <p class="mb-1">Condición: <strong>{{ weather?.condition || 'Cargando...' }}</strong></p>
            <p class="mb-3">Temperatura: <strong>{{ weather?.temperature ?? '--' }}°C</strong></p>
            <div class="alert" :class="alertClass" role="alert">
              {{ alertMessage }}
            </div>
            <p class="text-muted small mb-0">
              Fuente clima: {{ weather?.source || 'pendiente' }}.
              Agrega <code>VITE_OPENWEATHER_API_KEY</code> para datos en vivo.
            </p>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h2 class="h5 mb-3">Tendencia horaria de accidentes y congestión</h2>
            <div style="height: 320px">
              <canvas ref="chartCanvas" aria-label="Gráfico de accidentes por hora"></canvas>
            </div>
            <p v-if="loading" class="text-muted mt-3 mb-0">Cargando visualizaciones...</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
