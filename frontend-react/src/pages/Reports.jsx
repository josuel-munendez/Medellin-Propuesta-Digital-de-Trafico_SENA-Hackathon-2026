import { useState, useEffect } from 'react'
import { weatherAPI } from '../services/api'

export default function Reports() {
  const [formData, setFormData] = useState({
    type: 'accident',
    description: '',
    lat: '',
    lng: '',
    severity: 'medium',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [myReports, setMyReports] = useState([])
  const [recentReports, setRecentReports] = useState([])

  const incidentTypes = [
    { value: 'accident', label: 'Accidente', icon: '🚗', color: 'bg-danger-red' },
    { value: 'landslide', label: 'Derrumbe', icon: '🏔️', color: 'bg-alert-amber' },
    { value: 'construction', label: 'Construcción', icon: '🚧', color: 'bg-tech-cyan' },
    { value: 'flood', label: 'Inundación', icon: '🌊', color: 'bg-insight-purple' },
    { value: 'police', label: 'Policía de Tránsito', icon: '👮', color: 'bg-urban-blue' },
    { value: 'road_closed', label: 'Vía Cerrada', icon: '🚫', color: 'bg-gray-600' },
  ]

  useEffect(() => {
    // Load mock recent reports (will be replaced with API call)
    setRecentReports([
      {
        id: 1,
        type: 'accident',
        description: 'Accidente múltiple en Av. El Poblado',
        severity: 'high',
        time: 'Hace 15 minutos',
        location: 'Av. El Poblado #25-30',
      },
      {
        id: 2,
        type: 'construction',
        description: 'Construcción de vía, un carril cerrado',
        severity: 'medium',
        time: 'Hace 1 hora',
        location: 'Av. 70 con Calle 30',
      },
      {
        id: 3,
        type: 'flood',
        description: 'Acumulación de agua por lluvia',
        severity: 'low',
        time: 'Hace 2 horas',
        location: 'Carrera 43A #16-20',
      },
    ])

    // Load saved reports from localStorage
    const saved = localStorage.getItem('urbanlytics-reports')
    if (saved) {
      setMyReports(JSON.parse(saved))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    
    const newReport = {
      id: Date.now(),
      ...formData,
      timestamp: new Date().toISOString(),
      time: 'Ahora mismo',
      location: `${formData.lat}, ${formData.lng}`,
    }

    // Save to localStorage (will be replaced with API call)
    const updatedReports = [newReport, ...myReports]
    setMyReports(updatedReports)
    localStorage.setItem('urbanlytics-reports', JSON.stringify(updatedReports))
    
    setTimeout(() => {
      setSuccess(true)
      setSubmitting(false)
      
      // Reset form
      setFormData({
        type: 'accident',
        description: '',
        lat: '',
        lng: '',
        severity: 'medium',
      })
    }, 1000)
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          }))
        },
        (error) => {
          alert('Error obteniendo ubicación: ' + error.message)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      alert('Tu navegador no soporta geolocalización')
    }
  }

  if (success) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <div className="bg-data-green/10 border-2 border-data-green rounded-2xl p-12 text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <h2 className="font-brand text-3xl font-bold text-urban-blue mb-4">
            ¡Reporte Enviado!
          </h2>
          <p className="text-gray-600 mb-6">
            Gracias por colaborar con la comunidad. Tu reporte ayudará a otros conductores.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSuccess(false)}
              className="px-8 py-3 bg-urban-blue text-white font-bold rounded-xl hover:bg-urban-blue/90 transition-colors"
            >
              Crear Otro Reporte
            </button>
            <button
              onClick={() => window.location.href = '/map'}
              className="px-8 py-3 bg-tech-cyan text-white font-bold rounded-xl hover:bg-tech-cyan/90 transition-colors"
            >
              Ver Mapa
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-brand text-3xl lg:text-4xl font-bold text-urban-blue mb-2">
          📢 Reportes Ciudadanos
        </h1>
        <p className="text-gray-600">
          Colabora con la comunidad reportando incidentes viales en tiempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 space-y-6">
            {/* Tipo de Incidente */}
            <div>
              <label className="block font-bold text-lg mb-4 text-urban-blue">
                Tipo de Incidente
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {incidentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-center
                      ${formData.type === type.value
                        ? 'border-tech-cyan bg-tech-cyan/10 text-urban-blue'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <span className="text-3xl block mb-2">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-bold text-lg mb-2 text-urban-blue">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none resize-none"
                placeholder="Describe el incidente con detalles..."
                required
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block font-bold text-lg mb-2 text-urban-blue">
                Ubicación
              </label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="w-full px-4 py-3 bg-tech-cyan/10 hover:bg-tech-cyan/20 text-tech-cyan font-semibold rounded-xl transition-colors border-2 border-tech-cyan/30"
                >
                  📍 Usar Mi Ubicación Actual
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value }))}
                    placeholder="Latitud"
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData(prev => ({ ...prev, lng: e.target.value }))}
                    placeholder="Longitud"
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Severidad */}
            <div>
              <label className="block font-bold text-lg mb-2 text-urban-blue">
                Nivel de Severidad
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'low', label: 'Baja', color: 'bg-data-green' },
                  { value: 'medium', label: 'Media', color: 'bg-alert-amber' },
                  { value: 'high', label: 'Alta', color: 'bg-danger-red' },
                ].map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, severity: level.value }))}
                    className={`
                      p-3 rounded-xl font-semibold transition-all
                      ${formData.severity === level.value
                        ? `${level.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-urban-blue hover:bg-urban-blue/90 text-white font-bold text-lg rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Enviando...
                </span>
              ) : (
                'Enviar Reporte'
              )}
            </button>
          </form>
        </div>

        {/* Sidebar: Recent Reports + My Reports */}
        <div className="space-y-6">
          {/* Recent Reports */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-bold text-lg mb-4 text-urban-blue">🔴 Reportes Recientes</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentReports.map((report) => {
                const typeInfo = incidentTypes.find(t => t.value === report.type) || incidentTypes[0]
                return (
                  <div key={report.id} className="p-4 bg-cloud-white rounded-xl border border-gray-100">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-urban-blue truncate">
                          {report.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">📍 {report.location}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-bold
                            ${report.severity === 'high' ? 'bg-danger-red text-white' :
                              report.severity === 'medium' ? 'bg-alert-amber text-urban-blue' :
                              'bg-data-green text-urban-blue'}
                          `}>
                            {report.severity === 'high' ? 'Alta' : report.severity === 'medium' ? 'Media' : 'Baja'}
                          </span>
                          <span className="text-xs text-gray-500">{report.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* My Reports */}
          {myReports.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="font-bold text-lg mb-4 text-urban-blue">📝 Mis Reportes</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {myReports.slice(0, 5).map((report) => {
                  const typeInfo = incidentTypes.find(t => t.value === report.type) || incidentTypes[0]
                  return (
                    <div key={report.id} className="p-3 bg-cloud-white rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{typeInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-urban-blue truncate">
                            {report.description}
                          </p>
                          <p className="text-xs text-gray-500">{report.time}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
