<template>
  <div class="position-relative">
    <div ref="container" class="viewer-3d"></div>
    <div class="legend-3d">
      <strong>Leyenda 3D</strong>
      <div><span class="color-box" style="background:#a31f34"></span> Riesgo Alto</div>
      <div><span class="color-box" style="background:#b85c00"></span> Riesgo Medio</div>
      <div><span class="color-box" style="background:#237843"></span> Riesgo Bajo</div>
      <div><span class="color-sphere" style="background:#ff3333"></span> Accidente (tamaño = intensidad)</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { fetchAccidents, fetchZones } from '../services/api'

const container = ref(null)
let scene, camera, renderer, controls
let animationId = null

onMounted(async () => {
  // Inicializar escena
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#1a1a2e')

  // Camara
  camera = new THREE.PerspectiveCamera(45, container.value.clientWidth / container.value.clientHeight, 1, 5000)
  camera.position.set(0, 60, 100)
  camera.lookAt(0, 0, 0)

  // Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.value.appendChild(renderer.domElement)

  // Controles
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxDistance = 300

  // Luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 100, 50)
  scene.add(directionalLight)

  // Grid
  const gridHelper = new THREE.GridHelper(200, 40, 0x444444, 0x2a2a3e)
  scene.add(gridHelper)

  // Ejes
  const axesHelper = new THREE.AxesHelper(10)
  scene.add(axesHelper)

  // Cargar datos
  try {
    const [accidents, zones] = await Promise.all([
      fetchAccidents(0, 23),
      fetchZones()
    ])

    const centerLat = 6.2442
    const centerLon = -75.5812
    const scale = 1200 // Ajustar escala para que quepa en el grid

    // Esferas para accidentes
    const sphereGeometry = new THREE.SphereGeometry(1, 16, 16)
    
    // Solo mostramos los últimos 500 para evitar saturar la GPU
    const maxAccidents = 500
    const limitedAccidents = accidents.slice(-maxAccidents)

    limitedAccidents.forEach(acc => {
      if(Number.isFinite(Number(acc.lat)) && Number.isFinite(Number(acc.lng))) {
        const x = (Number(acc.lng) - centerLon) * scale
        const z = -(Number(acc.lat) - centerLat) * scale // Z negativo hacia el norte
        
        const intensity = Math.max(1, Number(acc.intensity || 1))
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xff3333,
          emissive: 0x880000,
          emissiveIntensity: intensity / 10
        })
        const sphere = new THREE.Mesh(sphereGeometry, material)
        sphere.position.set(x, intensity * 0.5, z)
        sphere.scale.set(intensity * 0.25, intensity * 0.25, intensity * 0.25)
        scene.add(sphere)
      }
    })

    // Zonas como cubos semitransparentes
    zones.forEach(zone => {
      let zoneX = 0
      let zoneZ = 0
      let valid = false
      
      try {
        const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry
        if (geom && geom.coordinates && geom.coordinates[0]) {
          const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0]
          if (coords && coords.length > 0) {
            let sumLng = 0, sumLat = 0
            coords.forEach(c => { sumLng += c[0]; sumLat += c[1] })
            const avgLng = sumLng / coords.length
            const avgLat = sumLat / coords.length
            zoneX = (avgLng - centerLon) * scale
            zoneZ = -(avgLat - centerLat) * scale
            valid = true
          }
        }
      } catch(e) { console.warn("Error parsing geometry", e) }

      if (valid) {
        let color = 0x237843 // Baja (verde)
        if (zone.risk_level === 'alta') color = 0xa31f34 // Alta (rojo)
        else if (zone.risk_level === 'media') color = 0xb85c00 // Media (naranja)

        const boxGeo = new THREE.BoxGeometry(12, 4, 12)
        const boxMat = new THREE.MeshStandardMaterial({ 
          color: color, 
          transparent: true, 
          opacity: 0.6 
        })
        const cube = new THREE.Mesh(boxGeo, boxMat)
        cube.position.set(zoneX, 2, zoneZ)
        scene.add(cube)
      }
    })
  } catch (err) {
    console.warn("[ThreeDView] Data could not be loaded for 3D View", err)
  }

  // Animation loop
  const animate = function () {
    if(!renderer) return
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('resize', onWindowResize)
})

function onWindowResize() {
  if (camera && renderer && container.value) {
    camera.aspect = container.value.clientWidth / container.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  if (animationId !== null) cancelAnimationFrame(animationId)
  if (renderer && renderer.domElement) {
    renderer.dispose()
  }
  scene = null
  camera = null
  renderer = null
  controls = null
})
</script>

<style scoped>
.viewer-3d {
  width: 100%;
  height: 60vh;
  min-height: 400px;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
}

.legend-3d {
  position: absolute;
  bottom: 15px;
  left: 15px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(4px);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  color: #333;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.legend-3d div {
  display: flex;
  align-items: center;
  margin-top: 6px;
}
.color-box {
  width: 14px;
  height: 14px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 3px;
}
.color-sphere {
  width: 14px;
  height: 14px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 50%;
}
</style>
