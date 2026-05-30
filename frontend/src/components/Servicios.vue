<script setup>
import { ref } from 'vue'

const activeService = ref(null)

const services = [
  { id: 1, title: 'Mapas de siniestralidad', description: 'Mapa de calor y zonas de riesgo consumiendo la API REST de Django.', details: 'Visualización geoespacial de accidentes por hora y polígono de zonas críticas.', badge: 'Core' },
  { id: 2, title: 'Alertas de lluvia', description: 'Simulación de lluvia para mostrar rutas más peligrosas en contexto.', details: 'Botón interactivo que alterna el estado de lluvia desde el backend.', badge: 'Realtime' },
  { id: 3, title: 'Tendencias horarias', description: 'Gráficas para observar cómo cambia la accidentalidad por hora.', details: 'Permite comparar el volumen y la intensidad de los accidentes registrados.', badge: 'Analítica' },
  { id: 4, title: 'API abierta', description: 'Endpoints REST para integrar los datos en otros sistemas.', details: 'Diseñada para desarrollo rápido y consumo por frontend independiente.', badge: 'API' },
]

function openModal(service) {
  activeService.value = service
}

function closeModal() {
  activeService.value = null
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="row mb-5 text-center text-lg-start align-items-center">
      <div class="col-lg-8">
        <h1 class="h3 fw-bold text-dark mb-2">Servicios Inteligentes</h1>
        <p class="text-muted mb-0">Soluciones de análisis de movilidad, georreferenciación y alertas viales diseñadas para Medellín.</p>
      </div>
      <div class="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
        <span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm">Propuesta Tecnológica</span>
      </div>
    </div>

    <div class="row g-4">
      <div v-for="service in services" :key="service.id" class="col-md-6 col-lg-3">
        <div class="card h-100 border-0 shadow-sm card-hover-effect">
          <div class="card-body p-4 d-flex flex-column justify-content-between">
            <div>
              <div class="icon-box mb-3" :class="'icon-color-' + service.id">{{ service.id }}</div>
              <h5 class="fw-bold text-dark mb-3">{{ service.title }}</h5>
              <p class="text-secondary small leading-relaxed m-0">{{ service.description }}</p>
            </div>
            <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
              <span class="text-muted small">CTGI HackData</span>
              <button @click="openModal(service)" class="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm-hover border">Ver detalles</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeService" class="custom-modal-overlay d-flex align-items-center justify-content-center p-3" @click.self="closeModal">
      <div class="custom-modal-content bg-white rounded-4 shadow-lg border p-4 p-md-5 position-relative animate-scale-up" style="max-width: 600px; width: 100%">
        <button @click="closeModal" class="btn-close position-absolute top-0 end-0 m-4 shadow-none" aria-label="Cerrar"></button>
        <span class="badge text-primary bg-primary-subtle mb-2 rounded-pill">{{ activeService.badge }}</span>
        <h4 class="fw-bold text-dark mb-3">{{ activeService.title }}</h4>
        <p class="text-secondary leading-relaxed mb-4">{{ activeService.details }}</p>
        <div class="d-flex justify-content-end gap-2">
          <button @click="closeModal" class="btn btn-light px-4 border">Cerrar</button>
          <a href="#" @click.prevent="closeModal" class="btn btn-primary px-4 shadow-sm">Integrar</a>
        </div>
      </div>
    </div>
  </div>
</template>
