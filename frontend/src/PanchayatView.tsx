import { useEffect, useMemo, useRef, useState } from 'react'
import { LngLatBounds, Map as MapLibreMap, NavigationControl, setWorkerUrl, type FillLayerSpecification, type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Compass, Mountain, RotateCcw } from 'lucide-react'
import { useLanguage } from './language'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { BlockData, ForecastDay, GPWeather } from './types'

// Bundle the worker as a Vite asset. MapLibre's default relative worker URL
// can otherwise be routed to index.html by the production Python server.
setWorkerUrl(mapLibreWorkerUrl)

export type PanchayatMapMetric = 'rainfall' | 'temperature' | 'humidity' | 'wind'
export type PanchayatMapMode = 'baseline' | 'scenario' | 'difference'

const METRICS: { key: PanchayatMapMetric; label: string; unit: string }[] = [
  { key: 'rainfall', label: 'Rainfall', unit: 'mm' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'humidity', label: 'Humidity', unit: '%' },
  { key: 'wind', label: 'Wind speed', unit: 'km/h' },
]

function valueFor(day: ForecastDay | undefined, metric: PanchayatMapMetric) {
  if (!day) return null
  const value = metric === 'wind' ? day.wind === null ? null : day.wind * 3.6 : day[metric]
  return value !== null && value !== undefined && Number.isFinite(value) ? value : null
}

function mapFeatures(data: BlockData, metric: PanchayatMapMetric, dayIndex: number, mode: PanchayatMapMode, baseline: BlockData): GeoJSON.FeatureCollection {
  const baselineById = new Map(baseline.gps.map(gp => [gp.id, gp]))
  return {
    type: 'FeatureCollection',
    features: data.gpGeometry.features.map(feature => {
      const id = String(feature.properties?.gp_id ?? feature.properties?.id ?? feature.id ?? '')
      const gp = data.gps.find(item => item.id === id) ?? baselineById.get(id)
      const currentValue = valueFor(gp?.forecast[dayIndex], metric)
      const baseValue = valueFor(baselineById.get(id)?.forecast[dayIndex], metric)
      const value = mode === 'difference'
        ? currentValue === null || baseValue === null ? null : currentValue - baseValue
        : currentValue
      return {
        ...feature,
        properties: { ...feature.properties, gp_id: id, metricValue: value },
      } as GeoJSON.Feature
    }),
  }
}

function metricColors(values: number[], mode: PanchayatMapMode): [number, string, number, string, number, string] {
  if (mode === 'difference') {
    const maximum = Math.max(0.1, ...values.map(value => Math.abs(value)))
    return [-maximum, '#c85539', 0, '#f4f3e9', maximum, '#176dc1']
  }
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const middle = min === max ? min + 0.5 : (min + max) / 2
  return [min, '#f1d95b', middle, '#f18b39', max === middle ? max + 0.5 : max, '#bb3544']
}

function extendCoordinates(bounds: LngLatBounds, coordinates: unknown) {
  if (!Array.isArray(coordinates)) return
  if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    bounds.extend([coordinates[0], coordinates[1]])
    return
  }
  for (const coordinate of coordinates) extendCoordinates(bounds, coordinate)
}

function focusSelected(map: MapLibreMap, data: BlockData, selected: GPWeather) {
  const selectedFeature = data.gpGeometry.features.find(feature => String(feature.properties?.gp_id ?? feature.properties?.id ?? feature.id ?? '') === selected.id)
  if (selectedFeature?.geometry && 'coordinates' in selectedFeature.geometry) {
    const bounds = new LngLatBounds()
    extendCoordinates(bounds, selectedFeature.geometry.coordinates)
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 55, maxZoom: 11, pitch: 68, duration: 500 })
      return
    }
  }
  if (selected.lon !== null && selected.lat !== null) map.flyTo({ center: [selected.lon, selected.lat], zoom: 12, pitch: 68, duration: 500 })
}

export default function PanchayatView({ baseline, scenario, selectedId, dayIndex, metric, mode, onSelect, onDayChange, onMetricChange }: {
  baseline: BlockData
  scenario: BlockData
  selectedId: string
  dayIndex: number
  metric: PanchayatMapMetric
  mode: PanchayatMapMode
  onSelect: (gp: GPWeather) => void
  onDayChange: (index: number) => void
  onMetricChange: (metric: PanchayatMapMetric) => void
}) {
  const { t } = useLanguage()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const latest = useRef({ baseline, scenario, selectedId, dayIndex, metric, mode, onSelect })
  const [mapError, setMapError] = useState('')
  const [demStatus, setDemStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const displayData = mode === 'baseline' ? baseline : scenario
  const collection = useMemo(() => mapFeatures(displayData, metric, dayIndex, mode, baseline), [displayData, metric, dayIndex, mode, baseline])
  const metricValues = collection.features.map(feature => feature.properties?.metricValue).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const stops = metricColors(metricValues, mode)

  latest.current = { baseline, scenario, selectedId, dayIndex, metric, mode, onSelect }

  useEffect(() => {
    if (!container.current) return
    if (!baseline.gpGeometry.features.length) {
      setMapError('Panchayat boundary geometry is unavailable from the forecast API.')
      setDemStatus('unavailable')
      return
    }
    setMapError('')
    setDemStatus('loading')
    const selected = baseline.gps.find(gp => gp.id === selectedId) ?? baseline.gps[0]
    const blockBounds = new LngLatBounds()
    for (const feature of baseline.gpGeometry.features) {
      if (feature.geometry && 'coordinates' in feature.geometry) extendCoordinates(blockBounds, feature.geometry.coordinates)
    }
    const blockCenter = blockBounds.isEmpty() ? [0, 0] as [number, number] : blockBounds.getCenter().toArray()
    const center: [number, number] = selected?.lon !== null && selected?.lat !== null && selected
      ? [selected.lon, selected.lat]
      : blockCenter
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: container.current,
        center,
        zoom: 10,
        pitch: 68,
        bearing: 0,
        maxPitch: 75,
        pitchWithRotate: true,
        dragRotate: true,
        touchPitch: true,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: 'Imagery © Esri',
            },
          },
          layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
        },
      })
    } catch (reason) {
      setMapError(reason instanceof Error ? reason.message : 'Could not initialize the 3D map.')
      return
    }
    mapRef.current = map
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
    let layersInitialized = false
    let terrainLoadTimeout: number | undefined
    const initializeLayers = () => {
      if (layersInitialized) return
      layersInitialized = true
      const current = latest.current
      const currentData = current.mode === 'baseline' ? current.baseline : current.scenario
      const currentCollection = mapFeatures(currentData, current.metric, current.dayIndex, current.mode, current.baseline)
      const currentValues = currentCollection.features
        .map(feature => feature.properties?.metricValue)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      const currentStops = metricColors(currentValues, current.mode)
      map.addSource('gp-weather', { type: 'geojson', data: currentCollection })
      const fillLayer: FillLayerSpecification = {
        id: 'gp-weather-fill',
        type: 'fill',
        source: 'gp-weather',
        paint: {
          'fill-color': ['interpolate', ['linear'], ['coalesce', ['get', 'metricValue'], 0], currentStops[0], currentStops[1], currentStops[2], currentStops[3], currentStops[4], currentStops[5]],
          'fill-opacity': 0.63,
        },
      }
      map.addLayer(fillLayer)
      map.addLayer({ id: 'gp-weather-outline', type: 'line', source: 'gp-weather', paint: { 'line-color': '#f3fff8', 'line-width': 1.5, 'line-opacity': 0.95 } })
      map.addLayer({
        id: 'gp-weather-selected',
        type: 'line',
        source: 'gp-weather',
        filter: ['==', ['to-string', ['get', 'gp_id']], current.selectedId],
        paint: { 'line-color': '#00f3df', 'line-width': 4, 'line-opacity': 1 },
      })
      map.on('click', 'gp-weather-fill', (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        const id = String(feature?.properties?.gp_id ?? '')
        const gp = latest.current.baseline.gps.find(item => item.id === id)
        if (gp) latest.current.onSelect(gp)
      })
      map.on('mouseenter', 'gp-weather-fill', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'gp-weather-fill', () => { map.getCanvas().style.cursor = '' })
      try {
        map.addSource('terrain', {
          type: 'raster-dem',
          tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
          tileSize: 256,
          encoding: 'terrarium',
          maxzoom: 15,
        })
        map.setTerrain({ source: 'terrain', exaggeration: 1.5 })
        map.addLayer({ id: 'terrain-hillshade', type: 'hillshade', source: 'terrain', paint: { 'hillshade-shadow-color': '#233a3a', 'hillshade-highlight-color': '#f8fff2', 'hillshade-exaggeration': 0.45 } }, 'gp-weather-fill')
      } catch (reason) {
        setDemStatus('unavailable')
        // Keep the weather map usable if terrain is unsupported; this is not a map failure.
      }
      const currentSelected = current.baseline.gps.find(gp => gp.id === current.selectedId)
      if (currentSelected) focusSelected(map, current.baseline, currentSelected)
      map.resize()
      terrainLoadTimeout = window.setTimeout(() => {
        setDemStatus(status => status === 'loading' ? 'unavailable' : status)
      }, 12000)
    }
    map.on('style.load', initializeLayers)
    if (map.isStyleLoaded()) initializeLayers()
    map.on('sourcedata', event => {
      if (event.sourceId === 'terrain' && event.isSourceLoaded) {
        setDemStatus('ready')
        if (terrainLoadTimeout !== undefined) window.clearTimeout(terrainLoadTimeout)
      }
    })
    map.on('error', event => {
      const sourceId = 'sourceId' in event ? String(event.sourceId ?? '') : ''
      const message = event.error?.message ?? ''
      if (sourceId === 'terrain' || /elevation-tiles-prod|terrain/i.test(message)) {
        setDemStatus('unavailable')
        if (terrainLoadTimeout !== undefined) window.clearTimeout(terrainLoadTimeout)
        return
      }
      if (sourceId.includes('satellite')) setMapError(`Satellite basemap unavailable: ${message || 'tile request failed.'}`)
      else if (message) setMapError(`3D map error: ${message}`)
    })
    return () => {
      if (terrainLoadTimeout !== undefined) window.clearTimeout(terrainLoadTimeout)
      map.off('style.load', initializeLayers)
      map.remove()
      mapRef.current = null
    }
  }, [baseline.location.state, baseline.location.district, baseline.location.block, baseline.gpGeometry])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('gp-weather') as GeoJSONSource | undefined
    source?.setData(collection)
    if (map?.getLayer('gp-weather-selected')) map.setFilter('gp-weather-selected', ['==', ['to-string', ['get', 'gp_id']], selectedId])
    if (map?.getLayer('gp-weather-fill')) {
      map.setPaintProperty('gp-weather-fill', 'fill-color', ['interpolate', ['linear'], ['coalesce', ['get', 'metricValue'], 0], stops[0], stops[1], stops[2], stops[3], stops[4], stops[5]])
    }
  }, [collection, selectedId, stops])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const selected = baseline.gps.find(gp => gp.id === selectedId)
    if (selected) focusSelected(map, baseline, selected)
  }, [selectedId, baseline])

  const forecast = baseline.gps.find(gp => gp.id === selectedId)?.forecast ?? baseline.gps[0]?.forecast ?? []
  const unit = METRICS.find(item => item.key === metric)?.unit ?? ''
  const modeLabel = mode === 'difference' ? `Difference · ${unit}` : mode === 'baseline' ? `Baseline · ${unit}` : `Scenario · ${unit}`
  const resetNorth = () => mapRef.current?.rotateTo(0, { duration: 450 })
  const rotateMap = () => {
    const map = mapRef.current
    if (map) map.easeTo({ bearing: (map.getBearing() + 30) % 360, duration: 350 })
  }
  const reset3d = () => {
    const map = mapRef.current
    if (!map) return
    const bounds = new LngLatBounds()
    for (const feature of baseline.gpGeometry.features) {
      if (feature.geometry && 'coordinates' in feature.geometry) extendCoordinates(bounds, feature.geometry.coordinates)
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 55, maxZoom: 11, pitch: 68, bearing: 0, duration: 650 })
    else map.easeTo({ pitch: 68, bearing: 0, duration: 650 })
  }
  const legendGradient = mode === 'difference'
    ? 'linear-gradient(90deg, #c85539, #f4f3e9, #176dc1)'
    : `linear-gradient(90deg, ${stops[1]}, ${stops[3]}, ${stops[5]})`

  return <section className="panchayat-3d-view" aria-label="3D Panchayat terrain and weather view">
    <div ref={container} className="panchayat-3d-map"/>
    <div className="panchayat-3d-view-controls" role="group" aria-label="Terrain view controls">
      <button type="button" onClick={resetNorth} title={t('Reset north')} aria-label={t('Reset north')}><Compass size={15}/> {t('North')}</button>
      <button type="button" onClick={reset3d} title={t('Reset 3D view')} aria-label={t('Reset 3D view')}><Mountain size={15}/> {t('3D view')}</button>
      <button type="button" onClick={rotateMap} title={t('Rotate map')} aria-label={t('Rotate map')}><RotateCcw size={15}/> {t('Rotate')}</button>
    </div>
    <div className="panchayat-3d-toolbar">
      <label>{t('Weather')}<select value={metric} onChange={event => onMetricChange(event.target.value as PanchayatMapMetric)}>{METRICS.map(item => <option key={item.key} value={item.key}>{t(item.label)}</option>)}</select></label>
      <label>{t('Forecast day')}<select value={dayIndex} onChange={event => onDayChange(Number(event.target.value))}>{forecast.map((day, index) => <option value={index} key={day.date}>{t('Day')} {index + 1} · {day.date}</option>)}</select></label>
    </div>
    <div className="panchayat-3d-key"><b>{t(modeLabel)} · {t('Weather')}</b><span className="panchayat-3d-legend-bar" aria-label={t('Weather value color scale')} style={{ background: legendGradient }}/><span>{metricValues.length ? `${Math.min(...metricValues).toFixed(1)} ${unit} — ${Math.max(...metricValues).toFixed(1)} ${unit}` : t('Weather values unavailable')}</span><span>{t('Real DEM terrain · Exaggeration 1.5×')}</span><span>{t('Terrain')}: {t(demStatus === 'ready' ? 'DEM loaded' : demStatus === 'unavailable' ? 'DEM unavailable' : 'Loading real DEM…')}</span></div>
    <div className="panchayat-3d-attribution">{t('Weather: existing GP forecast · Terrain © Mapterhorn')}</div>
    {mapError && <div className="panchayat-3d-error" role="alert">{t('3D map unavailable')}: {mapError}</div>}
  </section>
}
