<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createAdminAccident,
  createAdminUser,
  createAdminZone,
  deleteAdminAccident,
  deleteAdminUser,
  deleteAdminZone,
  fetchAdminAccidents,
  fetchAdminUsers,
  fetchAdminZones,
  updateAdminAccident,
  updateAdminUser,
  updateAdminZone,
} from '../../api'

const props = defineProps({
  token: { type: String, required: true },
  user: { type: Object, required: true },
  dashboard: { type: Object, required: true },
})

const emit = defineEmits(['logout'])

const accidents = ref([])
const zones = ref([])
const users = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const activeSection = ref('overview')

const accidentForm = reactive({ id: null, lat: '', lng: '', intensity: 5, hour: 8, date: '' })
const zoneForm = reactive({ id: null, name: '', risk_level: 'media', geometry: '' })
const userForm = reactive({ id: null, username: '', email: '', first_name: '', last_name: '', password: '', role: 'user', is_active: true })

const isAdmin = computed(() => props.user?.role === 'admin')

const metricCards = computed(() => {
  if (props.dashboard?.role === 'admin') {
    return [
      { label: 'Accidentes', value: props.dashboard.summary.accidents_count },
      { label: 'Zonas', value: props.dashboard.summary.zones_count },
      { label: 'Usuarios', value: props.dashboard.summary.users_count },
      { label: 'Zonas críticas', value: props.dashboard.summary.high_risk_zones },
    ]
  }

  return [
    { label: 'Zona recomendada', value: props.dashboard.summary.recommended_zone },
    { label: 'Riesgo', value: props.dashboard.summary.risk_level },
    { label: 'Alertas activas', value: props.dashboard.summary.active_alerts },
    { label: 'Accidentes visibles', value: props.dashboard.summary.visible_accidents },
  ]
})

function resetAccidentForm() {
  accidentForm.id = null
  accidentForm.lat = ''
  accidentForm.lng = ''
  accidentForm.intensity = 5
  accidentForm.hour = 8
  accidentForm.date = ''
}

function resetZoneForm() {
  zoneForm.id = null
  zoneForm.name = ''
  zoneForm.risk_level = 'media'
  zoneForm.geometry = ''
}

function resetUserForm() {
  userForm.id = null
  userForm.username = ''
  userForm.email = ''
  userForm.first_name = ''
  userForm.last_name = ''
  userForm.password = ''
  userForm.role = 'user'
  userForm.is_active = true
}

function editAccident(item) {
  accidentForm.id = item.id
  accidentForm.lat = item.lat
  accidentForm.lng = item.lng
  accidentForm.intensity = item.intensity
  accidentForm.hour = item.hour
  accidentForm.date = item.date || ''
  activeSection.value = 'accidents'
}

function editZone(item) {
  zoneForm.id = item.id
  zoneForm.name = item.name
  zoneForm.risk_level = item.risk_level
  zoneForm.geometry = item.geometry
  activeSection.value = 'zones'
}

function editUser(item) {
  userForm.id = item.id
  userForm.username = item.username
  userForm.email = item.email || ''
  userForm.first_name = item.first_name || ''
  userForm.last_name = item.last_name || ''
  userForm.password = ''
  userForm.role = item.role
  userForm.is_active = item.is_active
  activeSection.value = 'users'
}

async function loadAdminData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const tasks = [fetchAdminAccidents(props.token), fetchAdminZones(props.token)]
    if (isAdmin.value) tasks.push(fetchAdminUsers(props.token))
    const [accidentList, zoneList, userList] = await Promise.all(tasks)
    accidents.value = accidentList
    zones.value = zoneList
    if (isAdmin.value) {
      users.value = userList
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo cargar el panel administrativo.'
  } finally {
    loading.value = false
  }
}

async function saveAccident() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      lat: Number(accidentForm.lat),
      lng: Number(accidentForm.lng),
      intensity: Number(accidentForm.intensity),
      hour: Number(accidentForm.hour),
      date: accidentForm.date || null,
    }
    if (accidentForm.id) {
      await updateAdminAccident(props.token, accidentForm.id, payload)
    } else {
      await createAdminAccident(props.token, payload)
    }
    resetAccidentForm()
    await loadAdminData()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo guardar el accidente.'
  } finally {
    saving.value = false
  }
}

async function removeAccident(item) {
  if (!confirm('¿Eliminar este accidente?')) return
  await deleteAdminAccident(props.token, item.id)
  await loadAdminData()
}

async function saveZone() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      name: zoneForm.name,
      risk_level: zoneForm.risk_level,
      geometry: zoneForm.geometry,
    }
    if (zoneForm.id) {
      await updateAdminZone(props.token, zoneForm.id, payload)
    } else {
      await createAdminZone(props.token, payload)
    }
    resetZoneForm()
    await loadAdminData()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo guardar la zona.'
  } finally {
    saving.value = false
  }
}

async function removeZone(item) {
  if (!confirm('¿Eliminar esta zona?')) return
  await deleteAdminZone(props.token, item.id)
  await loadAdminData()
}

async function saveUser() {
  if (!isAdmin.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = {
      username: userForm.username,
      email: userForm.email,
      first_name: userForm.first_name,
      last_name: userForm.last_name,
      role: userForm.role,
      is_active: userForm.is_active,
    }
    if (userForm.password) {
      payload.password = userForm.password
    }
    if (userForm.id) {
      await updateAdminUser(props.token, userForm.id, payload)
    } else {
      await createAdminUser(props.token, payload)
    }
    resetUserForm()
    await loadAdminData()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo guardar el usuario.'
  } finally {
    saving.value = false
  }
}

async function removeUser(item) {
  if (!confirm('¿Eliminar este usuario?')) return
  await deleteAdminUser(props.token, item.id)
  await loadAdminData()
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleDateString('es-CO')
}

onMounted(loadAdminData)
</script>

<template>
  <section class="animate-fade-in">
    <div class="row g-4 mb-4">
      <div class="col-12">
        <div class="card soft-panel border-0">
          <div class="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <p class="kpi mb-2">Panel autenticado</p>
              <h2 class="brand-title mb-1">{{ dashboard.greeting }}</h2>
              <p class="text-secondary mb-0">{{ isAdmin ? 'Administración completa de datos, usuarios y zonas críticas.' : 'Vista de usuario con indicadores y alertas en tiempo real.' }}</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge rounded-pill text-bg-light px-3 py-2">{{ user.full_name }}</span>
              <span class="badge rounded-pill px-3 py-2" :class="isAdmin ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'">{{ user.role }}</span>
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="$emit('logout')">Cerrar sesión</button>
            </div>
          </div>
        </div>
      </div>

      <div v-for="card in metricCards" :key="card.label" class="col-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100 metric-card">
          <div class="card-body">
            <p class="text-muted small mb-1">{{ card.label }}</p>
            <p class="fw-bold mb-0 text-dark metric-value">{{ card.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Resumen y recomendaciones</h5>
            <ul class="list-unstyled mb-0 d-grid gap-3">
              <li v-for="item in dashboard.highlights || []" :key="item" class="d-flex gap-3 align-items-start">
                <span class="highlight-dot mt-1"></span>
                <span class="text-secondary">{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Sesión segura</h5>
            <p class="text-secondary mb-3">La sesión se gestiona con token de Django REST y el backend responde con permisos distintos para usuario y administrador.</p>
            <div class="bg-light rounded-4 p-3">
              <div class="row g-3">
                <div class="col-md-6">
                  <p class="small text-muted mb-1">Usuario</p>
                  <p class="mb-0 fw-semibold">{{ user.username }}</p>
                </div>
                <div class="col-md-6">
                  <p class="small text-muted mb-1">Correo</p>
                  <p class="mb-0 fw-semibold">{{ user.email || 'Sin correo' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex flex-wrap gap-2 mb-4" v-if="isAdmin">
      <button class="btn btn-outline-primary" :class="{ 'active': activeSection === 'overview' }" @click="activeSection = 'overview'">Resumen</button>
      <button class="btn btn-outline-primary" :class="{ 'active': activeSection === 'accidents' }" @click="activeSection = 'accidents'">Accidentes</button>
      <button class="btn btn-outline-primary" :class="{ 'active': activeSection === 'zones' }" @click="activeSection = 'zones'">Zonas</button>
      <button class="btn btn-outline-primary" :class="{ 'active': activeSection === 'users' }" @click="activeSection = 'users'">Usuarios</button>
    </div>

    <div v-if="loading" class="alert alert-info border-0 shadow-sm">Cargando datos administrativos...</div>
    <div v-if="errorMessage" class="alert alert-danger border-0 shadow-sm">{{ errorMessage }}</div>

    <div v-if="activeSection === 'overview' || !isAdmin" class="row g-4">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Estado del panel</h5>
            <p class="text-secondary mb-0">{{ isAdmin ? 'Puedes administrar accidentes, zonas y usuarios desde las secciones inferiores.' : 'Tu panel es de consulta. Puedes monitorear el mapa, las zonas y las alertas.' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isAdmin && activeSection === 'accidents'" class="row g-4 mb-4">
      <div class="col-12 col-xl-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">{{ accidentForm.id ? 'Editar accidente' : 'Nuevo accidente' }}</h5>
            <div class="row g-3">
              <div class="col-6"><input v-model="accidentForm.lat" type="number" step="0.0001" class="form-control" placeholder="Latitud" /></div>
              <div class="col-6"><input v-model="accidentForm.lng" type="number" step="0.0001" class="form-control" placeholder="Longitud" /></div>
              <div class="col-6"><input v-model="accidentForm.intensity" type="number" min="1" max="10" class="form-control" placeholder="Intensidad" /></div>
              <div class="col-6"><input v-model="accidentForm.hour" type="number" min="0" max="23" class="form-control" placeholder="Hora" /></div>
              <div class="col-12"><input v-model="accidentForm.date" type="date" class="form-control" /></div>
              <div class="col-12 d-flex gap-2">
                <button class="btn btn-primary flex-fill" type="button" :disabled="saving" @click="saveAccident">Guardar</button>
                <button class="btn btn-outline-secondary" type="button" @click="resetAccidentForm">Limpiar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-8">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Accidentes registrados</h5>
            <div class="table-responsive admin-table">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>ID</th><th>Lat</th><th>Lng</th><th>Intensidad</th><th>Hora</th><th>Fecha</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in accidents" :key="item.id">
                    <td>{{ item.id }}</td>
                    <td>{{ Number(item.lat).toFixed(4) }}</td>
                    <td>{{ Number(item.lng).toFixed(4) }}</td>
                    <td>{{ item.intensity }}</td>
                    <td>{{ String(item.hour).padStart(2, '0') }}:00</td>
                    <td>{{ formatDate(item.date) }}</td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary me-2" @click="editAccident(item)">Editar</button>
                      <button class="btn btn-sm btn-outline-danger" @click="removeAccident(item)">Eliminar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isAdmin && activeSection === 'zones'" class="row g-4 mb-4">
      <div class="col-12 col-xl-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">{{ zoneForm.id ? 'Editar zona' : 'Nueva zona' }}</h5>
            <div class="row g-3">
              <div class="col-12"><input v-model="zoneForm.name" class="form-control" placeholder="Nombre" /></div>
              <div class="col-12">
                <select v-model="zoneForm.risk_level" class="form-select">
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div class="col-12"><textarea v-model="zoneForm.geometry" rows="5" class="form-control" placeholder='{"type":"Polygon","coordinates":[...]}'></textarea></div>
              <div class="col-12 d-flex gap-2">
                <button class="btn btn-primary flex-fill" type="button" :disabled="saving" @click="saveZone">Guardar</button>
                <button class="btn btn-outline-secondary" type="button" @click="resetZoneForm">Limpiar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-8">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Zonas de riesgo</h5>
            <div class="table-responsive admin-table">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>ID</th><th>Nombre</th><th>Riesgo</th><th>GeoJSON</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in zones" :key="item.id">
                    <td>{{ item.id }}</td>
                    <td>{{ item.name }}</td>
                    <td><span class="badge" :class="`badge-risk-${item.risk_level}`">{{ item.risk_level }}</span></td>
                    <td class="text-truncate" style="max-width: 360px">{{ item.geometry }}</td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary me-2" @click="editZone(item)">Editar</button>
                      <button class="btn btn-sm btn-outline-danger" @click="removeZone(item)">Eliminar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isAdmin && activeSection === 'users'" class="row g-4 mb-4">
      <div class="col-12 col-xl-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">{{ userForm.id ? 'Editar usuario' : 'Nuevo usuario' }}</h5>
            <div class="row g-3">
              <div class="col-12"><input v-model="userForm.username" class="form-control" placeholder="Usuario" /></div>
              <div class="col-12"><input v-model="userForm.email" type="email" class="form-control" placeholder="Correo" /></div>
              <div class="col-6"><input v-model="userForm.first_name" class="form-control" placeholder="Nombre" /></div>
              <div class="col-6"><input v-model="userForm.last_name" class="form-control" placeholder="Apellido" /></div>
              <div class="col-12"><input v-model="userForm.password" type="password" class="form-control" placeholder="Contraseña" /></div>
              <div class="col-6">
                <select v-model="userForm.role" class="form-select">
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div class="col-6 d-flex align-items-center">
                <div class="form-check">
                  <input id="userActive" v-model="userForm.is_active" type="checkbox" class="form-check-input" />
                  <label for="userActive" class="form-check-label">Activo</label>
                </div>
              </div>
              <div class="col-12 d-flex gap-2">
                <button class="btn btn-primary flex-fill" type="button" :disabled="saving" @click="saveUser">Guardar</button>
                <button class="btn btn-outline-secondary" type="button" @click="resetUserForm">Limpiar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-8">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <h5 class="fw-bold text-dark mb-3">Usuarios registrados</h5>
            <div class="table-responsive admin-table">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>ID</th><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in users" :key="item.id">
                    <td>{{ item.id }}</td>
                    <td>{{ item.username }}</td>
                    <td>{{ item.full_name }}</td>
                    <td>{{ item.email || 'Sin correo' }}</td>
                    <td><span class="badge" :class="item.role === 'admin' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'">{{ item.role }}</span></td>
                    <td>{{ item.is_active ? 'Activo' : 'Inactivo' }}</td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary me-2" @click="editUser(item)">Editar</button>
                      <button class="btn btn-sm btn-outline-danger" @click="removeUser(item)">Eliminar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.metric-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 252, 0.95));
}

.metric-value {
  font-size: 1.05rem;
}

.highlight-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1551a1 0%, #0d6efd 100%);
  flex-shrink: 0;
}

.admin-table {
  max-height: 440px;
  overflow: auto;
}
</style>
