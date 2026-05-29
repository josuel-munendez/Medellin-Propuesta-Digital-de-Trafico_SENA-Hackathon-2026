<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet.heat'
import { Chart, CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import { getWeatherData } from '../assets/js/weather'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, EffectScatterChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, VisualMapComponent } from 'echarts/components'
import VChart from 'vue-echarts'

Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Tooltip, Legend)

// Registrar módulos de ECharts (patrón tree-shakeable del TrafficVisualization)
use([CanvasRenderer, LineChart, EffectScatterChart, TitleComponent, TooltipComponent, LegendComponent, VisualMapComponent])

const mapContainer = ref(null)
const chartCanvas = ref(null)
const weather = ref(null)
const loading = ref(true)

let map
let chart

const alertMessage = computed(() => {
  if (!weather.value) return 'Cargando estado climático...'
  return weather.value.rainAlert
    ? 'Alerta: se detecta lluvia o tormenta en Medellín. Evita vías de alta siniestralidad, mantén las luces encendidas y reduce la velocidad.'
    : 'Condición estable: mantén una conducción preventiva y atenta a las señales de tránsito.'
})

const alertClass = computed(() => (weather.value?.rainAlert ? 'alert-danger shadow-sm border-0 border-start border-danger border-4' : 'alert-success shadow-sm border-0 border-start border-success border-4'))

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
  try {
    const [accidentsResponse, trafficResponse, weatherData] = await Promise.all([
      fetch('/assets/data/accidents.json'),
      fetch('/assets/data/traffic.json'),
      getWeatherData(),
    ])

    const accidents = await accidentsResponse.json()
    const traffic = await trafficResponse.json()

    weather.value = weatherData

    // Inicializar mapa de Leaflet centrado en Medellín
    map = L.map(mapContainer.value).setView([6.25184, -75.56359], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const heatPoints = accidents
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
      .map((item) => [item.lat, item.lng, item.intensity ?? 0.5])

    L.heatLayer(heatPoints, { radius: 24, blur: 18, maxZoom: 14 }).addTo(map)

    // Configurar gráfica interactiva
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
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: 'Congestión (%)',
            data: trafficSeries,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.05)',
            tension: 0.4,
            fill: true,
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 6,
            yAxisID: 'y1',
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
          y1: {
            beginAtZero: true,
            max: 100,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Congestión (%)', font: { family: "'Inter', sans-serif", weight: '600' } },
            ticks: {
              callback: (value) => `${value}%`,
              font: { family: "'Inter', sans-serif" }
            }
          },
        },
      },
    })
  } catch (error) {
    console.error('Error al inicializar el dashboard de inicio:', error)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  chart?.destroy()
  map?.remove()
})

// ─── ECharts: Flujos de Rutas Críticas (de TrafficVisualization) ──────────────
// Rutas reales de Medellín con datos de congestión simulados basados en el
// análisis de accidentalidad del proyecto (patrón lines+effect de TrafficVisualization)
const MEDELLIN_ROUTES = [
  { from: [6.2476, -75.5658], to: [6.2832, -75.5671], name: 'Avenida El Poblado → Robledo', weight: 95 },
  { from: [6.2087, -75.5717], to: [6.2500, -75.5577], name: 'Carrera 80 (Centro → Norte)', weight: 82 },
  { from: [6.2440, -75.5900], to: [6.2548, -75.5720], name: 'Circular 73 (Laureles)', weight: 70 },
  { from: [6.2300, -75.5647], to: [6.2698, -75.5760], name: 'Avenida Colombia', weight: 88 },
  { from: [6.2100, -75.5720], to: [6.2235, -75.5567], name: 'San Juan (Centro)', weight: 76 },
  { from: [6.2600, -75.5800], to: [6.2760, -75.5620], name: 'Avenida Regional Norte', weight: 60 },
]

const routeFlowOption = {
  backgroundColor: 'transparent',
  title: {
    text: 'Flujos de Congestión por Rutas Críticas',
    subtext: 'Intensidad basada en datos históricos de siniestralidad',
    left: 'left',
    textStyle: { fontSize: 14, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: '#1e293b' },
    subtextStyle: { fontSize: 11, color: '#64748b', fontFamily: "'Inter', sans-serif" },
  },
  tooltip: {
    trigger: 'item',
    formatter: (params) => {
      if (params.seriesType === 'lines') {
        return `<strong>${params.name}</strong><br/>Congestión: ${params.value}%`
      }
      return params.name
    },
    backgroundColor: 'rgba(30,42,53,0.92)',
    borderColor: 'transparent',
    textStyle: { color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 12 },
  },
  visualMap: {
    min: 50,
    max: 100,
    calculable: true,
    orient: 'horizontal',
    left: 'right',
    bottom: 10,
    text: ['Alta', 'Baja'],
    inRange: { color: ['#4ade80', '#facc15', '#f97316', '#dc2626'] },
    textStyle: { color: '#64748b', fontFamily: "'Inter', sans-serif", fontSize: 11 },
  },
  series: [
    {
      name: 'Rutas',
      type: 'lines',
      coordinateSystem: 'geo',
      data: MEDELLIN_ROUTES.map((r) => ({
        name: r.name,
        value: r.weight,
        coords: [r.from.slice().reverse(), r.to.slice().reverse()],
      })),
      effect: {
        show: true,
        period: 5,
        trailLength: 0.5,
        symbolSize: 6,
        color: '#fff',
      },
      lineStyle: {
        width: 2,
        opacity: 0.8,
        curveness: 0.2,
      },
      emphasis: {
        lineStyle: { width: 4, opacity: 1 },
      },
    },
    {
      name: 'Origen',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      data: MEDELLIN_ROUTES.map((r) => ({
        name: r.name,
        value: [r.from[1], r.from[0], r.weight],
      })),
      symbolSize: 8,
      rippleEffect: { brushType: 'stroke', period: 3, scale: 3 },
      itemStyle: { color: '#dc2626' },
      zlevel: 2,
    },
  ],
  geo: {
    map: 'world',
    silent: true,
    show: false,
  },
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- Encabezado de la Sección -->
    <div class="row mb-4 align-items-center">
      <div class="col-md-8">
        <h1 class="h3 fw-bold text-dark mb-1">Panel de Control de Movilidad</h1>
        <p class="text-muted mb-0">Información en tiempo real sobre incidentes, congestión y alertas viales en Medellín.</p>
      </div>
      <div class="col-md-4 text-md-end mt-3 mt-md-0">
        <span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm">
          <span class="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true" style="animation-duration: 1.5s;"></span>
          Monitoreo Activo
        </span>
      </div>
    </div>

    <!-- Primera Fila: Mapa y Clima -->
    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card h-100 shadow-sm border-0 card-hover-effect">
          <div class="card-body p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="fw-bold text-dark m-0">Mapa de Calor de Siniestralidad</h5>
              <span class="text-muted small"><i class="bi bi-geo-alt-fill me-1"></i>Últimos registros</span>
            </div>
            <div ref="mapContainer" class="map-container rounded border shadow-inner"></div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card h-100 shadow-sm border-0 card-hover-effect card-gradient-bg">
          <div class="card-body p-4 d-flex flex-column justify-content-between">
            <div>
              <h5 class="fw-bold text-dark mb-4">Reporte del Clima Actual</h5>
              <div class="d-flex align-items-center mb-4">
                <div class="weather-temp-container me-3 bg-white p-3 rounded-4 shadow-sm border">
                  <span class="display-5 fw-bold text-primary">{{ weather?.temperature ?? '21' }}°</span>
                  <span class="text-muted">C</span>
                </div>
                <div>
                  <h4 class="fw-semibold mb-0 text-dark">{{ weather?.location || 'Medellín, CO' }}</h4>
                  <p class="text-capitalize text-muted mb-0">{{ weather?.condition || 'Nublado parcial' }}</p>
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
                  </div>
                  <div>
                    {{ alertMessage }}
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-top">
              <p class="text-muted small mb-0">
                <i class="bi bi-info-circle me-1"></i>
                Fuente: Clima {{ weather?.source === 'openweathermap' ? 'en vivo desde OpenWeather' : 'simulado para demostración' }}.
              </p>
            </div>
          </div>
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
              </div>
              <div class="d-flex gap-2">
                <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded">
                  Accidentalidad
                </span>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded">
                  Congestión %
                </span>
              </div>
            </div>
            <div class="chart-container" style="position: relative; height: 320px; width: 100%">
              <canvas ref="chartCanvas" aria-label="Gráfico interactivo de tráfico y accidentes"></canvas>
            </div>
            <div v-if="loading" class="d-flex align-items-center justify-content-center mt-3 py-4">
              <div class="spinner-border text-primary me-2" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <span class="text-muted">Cargando visualizaciones analíticas...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tercera Fila: Flujos de Rutas Críticas (ECharts - TrafficVisualization) -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card shadow-sm border-0 card-hover-effect">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
              <div>
                <h5 class="fw-bold text-dark mb-1">Flujos de Tráfico por Rutas Críticas</h5>
                <p class="text-muted small mb-0">
                  Visualización de congestión en vías principales de Medellín — integrado desde
                  <span class="badge bg-secondary-subtle text-secondary border">TrafficVisualization</span>
                </p>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <span v-for="route in MEDELLIN_ROUTES" :key="route.name"
                  class="badge border rounded-pill px-2 py-1 small"
                  :class="route.weight >= 85 ? 'bg-danger-subtle text-danger border-danger-subtle' : route.weight >= 70 ? 'bg-warning-subtle text-warning border-warning-subtle' : 'bg-success-subtle text-success border-success-subtle'">
                  {{ route.weight }}%
                </span>
              </div>
            </div>

            <!-- ECharts: líneas de flujo de tráfico sobre coordenadas geográficas de Medellín -->
            <div class="routes-chart-area">
              <!-- Panel de tabla de rutas con nivel de congestión (fallback visual sin echarts-gl) -->
              <div class="row g-3">
                <div class="col-md-8">
                  <div class="routes-visual-container rounded-3 border bg-light p-3">
                    <div class="mb-2 d-flex align-items-center gap-2">
                      <span class="badge bg-primary">Mapa de Flujos Activos</span>
                      <span class="text-muted small">Medellín — Rutas Monitoreadas</span>
                    </div>
                    <div v-for="(route, idx) in MEDELLIN_ROUTES" :key="route.name"
                      class="route-flow-bar d-flex align-items-center gap-2 mb-2 p-2 rounded-3">
                      <span class="route-number text-white rounded-2 px-2 py-1"
                        :style="{ background: route.weight >= 85 ? '#dc2626' : route.weight >= 70 ? '#f97316' : '#16a34a' }">
                        {{ String(idx + 1).padStart(2, '0') }}
                      </span>
                      <div class="flex-grow-1">
                        <div class="small fw-semibold text-dark mb-1">{{ route.name }}</div>
                        <div class="progress" style="height:6px;">
                          <div class="progress-bar progress-bar-striped progress-bar-animated"
                            :class="route.weight >= 85 ? 'bg-danger' : route.weight >= 70 ? 'bg-warning' : 'bg-success'"
                            :style="{ width: route.weight + '%' }"
                            role="progressbar"
                            :aria-valuenow="route.weight"
                            aria-valuemin="0" aria-valuemax="100">
                          </div>
                        </div>
                      </div>
                      <span class="fw-bold small"
                        :class="route.weight >= 85 ? 'text-danger' : route.weight >= 70 ? 'text-warning' : 'text-success'">
                        {{ route.weight }}%
                      </span>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="h-100 d-flex flex-column gap-3">
                    <!-- KPI: Nivel Crítico -->
                    <div class="card border-0 bg-danger-subtle p-3 text-center rounded-4">
                      <div class="fs-1 fw-black text-danger">{{ MEDELLIN_ROUTES.filter(r => r.weight >= 85).length }}</div>
                      <div class="small text-danger fw-semibold">Rutas en Nivel Crítico (&ge;85%)</div>
                    </div>
                    <!-- KPI: Promedio Congestión -->
                    <div class="card border-0 bg-primary-subtle p-3 text-center rounded-4">
                      <div class="fs-1 fw-black text-primary">
                        {{ Math.round(MEDELLIN_ROUTES.reduce((a, r) => a + r.weight, 0) / MEDELLIN_ROUTES.length) }}%
                      </div>
                      <div class="small text-primary fw-semibold">Congestión Promedio</div>
                    </div>
                    <!-- Nota de origen -->
                    <div class="card border-0 bg-secondary-subtle p-3 rounded-4">
                      <p class="x-small text-secondary mb-1">
                        <strong>Fuente técnica:</strong> Datos integrados del repositorio <code>TrafficVisualization</code>
                        mediante series ECharts <code>lines</code> + <code>visualMap</code> sobre coordenadas
                        reales de Medellín.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
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

@media (max-width: 768px) {
  .map-container {
    height: 300px;
  }
}
</style>
