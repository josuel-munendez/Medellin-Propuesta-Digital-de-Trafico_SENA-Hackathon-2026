<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  name: '',
  email: '',
  subject: 'General',
  message: ''
})

const errors = reactive({
  name: '',
  email: '',
  message: ''
})

const isSubmitting = ref(false)
const submitSuccess = ref(false)

function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return re.test(String(email).toLowerCase())
}

function validateForm() {
  let isValid = true
  
  // Validar nombre
  if (!form.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
    isValid = false
  } else if (form.name.trim().length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres.'
    isValid = false
  } else {
    errors.name = ''
  }

  // Validar email
  if (!form.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.'
    isValid = false
  } else if (!validateEmail(form.email)) {
    errors.email = 'Introduce un correo electrónico válido.'
    isValid = false
  } else {
    errors.email = ''
  }

  // Validar mensaje
  if (!form.message.trim()) {
    errors.message = 'El mensaje no puede estar vacío.'
    isValid = false
  } else if (form.message.trim().length < 10) {
    errors.message = 'El mensaje debe detallar al menos 10 caracteres.'
    isValid = false
  } else {
    errors.message = ''
  }

  return isValid
}

function handleSubmit() {
  if (!validateForm()) return

  isSubmitting.value = true

  // Simulando el envío a una API
  setTimeout(() => {
    isSubmitting.value = false
    submitSuccess.value = true
    
    // Resetear formulario
    form.name = ''
    form.email = ''
    form.subject = 'General'
    form.message = ''
  }, 1500)
}

function resetSuccess() {
  submitSuccess.value = false
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- Encabezado de la Sección -->
    <div class="row mb-5 text-center text-lg-start align-items-center">
      <div class="col-lg-8">
        <h1 class="h3 fw-bold text-dark mb-2">Contacto</h1>
        <p class="text-muted mb-0">¿Tienes dudas, propuestas o deseas integrar nuestros conjuntos de datos? Escríbenos.</p>
      </div>
      <div class="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
        <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">
          Canal de Soporte
        </span>
      </div>
    </div>

    <!-- Contenido Principal -->
    <div class="row g-4 mb-5">
      <!-- Columna 1: Tarjetas de Información de Contacto -->
      <div class="col-lg-5 order-lg-2">
        <div class="card border-0 shadow-sm bg-primary text-white p-4 h-100 card-hover-effect d-flex flex-column justify-content-between">
          <div>
            <h4 class="fw-bold mb-4">Información del Proyecto</h4>
            <p class="mb-4 opacity-90 leading-relaxed">
              Medellín Movilidata OS es una iniciativa tecnológica de analítica urbana desarrollada en el marco del HackData CTGI SENA 2026.
            </p>

            <div class="d-flex align-items-center mb-4">
              <div class="contact-icon bg-white bg-opacity-20 rounded-3 me-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.166 8.94c-.524-1.062-1.234-1.97-1.996-2.758L10 6l-.17.182c-.762.788-1.472 1.696-1.996 2.758C7.306 10.02 7 11.24 7 12c0 2.76 2.24 5 5 5s5-2.24 5-5c0-.76-.306-1.98-.834-3.06M12 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
                </svg>
              </div>
              <div>
                <h6 class="fw-bold mb-0">Ubicación principal</h6>
                <p class="small mb-0 opacity-80">SENA CTGI, Autopista Norte, Medellín, CO</p>
              </div>
            </div>

            <div class="d-flex align-items-center mb-4">
              <div class="contact-icon bg-white bg-opacity-20 rounded-3 me-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
                </svg>
              </div>
              <div>
                <h6 class="fw-bold mb-0">Correo Electrónico</h6>
                <p class="small mb-0 opacity-80">movilidata.sena@gmail.com</p>
              </div>
            </div>
          </div>

          <div class="pt-4 border-top border-white border-opacity-20 text-center text-lg-start">
            <span class="small opacity-75">© 2026 Medellín Movilidata OS</span>
          </div>
        </div>
      </div>

      <!-- Columna 2: Formulario Interactivo -->
      <div class="col-lg-7 order-lg-1">
        <div class="card border-0 shadow-sm bg-white p-4 p-md-5 h-100 card-hover-effect">
          
          <!-- Mensaje de Éxito -->
          <div v-if="submitSuccess" class="text-center py-4 animate-scale-up">
            <div class="success-icon bg-success-subtle text-success mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" class="bi bi-check2-circle" viewBox="0 0 16 16">
                <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0"/>
                <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z"/>
              </svg>
            </div>
            <h4 class="fw-bold text-dark mb-2">¡Mensaje Enviado con Éxito!</h4>
            <p class="text-muted mb-4 px-lg-5">
              Hemos recibido tu mensaje de forma segura. Nuestro equipo de analistas de datos viales lo revisará y se pondrá en contacto contigo en menos de 24 horas hábiles.
            </p>
            <button @click="resetSuccess" class="btn btn-primary rounded-pill px-4 shadow-sm">
              Enviar Otro Mensaje
            </button>
          </div>

          <!-- Formulario -->
          <form v-else @submit.prevent="handleSubmit" novalidate>
            <h4 class="fw-bold text-dark mb-4">Envíanos un Mensaje</h4>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label for="name" class="form-label small fw-semibold text-dark">Nombre Completo</label>
                <input 
                  type="text" 
                  id="name" 
                  v-model="form.name" 
                  class="form-control rounded-3" 
                  :class="{'is-invalid': errors.name}"
                  placeholder="Ej. Juan Pérez"
                />
                <div class="invalid-feedback">{{ errors.name }}</div>
              </div>

              <div class="col-md-6">
                <label for="email" class="form-label small fw-semibold text-dark">Correo Electrónico</label>
                <input 
                  type="email" 
                  id="email" 
                  v-model="form.email" 
                  class="form-control rounded-3" 
                  :class="{'is-invalid': errors.email}"
                  placeholder="juan.perez@ejemplo.com"
                />
                <div class="invalid-feedback">{{ errors.email }}</div>
              </div>
            </div>

            <div class="mb-3">
              <label for="subject" class="form-label small fw-semibold text-dark">Asunto del Mensaje</label>
              <select id="subject" v-model="form.subject" class="form-select rounded-3">
                <option value="General">Consulta General</option>
                <option value="Colaboracion">Propuesta de Colaboración</option>
                <option value="Reporte">Reporte de Fallos en Datos</option>
                <option value="API">Solicitud de Acceso API</option>
              </select>
            </div>

            <div class="mb-4">
              <label for="message" class="form-label small fw-semibold text-dark">Mensaje o Detalle</label>
              <textarea 
                id="message" 
                v-model="form.message" 
                rows="4" 
                class="form-control rounded-3" 
                :class="{'is-invalid': errors.message}"
                placeholder="Escribe tu mensaje detalladamente aquí..."
              ></textarea>
              <div class="invalid-feedback">{{ errors.message }}</div>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary w-100 py-2.5 rounded-pill shadow-sm d-flex align-items-center justify-content-center"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isSubmitting ? 'Enviando Mensaje...' : 'Enviar Mensaje' }}
            </button>
          </form>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leading-relaxed {
  line-height: 1.65;
}

.contact-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-hover-effect {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.card-hover-effect:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(21, 81, 161, 0.08) !important;
}

.py-2\.5 {
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.form-control:focus, .form-select:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.12);
}

.animate-scale-up {
  animation: scaleUp 0.25s ease-out forwards;
}

@keyframes scaleUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
