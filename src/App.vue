<script setup>
import { ref, computed } from 'vue'

// Importar los componentes modulares creados
import Inicio from './components/Inicio.vue'
import Nosotros from './components/Nosotros.vue'
import Servicios from './components/Servicios.vue'
import Contacto from './components/Contacto.vue'
import Login from './components/Login.vue'
import RealtimeTracker from './components/RealtimeTracker.vue'

const currentTab = ref('inicio')
const sidebarOpenMobile = ref(false)

const views = {
  inicio: Inicio,
  nosotros: Nosotros,
  servicios: Servicios,
  contacto: Contacto,
  login: Login,
  rastreo: RealtimeTracker,
}

const navItems = [
  { id: 'inicio', label: 'Inicio', icon: 'house' },
  { id: 'nosotros', label: 'Nosotros', icon: 'people' },
  { id: 'servicios', label: 'Servicios', icon: 'grid' },
  { id: 'contacto', label: 'Contacto', icon: 'envelope' },
  { id: 'rastreo', label: 'Rastreo en Vivo', icon: 'broadcast' },
  { id: 'login', label: 'Acceso Admin', icon: 'lock' },
]

function switchTab(tabId) {
  currentTab.value = tabId
  sidebarOpenMobile.value = false // Cerrar sidebar en móviles tras navegar
}

function toggleMobileSidebar() {
  sidebarOpenMobile.value = !sidebarOpenMobile.value
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- BARRA DE NAVEGACIÓN SUPERIOR (SÓLO MÓVILES) -->
    <header class="mobile-navbar shadow-sm d-flex d-lg-none">
      <button class="btn border-0 p-0 text-dark" @click="toggleMobileSidebar" aria-label="Abrir menú de navegación">
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
        </svg>
      </button>
      <div class="d-flex align-items-center gap-2">
        <img src="/assets/img/logo-placeholder.svg" alt="Medellín Movilidata Logo" width="34" height="34" />
        <span class="brand-title m-0">Movilidata OS</span>
      </div>
      <div style="width: 26px;"></div> <!-- placeholder para centrado óptico -->
    </header>

    <!-- SIDEBAR LATERAL (DESKTOP & MOBILE DRAWER) -->
    <aside class="sidebar-panel" :class="{ 'show-mobile-sidebar': sidebarOpenMobile }">
      <!-- Encabezado Sidebar -->
      <div class="sidebar-header d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <img src="/assets/img/logo-placeholder.svg" alt="Medellín Movilidata Logo" width="40" height="40" />
          <div>
            <h5 class="brand-title m-0">Medellín</h5>
            <span class="text-muted small fw-semibold">Movilidata OS</span>
          </div>
        </div>
        <!-- Botón Cerrar en móvil -->
        <button class="btn btn-close d-lg-none shadow-none" @click="toggleMobileSidebar" aria-label="Cerrar menú"></button>
      </div>

      <!-- Menú de Pestañas -->
      <nav class="sidebar-body">
        <ul class="nav-menu">
          <li v-for="item in navItems" :key="item.id">
            <a 
              class="nav-item-link" 
              :class="{ 'active-link': currentTab === item.id }"
              @click.prevent="switchTab(item.id)"
            >
              <!-- Iconos SVG integrados directamente para evitar dependencias externas -->
              <!-- House Icon -->
              <svg v-if="item.icon === 'house'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
              </svg>
              <!-- People Icon -->
              <svg v-if="item.icon === 'people'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.047 1.09-2.904.243-.294.526-.569.846-.816M4.92 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M6 5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0"/>
              </svg>
              <!-- Grid Icon -->
              <svg v-if="item.icon === 'grid'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/>
              </svg>
              <!-- Envelope Icon -->
              <svg v-if="item.icon === 'envelope'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
              </svg>
              <!-- Broadcast / Rastreo Icon -->
              <svg v-if="item.icon === 'broadcast'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3.05 3.05a7 7 0 0 0 0 9.9.5.5 0 0 1-.707.707 8 8 0 0 1 0-11.314.5.5 0 0 1 .707.707m2.122 2.122a4 4 0 0 0 0 5.656.5.5 0 1 1-.708.708 5 5 0 0 1 0-7.072.5.5 0 0 1 .708.708m5.656-.708a.5.5 0 0 1 .708 0 5 5 0 0 1 0 7.072.5.5 0 1 1-.708-.708 4 4 0 0 0 0-5.656.5.5 0 0 1 0-.708m2.122-2.12a.5.5 0 0 1 .707 0 8 8 0 0 1 0 11.313.5.5 0 0 1-.707-.707 7 7 0 0 0 0-9.9.5.5 0 0 1 0-.707zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/>
              </svg>
              <!-- Lock Icon -->
              <svg v-if="item.icon === 'lock'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1"/>
              </svg>
              <span>{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- Pie del Sidebar -->
      <footer class="sidebar-footer">
        <div class="d-flex align-items-center justify-content-between">
          <span class="text-secondary small fw-medium">SENA CTGI</span>
          <span class="badge bg-light text-primary border">v1.1.0</span>
        </div>
      </footer>
    </aside>

    <!-- PÁGINA O CONTENIDO PRINCIPAL -->
    <main class="main-content-panel">
      <!-- Renderizado Dinámico con KeepAlive para mantener persistido el estado de los mapas y gráficos de la pestaña Inicio -->
      <KeepAlive>
        <component :is="views[currentTab]" />
      </KeepAlive>
    </main>

    <!-- FONDO BLUR OSCURO AL ABRIR MENU EN MOVIL -->
    <div 
      v-if="sidebarOpenMobile" 
      class="mobile-backdrop d-lg-none" 
      @click="toggleMobileSidebar"
    ></div>
  </div>
</template>

<style scoped>
.mobile-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(30, 42, 53, 0.4);
  backdrop-filter: blur(4px);
  z-index: 98;
}

@media (max-width: 991.98px) {
  .mobile-backdrop {
    display: block;
  }
}
</style>
