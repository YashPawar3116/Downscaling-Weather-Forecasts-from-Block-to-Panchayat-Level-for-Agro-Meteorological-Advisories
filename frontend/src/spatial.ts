import type { GPWeather } from './types'

export const featureId = (feature: GeoJSON.Feature) => String(feature.properties?.gp_id ?? feature.properties?.id ?? feature.id ?? '')

const boundaryEdges = (feature?: GeoJSON.Feature) => {
  const geometry = feature?.geometry
  if (!geometry || !('coordinates' in geometry)) return new Set<string>()
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  const edges = new Set<string>()
  for (const polygon of polygons) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const point = (coordinate: number[]) => `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`
    const ends = [point(ring[i - 1]), point(ring[i])].sort()
    edges.add(`${ends[0]}|${ends[1]}`)
  }
  return edges
}

export const sharedBoundaryLength = (a?: GeoJSON.Feature, b?: GeoJSON.Feature) => {
  const edgesA = boundaryEdges(a), edgesB = boundaryEdges(b)
  let shared = 0
  for (const edge of edgesA) if (edgesB.has(edge)) shared++
  return shared
}

export const distanceKm = (a: GPWeather, b: GPWeather) => {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null
  const radians = (degrees: number) => degrees * Math.PI / 180
  const dLat = radians(b.lat - a.lat), dLon = radians(b.lon - a.lon)
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export const direction = (a: GPWeather, b: GPWeather) => {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null
  const y = Math.sin((b.lon - a.lon) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180)
  const x = Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) - Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos((b.lon - a.lon) * Math.PI / 180)
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360 / 45) % 8]
}

export function neighboringPanchayats(gps: GPWeather[], geometry: GeoJSON.FeatureCollection, selected: GPWeather, limit = 4) {
  const features = new Map(geometry.features.map(feature => [featureId(feature), feature]))
  const selectedFeature = features.get(selected.id)
  const candidates = gps.filter(gp => gp.id !== selected.id).map(gp => ({
    gp,
    shared: sharedBoundaryLength(selectedFeature, features.get(gp.id)),
    distance: distanceKm(selected, gp),
  }))
  const touching = candidates.filter(item => item.shared > 0)
    .sort((a, b) => b.shared - a.shared || (a.distance ?? Infinity) - (b.distance ?? Infinity))
  const chosen = touching.slice(0, limit)
  if (chosen.length < limit) {
    const used = new Set(chosen.map(item => item.gp.id))
    chosen.push(...candidates.filter(item => !used.has(item.gp.id))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      .slice(0, limit - chosen.length))
  }
  return [selected, ...chosen.map(item => item.gp)]
}
