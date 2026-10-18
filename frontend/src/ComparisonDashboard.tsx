import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, CalendarDays, Download, Expand, MapPin, Users, CloudRain, Database } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getBlock } from './services'
import type { BlockData, ForecastDay, GPWeather, LocationOption } from './types'
import { direction, distanceKm, featureId, neighboringPanchayats, sharedBoundaryLength } from './spatial'
import { useLanguage } from './language'
import { defaultLocation } from './locationDefaults'
import './comparison-dashboard.css'

const COLORS = ['#11b8c7', '#f04758', '#ffd23f', '#6aca55', '#ab78f2']
const locationKey = (location: LocationOption) => JSON.stringify([location.state, location.district, location.block])
const fmt = (n: number | null | undefined, digits = 1) => n == null || !Number.isFinite(n) ? '—' : n.toFixed(digits)
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
function FitBounds({ data, rows }: { data: BlockData; rows: GPWeather[] }) {
  const map = useMap()
  useEffect(() => {
    const selected = rows[0]
    if (selected?.lat != null && selected.lon != null) {
      map.flyTo([selected.lat, selected.lon], Math.max(map.getZoom(), 12), { duration: .65 })
      return
    }
    const geometry = data.blockGeometry?.features.length ? data.blockGeometry : data.gpGeometry
    const bounds = L.geoJSON(geometry as never).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 11 })
  }, [data, map, rows])
  return null
}
function ComparisonMap({ data, rows, selected, select, full }: { data: BlockData; rows: GPWeather[]; selected: GPWeather; select: (gp: GPWeather) => void; full: () => void }) {
  return <section className="comparison-panel comparison-map-panel"><header><b>🗺️ Location &amp; Nearby Panchayats</b><button className="comparison-plain" onClick={full} title="Fullscreen map"><Expand size={16}/></button></header><div className="comparison-map" id="comparison-map"><MapContainer center={[19.9, 74]} zoom={9} className="comparison-leaflet"><TileLayer attribution="&copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"/><FitBounds data={data} rows={rows}/><GeoJSON data={data.gpGeometry as never} style={feature => { const id = featureId(feature as GeoJSON.Feature); const ix = rows.findIndex(g => g.id === id); const highlighted = ix >= 0; const color = COLORS[Math.max(0, ix)]; return { color: highlighted ? color : '#173b32', weight: highlighted ? (ix === 0 ? 4 : 3) : 1.5, opacity: .98, fillColor: highlighted ? color : '#0f493a', fillOpacity: highlighted ? (ix === 0 ? .46 : .35) : .08 } }} onEachFeature={(feature, layer) => { const gp = rows.find(g => g.id === featureId(feature as GeoJSON.Feature)); if (gp) layer.bindTooltip(gp.name, { permanent: true, direction: 'center', className: 'comparison-map-label' }).on('click', () => select(gp)) }}/></MapContainer><div className="comparison-map-legend">{rows.map((gp, i) => <span key={gp.id}><i style={{ background: COLORS[i] }}/>{gp.name}{i === 0 ? ' · Selected' : ' · Nearby'}</span>)}</div></div></section>
}
function density(values: number[]) {
  if (!values.length) return []
  const low = Math.min(0, ...values), high = Math.max(...values), span = Math.max(1, high - low), bandwidth = Math.max(.8, span / 5)
  return Array.from({ length: 41 }, (_, i) => { const x = low + span * i / 40; const y = values.reduce((sum, value) => sum + Math.exp(-.5 * ((x - value) / bandwidth) ** 2), 0) / (values.length * bandwidth * Math.sqrt(2 * Math.PI)); return { x: Number(x.toFixed(2)), y } })
}

export default function ComparisonDashboard({ locations }: { locations: LocationOption[] }) {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const initial = locations.find(x => x.state === params.get('state') && x.district === params.get('district') && x.block === params.get('block'))
    ?? locations.find(x => x.block === params.get('block'))
    ?? defaultLocation(locations)
  const [location, setLocation] = useState(initial)
  const [data, setData] = useState<BlockData | null>(null)
  const [selectedId, setSelectedId] = useState(params.get('gp') ?? '')
  const [error, setError] = useState('')
  const [processingMessage, setProcessingMessage] = useState('')
  useEffect(() => { let live = true; setData(null); setError(''); setProcessingMessage(''); getBlock(location.state, location.district, location.block, status => live && setProcessingMessage(status.message)).then(d => { if (live) { setData(d); setSelectedId(id => d.gps.some(g => g.id === id) ? id : d.gps[0]?.id ?? '') } }).catch(e => live && setError(e.message)); return () => { live = false } }, [location])
  const gps = data?.gps ?? []
  const selected = gps.find(g => g.id === selectedId) ?? gps[0]
  const rows = useMemo(() => {
    if (!selected) return []
    return neighboringPanchayats(gps, data?.gpGeometry ?? { type: 'FeatureCollection', features: [] }, selected)
  }, [gps, selected, data?.gpGeometry])
  const forecastDates = selected?.forecast.map(f => f.date) ?? []
  const [startDate, setStartDate] = useState('')
  useEffect(() => { if (forecastDates.length) setStartDate(current => forecastDates.includes(current) ? current : forecastDates[0]) }, [selectedId, forecastDates.join(',')])
  const startIndex = Math.max(0, forecastDates.indexOf(startDate))
  const days = selected?.forecast.slice(startIndex, startIndex + 7) ?? []
  const barData = rows.map(g => ({ name: g.name, rainfall: g.forecast[startIndex]?.rainfall ?? null }))
  const trend = days.map((day, index) => ({ day: dateLabel(day.date), ...Object.fromEntries(rows.map(g => [g.id, g.forecast[startIndex + index]?.rainfall ?? null])) }))
  const kdes = rows.map(g => ({ gp: g, values: density(g.forecast.slice(startIndex, startIndex + 7).map(d => d.rainfall).filter((n): n is number => n != null)) }))
  const densityChart = Array.from({ length: 41 }, (_, i) => { const x = kdes[0]?.values[i]?.x ?? i; return Object.fromEntries([['rain', x], ...kdes.map(({ gp, values }) => [gp.id, values[i]?.y ?? null])]) })
  const metricRows = rows.map(g => { const fs = g.forecast.slice(startIndex, startIndex + 7); const temps = fs.map(f => f.temperature).filter((x): x is number => x != null); const sum = (key: 'rainfall' | 'humidity' | 'wind') => fs.map(f => f[key]).filter((x): x is number => x != null).reduce((a, b) => a + b, 0); const avg = (key: 'humidity' | 'wind') => { const values = fs.map(f => f[key]).filter((x): x is number => x != null); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null }; return { gp: g, max: temps.length ? Math.max(...temps) : null, min: temps.length ? Math.min(...temps) : null, dayRain: g.forecast[startIndex]?.rainfall ?? null, totalRain: sum('rainfall'), humidity: avg('humidity'), windKmh: avg('wind') == null ? null : avg('wind')! * 3.6 } })
  const onSelect = (gp: GPWeather) => { setSelectedId(gp.id); setParams({ block: location.block, gp: gp.id }) }
  const download = () => { const header = ['Panchayat', 'Direction', 'Distance km', 'Max temp C', 'Min temp C', 'Day 1 rainfall mm', '7 day rainfall mm', 'Humidity %', 'Wind km/h']; const lines = metricRows.map(r => [r.gp.name, direction(selected!, r.gp) ?? '—', fmt(distanceKm(selected!, r.gp), 2), fmt(r.max), fmt(r.min), fmt(r.dayRain), fmt(r.totalRain), fmt(r.humidity), fmt(r.windKmh)].map(x => `"${x}"`).join(',')); const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'panchayat-weather-comparison.csv'; a.click(); URL.revokeObjectURL(url) }
  const dayPeak = metricRows.reduce<(typeof metricRows)[number] | null>((best, row) => !best || (row.dayRain ?? -Infinity) > (best.dayRain ?? -Infinity) ? row : best, null)
  return <div className="page comparison-page"><div className="comparison-frame">{error ? <div className="card comparison-error">{t('Forecast data unavailable')}: {error}</div> : !data || !selected ? <div className="card comparison-loading">{processingMessage || t('Loading calculated Panchayat forecasts...')}</div> : <>
    <header className="comparison-heading"><Link to="/dashboard" className="comparison-back"><ArrowLeft size={17}/> {t('Dashboard')}</Link><div className="comparison-title-mark"><MapPin/></div><div className="comparison-title"><h1>{t('Cross-Panchayat Weather Comparison')}</h1><p>{location.block} {t('Block')} · {t('Nearby Panchayat analysis')} · {t('Model output')} · {t('Updated')} {data.updatedAt ? new Date(data.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : t('latest available run')}</p></div><label className="comparison-date"><CalendarDays size={16}/><select value={startDate} aria-label={t('Forecast start date')} onChange={e => setStartDate(e.target.value)}>{forecastDates.map(date => <option value={date} key={date}>{dateLabel(date)}</option>)}</select></label></header>
    <div className="comparison-location-select"><label>{t('Block')}<select value={locationKey(location)} onChange={e => setLocation(locations.find(x => locationKey(x) === e.target.value) ?? location)}>{locations.map(x => <option value={locationKey(x)} key={locationKey(x)}>{x.block}, {x.district}</option>)}</select></label><label>{t('Selected Panchayat')}<select value={selectedId} onChange={e => onSelect(gps.find(g => g.id === e.target.value) ?? selected)}>{gps.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}</select></label></div>
    <div className="comparison-summary"><article><span><MapPin/></span><div><small>Selected Panchayat</small><b>{selected.name}</b><p>{location.block} Block, {location.district}, {location.state}</p></div></article><article><span><Users/></span><div><small>Nearby Panchayats</small><b>{Math.max(0, rows.length - 1)}</b><p>{rows.slice(1).map(g => g.name).join(', ') || 'No nearby GP forecast available'}</p></div></article><article><span><CalendarDays/></span><div><small>Forecast horizon</small><b>{days.length} Days</b><p>{days.length ? `${dateLabel(days[0].date)} – ${dateLabel(days[days.length - 1].date)}` : 'No calculated dates'}</p></div></article><article><span><Database/></span><div><small>Forecast source</small><b>Model output</b><p>Existing Panchayat level calculation</p></div></article></div>
    {data.updatedAt && forecastDates[0] && new Date(`${forecastDates[0]}T12:00:00Z`) < new Date(new Date().toISOString().slice(0, 10)) && <div className="comparison-stale">Showing the latest calculated model run ({dateLabel(forecastDates[0])} onwards). These dates are historical and are not presented as live forecasts.</div>}
    <div className="comparison-charts"><ComparisonMap data={data} rows={rows} selected={selected} select={onSelect} full={() => document.getElementById('comparison-map')?.requestFullscreen?.()}/>
      <section className="comparison-panel"><header><b>🌧️ {t('Day-1 Rainfall Comparison')}</b><small>{forecastDates[startIndex] ? dateLabel(forecastDates[startIndex]) : t('No forecast date')}</small></header><div className="comparison-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 11 }}/><YAxis unit=" mm" tick={{ fontSize: 11 }}/><Tooltip formatter={(v) => [`${fmt(Number(v))} mm`, t('Rainfall')]}/><Bar dataKey="rainfall" radius={[3, 3, 0, 0]}>{barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></section>
      <section className="comparison-panel"><header><b>📈 {t('7-Day Rainfall Trend')}</b><small>{days.length ? `${dateLabel(days[0].date)} – ${dateLabel(days[days.length - 1].date)}` : t('No forecast dates')}</small></header><div className="comparison-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day" tick={{ fontSize: 11 }}/><YAxis unit=" mm" tick={{ fontSize: 11 }}/><Tooltip/><Legend wrapperStyle={{ fontSize: 11 }}/>{rows.map((g, i) => <Line key={g.id} dataKey={g.id} name={g.name} type="monotone" stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} connectNulls={false} dot={{ r: 4 }}/>)}</LineChart></ResponsiveContainer></div></section>
      <section className="comparison-panel"><header><b>📊 {t('Rainfall Distribution — 7-Day Forecast')}</b><small>{t('Kernel density estimated from calculated daily values')}</small></header><div className="comparison-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={densityChart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="rain" type="number" domain={['dataMin', 'dataMax']} unit=" mm" tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 11 }}/><Tooltip/><Legend wrapperStyle={{ fontSize: 11 }}/>{rows.map((g, i) => <Line key={g.id} dataKey={g.id} name={g.name} type="monotone" stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false}/>)}</LineChart></ResponsiveContainer></div></section>
    </div>
    <section className="comparison-panel comparison-table-panel"><header><b>📋 Panchayat-wise Weather Comparison</b><button className="comparison-download" onClick={download}><Download size={17}/> Download CSV</button></header><div className="comparison-table-scroll"><table><thead><tr><th>Panchayat</th><th>Direction</th><th>Distance (km)</th><th>Max Temperature (°C)</th><th>Min Temperature (°C)</th><th>Day-1 Rainfall (mm)</th><th>7-Day Rainfall Total (mm)</th><th>Humidity (%)</th><th>Wind Speed (km/h)</th></tr></thead><tbody>{metricRows.map((r, i) => <tr key={r.gp.id}><td><button className="comparison-name" onClick={() => onSelect(r.gp)}>{r.gp.name}{i === 0 && <em>Selected</em>}</button></td><td>{i === 0 ? '—' : direction(selected, r.gp) ?? '—'}</td><td>{i === 0 ? '—' : fmt(distanceKm(selected, r.gp), 2)}</td><td>{fmt(r.max)}</td><td>{fmt(r.min)}</td><td>{fmt(r.dayRain)}</td><td>{fmt(r.totalRain)}</td><td>{fmt(r.humidity)}</td><td>{fmt(r.windKmh)}</td></tr>)}</tbody></table></div></section>
    <section className="comparison-panel comparison-7day"><header><b>🗓️ 7-Day Forecast by Panchayat</b><small>Daily values from the selected model run</small></header><div className="comparison-table-scroll"><table><thead><tr><th>Panchayat</th>{days.map((d, i) => <th key={d.date}>D{i + 1}<small>{dateLabel(d.date)}</small></th>)}</tr></thead><tbody>{rows.map(g => <tr key={g.id}><td><button className="comparison-name" onClick={() => onSelect(g)}>{g.name}</button></td>{days.map((d, i) => { const f: ForecastDay | undefined = g.forecast[startIndex + i]; return <td key={d.date}>T {fmt(f?.temperature, 1)}°<br/>R {fmt(f?.rainfall, 1)} mm<br/>RH {fmt(f?.humidity, 0)}%<br/>W {f?.wind == null ? '—' : `${fmt(f.wind * 3.6, 1)} km/h`}</td> })}</tr>)}</tbody></table></div></section>
    <div className="comparison-insights"><h2>💡 Key Insights <small>(Neighbourhood comparison)</small></h2><article><CloudRain/><div><b>{dayPeak?.gp.name === selected.name ? 'Highest Day-1 rainfall at selected Panchayat' : `Higher rainfall in ${dayPeak?.gp.name ?? 'available Panchayats'}`}</b><p>{dayPeak ? `${fmt(dayPeak.dayRain)} mm on ${forecastDates[startIndex] ? dateLabel(forecastDates[startIndex]) : 'selected day'}, compared across ${rows.length} calculated Panchayat forecasts.` : 'Rainfall values are not present in this model output.'}</p></div></article><article><MapPin/><div><b>Temperature comparison uses calculated daily extremes</b><p>{metricRows.length ? `${fmt(Math.min(...metricRows.map(r => r.min).filter((n): n is number => n != null)), 1)}–${fmt(Math.max(...metricRows.map(r => r.max).filter((n): n is number => n != null)), 1)} °C across this comparison.` : 'Temperature values are unavailable.'}</p></div></article><article><Users/><div><b>Humidity and wind reflect the available run</b><p>Daily values above come directly from the existing Panchayat forecast output.</p></div></article></div>
  </>}</div></div>
}
