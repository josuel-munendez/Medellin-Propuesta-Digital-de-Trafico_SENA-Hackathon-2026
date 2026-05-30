import { useState, useEffect } from 'react'
import { weatherAPI } from '../services/api'

export default function WeatherWidget({ compact = false }) {
  const [weather, setWeather] = useState(null)
  const [siataWeather, setSiataWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('general') // 'general' or 'siata'

  useEffect(() => {
    loadWeatherData()
  }, [])

  const loadWeatherData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [generalRes, siataRes] = await Promise.allSettled([
        weatherAPI.getCurrent(),
        weatherAPI.getSiata(),
      ])

      if (generalRes.status === 'fulfilled') {
        setWeather(generalRes.value.data)
      }

      if (siataRes.status === 'fulfilled') {
        setSiataWeather(siataRes.value.data)
      }

      if (generalRes.status === 'rejected' && siataRes.status === 'rejected') {
        setError('No se pudo cargar datos climáticos')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRain = async () => {
    try {
      const response = await weatherAPI.toggleRain()
      setWeather(response.data)
    } catch (err) {
      console.error('Error toggling rain:', err)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-center gap-3">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-urban-blue border-t-transparent"></div>
          <p className="text-sm text-gray-600">Cargando clima...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center">
          <span className="text-3xl mb-2 block">⚠️</span>
          <p className="text-sm text-danger-red font-semibold">{error}</p>
          <button
            onClick={loadWeatherData}
            className="mt-3 text-xs text-tech-cyan hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const currentWeather = activeTab === 'siata' ? siataWeather : weather

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {weather?.isRaining ? '🌧️' : '☀️'}
            </span>
            <div>
              <p className="font-bold text-urban-blue">{weather?.temperature ?? '—'}°C</p>
              <p className="text-xs text-gray-600">{weather?.condition ?? 'Cargando'}</p>
            </div>
          </div>
          <button
            onClick={handleToggleRain}
            className="px-3 py-1.5 bg-tech-cyan/10 text-tech-cyan text-xs font-semibold rounded-lg hover:bg-tech-cyan/20 transition-colors"
          >
            {weather?.isRaining ? '☀️ Quitar Lluvia' : '🌧️ Simular Lluvia'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="gradient-primary text-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">🌤️ Clima en Tiempo Real</h3>
          <button
            onClick={loadWeatherData}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'general'
              ? 'bg-tech-cyan/10 text-tech-cyan border-b-2 border-tech-cyan'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('siata')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'siata'
              ? 'bg-tech-cyan/10 text-tech-cyan border-b-2 border-tech-cyan'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          SIATA
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'general' && weather && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-6xl">
                {weather.isRaining ? '🌧️' : '☀️'}
              </span>
              <div>
                <p className="text-4xl font-bold text-urban-blue font-metrics">
                  {Math.round(weather.temperature)}°C
                </p>
                <p className="text-gray-600 capitalize">{weather.condition}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Fuente: {weather.source === 'simulated' ? 'Simulado' : weather.source}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
              <div className="p-3 bg-cloud-white rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Ubicación</p>
                <p className="font-semibold text-sm text-urban-blue">{weather.location}</p>
              </div>
              <div className="p-3 bg-cloud-white rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Estado</p>
                <p className="font-semibold text-sm">
                  {weather.isRaining ? (
                    <span className="text-tech-cyan">🌧️ Lluvia activa</span>
                  ) : (
                    <span className="text-data-green">☀️ Sin lluvia</span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleRain}
              className={`
                w-full py-3 rounded-xl font-semibold transition-all
                ${weather.isRaining
                  ? 'bg-data-green text-urban-blue hover:bg-data-green/90'
                  : 'bg-tech-cyan text-white hover:bg-tech-cyan/90'
                }
              `}
            >
              {weather.isRaining ? '☀️ Quitar Lluvia Simulada' : '🌧️ Simular Lluvia'}
            </button>
          </div>
        )}

        {activeTab === 'siata' && siataWeather && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-6xl">🌦️</span>
              <div>
                <p className="text-4xl font-bold text-urban-blue font-metrics">
                  {siataWeather.temperature ?? '—'}°C
                </p>
                <p className="text-gray-600">{siataWeather.condition}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Fuente: {siataWeather.source}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
              <div className="p-3 bg-cloud-white rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Humedad</p>
                <p className="font-semibold text-sm text-urban-blue">
                  {siataWeather.humidity ?? '—'}%
                </p>
              </div>
              <div className="p-3 bg-cloud-white rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Viento</p>
                <p className="font-semibold text-sm text-urban-blue">
                  {siataWeather.wind_speed ?? '—'} km/h
                </p>
              </div>
              <div className="p-3 bg-cloud-white rounded-lg col-span-2">
                <p className="text-xs text-gray-600 mb-1">Ubicación</p>
                <p className="font-semibold text-sm text-urban-blue">{siataWeather.location}</p>
              </div>
            </div>

            <div className="p-4 bg-insight-purple/10 rounded-xl border border-insight-purple/20">
              <p className="text-xs text-insight-purple font-semibold mb-1">📡 Red SIATA</p>
              <p className="text-xs text-gray-600">
                Sistema de Alerta Temprana de Medellín - Datos oficiales de precipitación
              </p>
            </div>
          </div>
        )}

        {!currentWeather && (
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">⚠️</span>
            <p className="text-gray-600">No hay datos disponibles</p>
            <button
              onClick={loadWeatherData}
              className="mt-3 px-4 py-2 bg-tech-cyan text-white rounded-lg text-sm hover:bg-tech-cyan/90"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
