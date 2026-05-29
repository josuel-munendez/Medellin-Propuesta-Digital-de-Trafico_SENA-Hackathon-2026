const FALLBACK_WEATHER = {
  source: 'simulated',
  location: 'Medellín, CO',
  condition: 'Nublado parcial',
  temperature: 22,
  rainAlert: false,
}

export async function getWeatherData() {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY

  if (!apiKey) {
    return FALLBACK_WEATHER
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=Medellin,CO&units=metric&lang=es&appid=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Weather API request failed')
    }

    const weather = await response.json()
    const weatherMain = weather.weather?.[0]?.main?.toLowerCase() || ''

    return {
      source: 'openweathermap',
      location: weather.name ? `${weather.name}, CO` : 'Medellín, CO',
      condition: weather.weather?.[0]?.description || 'Sin datos',
      temperature: Math.round(weather.main?.temp ?? 0),
      rainAlert: weatherMain.includes('rain') || weatherMain.includes('drizzle') || weatherMain.includes('thunderstorm'),
    }
  } catch {
    return FALLBACK_WEATHER
  }
}
