export default function About() {
  const team = [
    { role: 'Backend Developer', responsibility: 'APIs y lógica de negocio', icon: '⚙️' },
    { role: 'Frontend Developer', responsibility: 'Interfaces y mapas', icon: '🎨' },
    { role: 'UX/UI Designer', responsibility: 'Experiencia visual', icon: '✨' },
    { role: 'Diseñador Audiovisual', responsibility: 'Marca y pitch', icon: '🎬' },
  ]

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-brand text-4xl lg:text-5xl font-bold text-urban-blue mb-4">
          👥 Sobre UrbanLytics
        </h1>
        <p className="text-xl text-gray-600">
          Transformando la movilidad urbana de Medellín mediante datos e inteligencia
        </p>
      </div>

      {/* Mission */}
      <section className="gradient-primary rounded-2xl p-8 lg:p-12 text-white">
        <h2 className="font-brand text-3xl font-bold mb-4">🎯 Nuestra Misión</h2>
        <p className="text-lg text-white/90 leading-relaxed">
          Desarrollar una plataforma web inteligente que permita monitorear el estado de las vías 
          de Medellín en tiempo real utilizando datos geográficos, climáticos y ciudadanos, 
          mejorando la seguridad vial y optimizando los tiempos de desplazamiento.
        </p>
      </section>

      {/* Problem */}
      <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h2 className="font-brand text-3xl font-bold text-urban-blue mb-6">⚠️ Problemática</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            'Alta congestión vehicular en horas pico',
            'Accidentes frecuentes sin prevención',
            'Poca visualización preventiva de riesgos',
            'Inundaciones y derrumbes en temporada de lluvia',
            'Falta de integración entre clima y tráfico',
            'Dificultad para encontrar rutas seguras',
          ].map((problem, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-danger-red text-xl mt-1">✗</span>
              <p className="text-gray-700">{problem}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h2 className="font-brand text-3xl font-bold text-urban-blue mb-6">💡 Nuestra Solución</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: '🚦', title: 'Tráfico en Tiempo Real', desc: 'Datos TomTom actualizados' },
            { icon: '🌧️', title: 'Integración Climática', desc: 'SIATA + alertas preventivas' },
            { icon: '📢', title: 'Reportes Ciudadanos', desc: 'Colaboración comunitaria' },
            { icon: '📊', title: 'Análisis Predictivo', desc: 'ML para predicción de congestión' },
            { icon: '🗺️', title: 'Mapas Interactivos', desc: 'Leaflet + heatmaps' },
            { icon: '🛣️', title: 'Rutas Inteligentes', desc: 'Cálculo de mejores rutas' },
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-cloud-white rounded-xl">
              <span className="text-4xl">{item.icon}</span>
              <div>
                <h3 className="font-bold text-urban-blue mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h2 className="font-brand text-3xl font-bold text-urban-blue mb-6">👨‍👩‍👧‍👦 Equipo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {team.map((member, index) => (
            <div key={index} className="flex items-center gap-4 p-6 bg-gradient-to-br from-cloud-white to-white rounded-xl border border-gray-100 card-hover">
              <span className="text-5xl">{member.icon}</span>
              <div>
                <h3 className="font-bold text-lg text-urban-blue">{member.role}</h3>
                <p className="text-gray-600">{member.responsibility}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h2 className="font-brand text-3xl font-bold text-urban-blue mb-6">💻 Tecnologías</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'React', icon: '⚛️' },
            { name: 'Tailwind CSS', icon: '🎨' },
            { name: 'Leaflet', icon: '🗺️' },
            { name: 'Chart.js', icon: '📊' },
            { name: 'Django', icon: '🐍' },
            { name: 'TomTom API', icon: '🚦' },
            { name: 'SIATA', icon: '🌧️' },
            { name: 'PWA', icon: '📱' },
          ].map((tech, index) => (
            <div key={index} className="text-center p-4 bg-cloud-white rounded-xl">
              <span className="text-4xl block mb-2">{tech.icon}</span>
              <p className="font-semibold text-urban-blue">{tech.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <p className="text-gray-600 mb-4">¿Quieres saber más?</p>
        <a 
          href="https://github.com" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-4 gradient-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          🚀 Ver Código en GitHub
        </a>
      </section>
    </div>
  )
}
