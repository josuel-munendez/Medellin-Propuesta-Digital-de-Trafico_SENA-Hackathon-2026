<template>
  <div class="traffic-flow-panel card shadow-sm">
    <div class="card-header bg-primary text-white">
      <h5 class="mb-0">
        <i class="bi bi-car-front"></i> Flujo de Tráfico
      </h5>
    </div>
    
    <div class="card-body">
      <!-- Route Selection -->
      <div class="mb-4">
        <label class="form-label fw-bold">Seleccionar ruta:</label>
        <div class="btn-group w-100" role="group">
          <button
            v-for="route in predefinedRoutes"
            :key="route.id"
            type="button"
            class="btn btn-outline-primary"
            :class="{ active: selectedRoute?.id === route.id }"
            @click="selectRoute(route)"
          >
            {{ route.name }}
          </button>
        </div>
      </div>

      <!-- Coordinates Input -->
      <div class="row mb-3">
        <div class="col-md-6">
          <label class="form-label">Coordenadas de inicio</label>
          <input
            v-model.number="startLat"
            type="number"
            class="form-control form-control-sm mb-2"
            placeholder="Latitud"
            step="0.0001"
          />
          <input
            v-model.number="startLng"
            type="number"
            class="form-control form-control-sm"
            placeholder="Longitud"
            step="0.0001"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label">Coordenadas de destino</label>
          <input
            v-model.number="endLat"
            type="number"
            class="form-control form-control-sm mb-2"
            placeholder="Latitud"
            step="0.0001"
          />
          <input
            v-model.number="endLng"
            type="number"
            class="form-control form-control-sm"
            placeholder="Longitud"
            step="0.0001"
          />
        </div>
      </div>

      <!-- Analyze Button -->
      <button
        class="btn btn-primary w-100 mb-3"
        :disabled="isLoading || !startLat || !startLng || !endLat || !endLng"
        @click="analyzeTraffic"
      >
        <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
        {{ isLoading ? 'Analizando...' : 'Analizar Tráfico' }}
      </button>

      <!-- Error Message -->
      <div v-if="error" class="alert alert-danger alert-sm" role="alert">
        <small>{{ error }}</small>
      </div>

      <!-- Results -->
      <div v-if="trafficData && !isLoading" class="traffic-results">
        <div class="row text-center">
          <div class="col-md-6 mb-2">
            <div class="result-box p-3 bg-light rounded">
              <small class="text-muted">Distancia</small>
              <h6 class="mb-0 fw-bold">{{ trafficData.distance?.toFixed(1) || 'N/A' }} km</h6>
            </div>
          </div>
          <div class="col-md-6 mb-2">
            <div class="result-box p-3 bg-light rounded">
              <small class="text-muted">Duración</small>
              <h6 class="mb-0 fw-bold">{{ formatDuration(trafficData.duration) }}</h6>
            </div>
          </div>
        </div>

        <div class="row text-center mt-2">
          <div class="col-md-6 mb-2">
            <div class="result-box p-3 bg-light rounded">
              <small class="text-muted">Velocidad Promedio</small>
              <h6 class="mb-0 fw-bold">{{ trafficData.speed || 'N/A' }} km/h</h6>
            </div>
          </div>
          <div class="col-md-6 mb-2">
            <div class="result-box p-3 bg-light rounded">
              <small class="text-muted">Congestión</small>
              <h6
                class="mb-0 fw-bold"
                :class="getCongestionClass(trafficData.congestion_percent)"
              >
                {{ trafficData.congestion_percent || 0 }}%
              </h6>
            </div>
          </div>
        </div>

        <!-- Status Indicator -->
        <div class="mt-3">
          <div
            class="p-3 rounded text-white text-center fw-bold"
            :style="{ backgroundColor: trafficData.status_color || '#999' }"
          >
            Estado: {{ trafficData.status || 'Desconocido' }}
          </div>
        </div>
      </div>

      <!-- No Results Message -->
      <div v-if="!trafficData && !isLoading && !error" class="text-center text-muted py-3">
        <small>Ingresa coordenadas y haz clic en "Analizar Tráfico"</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { analyzeTraffic } from '../services/api'

const isLoading = ref(false)
const error = ref(null)
const trafficData = ref(null)
const selectedRoute = ref(null)

// Coordenadas de entrada
const startLat = ref(6.2442)
const startLng = ref(-75.5898)
const endLat = ref(6.2258)
const endLng = ref(-75.5698)

// Rutas predefinidas de Medellín
const predefinedRoutes = [
  {
    id: 'poblado-centro',
    name: 'El Poblado → Centro',
    startCoords: [6.2442, -75.5898],
    endCoords: [6.2258, -75.5698],
  },
  {
    id: 'centro-bello',
    name: 'Centro → Bello',
    startCoords: [6.2258, -75.5698],
    endCoords: [6.3636, -75.5244],
  },
  {
    id: 'laureles-robledo',
    name: 'Laureles → Robledo',
    startCoords: [6.2437, -75.6052],
    endCoords: [6.3911, -75.5386],
  },
]

const selectRoute = (route) => {
  selectedRoute.value = route
  startLat.value = route.startCoords[0]
  startLng.value = route.startCoords[1]
  endLat.value = route.endCoords[0]
  endLng.value = route.endCoords[1]
}

const formatDuration = (minutes) => {
  if (!minutes) return 'N/A'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

const getCongestionClass = (percent) => {
  if (!percent) return ''
  if (percent >= 75) return 'text-danger'
  if (percent >= 50) return 'text-warning'
  return 'text-success'
}

const analyzeTraffic = async () => {
  error.value = null
  trafficData.value = null
  isLoading.value = true

  try {
    const startCoords = [startLat.value, startLng.value]
    const endCoords = [endLat.value, endLng.value]

    const data = await analyzeTraffic(startCoords, endCoords)
    trafficData.value = data
  } catch (err) {
    error.value = err.message || 'Error analizando tráfico'
    console.error('Traffic analysis error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.traffic-flow-panel {
  border: none;
  border-radius: 0.5rem;
}

.btn-group .btn {
  font-size: 0.85rem;
  padding: 0.4rem 0.6rem;
}

.result-box {
  border: 1px solid #dee2e6;
  transition: transform 0.2s;
}

.result-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.alert-sm {
  padding: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0;
}

.traffic-results {
  animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
