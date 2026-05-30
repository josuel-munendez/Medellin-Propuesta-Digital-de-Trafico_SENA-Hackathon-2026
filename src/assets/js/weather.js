const SIATA_BASE_URL = 'https://siata.gov.co/data/scroll'

const FALLBACK_WEATHER = {
  source: 'siata-fallback',
  location: 'Medellín, CO',
  condition: 'Monitoreo SIATA no disponible',
  temperature: 22,
  rainAlert: false,
  rainfallForecast: null,
  updatedAt: null,
}

export async function getWeatherData() {
  try {
    const [temperatureResponse, precipitationResponse] = await Promise.all([
      fetch(`${SIATA_BASE_URL}/temperatura2.json`, { cache: 'no-store' }),
      fetch(`${SIATA_BASE_URL}/pronosticoPPT.json`, { cache: 'no-store' }),
    ])

    if (!temperatureResponse.ok || !precipitationResponse.ok) {
      throw new Error('SIATA weather request failed')
    }

    const temperaturePayload = await temperatureResponse.json()
    const precipitationPayload = await precipitationResponse.json()
    const normalizedTemperature = normalizeTemperature(temperaturePayload)
    const normalizedRain = normalizeRainForecast(precipitationPayload)

    return {
      source: 'siata',
      location: 'Medellín, Valle de Aburrá',
      condition: normalizedRain.rainAlert ? 'Probabilidad de lluvia SIATA' : 'Condición estable SIATA',
      temperature: normalizedTemperature.temperature ?? FALLBACK_WEATHER.temperature,
      rainAlert: normalizedRain.rainAlert,
      rainfallForecast: normalizedRain.value,
      updatedAt: normalizedTemperature.updatedAt || normalizedRain.updatedAt || new Date().toISOString(),
    }
  } catch {
    return FALLBACK_WEATHER
  }
}

function normalizeTemperature(payload) {
  const candidates = flattenNumbers(payload)
  const plausible = candidates.find((value) => value > 5 && value < 40)

  return {
    temperature: Number.isFinite(plausible) ? Math.round(plausible) : null,
    updatedAt: payload?.fecha || payload?.updatedAt || payload?.date || null,
  }
}

function normalizeRainForecast(payload) {
  const candidates = flattenNumbers(payload)
  const value = candidates.find((item) => item >= 0 && item <= 100) ?? null

  return {
    value,
    rainAlert: Number.isFinite(value) ? value >= 45 : false,
    updatedAt: payload?.fecha || payload?.updatedAt || payload?.date || null,
  }
}

function flattenNumbers(value) {
  if (typeof value === 'number') return [value]
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? [parsed] : []
  }
  if (Array.isArray(value)) return value.flatMap(flattenNumbers)
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenNumbers)
  return []
}
