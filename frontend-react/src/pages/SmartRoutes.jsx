import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet-routing-machine'
import { accidentsAPI } from '../services/api'

export default function SmartRoutes() {
  const mapContainer = useRef(null)
  const mapInstance = useRef(null)
  const routingControl = useRef(null)
  
  const [origin, setOrigin] = useState({ lat: 6.2442, lng: -75.5812, address: '' })
  const [destination, setDestination] = useState({ lat: 6.2518, lng: -75.5636, address: '' })
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(0)
  const [calculating, setCalculating] = useState(false)
  const [avoidAccidents, setAvoidAccidents] = useState(true)
  const [accidents, setAccidents] = useState([])
  const [eta, setEta] = useState(null)
  const [distance, setDistance] = useState(null)

  useEffect(() => {
    initMap()
    loadAccidents()
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
      }
    }
  }, [])

  const initMap = () => {
    if (!mapContainer.current) return

    mapInstance.current = L.map(mapContainer.current).setView([6.2442, -75.5812], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    // Add click handler to set points
    mapInstance.current.on('click', (e) => {
      if (!origin.lat || !origin.lng || (origin.lat && origin.lng && destination.lat && destination.lng)) {
        // Set origin
        setOrigin({ lat: e.latlng.lat, lng: e.latlng.lng, address: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}` })
        L.marker([e.latlng.lat, e.latlng.lng])
          .addTo(mapInstance.current)
          .bindPopup('<strong>Origen</strong>')
          .openPopup()
      } else {
        // Set destination
        setDestination({ lat: e.latlng.lat, lng: e.latlng.lng, address: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}` })
        L.marker([e.latlng.lat, e.latlng.lng])
          .addTo(mapInstance.current)
          .bindPopup('<strong>Destino</strong>')
          .openPopup()
      }
    })
  }

  const loadAccidents = async () => {
    try {
      const response = await accidentsAPI.getAll()
      setAccidents(response.data)
    } catch (error) {
      console.error('Error cargando accidentes:', error)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOrigin({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Mi ubicación actual',
          })
          
          L.marker([position.coords.latitude, position.coords.longitude])
            .addTo(mapInstance.current)
            .bindPopup('<strong>📍 Mi ubicación</strong>')
            .openPopup()
        },
        (error) => {
          alert('Error obteniendo ubicación: ' + error.message)
        },
        { enableHighAccuracy: true }
      )
    }
  }

  const calculateRoutes = async () => {
    if (!origin.lat || !destination.lat) {
      alert('Por favor selecciona origen y destino')
      return
    }

    setCalculating(true)

    try {
      // Clear previous route
      if (routingControl.current) {
        mapInstance.current.removeControl(routingControl.current)
      }

      // Create routing control
      routingControl.current = L.Routing.control({
        waypoints: [
          L.latLng(origin.lat, origin.lng),
          L.latLng(destination.lat, destination.lng),
        ],
        routeWhileDragging: true,
        showAlternatives: true,
        lineOptions: {
          styles: [
            { color: '#00B4D8', weight: 6, opacity: 0.8 },
            { color: '#ffffff', weight: 2, opacity: 0.9 }
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        addWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
      }).addTo(mapInstance.current)

      // Listen for routes found
      routingControl.current.on('routesfound', (e) => {
        const foundRoutes = e.routes
        
        setRoutes(foundRoutes.map((route, index) => ({
          id: index,
          summary: route.summary,
          distance: route.summary.totalDistance,
          time: route.summary.totalTime,
          waypoints: route.waypoints,
        })))

        setSelectedRoute(0)
        setCalculating(false)

        // Calculate ETA and distance
        const bestRoute = foundRoutes[0]
        if (bestRoute) {
          setDistance((bestRoute.summary.totalDistance / 1000).toFixed(2))
          setEta(Math.round(bestRoute.summary.totalTime / 60))
        }
      })

    } catch (error) {
      console.error('Error calculando rutas:', error)
      setCalculating(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`
  }

  const formatDistance = (meters) => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-brand text-3xl lg:text-4xl font-bold text-urban-blue mb-2">
          🗺️ Rutas Inteligentes
        </h1>
        <p className="text-gray-600">
          Calcula la mejor ruta evitando zonas de alta accidentalidad
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          {/* Origin/Destination Form */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 space-y-4">
            <h3 className="font-bold text-lg text-urban-blue">📍 Puntos de Ruta</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Origen
                </label>
                <input
                  type="text"
                  value={origin.address}
                  onChange={(e) => setOrigin(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Haz clic en el mapa o ingresa coordenadas"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Destino
                </label>
                <input
                  type="text"
                  value={destination.address}
                  onChange={(e) => setDestination(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Haz clic en el mapa o ingresa coordenadas"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                />
              </div>

              <button
                onClick={getCurrentLocation}
                className="w-full px-4 py-3 bg-tech-cyan/10 hover:bg-tech-cyan/20 text-tech-cyan font-semibold rounded-xl transition-colors border-2 border-tech-cyan/30"
              >
                📍 Usar Mi Ubicación como Origen
              </button>

              <label className="flex items-center gap-3 p-3 bg-cloud-white rounded-lg">
                <input
                  type="checkbox"
                  checked={avoidAccidents}
                  onChange={(e) => setAvoidAccidents(e.target.checked)}
                  className="w-5 h-5 text-tech-cyan rounded focus:ring-tech-cyan"
                />
                <span className="text-sm font-medium text-gray-700">
                  Evitar zonas de accidentes
                </span>
              </label>

              <button
                onClick={calculateRoutes}
                disabled={calculating}
                className="w-full py-4 bg-urban-blue hover:bg-urban-blue/90 text-white font-bold text-lg rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Calculando...
                  </span>
                ) : (
                  '🧭 Calcular Ruta'
                )}
              </button>
            </div>
          </div>

          {/* Route Results */}
          {routes.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 space-y-4">
              <h3 className="font-bold text-lg text-urban-blue">🛣️ Rutas Disponibles</h3>
              
              <div className="space-y-3">
                {routes.map((route, index) => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRoute(index)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all text-left
                      ${selectedRoute === index
                        ? 'border-tech-cyan bg-tech-cyan/10'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-urban-blue">
                          {index === 0 ? '⭐ Mejor Ruta' : `Ruta ${index + 1}`}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDistance(route.distance)} • {formatTime(route.time)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-metrics text-2xl font-bold text-tech-cyan">
                          {Math.round(route.time / 60)}
                        </p>
                        <p className="text-xs text-gray-600">min</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* ETA & Distance Summary */}
              {eta && distance && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div className="p-4 bg-data-green/10 rounded-xl text-center">
                    <p className="text-xs text-gray-600 mb-1">Distancia</p>
                    <p className="font-metrics text-2xl font-bold text-data-green">{distance}</p>
                    <p className="text-xs text-gray-600">km</p>
                  </div>
                  <div className="p-4 bg-tech-cyan/10 rounded-xl text-center">
                    <p className="text-xs text-gray-600 mb-1">Tiempo Est.</p>
                    <p className="font-metrics text-2xl font-bold text-tech-cyan">{eta}</p>
                    <p className="text-xs text-gray-600">min</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="bg-gradient-to-br from-insight-purple/10 to-tech-cyan/10 rounded-2xl p-6 border border-insight-purple/20">
            <h4 className="font-bold text-urban-blue mb-3">💡 Consejos</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Haz clic en el mapa para seleccionar puntos</li>
              <li>• Arrastra la ruta para modificarla</li>
              <li>• Activa "Evitar accidentes" para rutas más seguras</li>
              <li>• Usa tu ubicación actual como punto de inicio</li>
            </ul>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div ref={mapContainer} className="h-[700px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
