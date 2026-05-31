<script setup>
import { ref } from 'vue'

const activeService = ref(null)

const services = [
  {
    id: 1,
    title: 'Visualización y Mapeo de Siniestralidad',
    description: 'Mapas interactivos geoespaciales y capas de calor históricos para identificar puntos críticos de accidentalidad vial en Medellín.',
    details: 'Utiliza tecnología Leaflet y WebGL para renderizar miles de puntos georreferenciados en tiempo real. Permite filtrar por tipo de vehículo, gravedad de incidente y ventana de tiempo, ideal para planeadores urbanos.',
    icon: 'map',
    badge: 'Core Feature'
  },
  {
    id: 2,
    title: 'Alertas Climáticas Inteligentes',
    description: 'Conexión con APIs meteorológicas para generar alertas proactivas a conductores ante lluvia o tormentas.',
    details: 'Algoritmo de alerta vial que evalúa las condiciones de lluvia y emite advertencias contextuales para vehículos de dos ruedas y transporte público en tramos con historial de deslizamiento o inundación.',
    icon: 'cloud-lightning-rain',
    badge: 'Real-time'
  },
  {
    id: 3,
    title: 'Análisis de Tendencias & Reportes',
    description: 'Tableros de analítica avanzada con tendencias horarias y mensuales de congestión y colisiones en la ciudad.',
    details: 'Generación de gráficos detallados con Chart.js para comprender patrones horarios (horas pico) de siniestralidad. Permite exportar datos consolidados en formatos CSV y JSON listos para su uso académico o institucional.',
    icon: 'bar-chart-line',
    badge: 'Analítica'
  },
  {
    id: 4,
    title: 'API de Integración Abierta',
    description: 'Endpoints listos para que aplicaciones externas consuman las estadísticas viales y de congestión de Medellín.',
    details: 'API JSON estructurada, documentada y ligera para que entidades externas, aplicaciones móviles de GPS o desarrolladores locales incorporen las alertas y datos históricos en sus propios sistemas de enrutamiento.',
    icon: 'code-slash',
    badge: 'Desarrolladores'
  },
  {
    id: 5,
    title: 'PWA con Soporte Offline',
    description: 'Instalación nativa de la aplicación en dispositivos móviles y funcionamiento sin conexión a internet.',
    details: 'Service Worker avanzado que almacena en caché los assets principales y datos estáticos clave de Medellín, garantizando que los conductores mantengan acceso a la cartografía crítica y guías viales sin gastar datos móviles.',
    icon: 'phone-vibrate',
    badge: 'Offline-ready'
  }
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
    <!-- Encabezado de la Sección -->
    <div class="row mb-5 text-center text-lg-start align-items-center">
      <div class="col-lg-8">
        <h1 class="h3 fw-bold text-dark mb-2">Servicios Inteligentes</h1>
        <p class="text-muted mb-0">Soluciones de análisis de movilidad, georreferenciación y alertas viales diseñadas para Medellín.</p>
      </div>
      <div class="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
        <span class="badge bg-primary px-3 py-2 rounded-pill shadow-sm">
          Propuesta Tecnológica
        </span>
      </div>
    </div>

    <!-- Servicios en Grid -->
    <div class="row g-4 mb-5">
      <div v-for="service in services" :key="service.id" class="col-md-6 col-lg-4">
        <div class="card h-100 border-0 shadow-sm card-hover-effect">
          <div class="card-body p-4 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="icon-box" :class="'icon-color-' + service.id">
                  <!-- SVG Map Icon -->
                  <svg v-if="service.icon === 'map'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.5.5 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103M10 1.91l-4-.8v12.98l4 .8zm1 12.98 4-.8V1.11l-4 .8zm-6-.8V1.11l-4 .8v12.98z"/>
                  </svg>
                  <!-- SVG Weather Icon -->
                  <svg v-if="service.icon === 'cloud-lightning-rain'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.658 11.026a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m9.5 0a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m-7.5 1.5a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m9.5 0a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m-7.105-1.259A.5.5 0 0 1 7.5 11h1a.5.5 0 0 1 .474.342l.5 1.5a.5.5 0 1 1-.948.316L8.13 12h-.762l-.396 1.158a.5.5 0 1 1-.948-.316z"/>
                    <path d="M13.405 4.027a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 10H13a3 3 0 0 0 .405-5.973M8.5 1a4 4 0 0 1 3.976 3.504l.008.082A2.5 2.5 0 0 1 13 9.5H3.5a3 3 0 1 1 .59-5.942A4 4 0 0 1 8.5 1"/>
                  </svg>
                  <!-- SVG Chart Icon -->
                  <svg v-if="service.icon === 'bar-chart-line'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z"/>
                  </svg>
                  <!-- SVG Code Icon -->
                  <svg v-if="service.icon === 'code-slash'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 1 0-.708-.708L1.707 5.854a.5.5 0 0 0 0 .708l2.439 2.439a.5.5 0 1 0 .708-.708L2.773 6l2.081-2.081Zm6.292.708a.5.5 0 0 0 .708-.708L9.414 1.707a.5.5 0 0 0-.708 0L6.268 4.146a.5.5 0 0 0 .708.708L9 2.773l2.146 2.146Z"/>
                  </svg>
                  <!-- SVG Phone Icon -->
                  <svg v-if="service.icon === 'phone-vibrate'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M10 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM6 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
                    <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2M1.599 4.02a.5.5 0 0 1 .116.696A7 7 0 0 0 1 8.5a7 7 0 0 0 .715 3.784.5.5 0 1 1-.877.48A8 8 0 0 1 0 8.5a8 8 0 0 1 .903-4.364.5.5 0 0 1 .696-.116m12.802 0a.5.5 0 0 1 .696.116A8 8 0 0 1 16 8.5a8 8 0 0 1-.903 4.364.5.5 0 1 1-.877-.48A7 7 0 0 0 15 8.5a7 7 0 0 0-.715-3.784.5.5 0 0 1 .116-.696M3.242 5.218a.5.5 0 0 1 .155.682A4.98 4.98 0 0 0 3 8.5c0 .967.275 1.87.753 2.636a.5.5 0 1 1-.85.528A5.98 5.98 0 0 1 2 8.5c0-1.161.33-2.246.903-3.16a.5.5 0 0 1 .682-.155m9.516 0a.5.5 0 0 1 .682.155A5.98 5.98 0 0 1 14 8.5c0 1.161-.33 2.246-.903 3.16a.5.5 0 1 1-.85-.528c.478-.766.753-1.669.753-2.636 0-.967-.275-1.87-.753-2.636a.5.5 0 0 1 .155-.682"/>
                  </svg>
                </div>
                <span class="badge text-primary bg-primary-subtle rounded-pill small-badge">{{ service.badge }}</span>
              </div>
              <h5 class="fw-bold text-dark mb-3">{{ service.title }}</h5>
              <p class="text-secondary small leading-relaxed m-0">{{ service.description }}</p>
            </div>
            
            <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
              <span class="text-muted small">CTGI HackData</span>
              <button @click="openModal(service)" class="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm-hover border">
                Ver Detalles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detalle Servicio -->
    <div v-if="activeService" class="custom-modal-overlay d-flex align-items-center justify-content-center p-3" @click.self="closeModal">
      <div class="custom-modal-content bg-white rounded-4 shadow-lg border p-4 p-md-5 position-relative animate-scale-up" style="max-width: 600px; width: 100%">
        <!-- Botón Cerrar -->
        <button @click="closeModal" class="btn-close position-absolute top-0 end-0 m-4 shadow-none" aria-label="Cerrar"></button>

        <div class="d-flex align-items-center mb-4">
          <div class="icon-box me-3" :class="'icon-color-' + activeService.id">
            <!-- SVG Map Icon (duplicate for inside modal) -->
            <svg v-if="activeService.icon === 'map'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.5.5 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103M10 1.91l-4-.8v12.98l4 .8zm1 12.98 4-.8V1.11l-4 .8zm-6-.8V1.11l-4 .8v12.98z"/>
            </svg>
            <svg v-if="activeService.icon === 'cloud-lightning-rain'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.658 11.026a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m9.5 0a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m-7.5 1.5a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m9.5 0a.5.5 0 0 1 .316.632l-.5 1.5a.5.5 0 1 1-.948-.316l.5-1.5a.5.5 0 0 1 .632-.316m-7.105-1.259A.5.5 0 0 1 7.5 11h1a.5.5 0 0 1 .474.342l.5 1.5a.5.5 0 1 1-.948.316L8.13 12h-.762l-.396 1.158a.5.5 0 1 1-.948-.316z"/>
              <path d="M13.405 4.027a5.001 5.001 0 0 0-9.499-1.004A3.5 3.5 0 1 0 3.5 10H13a3 3 0 0 0 .405-5.973M8.5 1a4 4 0 0 1 3.976 3.504l.008.082A2.5 2.5 0 0 1 13 9.5H3.5a3 3 0 1 1 .59-5.942A4 4 0 0 1 8.5 1"/>
            </svg>
            <svg v-if="activeService.icon === 'bar-chart-line'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z"/>
            </svg>
            <svg v-if="activeService.icon === 'code-slash'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 1 0-.708-.708L1.707 5.854a.5.5 0 0 0 0 .708l2.439 2.439a.5.5 0 1 0 .708-.708L2.773 6l2.081-2.081Zm6.292.708a.5.5 0 0 0 .708-.708L9.414 1.707a.5.5 0 0 0-.708 0L6.268 4.146a.5.5 0 0 0 .708.708L9 2.773l2.146 2.146Z"/>
            </svg>
            <svg v-if="activeService.icon === 'phone-vibrate'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M10 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM6 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
              <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2M1.599 4.02a.5.5 0 0 1 .116.696A7 7 0 0 0 1 8.5a7 7 0 0 0 .715 3.784.5.5 0 1 1-.877.48A8 8 0 0 1 0 8.5a8 8 0 0 1 .903-4.364.5.5 0 0 1 .696-.116m12.802 0a.5.5 0 0 1 .696.116A8 8 0 0 1 16 8.5a8 8 0 0 1-.903 4.364.5.5 0 1 1-.877-.48A7 7 0 0 0 15 8.5a7 7 0 0 0-.715-3.784.5.5 0 0 1 .116-.696M3.242 5.218a.5.5 0 0 1 .155.682A4.98 4.98 0 0 0 3 8.5c0 .967.275 1.87.753 2.636a.5.5 0 1 1-.85.528A5.98 5.98 0 0 1 2 8.5c0-1.161.33-2.246.903-3.16a.5.5 0 0 1 .682-.155m9.516 0a.5.5 0 0 1 .682.155A5.98 5.98 0 0 1 14 8.5c0 1.161-.33 2.246-.903 3.16a.5.5 0 1 1-.85-.528c.478-.766.753-1.669.753-2.636 0-.967-.275-1.87-.753-2.636a.5.5 0 0 1 .155-.682"/>
            </svg>
          </div>
          <div>
            <span class="badge text-primary bg-primary-subtle mb-1 rounded-pill">{{ activeService.badge }}</span>
            <h4 class="fw-bold text-dark mb-0">{{ activeService.title }}</h4>
          </div>
        </div>

        <p class="text-secondary leading-relaxed mb-4">
          {{ activeService.details }}
        </p>

        <div class="d-flex justify-content-end gap-2">
          <button @click="closeModal" class="btn btn-light px-4 border">Cerrar</button>
          <a href="#" @click.prevent="closeModal" class="btn btn-primary px-4 shadow-sm">Integrar en mi Flujo</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leading-relaxed {
  line-height: 1.65;
}

.icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

/* Diferentes colores de gradientes de fondo para los iconos de servicio */
.icon-color-1 { background: linear-gradient(135deg, rgba(13, 110, 253, 0.15) 0%, rgba(13, 110, 253, 0.05) 100%); color: #0d6efd; }
.icon-color-2 { background: linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(220, 53, 69, 0.05) 100%); color: #dc3545; }
.icon-color-3 { background: linear-gradient(135deg, rgba(25, 135, 84, 0.15) 0%, rgba(25, 135, 84, 0.05) 100%); color: #198754; }
.icon-color-4 { background: linear-gradient(135deg, rgba(111, 66, 193, 0.15) 0%, rgba(111, 66, 193, 0.05) 100%); color: #6f42c1; }
.icon-color-5 { background: linear-gradient(135deg, rgba(253, 126, 20, 0.15) 0%, rgba(253, 126, 20, 0.05) 100%); color: #fd7e14; }

.small-badge {
  font-size: 0.75rem;
  padding: 0.35em 0.8em;
}

.card-hover-effect {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.card-hover-effect:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(21, 81, 161, 0.08) !important;
}

.shadow-sm-hover {
  transition: all 0.2s ease;
}
.shadow-sm-hover:hover {
  background-color: #0d6efd;
  color: #fff !important;
  border-color: #0d6efd !important;
  box-shadow: 0 4px 10px rgba(13, 110, 253, 0.2);
}

/* Modal Estilos */
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(30, 42, 53, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1050;
  transition: all 0.3s ease;
}

.custom-modal-content {
  z-index: 1060;
}

/* Animaciones */
.animate-scale-up {
  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes scaleUp {
  from {
    transform: scale(0.92);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
