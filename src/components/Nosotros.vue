<template>
  <div class="animate-fade-in">
    <!-- Encabezado de la Sección -->
    <div class="row mb-5 text-center text-lg-start align-items-center">
      <div class="col-lg-8">
        <h1 class="h3 fw-bold text-dark mb-2">Sobre Nosotros</h1>
        <p class="text-muted mb-0">La propuesta digital que está transformando la gestión de movilidad y seguridad vial en la ciudad de Medellín.</p>
      </div>
      <div class="col-lg-4 text-center text-lg-end mt-4 mt-lg-0">
        <div class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2 rounded-pill">
          HackData CTGI SENA 2026
        </div>
      </div>
    </div>

    <!-- Misión y Visión con Diseño Moderno -->
    <div class="row g-4 mb-5">
      <div class="col-md-6">
        <div class="card h-100 shadow-sm border-0 bg-white card-hover-effect">
          <div class="card-body p-4 p-lg-5">
            <div class="icon-circle bg-primary-subtle text-primary mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-compass" viewBox="0 0 16 16">
                <path d="M8 16.012a8 8 0 1 1 0-16.012 8 8 0 0 1 0 16.012m0-1a7 7 0 1 0 0-14 7 7 0 0 0 0 14"/>
                <path d="M6.107 12.908a.5.5 0 0 0 .576.576l4-1a.5.5 0 0 0 .324-.324l1-4a.5.5 0 0 0-.576-.576l-4 1a.5.5 0 0 0-.324.324zM8.358 8.1l.03.03a.5.5 0 0 0 .708-.707L9.066 7.4A.5.5 0 0 0 8.358 8.1M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5"/>
              </svg>
            </div>
            <h4 class="fw-bold text-dark mb-3">Nuestra Misión</h4>
            <p class="text-secondary leading-relaxed mb-0">
              Desarrollar y proveer soluciones analíticas de alto impacto digital para mitigar la siniestralidad vial en Medellín. Aprovechando el poder de los datos y la tecnología móvil, capacitamos a ciudadanos y tomadores de decisiones para planificar rutas más seguras e inteligentes diariamente.
            </p>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card h-100 shadow-sm border-0 bg-white card-hover-effect">
          <div class="card-body p-4 p-lg-5">
            <div class="icon-circle bg-info-subtle text-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 4 8 4s3.879.668 5.168 1.957A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12 8 12s-3.879-.668-5.168-1.957A13 13 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
              </svg>
            </div>
            <h4 class="fw-bold text-dark mb-3">Nuestra Visión</h4>
            <p class="text-secondary leading-relaxed mb-0">
              Convertirnos para 2028 en la plataforma PWA líder de análisis predictivo de movilidad en el Valle de Aburrá. Aspiramos a integrar de manera fluida inteligencia artificial y flujos de información en vivo que ayuden a disminuir en un 30% los índices de accidentes viales urbanos.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Objetivos Clave en Grid de Tarjetas -->
    <div class="mb-5">
      <h3 class="fw-bold text-dark text-center mb-4">Pilares de Desarrollo</h3>
      <div class="row g-4">
        <div class="col-md-4">
          <div class="card border-0 shadow-sm text-center h-100 card-hover-effect">
            <div class="card-body p-4">
              <div class="badge-icon bg-danger-subtle text-danger mx-auto mb-3">01</div>
              <h5 class="fw-bold text-dark mb-2">Prevención Activa</h5>
              <p class="text-muted small mb-0">Identificación precisa y visualización en tiempo real de los puntos geográficos con mayor índice de siniestros viales.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm text-center h-100 card-hover-effect">
            <div class="card-body p-4">
              <div class="badge-icon bg-primary-subtle text-primary mx-auto mb-3">02</div>
              <h5 class="fw-bold text-dark mb-2">Análisis de Tendencias</h5>
              <p class="text-muted small mb-0">Monitoreo de horas críticas de congestión y accidentes para habilitar una planificación horaria óptima e inteligente.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm text-center h-100 card-hover-effect">
            <div class="card-body p-4">
              <div class="badge-icon bg-success-subtle text-success mx-auto mb-3">03</div>
              <h5 class="fw-bold text-dark mb-2">Alertas Climáticas</h5>
              <p class="text-muted small mb-0">Integración con reportes meteorológicos reales para emitir advertencias dinámicas inmediatas en condiciones lluviosas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de Equipo Técnico -->
    <div class="mb-4">
      <div class="text-center mb-5">
        <h3 class="fw-bold text-dark m-0">Nuestro Equipo Técnico</h3>
        <p class="text-muted">Desarrolladores y analistas apasionados de la Hackathon SENA 2026.</p>
      </div>

      <div class="row g-4 justify-content-center">
        <!-- Miembro 1 -->
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm text-center h-100 card-hover-effect">
            <div class="card-body p-4">
              <div class="avatar-container mb-3 mx-auto">
                <div class="avatar-placeholder bg-gradient-primary">
                  <span class="fs-3 fw-bold text-white">PQ</span>
                </div>
              </div>
              <h5 class="fw-bold text-dark mb-1">Pipe Quiros</h5>
              <p class="text-primary small fw-semibold mb-3">Frontend Developer & UX Designer</p>
              <p class="text-muted small mb-3">Especialista en Vue.js, diseño de interfaces responsivas premium, integración de mapas interactivos y optimización de PWA.</p>
              <div class="d-flex justify-content-center gap-2">
                <span class="badge bg-light text-secondary border">Vue 3</span>
                <span class="badge bg-light text-secondary border">Leaflet</span>
                <span class="badge bg-light text-secondary border">Bootstrap</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Miembro 2 -->
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm text-center h-100 card-hover-effect">
            <div class="card-body p-4">
              <div class="avatar-container mb-3 mx-auto">
                <div class="avatar-placeholder bg-gradient-secondary">
                  <span class="fs-3 fw-bold text-white">JM</span>
                </div>
              </div>
              <h5 class="fw-bold text-dark mb-1">Jose Muñoz</h5>
              <p class="text-success small fw-semibold mb-3">Backend Developer & DB Admin</p>
              <p class="text-muted small mb-3">Responsable del desarrollo del backend con Django, modelado de bases de datos relacionales en MySQL y diseño de APIs REST.</p>
              <div class="d-flex justify-content-center gap-2">
                <span class="badge bg-light text-secondary border">Django</span>
                <span class="badge bg-light text-secondary border">MySQL</span>
                <span class="badge bg-light text-secondary border">APIs REST</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Miembro 3 -->
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm text-center h-100 card-hover-effect">
            <div class="card-body p-4">
              <div class="avatar-container mb-3 mx-auto">
                <div class="avatar-placeholder bg-gradient-info">
                  <span class="fs-3 fw-bold text-white">SP</span>
                </div>
              </div>
              <h5 class="fw-bold text-dark mb-1">Samuel Perez</h5>
              <p class="text-info small fw-semibold mb-3">Data Analyst & QA Engineer</p>
              <p class="text-muted small mb-3">Experto en procesamiento de datasets de siniestralidad, análisis de tendencias horarias, georreferenciación y pruebas de usabilidad.</p>
              <div class="d-flex justify-content-center gap-2">
                <span class="badge bg-light text-secondary border">Data Science</span>
                <span class="badge bg-light text-secondary border">Chart.js</span>
                <span class="badge bg-light text-secondary border">QA Testing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leading-relaxed {
  line-height: 1.65;
}

.icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.avatar-container {
  width: 90px;
  height: 90px;
  position: relative;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #1551a1 0%, #0d6efd 100%);
}

.bg-gradient-secondary {
  background: linear-gradient(135deg, #198754 0%, #20c997 100%);
}

.bg-gradient-info {
  background: linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%);
}

.card-hover-effect {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.card-hover-effect:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(21, 81, 161, 0.08) !important;
}
</style>
