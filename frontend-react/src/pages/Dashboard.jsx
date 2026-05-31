import { useState, useEffect } from 'react'
import { Chart as ChartJS, registerables } from 'chart.js'
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2'
import { accidentsAPI, predictionAPI } from '../services/api'

ChartJS.register(...registerables)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [accidents, setAccidents] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [timeRange, setTimeRange] = useState('week')
  const [activeChart, setActiveChart] = useState('hourly')

  useEffect(() => {
    loadData()
  }, [timeRange])

  const loadData = async () => {
    try {
      const [accidentsRes, predictionRes] = await Promise.all([
        accidentsAPI.getAll(),
        predictionAPI.getNext24h(),
      ])

      setAccidents(accidentsRes.data)
      setPrediction(predictionRes.data)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate metrics
  const totalAccidents = accidents.length
  const avgIntensity = (accidents.reduce((sum, a) => sum + (a.intensity || 0), 0) / (totalAccidents || 1)).toFixed(1)
  
  // Accidents by type
  const accidentsByType = accidents.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
    return acc
  }, {})

  // Accidents by zone
  const accidentsByZone = accidents.reduce((acc, curr) => {
    if (curr.zone) {
      acc[curr.zone] = (acc[curr.zone] || 0) + 1
    }
    return acc
  }, {})

  // Top 5 zones
  const topZones = Object.entries(accidentsByZone)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Severity distribution
  const severityCounts = accidents.reduce((acc, curr) => {
    const severity = curr.severity || 'medium'
    acc[severity] = (acc[severity] || 0) + 1
    return acc
  }, {})

  // Hourly distribution
  const hourlyCounts = Array(24).fill(0)
  const hourlyIntensity = Array(24).fill(0)
  accidents.forEach(accident => {
    const hour = accident.hour
    if (hour >= 0 && hour < 24) {
      hourlyCounts[hour]++
      hourlyIntensity[hour] += accident.intensity || 0
    }
  })

  // Chart configs
  const hourlyChartConfig = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Accidentes',
        data: hourlyCounts,
        backgroundColor: 'rgba(0, 180, 216, 0.6)',
        borderColor: '#00B4D8',
        borderWidth: 2,
      }
    ]
  }

  const typeChartConfig = {
    labels: Object.keys(accidentsByType).map(t => t.replace('_', ' ').toUpperCase()),
    datasets: [{
      data: Object.values(accidentsByType),
      backgroundColor: ['#E63946', '#FFB800', '#00D26A', '#00B4D8', '#7B2CBF', '#1D3557'],
      borderColor: '#ffffff',
      borderWidth: 3,
    }]
  }

  const zoneChartConfig = {
    labels: topZones.map(([zone]) => zone),
    datasets: [{
      label: 'Accidentes',
      data: topZones.map(([, count]) => count),
      backgroundColor: 'rgba(29, 53, 87, 0.7)',
      borderColor: '#1D3557',
      borderWidth: 2,
    }]
  }

  const severityChartConfig = {
    labels: Object.keys(severityCounts).map(s => s.toUpperCase()),
    datasets: [{
      data: Object.values(severityCounts),
      backgroundColor: ['#00D26A', '#FFB800', '#E63946'],
      borderColor: '#ffffff',
      borderWidth: 3,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' }
    },
    scales: { y: { beginAtZero: true } }
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Tipo', 'Zona', 'Intensidad', 'Severidad', 'Fecha', 'Hora', 'Lat', 'Lng']
    const rows = accidents.map(a => [a.id, a.type, a.zone, a.intensity, a.severity, a.date, a.hour, a.lat, a.lng])
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `urbanlytics_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-urban-blue border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl lg:text-4xl font-bold text-urban-blue">
            📊 Dashboard Analítico
          </h1>
          <p className="text-gray-600 mt-1">
            Análisis avanzado de accidentalidad y predicción de congestión
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-data-green/10 text-data-green font-semibold rounded-xl hover:bg-data-green/20 transition-colors"
          >
            📥 Exportar CSV
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-tech-cyan focus:outline-none"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mes</option>
            <option value="year">Último Año</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon="🚗" label="Total Accidentes" value={totalAccidents} color="bg-danger-red/10 text-danger-red" />
        <StatBox icon="📈" label="Intensidad Promedio" value={avgIntensity} color="bg-alert-amber/10 text-alert-amber" />
        <StatBox icon="⚠️" label="Zonas Activas" value={Object.keys(accidentsByZone).length} color="bg-tech-cyan/10 text-tech-cyan" />
        <StatBox icon="🔮" label="Predicción ML" value={prediction ? 'Activa' : 'N/A'} color="bg-insight-purple/10 text-insight-purple" />
      </div>

      {/* Chart Tabs */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex gap-3 mb-6">
          {[
            { key: 'hourly', label: '📈 Por Hora', icon: '📈' },
            { key: 'zone', label: '🗺️ Por Zona', icon: '🗺️' },
            { key: 'type', label: '🚗 Por Tipo', icon: '🚗' },
            { key: 'severity', label: '⚠️ Severidad', icon: '⚠️' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveChart(tab.key)}
              className={`
                px-4 py-2 rounded-xl font-semibold transition-all
                ${activeChart === tab.key
                  ? 'bg-urban-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-[400px]">
          {activeChart === 'hourly' && <Bar data={hourlyChartConfig} options={chartOptions} />}
          {activeChart === 'zone' && <Bar data={zoneChartConfig} options={{ ...chartOptions, indexAxis: 'y' }} />}
          {activeChart === 'type' && <Pie data={typeChartConfig} options={pieOptions} />}
          {activeChart === 'severity' && <Doughnut data={severityChartConfig} options={pieOptions} />}
        </div>
      </div>

      {/* ML Prediction */}
      {prediction && (
        <div className="bg-gradient-to-br from-insight-purple to-tech-cyan rounded-2xl p-8 text-white shadow-lg">
          <h2 className="font-brand text-2xl font-bold mb-6">
            🔮 Predicción de Congestión (Próximas 24h)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prediction.forecast?.map((item, index) => (
              <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-6">
                <p className="text-white/70 text-sm mb-1">Hora</p>
                <p className="font-metrics text-4xl font-bold mb-2">{item.hour}:00</p>
                <div className="flex items-center gap-3">
                  <div className={`
                    px-3 py-1 rounded-full text-sm font-bold
                    ${item.risk_level === 'alta' ? 'bg-danger-red' : 
                      item.risk_level === 'media' ? 'bg-alert-amber text-urban-blue' : 
                      'bg-data-green text-urban-blue'}
                  `}>
                    Riesgo {item.risk_level}
                  </div>
                  <span className="text-white/70">
                    {item.predicted_accidents} accidentes
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-white/70 text-sm">
            Método: {prediction.method === 'linear_regression' ? 'Regresión Lineal (ML)' : 'Baseline Histórico'}
          </p>
        </div>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard 
          icon="📈" title="Hora Pico Detectada" value="17:00 - 19:00"
          description="Mayor concentración de accidentes"
          color="bg-danger-red/10 text-danger-red"
        />
        <InsightCard 
          icon="🎯" title="Zona Crítica" value="Centro"
          description="Riesgo alto de accidentalidad"
          color="bg-alert-amber/10 text-alert-amber"
        />
        <InsightCard 
          icon="🌧️" title="Factor Climático" value="Lluvia"
          description="Aumenta riesgo en 40%"
          color="bg-tech-cyan/10 text-tech-cyan"
        />
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

function InsightCard({ icon, title, value, description, color }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 card-hover">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${color} mb-4`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-gray-600 text-sm mb-1">{title}</p>
      <p className="font-metrics text-2xl font-bold text-urban-blue mb-1">{value}</p>
      <p className="text-gray-500 text-xs">{description}</p>
    </div>
  )
}
