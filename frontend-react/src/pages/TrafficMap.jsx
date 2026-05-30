import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import { accidentsAPI, zonesAPI, weatherAPI } from '../services/api'

// Traffic color utility functions
const getTrafficColor = (currentSpeed, freeFlowSpeed) => {
  if (!freeFlowSpeed || freeFlowSpeed === 0) return '#9ca3af'
  const ratio = currentSpeed / freeFlowSpeed
  if (ratio >= 0.80) return '#22c55e'  // Green: free flow
  if (ratio >= 0.40) return '#eab308'  // Yellow: moderate
  return '#ef4444'                      // Red: congested
}

const getTrafficLevel = (currentSpeed, freeFlowSpeed) => {
  if (!freeFlowSpeed || freeFlowSpeed === 0) return 'Desconocido'
  const ratio = currentSpeed / freeFlowSpeed
  if (ratio >= 0.80) return 'Fluido'
  if (ratio >= 0.40) return 'Moderado'
  return 'Congestionado'
}

export default function TrafficMap() {
  const mapContainer = useRef(null)
  const mapInstance = useRef(null)
  const tomtomLayer = useRef(null)
  const heatLayer = useRef(null)
  const zonesLayer = useRef(null)
  const trafficSegmentsLayer = useRef(null)
  const gpsMarker = useRef(null)
  const gpsWatchId = useRef(null)
  
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)
  const [hourFrom, setHourFrom] = useState(0)
  const [hourTo, setHourTo] = useState(23)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [tomtomEnabled, setTomtomEnabled] = useState(true)
  const [trafficSegments, setTrafficSegments] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [accidentsCount, setAccidentsCount] = useState(0)
  const [zonesCount, setZonesCount] = useState(0)

  // Initialize map
  useEffect(() => {
    initMap()
    loadData()
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
      }
      if (gpsWatchId.current) {
        navigator.geolocation.clearWatch(gpsWatchId.current)
      }
    }
  }, [])

  // Update map when filters change
  useEffect(() => {
    if (mapInstance.current) {
      updateAccidentsData()
    }
  }, [hourFrom, hourTo])

  const initMap = () => {
    if (!mapContainer.current) return

    mapInstance.current = L.map(mapContainer.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([6.2442, -75.5812], 12)

    // Base tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    // Add TomTom traffic raster layer
    const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY
    if (tomtomKey) {
      tomtomLayer.current = L.tileLayer(
        `https://api.tomtom.com/map/1/tile/flow/relative/png8/{z}/{x}/{y}.png?key=${tomtomKey}`,
        {
          opacity: 0.45,
          maxZoom: 19,
        }
      )
      
      if (tomtomEnabled) {
        tomtomLayer.current.addTo(mapInstance.current)
      }
    }

    // Add scale control
    L.control.scale({ imperial: false }).addTo(mapInstance.current)
  }

  const loadData = async () => {
    try {
      const [accidentsRes, zonesRes, weatherRes] = await Promise.all([
        accidentsAPI.getAll(),
        zonesAPI.getAll(),
        weatherAPI.getCurrent(),
      ])

      renderAccidents(accidentsRes.data)
      renderZones(zonesRes.data)
      setAccidentsCount(accidentsRes.data.length)
      setZonesCount(zonesRes.data.length)
      setWeather(weatherRes.data)
      setLastUpdate(new Date().toLocaleTimeString('es-CO'))
    } catch (error) {
      console.error('Error cargando datos del mapa:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAccidentsData = async () => {
    try {
      const accidentsRes = await accidentsAPI.getAll(hourFrom, hourTo)
      renderAccidents(accidentsRes.data)
      setAccidentsCount(accidentsRes.data.length)
    } catch (error) {
      console.error('Error actualizando mapa:', error)
    }
  }

  const renderAccidents = (accidents) => {
    if (!mapInstance.current) return

    // Remove old heat layer
    if (heatLayer.current) {
      mapInstance.current.removeLayer(heatLayer.current)
    }

    const heatPoints = accidents
      .filter(a => a.lat && a.lng)
      .map(a => [a.lat, a.lng, (a.intensity || 5) / 10])

    heatLayer.current = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 20,
      maxZoom: 15,
      gradient: {
        0.0: '#00D26A',
        0.4: '#FFB800',
        0.7: '#E63946',
        1.0: '#7B2CBF'
      }
    }).addTo(mapInstance.current)
  }

  const renderZones = (zones) => {
    if (!mapInstance.current) return

    // Remove old zones layer
    if (zonesLayer.current) {
      mapInstance.current.removeLayer(zonesLayer.current)
    }

    const riskColors = {
      alta: '#E63946',
      media: '#FFB800',
      baja: '#00D26A',
    }

    const zoneLayers = zones.map(zone => {
      try {
        const geometry = typeof zone.geometry === 'string' 
          ? JSON.parse(zone.geometry) 
          : zone.geometry

        if (geometry?.type === 'Polygon') {
          const coords = geometry.coordinates[0].map(c => [c[1], c[0]])
          
          return L.polygon(coords, {
            color: riskColors[zone.risk_level] || '#00B4D8',
            fillColor: riskColors[zone.risk_level] || '#00B4D8',
            fillOpacity: 0.3,
            weight: 2,
          }).bindPopup(`
            <div style="font-family: Inter, sans-serif; min-width: 180px;">
              <strong style="display: block; margin-bottom: 8px; font-size: 14px;">⚠️ ${zone.name}</strong>
              <div style="font-size: 12px; color: #475569;">
                <p style="margin: 4px 0;"><strong>Nivel de riesgo:</strong> ${zone.risk_level}</p>
              </div>
            </div>
          `)
        }
      } catch (error) {
        console.error(`Error renderizando zona ${zone.name}:`, error)
      }
      return null
    }).filter(Boolean)

    zonesLayer.current = L.layerGroup(zoneLayers).addTo(mapInstance.current)
  }

  // TomTom traffic segments
  const loadTrafficSegments = useCallback(async () => {
    const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY
    if (!tomtomKey || !mapInstance.current) return

    // Sample road points in Medellín
    const roadPoints = [
      { name: 'Av. El Poblado', point: [6.2100, -75.5720] },
      { name: 'Av. Laureles', point: [6.2440, -75.5900] },
      { name: 'Centro', point: [6.2518, -75.5636] },
      { name: 'Av. 70', point: [6.2590, -75.5721] },
      { name: 'Robledo', point: [6.2832, -75.5671] },
    ]

    try {
      const segments = []
      
      for (const road of roadPoints) {
        try {
          const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/13/json?key=${tomtomKey}&point=${road.point[0]},${road.point[1]}&unit=KMPH`
          const response = await fetch(url)
          
          if (!response.ok) continue
          
          const data = await response.json()
          const segment = data.flowSegmentData
          
          if (!segment) continue
          
          const coordinates = segment.coordinates?.coordinate?.map(c => [c.latitude, c.longitude]) || []
          
          if (coordinates.length > 1) {
            segments.push({
              name: road.name,
              coordinates,
              currentSpeed: segment.currentSpeed,
              freeFlowSpeed: segment.freeFlowSpeed,
              color: getTrafficColor(segment.currentSpeed, segment.freeFlowSpeed),
              level: getTrafficLevel(segment.currentSpeed, segment.freeFlowSpeed),
            })
          }
        } catch (error) {
          console.warn(`Error fetching traffic for ${road.name}:`, error)
        }
      }

      setTrafficSegments(segments)
      renderTrafficSegments(segments)
    } catch (error) {
      console.error('Error cargando segmentos de tráfico:', error)
    }
  }, [])

  const renderTrafficSegments = (segments) => {
    if (!mapInstance.current) return

    if (trafficSegmentsLayer.current) {
      mapInstance.current.removeLayer(trafficSegmentsLayer.current)
    }

    const segmentLayers = segments.map(segment => {
      return L.polyline(segment.coordinates, {
        color: segment.color,
        weight: 6,
        opacity: 0.8,
      }).bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 200px;">
          <strong style="display: block; margin-bottom: 8px;">🛣️ ${segment.name}</strong>
          <div style="font-size: 12px; color: #475569;">
            <p style="margin: 4px 0;"><strong>Velocidad actual:</strong> ${segment.currentSpeed} km/h</p>
            <p style="margin: 4px 0;"><strong>Velocidad libre:</strong> ${segment.freeFlowSpeed} km/h</p>
            <p style="margin: 4px 0;"><strong>Congestión:</strong> ${segment.level}</p>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            Fuente: TomTom Traffic
          </div>
        </div>
      `)
    })

    trafficSegmentsLayer.current = L.layerGroup(segmentLayers).addTo(mapInstance.current)
  }

  // GPS functionality
  const startGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      return
    }

    gpsWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setGpsAccuracy(Math.round(accuracy))
        setGpsActive(true)

        if (!gpsMarker.current) {
          // Create custom GPS marker
          const gpsIcon = L.divIcon({
            className: 'gps-marker',
            html: `
              <div style="
                position: relative;
                width: 28px;
                height: 28px;
              ">
                <div style="
                  position: absolute;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: rgba(13, 110, 253, 0.28);
                  animation: pulse-dot 1.5s ease-in-out infinite;
                "></div>
                <div style="
                  position: absolute;
                  top: 6px;
                  left: 6px;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: #0d6efd;
                  border: 2px solid white;
                  box-shadow: 0 2px 10px rgba(13, 110, 253, 0.45);
                "></div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })

          gpsMarker.current = L.marker([longitude, latitude], {
            icon: gpsIcon,
          })
            .bindPopup('<strong>📍 Tu ubicación actual</strong><br/><small>GPS activo</small>')
            .addTo(mapInstance.current)
          
          mapInstance.current.flyTo([longitude, latitude], 15, {
            duration: 1.5,
          })
        } else {
          gpsMarker.current.setLatLng([longitude, latitude])
        }
      },
      (error) => {
        console.error('Error GPS:', error)
        setGpsActive(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const stopGPS = () => {
    if (gpsWatchId.current) {
      navigator.geolocation.clearWatch(gpsWatchId.current)
      gpsWatchId.current = null
    }
    if (gpsMarker.current) {
      mapInstance.current?.removeLayer(gpsMarker.current)
      gpsMarker.current = null
    }
    setGpsActive(false)
    setGpsAccuracy(null)
  }

  const toggleGPS = () => {
    if (gpsActive) {
      stopGPS()
    } else {
      startGPS()
    }
  }

  // Toggle TomTom layer
  const toggleTomTom = () => {
    if (!mapInstance.current || !tomtomLayer.current) return
    
    if (tomtomEnabled) {
      mapInstance.current.removeLayer(tomtomLayer.current)
    } else {
      tomtomLayer.current.addTo(mapInstance.current)
    }
    setTomtomEnabled(!tomtomEnabled)
  }

  // Refresh traffic data
  const refreshTraffic = async () => {
    setLoading(true)
    await Promise.all([
      updateAccidentsData(),
      loadTrafficSegments(),
    ])
    setLastUpdate(new Date().toLocaleTimeString('es-CO'))
    setLoading(false)
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl lg:text-4xl font-bold text-urban-blue">
            🗺️ Mapa de Tráfico en Vivo
          </h1>
          <p className="text-gray-600 mt-1">
            Visualización de accidentalidad, zonas de riesgo y tráfico en tiempo real
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {weather && (
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{weather.isRaining ? '🌧️' : '☀️'}</span>
                <div>
                  <p className="font-bold text-urban-blue text-sm">{weather.temperature}°C</p>
                  <p className="text-xs text-gray-600">{weather.condition}</p>
                </div>
              </div>
            </div>
          )}
          
          {lastUpdate && (
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
              <p className="text-xs text-gray-600">Última actualización</p>
              <p className="font-metrics font-bold text-urban-blue">{lastUpdate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon="🚗" label="Accidentes" value={accidentsCount} color="bg-danger-red/10 text-danger-red" />
        <StatBox icon="⚠️" label="Zonas" value={zonesCount} color="bg-alert-amber/10 text-alert-amber" />
        <StatBox icon="🛣️" label="Segmentos" value={trafficSegments.length} color="bg-tech-cyan/10 text-tech-cyan" />
        <StatBox 
          icon="📍" 
          label="GPS" 
          value={gpsActive ? 'Activo' : 'Inactivo'} 
          color={gpsActive ? 'bg-data-green/10 text-data-green' : 'bg-gray-100 text-gray-600'} 
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hour Filters */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-urban-blue">Filtrar por Hora</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Desde: <span className="font-metrics font-bold text-tech-cyan">{hourFrom}:00</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={hourFrom}
                  onChange={(e) => setHourFrom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Hasta: <span className="font-metrics font-bold text-tech-cyan">{hourTo}:00</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={hourTo}
                  onChange={(e) => setHourTo(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-urban-blue">Controles del Mapa</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={toggleTomTom}
                className={`
                  px-4 py-3 rounded-xl font-semibold transition-all
                  ${tomtomEnabled 
                    ? 'bg-data-green text-urban-blue' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                🚦 TomTom Traffic
              </button>
              
              <button
                onClick={toggleGPS}
                className={`
                  px-4 py-3 rounded-xl font-semibold transition-all
                  ${gpsActive 
                    ? 'bg-danger-red text-white' 
                    : 'bg-tech-cyan text-white hover:bg-tech-cyan/90'
                  }
                `}
              >
                {gpsActive ? '⏹️ Detener GPS' : '📍 Activar GPS'}
              </button>
              
              <button
                onClick={loadTrafficSegments}
                disabled={loading}
                className="px-4 py-3 bg-insight-purple/10 text-insight-purple rounded-xl font-semibold hover:bg-insight-purple/20 transition-colors disabled:opacity-50"
              >
                🛣️ Cargar Segmentos
              </button>
              
              <button
                onClick={refreshTraffic}
                disabled={loading}
                className="px-4 py-3 bg-urban-blue/10 text-urban-blue rounded-xl font-semibold hover:bg-urban-blue/20 transition-colors disabled:opacity-50"
              >
                {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
              </button>
            </div>
            
            {gpsActive && gpsAccuracy && (
              <div className="mt-3 px-4 py-2 bg-data-green/10 rounded-lg">
                <p className="text-xs text-data-green font-semibold">
                  📡 Precisión GPS: ±{gpsAccuracy}m
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-urban-blue border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Cargando mapa...</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="h-[600px]" />
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h3 className="font-bold text-lg mb-4 text-urban-blue">Leyenda</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="font-semibold mb-2 text-urban-blue">Zonas de Riesgo</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-danger-red"></div>
                <span className="text-sm">Riesgo Alto</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-alert-amber"></div>
                <span className="text-sm">Riesgo Medio</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-data-green"></div>
                <span className="text-sm">Riesgo Bajo</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="font-semibold mb-2 text-urban-blue">Tráfico TomTom</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-2 rounded bg-green-500"></div>
                <span className="text-sm">Fluido (&gt;80%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-2 rounded bg-yellow-500"></div>
                <span className="text-sm">Moderado (40-80%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-2 rounded bg-red-500"></div>
                <span className="text-sm">Congestionado (&lt;40%)</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="font-semibold mb-2 text-urban-blue">Heatmap de Accidentes</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-2 rounded bg-gradient-to-r from-green-500 to-purple-600"></div>
                <span className="text-sm">Baja → Alta intensidad</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 card-hover">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${color} mb-2`}>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-gray-600 text-xs mb-1">{label}</p>
      <p className="font-metrics text-xl font-bold text-urban-blue">{value}</p>
    </div>
  )
}
