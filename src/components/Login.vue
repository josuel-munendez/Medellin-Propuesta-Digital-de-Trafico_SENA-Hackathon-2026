<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const errors = reactive({
  username: '',
  password: ''
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const isLoggedIn = ref(false)
const loginError = ref('')

function togglePassword() {
  showPassword.value = !showPassword.value
}

function validateForm() {
  let isValid = true
  
  // Validar usuario
  if (!form.username.trim()) {
    errors.username = 'El nombre de usuario o correo electrónico es obligatorio.'
    isValid = false
  } else if (form.username.trim().length < 4) {
    errors.username = 'Debe tener al menos 4 caracteres.'
    isValid = false
  } else {
    errors.username = ''
  }

  // Validar contraseña
  if (!form.password) {
    errors.password = 'La contraseña es obligatoria.'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = 'Debe tener al menos 6 caracteres.'
    isValid = false
  } else {
    errors.password = ''
  }

  return isValid
}

function handleLogin() {
  loginError.value = ''
  if (!validateForm()) return

  isSubmitting.value = true

  // Simulación de autenticación
  setTimeout(() => {
    isSubmitting.value = false
    
    // Simular éxito para credenciales cualquiera, o error para probar
    if (form.username.toLowerCase() === 'admin' && form.password === '123456') {
      isLoggedIn.value = true
    } else {
      // Dejamos pasar cualquier cosa por fines de demostración en el Hackathon,
      // pero si ponen admin/123456 es una autenticación simulada oficial.
      // Permitimos iniciar sesión con fines interactivos siempre que sea válido formalmente:
      isLoggedIn.value = true
    }
  }, 1800)
}

function handleLogout() {
  isLoggedIn.value = false
  form.username = ''
  form.password = ''
  form.rememberMe = false
}
</script>

<template>
  <div class="animate-fade-in login-container-wrapper d-flex align-items-center justify-content-center py-4">
    
    <!-- Estado: Sesión Activa / Administrador -->
    <div v-if="isLoggedIn" class="glass-card p-4 p-md-5 rounded-4 border shadow text-center animate-scale-up" style="max-width: 480px; width: 100%">
      <div class="admin-avatar mx-auto mb-4 bg-gradient-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-9 8c0 1 1 1 1 1h10s1 0 1-1-1-4-6-4-6 3-6 4m7-11a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9H6a.5.5 0 0 1 0-1h1.5V5.5A.5.5 0 0 1 8 5"/>
        </svg>
      </div>
      <h3 class="fw-bold text-dark mb-1">¡Acceso Autorizado!</h3>
      <p class="text-success small fw-semibold mb-3">Panel de Reporte de Incidentes Activo</p>
      
      <div class="alert alert-info border-0 shadow-sm text-start mb-4 py-3">
        <h6 class="fw-bold mb-1 small text-dark"><i class="bi bi-shield-lock-fill me-1"></i>Sesión del Hackathon 2026</h6>
        <p class="mb-0 small text-secondary">Tienes permisos para simular reportes de colisiones e ingresar nuevos flujos de tráfico en la base de datos.</p>
      </div>

      <div class="d-grid gap-2">
        <button @click="handleLogout" class="btn btn-outline-danger rounded-pill py-2 border shadow-sm-hover">
          Cerrar Sesión Administrativa
        </button>
      </div>
    </div>

    <!-- Estado: Formulario de Login (Glassmorphism) -->
    <div v-else class="glass-card p-4 p-md-5 rounded-4 border shadow animate-scale-up" style="max-width: 450px; width: 100%">
      <div class="text-center mb-4">
        <div class="brand-badge mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0a8 8 0 0 0-8 8v.787c0 .16.023.315.066.465l.03-.012c.027-.009.054-.018.082-.027l.03-.01a6 6 0 0 1 11.583-1.48h.01a4 4 0 0 1 3.992 3.494H16V8a8 8 0 0 0-8-8M8 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
          </svg>
        </div>
        <h4 class="fw-bold text-dark mb-1">Acceso Administrativo</h4>
        <p class="text-muted small">Ingresa para gestionar incidentes viales</p>
      </div>

      <div v-if="loginError" class="alert alert-danger py-2 px-3 small rounded-3 mb-3 border-0 shadow-sm" role="alert">
        {{ loginError }}
      </div>

      <form @submit.prevent="handleLogin" novalidate>
        <!-- Usuario -->
        <div class="mb-3">
          <label for="username" class="form-label small fw-semibold text-dark">Usuario o Correo</label>
          <div class="input-group">
            <span class="input-group-text bg-white border-end-0 rounded-start-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-muted" viewBox="0 0 16 16">
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
              </svg>
            </span>
            <input 
              type="text" 
              id="username" 
              v-model="form.username" 
              class="form-control border-start-0 rounded-end-3" 
              :class="{'is-invalid': errors.username}"
              placeholder="admin o correo"
            />
            <div class="invalid-feedback">{{ errors.username }}</div>
          </div>
        </div>

        <!-- Contraseña -->
        <div class="mb-4">
          <label for="password" class="form-label small fw-semibold text-dark">Contraseña</label>
          <div class="input-group">
            <span class="input-group-text bg-white border-end-0 rounded-start-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-muted" viewBox="0 0 16 16">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1"/>
              </svg>
            </span>
            <input 
              :type="showPassword ? 'text' : 'password'" 
              id="password" 
              v-model="form.password" 
              class="form-control border-start-0" 
              :class="{'is-invalid': errors.password}"
              placeholder="••••••••"
            />
            <button 
              type="button" 
              @click="togglePassword" 
              class="btn btn-outline-secondary border rounded-end-3 px-3 shadow-none bg-white d-flex align-items-center justify-content-center"
              style="border-color: #dee2e6 !important;"
            >
              <!-- Icon Show -->
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-muted" viewBox="0 0 16 16">
                <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
              </svg>
              <!-- Icon Hide -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-muted" viewBox="0 0 16 16">
                <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474L2.234 4.354a8 8 0 0 0-.222.179c-.066.059-.115.11-.157.15l-.11.1c-.002.002-.006.007-.006.007l-.003.003c-.008.008-.017.022-.027.039A8 8 0 0 0 16 8a8 8 0 0 0-1.85-4.22c-.01-.017-.019-.03-.027-.038L13.8 3.42l-.006-.007s-.004-.005-.006-.007a8 8 0 0 0-.15-.14 8 8 0 0 0-.166-.145L10.79 12.912ZM9.89 11.028l-1.12-1.12a2.5 2.5 0 0 0-3.344-3.344L4.3 5.44a3.5 3.5 0 0 1 5.59 5.592Zm-5.385-6.9L1.3 1.3a.5.5 0 0 0-.707.707l1.58 1.58a8.03 8.03 0 0 0-1.76 2.378A8 8 0 0 0 0 8a8 8 0 0 0 1.85 4.22c.01.017.019.03.027.038l.315.315.006.007s.004.005.006.007a8 8 0 0 0 .15.14c.054.048.11.096.166.145l1.6 1.6a.5.5 0 0 0 .707-.707l-1.6-1.6c.077-.077.158-.152.24-.225a8.02 8.02 0 0 0 1.76-2.378c.08-.152.146-.31.196-.474l1.6 1.6a.5.5 0 0 0 .707-.707l-1.6-1.6c.074-.084.152-.162.23-.236l1.6-1.6a.5.5 0 0 0-.708-.707l-1.6 1.6Z"/>
              </svg>
            </button>
            <div class="invalid-feedback">{{ errors.password }}</div>
          </div>
        </div>

        <!-- Recordarme -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div class="form-check">
            <input type="checkbox" id="rememberMe" v-model="form.rememberMe" class="form-check-input">
            <label for="rememberMe" class="form-check-label small text-secondary">Recordar cuenta</label>
          </div>
          <a href="#" @click.prevent class="small text-primary text-decoration-none">¿Olvidó contraseña?</a>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary w-100 py-2.5 rounded-pill shadow-sm d-flex align-items-center justify-content-center"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ isSubmitting ? 'Iniciando Sesión...' : 'Entrar' }}
        </button>
      </form>
    </div>

  </div>
</template>

<style scoped>
.login-container-wrapper {
  min-height: 480px;
  background-position: center;
  background-size: cover;
  position: relative;
  z-index: 1;
}

/* Estilo Glassmorphism Premium */
.glass-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 8px 32px 0 rgba(21, 81, 161, 0.12) !important;
}

.brand-badge {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1551a1 0%, #0d6efd 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(13, 110, 253, 0.25);
}

.admin-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(40, 167, 69, 0.25);
}

.bg-gradient-success {
  background: linear-gradient(135deg, #198754 0%, #20c997 100%);
}

.py-2\.5 {
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.12);
}

.shadow-sm-hover {
  transition: all 0.2s ease;
}
.shadow-sm-hover:hover {
  background-color: #dc3545;
  color: white !important;
}

.animate-scale-up {
  animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
