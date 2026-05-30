import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import 'bootstrap'
import './assets/css/bootstrap-custom.css'
import App from './App.vue'

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    })
  }
}

createApp(App).mount('#app')
