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

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function requestAuthJson(path, token, options = {}) {
  return requestJson(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Token ${token}`,
    },
  })
}

export function fetchAccidents(hourFrom, hourTo) {
  const params = new URLSearchParams()

  if (Number.isFinite(Number(hourFrom))) {
    params.set('hour_from', String(hourFrom))
  }

  if (Number.isFinite(Number(hourTo))) {
    params.set('hour_to', String(hourTo))
  }

  const query = params.toString()
  return requestJson(`/accidents/${query ? `?${query}` : ''}`)
}

export function fetchZones() {
  return requestJson('/zones/')
}

export function fetchWeather() {
  return requestJson('/weather/')
}

export function fetchSiataWeather() {
  return requestJson('/siata_weather/')
}

export function fetchRainStatus() {
  return fetchWeather()
}

export function toggleRain() {
  return requestJson('/simulate_rain/', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function toggleRainStatus() {
  return toggleRain()
}

export function fetchCongestionPrediction(hour) {
  const params = new URLSearchParams()
  if (Number.isFinite(Number(hour))) {
    params.set('hour', String(hour))
  }
  const query = params.toString()
  return requestJson(`/congestion_prediction/${query ? `?${query}` : ''}`)
}

export function loginUser(username, password) {
  return requestJson('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function fetchCurrentUser(token) {
  return requestAuthJson('/auth/me/', token)
}

export function fetchDashboard(token) {
  return requestAuthJson('/dashboard/', token)
}

export function logoutUser(token) {
  return requestAuthJson('/auth/logout/', token, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function fetchAdminAccidents(token) {
  return requestAuthJson('/admin/accidents/', token)
}

export function createAdminAccident(token, payload) {
  return requestAuthJson('/admin/accidents/', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminAccident(token, id, payload) {
  return requestAuthJson(`/admin/accidents/${id}/`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminAccident(token, id) {
  return requestAuthJson(`/admin/accidents/${id}/`, token, {
    method: 'DELETE',
  })
}

export function fetchAdminZones(token) {
  return requestAuthJson('/admin/zones/', token)
}

export function createAdminZone(token, payload) {
  return requestAuthJson('/admin/zones/', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminZone(token, id, payload) {
  return requestAuthJson(`/admin/zones/${id}/`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminZone(token, id) {
  return requestAuthJson(`/admin/zones/${id}/`, token, {
    method: 'DELETE',
  })
}

export function fetchAdminUsers(token) {
  return requestAuthJson('/admin/users/', token)
}

export function createAdminUser(token, payload) {
  return requestAuthJson('/admin/users/', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(token, id, payload) {
  return requestAuthJson(`/admin/users/${id}/`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminUser(token, id) {
  return requestAuthJson(`/admin/users/${id}/`, token, {
    method: 'DELETE',
  })
}

export function analyzeTraffic(startCoords, endCoords) {
  return requestJson('/traffic_analysis/', {
    method: 'POST',
    body: JSON.stringify({
      start: startCoords,
      end: endCoords,
    }),
  })
}

export function fetchWeatherHistory() {
  return requestJson('/weather/history/')
}

export function fetchZonesWithData() {
  return requestJson('/zones/')
}
