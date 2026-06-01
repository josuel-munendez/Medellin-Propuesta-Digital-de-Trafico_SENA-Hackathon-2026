const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`)
  }

  return response.json()
}

export function fetchAccidents(hourFrom, hourTo) {
  const params = new URLSearchParams()

  if (Number.isFinite(hourFrom)) {
    params.set('hour_from', String(hourFrom))
  }

  if (Number.isFinite(hourTo)) {
    params.set('hour_to', String(hourTo))
  }

  const query = params.toString()
  return requestJson(`/accidents/${query ? `?${query}` : ''}`)
}

export function fetchZones() {
  return requestJson('/zones/')
}

export function fetchRainStatus() {
  return requestJson('/weather/')
}

export function toggleRainStatus() {
  return requestJson('/simulate_rain/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
