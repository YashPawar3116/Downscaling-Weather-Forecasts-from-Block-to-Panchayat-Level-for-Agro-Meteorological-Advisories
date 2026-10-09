import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, MapPin } from 'lucide-react'
import type { BlockData, GPWeather } from './types'

const layers = ['Temperature', 'Rainfall', 'Humidity', 'Wind'] as const
type Layer = typeof layers[number]
const indiaDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const displayNumber = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1)

export default function MapWeather({ data, gp, onSelect, layer, setLayer }: {
  data: BlockData; gp: GPWeather | null; onSelect: (gp: GPWeather) => void;
  layer: Layer; setLayer: (layer: Layer) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [base, setBase] = useState('satellite')
  const [showGp, setShowGp] = useState(true)
  const [showBlock, setShowBlock] = useState(true)
  const todayKey = indiaDateKey()
  const upcomingDay = data.gps[0]?.forecast.findIndex(day => day.date >= todayKey) ?? -1
  const dayIndex = upcomingDay >= 0 ? upcomingDay : (data.gps[0]?.forecast.length ? 0 : -1)
  const forecastDate = dayIndex >= 0 ? data.gps[0]?.forecast[dayIndex]?.date : undefined
  const dayLabel = forecastDate ? (forecastDate < todayKey ? `Latest · ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${forecastDate}T12:00:00Z`))}` : forecastDate === todayKey ? 'Today' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${forecastDate}T12:00:00Z`))) : 'Forecast unavailable'
  const variable = layer.toLowerCase() === 'wind' ? 'wind' : layer.toLowerCase() as 'temperature' | 'rainfall' | 'humidity'
  const legendValues = data.gps.map(item => item.forecast[dayIndex]?.[variable]).filter((value): value is number => value != null && Number.isFinite(value)).map(value => variable === 'wind' ? value * 3.6 : value)
  const legendMin = legendValues.length ? Math.min(...legendValues) : 0
  const legendMax = legendValues.length ? Math.max(...legendValues) : 0
  const legendMid = (legendMin + legendMax) / 2
  const post = (message: object) => frame.current?.contentWindow?.postMessage(message, '*')
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'hyperweather:map-ready') {
        post({ type: 'hyperweather:data', gps: data.gps, gpGeometry: data.gpGeometry, blockGeometry: data.blockGeometry, selectedId: gp?.id, dayIndex })
        post({ type: 'hyperweather:layer', layer })
        return
      }
      if (event.data?.type !== 'hyperweather:select-gp') return
      const selected = data.gps.find(item => item.id === String(event.data.id))
      if (selected) onSelect(selected)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [data, gp?.id, layer, onSelect, dayIndex])
  useEffect(() => {
    post({ type: 'hyperweather:data', gps: data.gps, gpGeometry: data.gpGeometry, blockGeometry: data.blockGeometry, selectedId: gp?.id, dayIndex })
  }, [data, gp?.id, dayIndex])
  useEffect(() => { post({ type: 'hyperweather:layer', layer }) }, [layer])
  return <section className="map-card">
    <div className="map-title"><div><span className="eyebrow">AVAILABLE MODEL OUTPUT</span><h2>{data.location.block} Block <span>· {data.location.district}</span></h2><p>{data.gps.length} Gram Panchayats · 7-day forecast{data.updatedAt ? ` · Run ${new Date(data.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p></div>
      <div className="map-actions"><label className="map-select"><MapPin size={15}/><select aria-label="Weather layer" value={layer} onChange={e => setLayer(e.target.value as Layer)}>{layers.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={14}/></label></div>
    </div>
    <div className="map-wrap maplibre-wrap"><iframe ref={frame} title="Gram Panchayat weather map" src="/src/map.html" onLoad={() => {
      post({ type: 'hyperweather:data', gps: data.gps, gpGeometry: data.gpGeometry, blockGeometry: data.blockGeometry, selectedId: gp?.id, dayIndex })
      post({ type: 'hyperweather:layer', layer })
    }}/>
      <div className={`map-legend legend-${layer.toLowerCase()}`}><b>{layer} · {dayLabel}</b>{dayIndex < 0 || !legendValues.length ? <span>Forecast values unavailable</span> : (layer === 'Temperature' ? [['Max', '#ed401b', `${displayNumber(legendMax)}°C`], ['Mid', '#ffad1f', `${displayNumber(legendMid)}°C`], ['Min', '#fff04a', `${displayNumber(legendMin)}°C`]] : layer === 'Rainfall' ? [['Max', '#092e87', `${displayNumber(legendMax)} mm`], ['Mid', '#318ad8', `${displayNumber(legendMid)} mm`], ['Min', '#e8f5ff', `${displayNumber(legendMin)} mm`]] : layer === 'Humidity' ? [['Max', '#1556c0', `${displayNumber(legendMax)}%`], ['Mid', '#41c9a4', `${displayNumber(legendMid)}%`], ['Min', '#efff9a', `${displayNumber(legendMin)}%`]] : [['Max', '#633bb4', `${displayNumber(legendMax)} km/h`], ['Mid', '#16a34a', `${displayNumber(legendMid)} km/h`], ['Min', '#dcfce7', `${displayNumber(legendMin)} km/h`]]).map(([name, color, value]) => <span key={name}><i style={{ background: color }}/>{name} · {value}</span>)}</div>
      <div className="map-controls"><button className={showBlock ? 'chosen' : ''} aria-pressed={showBlock} onClick={() => { const next = !showBlock; setShowBlock(next); post({ type: 'hyperweather:boundaries', gp: showGp, block: next }) }}><span className="check">{showBlock ? '✓' : ''}</span> Block boundary</button><button className={showGp ? 'chosen' : ''} aria-pressed={showGp} onClick={() => { const next = !showGp; setShowGp(next); post({ type: 'hyperweather:boundaries', gp: next, block: showBlock }) }}><span className="check">{showGp ? '✓' : ''}</span> GP boundaries</button><label>Basemap <select value={base} onChange={e => { setBase(e.target.value); post({ type: 'hyperweather:basemap', base: e.target.value }) }}><option value="satellite">Satellite</option><option value="satellite-labels">Satellite + labels</option><option value="agriculture">Agriculture</option><option value="liberty">Liberty</option><option value="positron">Positron</option><option value="dark">Dark</option><option value="fiord">Fiord</option></select></label></div>
    </div>
  </section>
}
