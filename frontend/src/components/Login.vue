<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AdminPanel from './admin/AdminPanel.vue'
import { fetchCurrentUser, loginUser, logoutUser } from '../api'

const AUTH_STORAGE_KEY = 'movilidata-auth-token'

const form = reactive({
  username: '',
  password: '',
  rememberMe: true,
})

const errors = reactive({
  username: '',
  password: '',
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const isRestoring = ref(true)
const authError = ref('')
const authToken = ref('')
const currentUser = ref(null)
const dashboard = ref(null)

function getStoredToken() {
  return localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY) || ''
}

function persistAuth(token, rememberMe) {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(AUTH_STORAGE_KEY, token)
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  currentUser.value = null
  dashboard.value = null
  authToken.value = ''
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function validateForm() {
  let valid = true

  if (!form.username.trim()) {
    errors.username = 'El nombre de usuario es obligatorio.'
    valid = false
  } else {
    errors.username = ''
  }

  if (!form.password) {
    errors.password = 'La contraseña es obligatoria.'
    valid = false
  } else {
    errors.password = ''
  }

  return valid
}

async function hydrateSession(token) {
  const response = await fetchCurrentUser(token)
  currentUser.value = response.user
  dashboard.value = response.dashboard
  authToken.value = token
}

async function restoreSession() {
  isRestoring.value = true
  authError.value = ''

  try {
    const token = getStoredToken()
    if (token) {
      await hydrateSession(token)
    }
  } catch (error) {
    clearAuth()
    authError.value = 'Tu sesión anterior expiró o ya no es válida.'
  } finally {
    isRestoring.value = false
  }
}

async function handleLogin() {
  authError.value = ''
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const response = await loginUser(form.username, form.password)
    persistAuth(response.token, form.rememberMe)
    currentUser.value = response.user
    dashboard.value = response.dashboard
    authToken.value = response.token
  } catch (error) {
    authError.value = 'No fue posible iniciar sesión. Revisa usuario y contraseña.'
    console.error(error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleLogout() {
  authError.value = ''

  try {
    if (authToken.value) {
      await logoutUser(authToken.value)
    }
  } catch (error) {
    console.error(error)
  } finally {
    clearAuth()
    form.username = ''
    form.password = ''
    form.rememberMe = true
  }
}

const isLoggedIn = computed(() => Boolean(currentUser.value && dashboard.value))

onMounted(restoreSession)
</script>

<template>
  <div class="animate-fade-in login-container-wrapper d-flex align-items-center justify-content-center py-4">
    <div v-if="isRestoring" class="glass-card p-4 p-md-5 rounded-4 border shadow text-center animate-scale-up" style="max-width: 500px; width: 100%">
      <div class="brand-badge mx-auto mb-3"></div>
      <h4 class="fw-bold text-dark mb-2">Restaurando sesión</h4>
      <p class="text-muted mb-0">Verificando acceso contra la API de Django...</p>
    </div>

    <div v-else-if="isLoggedIn" class="w-100">
      <AdminPanel :token="authToken" :user="currentUser" :dashboard="dashboard" @logout="handleLogout" />
    </div>

    <div v-else class="glass-card p-4 p-md-5 rounded-4 border shadow animate-scale-up" style="max-width: 520px; width: 100%">
      <div class="text-center mb-4">
        <div class="brand-badge mx-auto mb-3"></div>
        <h4 class="fw-bold text-dark mb-1">Acceso Administrativo</h4>
        <p class="text-muted small mb-0">Inicia sesión para ver tu panel de usuario o administrador</p>
      </div>

      <div v-if="authError" class="alert alert-danger border-0 shadow-sm small mb-3" role="alert">
        {{ authError }}
      </div>

      <form @submit.prevent="handleLogin" novalidate>
        <div class="mb-3">
          <label for="username" class="form-label small fw-semibold text-dark">Usuario</label>
          <input id="username" v-model="form.username" class="form-control rounded-3" :class="{ 'is-invalid': errors.username }" placeholder="admin o usuario" autocomplete="username" />
          <div class="invalid-feedback">{{ errors.username }}</div>
        </div>

        <div class="mb-3">
          <label for="password" class="form-label small fw-semibold text-dark">Contraseña</label>
          <div class="input-group">
            <input :type="showPassword ? 'text' : 'password'" id="password" v-model="form.password" class="form-control border-start-0" :class="{ 'is-invalid': errors.password }" placeholder="••••••••" autocomplete="current-password" />
            <button type="button" @click="togglePassword" class="btn btn-outline-secondary border rounded-end-3 px-3 shadow-none bg-white">{{ showPassword ? 'Ocultar' : 'Ver' }}</button>
            <div class="invalid-feedback">{{ errors.password }}</div>
          </div>
        </div>

        <div class="form-check mb-4">
          <input type="checkbox" id="rememberMe" v-model="form.rememberMe" class="form-check-input">
          <label for="rememberMe" class="form-check-label small text-secondary">Recordar sesión en este navegador</label>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-2.5 rounded-pill shadow-sm d-flex align-items-center justify-content-center" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ isSubmitting ? 'Iniciando sesión...' : 'Entrar' }}
        </button>
      </form>

      <div class="mt-4 pt-3 border-top small text-secondary">
        Credenciales demo: admin / Admin123! o usuario / Usuario123!
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container-wrapper {
  min-height: 480px;
  position: relative;
  z-index: 1;
}

.glass-card {
  background: rgba(255, 255, 255, 0.78);
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

.py-2\.5 {
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.12);
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
