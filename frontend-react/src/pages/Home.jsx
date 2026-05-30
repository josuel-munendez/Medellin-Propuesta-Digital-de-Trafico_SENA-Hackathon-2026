import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { accidentsAPI, zonesAPI, weatherAPI, predictionAPI } from '../services/api'

export default function Home() {
  const [stats, setStats] = useState({
    accidents: 0,
    zones: 0,
    activeAlerts: 0,
    temperature: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [accidentsRes, zonesRes, weatherRes] = await Promise.all([
        accidentsAPI.getAll(),
        zonesAPI.getAll(),
        weatherAPI.getCurrent(),
      ])

      setStats({
        accidents: accidentsRes.data.length,
        zones: zonesRes.data.length,
        activeAlerts: weatherRes.data.isRaining ? 1 : 0,
        temperature: weatherRes.data.temperature,
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-urban-blue border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando UrbanLytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero Section */}
      <section className="gradient-primary rounded-2xl p-8 lg:p-12 text-white shadow-2xl">
        <div className="max-w-4xl">
          <div className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-semibold mb-6">
            🏙️ HackData CTGI SENA 2026
          </div>
          <h1 className="font-brand text-4xl lg:text-6xl font-bold mb-4">
            UrbanLytics
          </h1>
          <p className="text-xl lg:text-2xl text-white/90 mb-2 font-light">
            La ciudad que se ve en datos
          </p>
          <p className="text-white/70 mb-8 max-w-2xl">
            Plataforma inteligente de movilidad urbana para Medellín. 
            Monitoreo vial en tiempo real, reportes ciudadanos y análisis predictivo.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/map" 
              className="px-8 py-4 bg-data-green hover:bg-data-green/90 text-urban-blue font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              🗺️ Ver Mapa en Vivo
            </Link>
            <Link 
              to="/reports" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border-2 border-white/30"
            >
              📢 Crear Reporte
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon="🚗"
          label="Accidentes Registrados"
          value={stats.accidents}
          color="bg-danger-red/10 text-danger-red"
        />
        <StatCard 
          icon="⚠️"
          label="Zonas de Riesgo"
          value={stats.zones}
          color="bg-alert-amber/10 text-alert-amber"
        />
        <StatCard 
          icon="🌧️"
          label="Alertas Activas"
          value={stats.activeAlerts}
          color="bg-tech-cyan/10 text-tech-cyan"
        />
        <StatCard 
          icon="🌡️"
          label="Temperatura Actual"
          value={stats.temperature ? `${Math.round(stats.temperature)}°C` : 'N/A'}
          color="bg-data-green/10 text-data-green"
        />
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="font-brand text-3xl font-bold mb-8 text-center">
          Funcionalidades Principales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon="🚦"
            title="Tráfico en Tiempo Real"
            description="Visualiza congestión vehicular con datos de TomTom. Código de colores: verde, amarillo, rojo."
            link="/map"
            color="from-tech-cyan to-data-green"
          />
          <FeatureCard 
            icon="📢"
            title="Reportes Ciudadanos"
            description="Reporta accidentes, derrumbes, construcciones y más. Colabora con la comunidad."
            link="/reports"
            color="from-alert-amber to-danger-red"
          />
          <FeatureCard 
            icon="🌧️"
            title="Datos Climáticos SIATA"
            description="Integración con SIATA para precipitación, humedad y alertas climáticas en Medellín."
            link="/map"
            color="from-insight-purple to-tech-cyan"
          />
          <FeatureCard 
            icon="📊"
            title="Dashboard Analítico"
            description="Gráficas estadísticas, heatmaps y análisis de accidentalidad por hora y zona."
            link="/dashboard"
            color="from-urban-blue to-insight-purple"
          />
          <FeatureCard 
            icon="🛣️"
            title="Rutas Inteligentes"
            description="Cálculo de rutas óptimas considerando tráfico, clima y reportes en tiempo real."
            link="/map"
            color="from-data-green to-tech-cyan"
          />
          <FeatureCard 
            icon="⚠️"
            title="Zonas Peligrosas"
            description="Identifica zonas de alto riesgo con heatmaps de accidentalidad y mortalidad vial."
            link="/dashboard"
            color="from-danger-red to-alert-amber"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="gradient-primary rounded-2xl p-8 text-white">
        <h2 className="font-brand text-2xl font-bold mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction 
            icon="📍"
            title="Ver mi ubicación"
            description="Activa GPS para rastreo en tiempo real"
            link="/map"
          />
          <QuickAction 
            icon="🔍"
            title="Explorar zonas"
            description="Consulta zonas de riesgo en Medellín"
            link="/dashboard"
          />
          <QuickAction 
            icon="ℹ️"
            title="Conocer más"
            description="Sobre UrbanLytics y el equipo"
            link="/about"
          />
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg card-hover border border-gray-100">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${color} mb-4`}>
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-gray-600 text-sm mb-1">{label}</p>
      <p className="font-metrics text-3xl font-bold text-urban-blue">{value}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description, link, color }) {
  return (
    <Link to={link} className="block group">
      <div className="bg-white rounded-xl p-6 shadow-lg card-hover border border-gray-100 h-full">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white mb-4`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="font-bold text-xl mb-2 text-urban-blue group-hover:text-tech-cyan transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  )
}

function QuickAction({ icon, title, description, link }) {
  return (
    <Link to={link} className="block">
      <div className="bg-white/10 hover:bg-white/20 rounded-xl p-6 transition-all cursor-pointer">
        <span className="text-4xl mb-3 block">{icon}</span>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-white/70 text-sm">{description}</p>
      </div>
    </Link>
  )
}
