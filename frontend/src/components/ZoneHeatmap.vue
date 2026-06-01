<template>
  <div class="zone-heatmap card shadow-sm">
    <div class="card-header bg-success text-white">
      <h5 class="mb-0">
        <i class="bi bi-geo-alt"></i> Mapa de Zonas de Riesgo
      </h5>
    </div>

    <div class="card-body p-0">
      <!-- Loading State -->
      <div v-if="isLoading" class="d-flex justify-content-center align-items-center" style="height: 400px">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-else-if="error" class="alert alert-danger alert-sm m-3" role="alert">
        <small>{{ error }}</small>
      </div>

      <!-- Map Container -->
      <div v-else>
        <div ref="mapContainer" class="map-container" style="height: 400px"></div>

        <!-- Legend -->
        <div class="legend p-3 border-top">
          <h6 class="fw-bold mb-2">Niveles de Riesgo</h6>
          <div class="row">
            <div class="col-md-4 mb-2">
              <div class="legend-item">
                <span class="legend-color" style="background-color: #dc3545"></span>
                <small>Riesgo Alto</small>
              </div>
            </div>
            <div class="col-md-4 mb-2">
              <div class="legend-item">
                <span class="legend-color" style="background-color: #fd7e14"></span>
                <small>Riesgo Medio</small>
              </div>
            </div>
            <div class="col-md-4 mb-2">
              <div class="legend-item">
                <span class="legend-color" style="background-color: #198754"></span>
                <small>Riesgo Bajo</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Zone Stats -->
        <div class="stats p-3 border-top" v-if="zones.length > 0">
          <h6 class="fw-bold mb-2">Estadísticas</h6>
          <div class="row text-center">
            <div class="col-md-4">
              <div class="stat-box">
                <strong class="text-danger">{{ highRiskCount }}</strong>
                <small class="d-block text-muted">Zonas Alto Riesgo</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="stat-box">
                <strong class="text-warning">{{ mediumRiskCount }}</strong>
                <small class="d-block text-muted">Zonas Riesgo Medio</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="stat-box">
                <strong class="text-success">{{ lowRiskCount }}</strong>
                <small class="d-block text-muted">Zonas Bajo Riesgo</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Refresh Button -->
        <div class="p-3 border-top">
          <button
            class="btn btn-sm btn-success w-100"
            :disabled="isLoading"
            @click="refreshZones"
          >
            <i class="bi bi-arrow-clockwise"></i> Actualizar Zonas
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { fetchZonesWithData } from '../services/api'

const isLoading = ref(false)
const error = ref(null)
const mapContainer = ref(null)
const zones = ref([])
let map = null
let drawnItems = null

// Medellín center coordinates
const MEDELLIN_CENTER = [6.2442, -75.5898]

// Computed properties for statistics
const highRiskCount = computed(
  () => zones.value.filter((z) => z.risk_level === 'alta').length
)
const mediumRiskCount = computed(
  () => zones.value.filter((z) => z.risk_level === 'media').length
)
const lowRiskCount = computed(
  () => zones.value.filter((z) => z.risk_level === 'baja').length
)

const getRiskColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'alta':
      return '#dc3545' // red
    case 'media':
      return '#fd7e14' // orange
    case 'baja':
      return '#198754' // green
    default:
      return '#6c757d' // gray
  }
}

const initializeMap = () => {
  if (!mapContainer.value) return

  // Create map
  map = L.map(mapContainer.value).setView(MEDELLIN_CENTER, 12)

  // Add base layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // Layer group for zone polygons
  drawnItems = L.featureGroup()
  map.addLayer(drawnItems)
}

const drawZones = () => {
  if (!map || !drawnItems) return

  // Clear existing layers
  drawnItems.clearLayers()

  zones.value.forEach((zone) => {
    try {
      // Check if zone has coordinates (GeoJSON or array of coordinates)
      let coordinates = null

      if (zone.coordinates) {
        // GeoJSON format
        if (
          zone.coordinates.type === 'Polygon' &&
          Array.isArray(zone.coordinates.coordinates)
        ) {
          coordinates = zone.coordinates.coordinates[0]
        } else if (Array.isArray(zone.coordinates)) {
          coordinates = zone.coordinates
        }
      } else if (zone.polygon || zone.geometry) {
        // Alternative format
        coordinates = zone.polygon || zone.geometry
      }

      if (!coordinates || coordinates.length < 3) {
        console.warn(`Zone ${zone.id} has invalid coordinates`)
        return
      }

      // Create polygon
      const polygon = L.polygon(coordinates, {
        color: getRiskColor(zone.risk_level),
        weight: 2,
        opacity: 0.7,
        fillOpacity: 0.4,
        fillColor: getRiskColor(zone.risk_level),
      })

      // Add popup
      const popupContent = `
        <div class="zone-popup">
          <h6>${zone.name || 'Zona'}</h6>
          <p><strong>Riesgo:</strong> ${zone.risk_level || 'Desconocido'}</p>
          ${zone.description ? `<p><small>${zone.description}</small></p>` : ''}
          ${zone.incidents_count ? `<p><strong>Incidentes:</strong> ${zone.incidents_count}</p>` : ''}
        </div>
      `
      polygon.bindPopup(popupContent)

      polygon.addTo(drawnItems)
    } catch (err) {
      console.error(`Error drawing zone ${zone.id}:`, err)
    }
  })

  // Fit bounds to all zones
  if (drawnItems.getLayers().length > 0) {
    map.fitBounds(drawnItems.getBounds(), { padding: [50, 50] })
  }
}

const loadZones = async () => {
  error.value = null
  isLoading.value = true

  try {
    const data = await fetchZonesWithData()

    if (Array.isArray(data)) {
      zones.value = data
    } else if (data && Array.isArray(data.results)) {
      zones.value = data.results
    } else {
      zones.value = []
      console.warn('Zones data format unexpected:', data)
    }

    drawZones()
  } catch (err) {
    error.value = err.message || 'Error cargando zonas'
    console.error('Zones error:', err)
  } finally {
    isLoading.value = false
  }
}

const refreshZones = () => {
  loadZones()
}

const handleMapResize = () => {
  if (map) {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }
}

onMounted(() => {
  initializeMap()
  loadZones()

  // Handle window resize
  window.addEventListener('resize', handleMapResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleMapResize)
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.zone-heatmap {
  border: none;
  border-radius: 0.5rem;
  overflow: hidden;
}

.map-container {
  width: 100%;
  border-radius: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.stat-box {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.25rem;
}

.alert-sm {
  padding: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0;
}

:deep(.zone-popup) {
  font-size: 0.85rem;
}

:deep(.zone-popup h6) {
  margin-bottom: 0.5rem;
  font-weight: bold;
}

:deep(.zone-popup p) {
  margin-bottom: 0.25rem;
  word-break: break-word;
}

/* Leaflet override */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 0.25rem;
}
</style>
