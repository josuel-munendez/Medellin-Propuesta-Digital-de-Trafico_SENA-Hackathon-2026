/**
 * TomTom Traffic Flow Service
 * Fetches real-time traffic data from TomTom Flow Segment Data API
 */

const TOMTOM_BASE_URL = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/13/json'

/**
 * Get traffic color based on speed ratio
 * @param {number} currentSpeed - Current speed in km/h
 * @param {number} freeFlowSpeed - Free flow speed in km/h
 * @returns {string} Hex color code
 */
export function getTrafficColor(currentSpeed, freeFlowSpeed) {
  if (!freeFlowSpeed || freeFlowSpeed === 0) return '#9ca3af' // gray fallback
  const ratio = currentSpeed / freeFlowSpeed
  if (ratio >= 0.80) return '#22c55e'  // Green: free flow
  if (ratio >= 0.40) return '#eab308'  // Yellow: moderate congestion
  return '#ef4444'                      // Red: heavy congestion
}

/**
 * Get traffic level label based on speed ratio
 * @param {number} currentSpeed 
 * @param {number} freeFlowSpeed 
 * @returns {string} Traffic level description
 */
export function getTrafficLevel(currentSpeed, freeFlowSpeed) {
  if (!freeFlowSpeed || freeFlowSpeed === 0) return 'Desconocido'
  const ratio = currentSpeed / freeFlowSpeed
  if (ratio >= 0.80) return 'Fluido'
  if (ratio >= 0.40) return 'Moderado'
  return 'Congestionado'
}

/**
 * Fetch traffic data for a single road segment
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} apiKey - TomTom API key
 * @returns {Promise<object|null>} Traffic segment data or null on error
 */
export async function fetchTrafficSegment(lat, lng, apiKey) {
  try {
    const url = `${TOMTOM_BASE_URL}?key=${apiKey}&point=${lat},${lng}&unit=KMPH`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.warn(`[TrafficFlow] API error ${response.status} for point [${lat}, ${lng}]`)
      return null
    }
    
    const data = await response.json()
    const segment = data.flowSegmentData
    
    if (!segment) return null
    
    const ratio = segment.freeFlowSpeed > 0 
      ? segment.currentSpeed / segment.freeFlowSpeed 
      : 0
    
    return {
      currentSpeed: segment.currentSpeed,
      freeFlowSpeed: segment.freeFlowSpeed,
      currentTravelTime: segment.currentTravelTime,
      freeFlowTravelTime: segment.freeFlowTravelTime,
      confidence: segment.confidence,
      roadClosure: segment.roadClosure || false,
      ratio: Math.round(ratio * 100) / 100,
      color: getTrafficColor(segment.currentSpeed, segment.freeFlowSpeed),
      level: getTrafficLevel(segment.currentSpeed, segment.freeFlowSpeed),
      coordinates: segment.coordinates?.coordinate?.map(c => [c.latitude, c.longitude]) || []
    }
  } catch (error) {
    console.warn(`[TrafficFlow] Fetch error for point [${lat}, ${lng}]:`, error.message)
    return null
  }
}

/**
 * Fetch traffic data for multiple points with concurrency limiting
 * @param {Array<{name: string, point: [number, number]}>} points - Array of road points
 * @param {string} apiKey - TomTom API key
 * @param {number} concurrency - Max concurrent requests (default 5)
 * @returns {Promise<Array<object|null>>} Array of results matching input order
 */
export async function fetchMultipleSegments(points, apiKey, concurrency = 5) {
  const results = []
  
  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (road) => {
        const segment = await fetchTrafficSegment(road.point[0], road.point[1], apiKey)
        if (segment) {
          segment.name = road.name
        }
        return segment
      })
    )
    results.push(...batchResults)
  }
  
  return results
}
