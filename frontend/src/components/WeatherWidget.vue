<template>
  <div class="weather-widget card shadow-sm">
    <div class="card-header bg-info text-white">
      <h5 class="mb-0">
        <i class="bi bi-cloud-sun"></i> Clima Actual y Histórico
      </h5>
    </div>

    <div class="card-body">
      <!-- Loading State -->
      <div v-if="isLoading" class="d-flex justify-content-center align-items-center" style="height: 200px">
        <div class="spinner-border text-info" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-else-if="error" class="alert alert-danger alert-sm" role="alert">
        <small>{{ error }}</small>
      </div>

      <!-- Current Weather -->
      <div v-else>
        <div class="current-weather p-3 bg-light rounded mb-3 border">
          <div class="row align-items-center">
            <div class="col-md-6">
              <div class="weather-icon mb-2">
                <span :class="getWeatherIcon(currentWeather.condition)"></span>
              </div>
              <h3 class="mb-2 fw-bold">{{ Math.round(currentWeather.temperature) }}°C</h3>
              <p class="mb-0 text-muted">{{ currentWeather.condition || 'Desconocido' }}</p>
            </div>
            <div class="col-md-6">
              <div class="weather-details">
                <div class="detail-row mb-2">
                  <small class="text-muted">Humedad:</small>
                  <strong>{{ currentWeather.humidity || 'N/A' }}%</strong>
                </div>
                <div class="detail-row mb-2">
                  <small class="text-muted">¿Lluvia?</small>
                  <strong>
                    <span v-if="currentWeather.is_raining" class="badge bg-primary">Sí</span>
                    <span v-else class="badge bg-success">No</span>
                  </strong>
                </div>
                <div class="detail-row">
                  <small class="text-muted">Actualizado:</small>
                  <strong>{{ formatTime(currentWeather.timestamp) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- History Chart -->
        <div class="history-section">
          <h6 class="fw-bold mb-3">Últimas 24 horas</h6>
          <div ref="chartContainer" class="chart-container position-relative">
            <canvas ref="chartElement"></canvas>
          </div>
        </div>

        <!-- Refresh Button -->
        <button
          class="btn btn-sm btn-info w-100 mt-3"
          :disabled="isLoading"
          @click="refreshWeather"
        >
          <i class="bi bi-arrow-clockwise"></i> Actualizar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chart } from 'chart.js'
import { fetchWeather, fetchWeatherHistory } from '../services/api'

const isLoading = ref(false)
const error = ref(null)
const currentWeather = ref({
  temperature: 0,
  condition: '',
  humidity: 0,
  is_raining: false,
  timestamp: new Date(),
})
const weatherHistory = ref([])
const chartElement = ref(null)
const chartContainer = ref(null)
let chartInstance = null

const getWeatherIcon = (condition) => {
  if (!condition) return 'text-muted'
  const lower = condition.toLowerCase()
  if (lower.includes('rain')) return 'bi bi-cloud-rain text-primary'
  if (lower.includes('cloud')) return 'bi bi-cloud text-secondary'
  if (lower.includes('sun') || lower.includes('clear') || lower.includes('sunny'))
    return 'bi bi-sun text-warning'
  if (lower.includes('storm')) return 'bi bi-cloud-lightning text-danger'
  return 'bi bi-cloud text-muted'
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'N/A'
  }
}

const loadWeatherData = async () => {
  error.value = null
  isLoading.value = true

  try {
    // Cargar clima actual
    const current = await fetchWeather()
    if (current) {
      currentWeather.value = {
        temperature: current.temperature || 0,
        condition: current.condition || 'Desconocido',
        humidity: current.humidity || 0,
        is_raining: current.is_raining || false,
        timestamp: current.timestamp || new Date(),
      }
    }

    // Cargar histórico
    try {
      const history = await fetchWeatherHistory()
      if (Array.isArray(history)) {
        weatherHistory.value = history
        renderChart()
      }
    } catch (historyErr) {
      console.warn('Weather history not available:', historyErr)
      // Continue without history - it's optional
    }
  } catch (err) {
    error.value = err.message || 'Error cargando clima'
    console.error('Weather error:', err)
  } finally {
    isLoading.value = false
  }
}

const renderChart = () => {
  if (!chartElement.value || weatherHistory.value.length === 0) return

  // Destruir gráfico anterior si existe
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartElement.value.getContext('2d')
  const labels = weatherHistory.value.map((w) => {
    try {
      const date = new Date(w.timestamp)
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'N/A'
    }
  })

  const temperatures = weatherHistory.value.map((w) => w.temperature || 0)
  const humidity = weatherHistory.value.map((w) => w.humidity || 0)

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: temperatures,
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ff6b6b',
        },
        {
          label: 'Humedad (%)',
          data: humidity,
          borderColor: '#4dabf7',
          backgroundColor: 'rgba(77, 171, 247, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#4dabf7',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { size: 12 },
            usePointStyle: true,
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Temperatura (°C)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Humedad (%)',
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  })
}

const refreshWeather = () => {
  loadWeatherData()
}

onMounted(() => {
  loadWeatherData()
})
</script>

<style scoped>
.weather-widget {
  border: none;
  border-radius: 0.5rem;
}

.current-weather {
  position: relative;
  overflow: hidden;
}

.weather-icon {
  font-size: 3rem;
  animation: float 3s ease-in-out infinite;
}

.weather-details {
  background: white;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  position: relative;
  height: 200px;
  margin-bottom: 1rem;
}

.alert-sm {
  padding: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Bootstrap Icons */
:deep(.bi) {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  fill: currentColor;
}
</style>
