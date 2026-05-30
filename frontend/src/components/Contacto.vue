<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  name: '',
  email: '',
  subject: 'General',
  message: '',
})

const errors = reactive({
  name: '',
  email: '',
  message: '',
})

const isSubmitting = ref(false)
const submitSuccess = ref(false)

function validateEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).toLowerCase())
}

function validateForm() {
  let isValid = true

  if (!form.name.trim()) {
    errors.name = 'El nombre es obligatorio.'
    isValid = false
  } else {
    errors.name = ''
  }

  if (!form.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.'
    isValid = false
  } else if (!validateEmail(form.email)) {
    errors.email = 'Introduce un correo electrónico válido.'
    isValid = false
  } else {
    errors.email = ''
  }

  if (!form.message.trim()) {
    errors.message = 'El mensaje no puede estar vacío.'
    isValid = false
  } else {
    errors.message = ''
  }

  return isValid
}

function handleSubmit() {
  if (!validateForm()) return

  isSubmitting.value = true

  setTimeout(() => {
    isSubmitting.value = false
    submitSuccess.value = true
    form.name = ''
    form.email = ''
    form.subject = 'General'
    form.message = ''
  }, 1000)
}

function resetSuccess() {
  submitSuccess.value = false
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="row mb-5 text-center text-lg-start align-items-center">
      <div class="col-lg-8">
        <h1 class="h3 fw-bold text-dark mb-2">Contacto</h1>
        <p class="text-muted mb-0">¿Tienes dudas, propuestas o deseas integrar nuestros datos? Escríbenos.</p>
      </div>
      <div class="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
        <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">Canal de Soporte</span>
      </div>
    </div>

    <div class="row g-4 mb-5">
      <div class="col-lg-5 order-lg-2">
        <div class="card border-0 shadow-sm bg-primary text-white p-4 h-100 card-hover-effect d-flex flex-column justify-content-between">
          <div>
            <h4 class="fw-bold mb-4">Información del Proyecto</h4>
            <p class="mb-4 opacity-90 leading-relaxed">Medellín Movilidata OS es una iniciativa tecnológica de analítica urbana para el HackData CTGI SENA 2026.</p>
            <div class="d-flex align-items-center mb-4">
              <div class="contact-icon bg-white bg-opacity-20 rounded-3 me-3"></div>
              <div>
                <h6 class="fw-bold mb-0">Ubicación principal</h6>
                <p class="small mb-0 opacity-80">SENA CTGI, Medellín, CO</p>
              </div>
            </div>
            <div class="d-flex align-items-center mb-4">
              <div class="contact-icon bg-white bg-opacity-20 rounded-3 me-3"></div>
              <div>
                <h6 class="fw-bold mb-0">Correo electrónico</h6>
                <p class="small mb-0 opacity-80">movilidata.sena@gmail.com</p>
              </div>
            </div>
          </div>
          <div class="pt-4 border-top border-white border-opacity-20 text-center text-lg-start">
            <span class="small opacity-75">© 2026 Medellín Movilidata OS</span>
          </div>
        </div>
      </div>

      <div class="col-lg-7 order-lg-1">
        <div class="card border-0 shadow-sm bg-white p-4 p-md-5 h-100 card-hover-effect">
          <div v-if="submitSuccess" class="text-center py-4 animate-scale-up">
            <h4 class="fw-bold text-dark mb-2">¡Mensaje enviado!</h4>
            <p class="text-muted mb-4">Recibimos tu mensaje y el equipo lo revisará en breve.</p>
            <button @click="resetSuccess" class="btn btn-primary rounded-pill px-4 shadow-sm">Enviar otro mensaje</button>
          </div>

          <form v-else @submit.prevent="handleSubmit" novalidate>
            <h4 class="fw-bold text-dark mb-4">Envíanos un mensaje</h4>
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label for="name" class="form-label small fw-semibold text-dark">Nombre</label>
                <input id="name" v-model="form.name" class="form-control rounded-3" :class="{ 'is-invalid': errors.name }" />
                <div class="invalid-feedback">{{ errors.name }}</div>
              </div>
              <div class="col-md-6">
                <label for="email" class="form-label small fw-semibold text-dark">Correo</label>
                <input id="email" type="email" v-model="form.email" class="form-control rounded-3" :class="{ 'is-invalid': errors.email }" />
                <div class="invalid-feedback">{{ errors.email }}</div>
              </div>
            </div>
            <div class="mb-3">
              <label for="subject" class="form-label small fw-semibold text-dark">Asunto</label>
              <select id="subject" v-model="form.subject" class="form-select rounded-3">
                <option value="General">Consulta general</option>
                <option value="Colaboracion">Propuesta de colaboración</option>
                <option value="Reporte">Reporte de fallos</option>
                <option value="API">Solicitud de acceso API</option>
              </select>
            </div>
            <div class="mb-4">
              <label for="message" class="form-label small fw-semibold text-dark">Mensaje</label>
              <textarea id="message" v-model="form.message" rows="4" class="form-control rounded-3" :class="{ 'is-invalid': errors.message }"></textarea>
              <div class="invalid-feedback">{{ errors.message }}</div>
            </div>
            <button type="submit" class="btn btn-primary w-100 py-2.5 rounded-pill shadow-sm d-flex align-items-center justify-content-center" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isSubmitting ? 'Enviando mensaje...' : 'Enviar mensaje' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
