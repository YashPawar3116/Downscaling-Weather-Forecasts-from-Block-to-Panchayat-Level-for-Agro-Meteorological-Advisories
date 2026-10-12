import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, CalendarDays, ChevronDown, CloudRain, Droplets, Leaf, MapPin, RefreshCcw, Sprout, Thermometer, UserRound, Waves, Wind } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { buildAdvisories } from './advisory'
import MapWeather from './MapWeather'
import type { PanchayatMapMetric, PanchayatMapMode } from './PanchayatView'
import { applyScenario, baselineScenarioInputs, scenarioInsight, scenarioIsChanged, scenarioStatus, type ScenarioInputs } from './scenario'
import { direction, distanceKm, neighboringPanchayats } from './spatial'
import { getBlock } from './services'
import type { BlockData, ForecastDay, GPWeather, LandCoverClass, LocationOption } from './types'
import { useLanguage } from './language'
import { defaultLocation as preferredLocation } from './locationDefaults'
import './digital-twin.css'

const PanchayatView = lazy(() => import('./PanchayatView'))
const HORIZONS = [1, 3, 5, 7] as const
const VARIABLES = [
  { key: 'rainfall', label: 'Rainfall', icon: CloudRain, unit: 'mm' },
  { key: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°C' },
  { key: 'humidity', label: 'Humidity', icon: Droplets, unit: '%' },
  { key: 'wind', label: 'Wind speed', icon: Wind, unit: 'km/h' },
] as const
type Variable = typeof VARIABLES[number]['key']
type Layer = 'Rainfall' | 'Temperature' | 'Humidity' | 'Wind'
type Intervention = 'none' | 'drainage' | 'irrigation' | 'water-storage' | 'crop-protection'
const numberLabel = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits)
const kmh = (value: number | null | undefined) => value == null ? null : value * 3.6
const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
const todayKey = () => new Date().toISOString().slice(0, 10)
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
const CATEGORY_LABELS: Record<LandCoverClass, string> = {
  water: 'Water',
  trees: 'Trees',
  grass: 'Grass',
  flooded_vegetation: 'Flooded vegetation',
  crops: 'Agriculture',
  shrub: 'Shrub',
  built: 'Built area',
  bare: 'Bare ground',
  snow_ice: 'Snow / ice',
}
const LAND_COLORS = ['#169a73', '#f5bb31', '#ed8750', '#35a6c5', '#7987a5', '#66b8a6', '#d2a17a', '#9b8c76', '#c5d4e2']

function defaultLocation(locations: LocationOption[]) {
  return preferredLocation(locations)
}

function forecastValue(day: ForecastDay | undefined, variable: Variable) {
  if (!day) return null
  return variable === 'wind' ? kmh(day.wind) : day[variable]
}

function differenceLabel(base: number | null, next: number | null, digits = 1) {
  if (base === null || next === null) return 'Change unavailable'
  const difference = next - base
  if (Math.abs(difference) < 0.05) return 'No scenario change'
  return `${difference > 0 ? '+' : ''}${difference.toFixed(digits)}`
}

function makeDensity(values: number[]) {
  if (!values.length) return []
  const minimum = Math.min(0, ...values)
  const maximum = Math.max(...values)
  const span = Math.max(1, maximum - minimum)
  const bandwidth = Math.max(0.8, span / 5)
  return Array.from({ length: 41 }, (_, index) => {
    const rainfall = minimum + span * index / 40
    const density = values.reduce((sum, value) => sum + Math.exp(-0.5 * ((rainfall - value) / bandwidth) ** 2), 0) / (values.length * bandwidth * Math.sqrt(2 * Math.PI))
    return { rainfall: Number(rainfall.toFixed(2)), density }
  })
}

function sumRainfall(gp: GPWeather | null, start: number, count: number) {
  const values = gp?.forecast.slice(start, start + count).map(day => day.rainfall).filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value)) ?? []
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null
}

function SelectBox({ label, value, options, onChange, disabledValues = new Set<string>() }: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  disabledValues?: Set<string>
}) {
  const { t } = useLanguage()
  return <label className="twin-select"><span>{t(label)}</span><div><select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option} disabled={disabledValues.has(option)}>{option}</option>)}</select><ChevronDown size={14}/></div></label>
}

function ScenarioSlider({ label, value, min, max, step, unit, onChange, hint }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
  hint: string
}) {
  const { t } = useLanguage()
  return <label className="scenario-slider">
    <span>{t(label)}<b>{value > 0 ? '+' : ''}{value}{unit}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/>
    <small>{t(hint)}</small>
  </label>
}

function MetricRow({ variable, baseline, scenario }: { variable: typeof VARIABLES[number]; baseline: number | null; scenario: number | null }) {
  const { t } = useLanguage()
  const Icon = variable.icon
  return <div className={`twin-metric twin-metric-${variable.key}`}>
    <span className="twin-metric-icon"><Icon size={18}/></span>
    <div className="twin-metric-label"><b>{t(variable.label)}</b><small>{variable.label === 'Rainfall' ? t('Scenario forecast') : `${t('Forecast')} · ${variable.unit}`}</small></div>
    <div className="twin-metric-values"><span>{numberLabel(baseline)}{baseline === null ? '' : variable.unit}</span><strong>{numberLabel(scenario)}{scenario === null ? '' : variable.unit}</strong><small>{differenceLabel(baseline, scenario)}{baseline !== null && scenario !== null && differenceLabel(baseline, scenario) !== 'No scenario change' ? ` ${variable.unit}` : ''}</small></div>
  </div>
}

function ForecastCard({ gp, dateIndex, horizon, variable, setVariable }: {
  gp: GPWeather
  dateIndex: number
  horizon: number
  variable: Variable
  setVariable: (variable: Variable) => void
}) {
  const { t } = useLanguage()
  const days = gp.forecast.slice(dateIndex, dateIndex + horizon)
  const chartData = days.map((day, index) => ({ label: `D${index + 1}`, value: forecastValue(day, variable), date: day.date }))
  const selectedVariable = VARIABLES.find(item => item.key === variable) ?? VARIABLES[0]
  return <section className="twin-panel twin-forecast-panel" id="twin-weather">
    <header className="twin-panel-heading"><div><h2><BarChart3 size={17}/> {horizon}-{t('Day Forecast')}</h2><p>{gp.name} · {t('Scenario-adjusted values')}</p></div><span className="twin-panel-tag">{days.length} {t('available days')}</span></header>
    <div className="twin-tabs" role="tablist" aria-label={t('Forecast chart variable')}>{VARIABLES.map(item => <button key={item.key} role="tab" aria-selected={variable === item.key} className={variable === item.key ? 'active' : ''} onClick={() => setVariable(item.key)}>{t(item.label)}</button>)}</div>
    {chartData.length ? <div className="twin-chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
      <defs><linearGradient id="twinForecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#188fcb" stopOpacity={0.3}/><stop offset="100%" stopColor="#188fcb" stopOpacity={0.02}/></linearGradient></defs>
      <CartesianGrid stroke="#e5eef1" strokeDasharray="3 3" vertical={false}/>
      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#627986' }} axisLine={false} tickLine={false}/>
      <YAxis width={45} tick={{ fontSize: 10, fill: '#627986' }} axisLine={false} tickLine={false}/>
      <Tooltip labelFormatter={(_, items) => items[0]?.payload?.date ? dateLabel(items[0].payload.date) : ''} formatter={value => [`${numberLabel(Number(value))} ${selectedVariable.unit}`, t(selectedVariable.label)]}/>
      <Area dataKey="value" type="monotone" connectNulls={false} stroke="#188fcb" strokeWidth={2.5} fill="url(#twinForecastFill)"/>
    </AreaChart></ResponsiveContainer></div> : <div className="twin-no-data">{t('No forecast dates are available for this selection.')}</div>}
    <div className="twin-forecast-strip">{days.map((day, index) => <div key={day.date}><small>D{index + 1} · {dateLabel(day.date)}</small><b>{numberLabel(forecastValue(day, variable))}{forecastValue(day, variable) === null ? '' : ` ${selectedVariable.unit}`}</b></div>)}</div>
  </section>
}

function RainfallDistribution({ data, selectedId, dayIndex, threshold }: { data: BlockData; selectedId: string; dayIndex: number; threshold: number }) {
  const { t } = useLanguage()
  const readings = data.gps.map(gp => gp.forecast[dayIndex]?.rainfall).filter((value): value is number => value != null && Number.isFinite(value))
  const selected = data.gps.find(gp => gp.id === selectedId)?.forecast[dayIndex]?.rainfall ?? null
  const chartData = makeDensity(readings)
  return <section className="twin-panel twin-distribution-panel" id="twin-water">
    <header className="twin-panel-heading"><div><h2><Waves size={17}/> {t('Rainfall Distribution')}</h2><p>{t('Day')} {dayIndex + 1} · {readings.length} {t('real GP forecasts')}</p></div></header>
    {chartData.length ? <><div className="twin-chart-area twin-density-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
      <defs><linearGradient id="twinDensityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20a9d4" stopOpacity={0.34}/><stop offset="100%" stopColor="#20a9d4" stopOpacity={0.03}/></linearGradient></defs>
      <CartesianGrid stroke="#e6eef0" strokeDasharray="3 3" vertical={false}/>
      <XAxis type="number" dataKey="rainfall" tick={{ fontSize: 9, fill: '#607682' }} tickFormatter={value => `${value}`} axisLine={false} tickLine={false}/>
      <YAxis tick={{ fontSize: 9, fill: '#607682' }} axisLine={false} tickLine={false}/>
      <Tooltip labelFormatter={value => `${numberLabel(Number(value))} mm`} formatter={value => [numberLabel(Number(value), 3), 'Kernel density']}/>
      <Area dataKey="density" type="monotone" stroke="#138fc1" strokeWidth={2} fill="url(#twinDensityFill)"/>
      {selected !== null && <ReferenceLine x={selected} stroke="#1672bd" strokeDasharray="5 4" label={{ value: `${numberLabel(selected)} mm`, fill: '#126aa7', fontSize: 10, position: 'insideTopRight' }}/>}
      <ReferenceLine x={threshold} stroke="#d48a21" strokeDasharray="3 4"/>
    </AreaChart></ResponsiveContainer></div><div className="twin-distribution-caption"><span><i className="density-mark"/> Selected GP: <b>{numberLabel(selected)} mm</b></span><span><i className="threshold-mark"/> Threshold: {threshold} mm</span></div></> : <div className="twin-no-data">Rainfall values are unavailable for this date.</div>}
  </section>
}

function NeighbourTable({ data, selected, dayIndex }: { data: BlockData; selected: GPWeather; dayIndex: number }) {
  const { t } = useLanguage()
  const neighbours = neighboringPanchayats(data.gps, data.gpGeometry, selected)
  return <section className="twin-panel twin-neighbour-panel" id="twin-comparative">
    <header className="twin-panel-heading"><div><h2><MapPin size={17}/> {t('Neighbouring Panchayat Comparison')}</h2><p>{t('Adjacent boundaries first, then nearest available GPs')} · {t('Day')} {dayIndex + 1}</p></div></header>
    <div className="twin-table-wrap"><table><thead><tr><th>{t('Panchayat')}</th><th>{t('Distance')}</th><th>{t('Direction')}</th><th>{t('Rain (mm)')}</th><th>{t('Temp (°C)')}</th><th>{t('Humidity')}</th><th>{t('Wind (km/h)')}</th></tr></thead><tbody>{neighbours.map((gp, index) => {
      const day = gp.forecast[dayIndex]
      return <tr key={gp.id} className={gp.id === selected.id ? 'selected-row' : ''}><td><b>{gp.name}</b>{index === 0 && <small>Selected</small>}</td><td>{index === 0 ? '—' : distanceKm(selected, gp) == null ? '—' : `${numberLabel(distanceKm(selected, gp), 2)} km`}</td><td>{index === 0 ? '—' : direction(selected, gp) ?? '—'}</td><td>{numberLabel(day?.rainfall)}</td><td>{numberLabel(day?.temperature)}</td><td>{numberLabel(day?.humidity, 0)}{day?.humidity == null ? '' : '%'}</td><td>{numberLabel(kmh(day?.wind))}</td></tr>
    })}</tbody></table></div>
    {!neighbours.length && <div className="twin-no-data">{t('No neighbouring Panchayat forecast is available in this block.')}</div>}
  </section>
}

function LandUseCard({ gp }: { gp: GPWeather }) {
  const { t } = useLanguage()
  const chartData = (Object.entries(gp.landUseFractions ?? {}) as [LandCoverClass, number][])
    .filter(([, fraction]) => Number.isFinite(fraction) && fraction > 0)
    .map(([key, fraction]) => ({ name: t(CATEGORY_LABELS[key]), fraction, percent: fraction * 100 }))
    .sort((a, b) => b.fraction - a.fraction)
  return <section className="twin-panel twin-landuse-panel" id="twin-agriculture">
    <header className="twin-panel-heading"><div><h2><Leaf size={17}/> {t('Land Use & Assets')}</h2><p>{gp.name} · {t('observed land-cover fractions')}</p></div></header>
    {chartData.length ? <div className="twin-landuse-content"><div className="twin-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="fraction" nameKey="name" innerRadius="57%" outerRadius="88%" paddingAngle={1} stroke="none">{chartData.map((entry, index) => <Cell key={entry.name} fill={LAND_COLORS[index % LAND_COLORS.length]}/>)}</Pie><Tooltip formatter={value => [`${numberLabel(Number(value) * 100)}%`, 'Observed share']}/></PieChart></ResponsiveContainer></div><div className="twin-land-legend">{chartData.map((entry, index) => <div key={entry.name}><i style={{ background: LAND_COLORS[index % LAND_COLORS.length] }}/><span>{entry.name}</span><b>{numberLabel(entry.percent, 0)}%</b></div>)}</div></div> : <div className="twin-no-data">Land-cover fractions are not available for this Panchayat in the current data output.</div>}
    {chartData.length > 0 && <small className="twin-data-note">Dynamic World-derived classes; percentages are from the published GP land-cover output.</small>}
  </section>
}

function differenceData(baseline: BlockData, scenario: BlockData): BlockData {
  const baselineById = new Map(baseline.gps.map(gp => [gp.id, gp]))
  return {
    ...scenario,
    gps: scenario.gps.map(gp => {
      const base = baselineById.get(gp.id)
      const baselineByDate = new Map(base?.forecast.map(day => [day.date, day]))
      return {
        ...gp,
        forecast: gp.forecast.map(day => {
          const baseDay = baselineByDate.get(day.date)
          const delta = (value: number | null, reference: number | null | undefined) =>
            value === null || reference == null ? null : value - reference
          return {
            ...day,
            rainfall: delta(day.rainfall, baseDay?.rainfall),
            temperature: delta(day.temperature, baseDay?.temperature),
            humidity: delta(day.humidity, baseDay?.humidity),
            wind: delta(day.wind, baseDay?.wind),
          }
        }),
      }
    }),
  }
}

export default function DigitalTwinDashboard({ locations }: { locations: LocationOption[] }) {
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [location, setLocation] = useState(() => defaultLocation(locations))
  const [data, setData] = useState<BlockData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [processing, setProcessing] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [horizon, setHorizon] = useState<number>(5)
  const [layer, setLayer] = useState<Layer>('Rainfall')
  const [mapView, setMapView] = useState<'2d' | '3d'>('3d')
  const [mapMode, setMapMode] = useState<PanchayatMapMode>('scenario')
  const [intervention, setIntervention] = useState<Intervention>('none')
  const [chartVariable, setChartVariable] = useState<Variable>('rainfall')
  const [visibleVariables, setVisibleVariables] = useState<Set<Variable>>(() => new Set(VARIABLES.map(item => item.key)))
  const [pending, setPending] = useState<ScenarioInputs>({ ...baselineScenarioInputs })
  const [applied, setApplied] = useState<ScenarioInputs>({ ...baselineScenarioInputs })
  const [activeSection, setActiveSection] = useState('Overview')

  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    setProcessing('')
    if (!location || location.available === false) {
      setBusy(false)
      setError('A calculated forecast is not available for this block yet. Selecting it will not start a processing job.')
      return () => { live = false }
    }
    setBusy(true)
    getBlock(location.state, location.district, location.block, status => live && setProcessing(status.message))
      .then(result => {
        if (!live) return
        setData(result)
        const preferred = result.gps.find(gp => normalized(gp.name) === 'anjangaon')
        const first = preferred ?? result.gps[0]
        setSelectedId(first?.id ?? '')
        setSelectedDate(first?.forecast[0]?.date ?? '')
      })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Could not load the real block forecast.') })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [location])

  const scenarioData = useMemo(() => data ? applyScenario(data, applied) : null, [data, applied])
  const difference = useMemo(() => data && scenarioData ? differenceData(data, scenarioData) : null, [data, scenarioData])
  const mapData = mapMode === 'baseline' ? data : mapMode === 'difference' ? difference : scenarioData
  const baselineGp = data?.gps.find(gp => gp.id === selectedId) ?? null
  const scenarioGp = scenarioData?.gps.find(gp => gp.id === selectedId) ?? null
  const dateIndex = Math.max(0, baselineGp?.forecast.findIndex(day => day.date === selectedDate) ?? 0)
  const baselineDay = baselineGp?.forecast[dateIndex]
  const scenarioDay = scenarioGp?.forecast[dateIndex]
  const activeScenario = scenarioIsChanged(applied)
  const stale = selectedDate !== '' && selectedDate < todayKey()
  const advisories = scenarioGp ? buildAdvisories(scenarioGp.forecast.slice(dateIndex, dateIndex + horizon)) : []
  const scenarioInsights = scenarioGp ? scenarioInsight(scenarioGp, scenarioDay, applied) : []
  const temperatureInterpretation = applied.temperatureDeltaC > 0
    ? 'Higher temperature increases heat exposure and may raise crop water demand; this is qualitative, not a calibrated impact estimate.'
    : applied.temperatureDeltaC < 0
      ? 'Lower temperature reduces the temperature scenario input; crop impacts are not quantified.'
      : 'No temperature scenario adjustment applied.'
  const rainfallTotal = sumRainfall(scenarioGp, dateIndex, horizon)
  const baselineRainfallTotal = sumRainfall(baselineGp, dateIndex, horizon)
  const latestModelTargetDate = baselineGp?.forecast.map(day => day.date).sort().slice(-1)[0]
  const displayedDays = scenarioGp?.forecast.slice(dateIndex, dateIndex + horizon).filter(day => day.rainfall !== null).length ?? 0
  const averageScenarioRainfall = rainfallTotal === null || !displayedDays ? null : rainfallTotal / displayedDays
  const belowRainfallThreshold = averageScenarioRainfall !== null && averageScenarioRainfall < applied.rainfallThresholdMm
  const waterPlanningStatus = averageScenarioRainfall === null
    ? 'Unavailable'
    : belowRainfallThreshold
      ? applied.soilMoisture === 'low'
        ? 'Dryness watch · low soil-moisture assumption'
        : `Below rainfall threshold · ${applied.soilMoisture} soil-moisture assumption`
      : applied.soilMoisture === 'high'
        ? 'Wet-condition review · high soil-moisture assumption'
        : 'Rainfall planning threshold met'
  const agriculturePlanningSignal = belowRainfallThreshold && applied.soilMoisture === 'low'
    ? 'Irrigation review flag: rainfall is below the selected threshold and soil moisture is assumed low.'
    : !belowRainfallThreshold && applied.soilMoisture === 'high'
      ? 'Drainage review flag: rainfall meets the selected threshold and soil moisture is assumed high.'
      : 'No additional soil-moisture planning flag for the current assumptions.'
  const interventionDescriptions: Record<Intervention, string> = {
    none: 'No intervention selected. Weather thresholds remain the only modeled signals.',
    drainage: 'Drainage action selected. The rainfall trigger remains visible; drainage capacity and runoff reduction are not available to quantify.',
    irrigation: 'Delay irrigation pending a rainfall check. Soil water and irrigation demand are not measured, so this remains a planning prompt.',
    'water-storage': 'Water storage selected for planning. Available capacity and capture effectiveness are not measured, so no storage gain is estimated.',
    'crop-protection': 'Crop-protection action selected. Weather-risk prompts update; crop, growth-stage, and treatment efficacy data are not available.',
  }
  const interventionSignal = intervention === 'none'
    ? 'No intervention selected.'
    : intervention === 'drainage'
      ? !belowRainfallThreshold ? 'Planning flag: review drainage against the rainfall threshold.' : 'No rainfall-threshold signal for drainage review.'
      : intervention === 'irrigation'
        ? belowRainfallThreshold ? 'Planning flag: delay irrigation and review the below-threshold rainfall signal.' : 'Rainfall threshold met; irrigation delay is not indicated by this rule.'
        : intervention === 'water-storage'
          ? !belowRainfallThreshold ? 'Planning flag: review storage readiness against the rainfall threshold.' : 'Rainfall threshold is below target; storage capacity impact is unavailable.'
          : advisories.length ? `${advisories.length} rule-based weather prompt(s) to check before crop-protection decisions.` : 'No current rule-based weather prompt; crop-specific data is unavailable.'
  const states = [...new Set(locations.map(item => item.state))].sort()
  const districts = [...new Set(locations.filter(item => item.state === location?.state).map(item => item.district))].sort()
  const blocks = locations.filter(item => item.state === location?.state && item.district === location?.district).sort((a, b) => a.block.localeCompare(b.block))
  const availableBlocks = new Set(blocks.filter(item => item.available === false).map(item => item.block))

  const changeLocation = (next: LocationOption) => {
    setLocation(next)
    setSelectedId('')
    setSelectedDate('')
    setPending({ ...baselineScenarioInputs })
    setApplied({ ...baselineScenarioInputs })
    setMapMode('baseline')
    setIntervention('none')
  }
  const selectState = (state: string) => {
    const next = locations.find(item => item.state === state && item.available !== false) ?? locations.find(item => item.state === state)
    if (next) changeLocation(next)
  }
  const selectDistrict = (district: string) => {
    const next = locations.find(item => item.state === location?.state && item.district === district && item.available !== false)
      ?? locations.find(item => item.state === location?.state && item.district === district)
    if (next) changeLocation(next)
  }
  const selectBlock = (block: string) => {
    const next = blocks.find(item => item.block === block)
    if (next) changeLocation(next)
  }
  const selectGp = (id: string) => {
    setSelectedId(id)
    const next = data?.gps.find(gp => gp.id === id)
    if (next && !next.forecast.some(day => day.date === selectedDate)) setSelectedDate(next.forecast[0]?.date ?? '')
  }
  const toggleVariable = (key: Variable) => setVisibleVariables(current => {
    const updated = new Set(current)
    if (updated.has(key)) updated.delete(key)
    else updated.add(key)
    return updated
  })
  const updatePending = <K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) => {
    const updated = { ...pending, [key]: value }
    setPending(updated)
    setApplied(updated)
  }
  const applyPending = () => {
    setApplied({ ...pending })
    setMapMode('scenario')
  }
  const resetScenario = () => {
    setPending({ ...baselineScenarioInputs })
    setApplied({ ...baselineScenarioInputs })
    setMapMode('baseline')
    setIntervention('none')
  }
  const openSection = (label: string, target: string) => {
    setActiveSection(label)
    if (label === 'Comparative View') {
      const params = new URLSearchParams()
      if (location) {
        params.set('state', location.state)
        params.set('district', location.district)
        params.set('block', location.block)
      }
      if (selectedId) params.set('gp', selectedId)
      navigate(`/comparison?${params}`)
      return
    }
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return <div className="digital-twin-app">
    <header className="twin-header">
      <a className="twin-brand" href="/dashboard" aria-label={t('Panchayat Digital Twin overview')}><span className="twin-brand-mark"><Leaf size={22}/></span><span><b>{t('Panchayat Digital Twin')}</b><small>{location ? `${location.block} ${t('Block')}, ${location.district} | ${t('Real-data village weather intelligence')}` : t('Real-data village weather intelligence')}</small></span></a>
      <div className="twin-global-filters">
        <SelectBox label="State" value={location?.state ?? ''} options={states} onChange={selectState}/>
        <SelectBox label="District" value={location?.district ?? ''} options={districts} onChange={selectDistrict}/>
        <SelectBox label="Block" value={location?.block ?? ''} options={blocks.map(item => item.block)} disabledValues={availableBlocks} onChange={selectBlock}/>
        <label className="twin-select"><span>{t('Gram Panchayat')}</span><div><select aria-label={t('Gram Panchayat')} value={baselineGp?.id ?? ''} onChange={event => selectGp(event.target.value)}>{data?.gps.map(gp => <option key={gp.id} value={gp.id}>{gp.name}</option>)}</select><ChevronDown size={14}/></div></label>
        <label className="twin-date-select"><CalendarDays size={15}/><span className="twin-date-caption">{t('Replay target')}</span><select aria-label={t('Replay stored Panchayat model target date')} value={selectedDate} onChange={event => setSelectedDate(event.target.value)}>{baselineGp?.forecast.map(day => <option key={day.date} value={day.date}>{dateLabel(day.date)}</option>)}</select><ChevronDown size={13}/></label>
        <label className="twin-language"><select aria-label={t('Language')} value={language} onChange={event => setLanguage(event.target.value as typeof language)}><option value="en">{t('English')}</option><option value="mr">{t('Marathi')}</option><option value="hi">{t('Hindi')}</option></select><ChevronDown size={13}/></label>
        <button className="twin-profile" aria-label={t('Profile')}><UserRound size={17}/></button>
      </div>
    </header>
    <nav className="twin-nav" aria-label="Digital Twin sections">{[
      ['Overview', 'twin-overview'], ['Weather & Climate', 'twin-weather'], ['3D Panchayat', 'twin-3d'], ['Agriculture', 'twin-agriculture'], ['Water Resources', 'twin-water'], ['Infrastructure', 'twin-landuse'], ['Risk & Alerts', 'twin-insights'], ['Comparative View', 'twin-comparative'],
    ].map(([label, target]) => <button key={label} className={activeSection === label ? 'active' : ''} onClick={() => openSection(label, target)}>{label === 'Overview' ? <Activity size={14}/> : label === 'Agriculture' ? <Sprout size={14}/> : label === 'Water Resources' ? <Waves size={14}/> : label === 'Risk & Alerts' ? <AlertTriangle size={14}/> : label === 'Comparative View' ? <BarChart3 size={14}/> : label === 'Infrastructure' ? <MapPin size={14}/> : <CloudRain size={14}/>}<span>{t(label)}</span></button>)}</nav>

    <main className="twin-workspace" id="twin-overview">
      {stale && data && <div className="twin-stale-banner"><AlertTriangle size={15}/><span>{t('Historical replay: stored Panchayat model target, not an observed weather record. Historical GP observations are not available from the current API.')}</span></div>}
      {activeScenario && <div className="twin-scenario-banner"><Activity size={15}/><span>{t('Scenario applied in memory · baseline source data is unchanged')}</span><button onClick={resetScenario}><RefreshCcw size={13}/> {t('Reset scenario')}</button></div>}
      {busy ? <div className="twin-loading"><span className="twin-spinner"/>{t(processing || 'Loading real Panchayat forecast and boundaries…')}</div> : error ? <div className="twin-error"><AlertTriangle/><div><b>{t('Forecast unavailable')}</b><p>{error}</p></div></div> : data && scenarioData && baselineGp && scenarioGp ? <>
        <section className="twin-replay-strip" aria-label={t('Historical replay timeline')}>
          <article><small>{t('Historical baseline')}</small><b>{t('GP observation unavailable')}</b><span>{t("The available historical archive is block-level and cannot be represented as this Panchayat's observation.")}</span></article>
          <span aria-hidden="true">→</span>
          <article><small>{t('Latest stored Panchayat target')}</small><b>{latestModelTargetDate ? dateLabel(latestModelTargetDate) : t('Unavailable')}</b><span>{t('Stored forecast target date, not a live weather reading.')}</span></article>
          <span aria-hidden="true">→</span>
          <article><small>{t(selectedDate && selectedDate >= todayKey() ? 'Future scenario' : 'Scenario replay')}</small><b>{selectedDate ? dateLabel(selectedDate) : t('Unavailable')}</b><span>{t(selectedDate && selectedDate >= todayKey() ? 'Scenario adjustments apply to this available target date.' : 'Adjustments replay the selected stored target; this is not a future forecast.')}</span></article>
        </section>
        <div className="twin-main-grid">
          <aside className="twin-panel twin-controls-panel">
            <header className="twin-panel-heading"><div><h2>{t('Adjust Parameters')}</h2><p>{t('Explore an in-memory scenario')}</p></div><SlidersIcon/></header>
            <div className="twin-control-section"><b>{t('Forecast Horizon')}</b><div className="twin-horizon">{HORIZONS.map(days => <label key={days}><input type="radio" name="horizon" checked={horizon === days} onChange={() => setHorizon(days)}/><span>{days} {t(days === 1 ? 'Day' : 'Days')}</span></label>)}</div></div>
            <div className="twin-control-section"><b>{t('Weather Variables')}</b><div className="twin-variable-list">{VARIABLES.map(item => <label key={item.key}><input type="checkbox" checked={visibleVariables.has(item.key)} onChange={() => toggleVariable(item.key)}/><span>{t(item.label)}</span></label>)}</div></div>
            <div className="twin-control-section twin-model-settings"><b>{t('Model Settings')}</b>
              <ScenarioSlider label="Rainfall threshold" value={pending.rainfallThresholdMm} min={0} max={50} step={1} unit=" mm" hint="Used for scenario threshold status; not a model input." onChange={value => updatePending('rainfallThresholdMm', value)}/>
              <label className="twin-moisture-select"><span>{t('Soil moisture context')}</span><select value={pending.soilMoisture} onChange={event => updatePending('soilMoisture', event.target.value as ScenarioInputs['soilMoisture'])}><option value="low">{t('Low (scenario assumption)')}</option><option value="medium">{t('Medium (scenario assumption)')}</option><option value="high">{t('High (scenario assumption)')}</option></select></label>
            </div>
            <details className="twin-control-section twin-scenario-inputs" open>
              <summary>{t('Scenario adjustments')} <small>{t('Updates other panels live')}</small></summary>
              <ScenarioSlider label="Rainfall" value={pending.rainfallDeltaPct} min={-100} max={200} step={5} unit="%" hint="Scales each baseline rainfall value; rainfall cannot fall below zero." onChange={value => updatePending('rainfallDeltaPct', value)}/>
              <ScenarioSlider label="Temperature" value={pending.temperatureDeltaC} min={-5} max={5} step={0.5} unit=" °C" hint="Explicit temperature scenario offset." onChange={value => updatePending('temperatureDeltaC', value)}/>
              <ScenarioSlider label="Humidity" value={pending.humidityDeltaPct} min={-30} max={30} step={1} unit=" %" hint="Bounded to physically valid relative humidity." onChange={value => updatePending('humidityDeltaPct', value)}/>
              <ScenarioSlider label="Wind speed" value={pending.windDeltaKmh} min={-20} max={20} step={1} unit=" km/h" hint="Converted to the source forecast unit (m/s)." onChange={value => updatePending('windDeltaKmh', value)}/>
            </details>
            <div className="twin-control-actions"><button className="twin-apply-button" onClick={applyPending}><RefreshCcw size={14}/> {t('Update Map')}</button><button className="twin-reset-button" onClick={resetScenario}>{t('Reset')}</button></div>
            <small className="twin-isolation-note">{t('Scenario values are temporary and do not alter the real forecast.')}</small>
          </aside>

          <section className="twin-map-column">
            <div className="twin-map-toolbar">
              <div className="twin-map-mode" role="group" aria-label="Map comparison mode">{([
                ['baseline', 'Baseline'], ['scenario', 'Scenario'], ['difference', 'Difference'],
              ] as const).map(([mode, label]) => <button key={mode} className={mapMode === mode ? 'active' : ''} aria-pressed={mapMode === mode} onClick={() => setMapMode(mode)}>{t(label)}</button>)}</div>
              <div className="twin-map-view-switch" role="group" aria-label="Map view">
                <button className={mapView === '3d' ? 'active' : ''} aria-pressed={mapView === '3d'} onClick={() => setMapView('3d')}>{t('3D terrain')}</button>
                <button className={mapView === '2d' ? 'active' : ''} aria-pressed={mapView === '2d'} onClick={() => setMapView('2d')}>{t('2D map')}</button>
              </div>
            </div>
            {mapData && (mapView === '3d'
              ?               <section className="twin-map-3d-shell" id="twin-3d" aria-label={t('Panchayat 3D terrain view')}>
                  <header className="twin-map-3d-heading"><b><Activity size={16}/> {t('3D Panchayat View')}</b><span>{location.block} · {t(layer)} · {t('Day')} {dateIndex + 1}</span></header>
                  <Suspense fallback={<div className="twin-3d-loading">{t('Loading interactive 3D terrain…')}</div>}>
                    <PanchayatView baseline={data} scenario={scenarioData} selectedId={selectedId} dayIndex={dateIndex} metric={layer.toLowerCase() as PanchayatMapMetric} mode={mapMode} onSelect={gp => selectGp(gp.id)} onDayChange={index => {
                      const date = baselineGp?.forecast[index]?.date
                      if (date) setSelectedDate(date)
                    }} onMetricChange={metric => setLayer(metric === 'wind' ? 'Wind' : metric[0].toUpperCase() + metric.slice(1) as Layer)}/>
                  </Suspense>
                </section>
              : <MapWeather data={mapData} gp={mapData.gps.find(gp => gp.id === selectedId) ?? null} onSelect={gp => selectGp(gp.id)} layer={layer} setLayer={setLayer} dayIndex={dateIndex} displayMode={mapMode}/>)}
          </section>

          <aside className="twin-right-column">
            <section className="twin-panel twin-selected-panel">
              <header className="twin-panel-heading"><div><h2>{t('Selected Panchayat')}</h2><p><b>{baselineGp.name}</b> · GP ID {baselineGp.id}<br/>{location.block} {t('Block')}, {location.district}, {location.state}</p></div><a href={`/gp/${encodeURIComponent(baselineGp.id)}`}>{t('View details →')}</a></header>
              <div className="twin-baseline-head"><span>{t('Metric')} · {t('Day')} {dateIndex + 1}</span><span>{t('Baseline')}</span><span>{t('Scenario')}</span></div>
              <div className="twin-metrics">{VARIABLES.filter(item => visibleVariables.has(item.key)).map(item => <MetricRow key={item.key} variable={item} baseline={forecastValue(baselineDay, item.key)} scenario={forecastValue(scenarioDay, item.key)}/>)}</div>
              <div className="twin-history-note"><small>{t('Historical replay · stored model target')}</small><b>{dateLabel(selectedDate)}</b><span>{t('The selector replays stored GP forecast targets. No matching GP observation or prior-run archive is provided, so this is not an actual-versus-forecast comparison.')}</span></div>
              <div className="twin-threshold-status"><span className={scenarioStatus(scenarioDay, applied).includes('reached') ? 'threshold-hit' : ''}>{t(scenarioStatus(scenarioDay, applied))}</span><small>{t('Threshold')} {applied.rainfallThresholdMm} mm</small></div>
              <div className="twin-confidence-note"><b>{t('Forecast confidence')}</b><span>{t('Confidence not available · no calibrated uncertainty or confidence interval is supplied by this API.')}</span></div>
            </section>
          </aside>
        </div>

        <div className="twin-bottom-grid">
          <ForecastCard gp={scenarioGp} dateIndex={dateIndex} horizon={horizon} variable={chartVariable} setVariable={setChartVariable}/>
          <RainfallDistribution data={scenarioData} selectedId={selectedId} dayIndex={dateIndex} threshold={applied.rainfallThresholdMm}/>
          <NeighbourTable data={scenarioData} selected={scenarioGp} dayIndex={dateIndex}/>
          <LandUseCard gp={baselineGp}/>
        </div>
        <div className="twin-resource-row">
          <section className="twin-panel twin-water-indicator" id="twin-water"><header className="twin-panel-heading"><div><h2><Waves size={17}/> {t('Water Resources')}</h2><p>{t('Rainfall-derived scenario indicator, not observed storage')}</p></div></header><div className="twin-water-values"><span><small>{t('Baseline rainfall total')} · {horizon} {t('day(s)')}</small><b>{numberLabel(baselineRainfallTotal)} mm</b></span><span><small>{t('Scenario rainfall total')}</small><b>{numberLabel(rainfallTotal)} mm</b></span><strong>{differenceLabel(baselineRainfallTotal, rainfallTotal)}{baselineRainfallTotal !== null && rainfallTotal !== null && baselineRainfallTotal !== rainfallTotal ? ' mm' : ''}</strong></div><div className="twin-water-status"><b>{t(waterPlanningStatus)}</b><span>{t('Compared with the selected rainfall planning threshold')}: {applied.rainfallThresholdMm} mm/day.</span></div><p>{t('Rainfall is a potential water input; no reservoir, streamflow, groundwater, or soil-water observation is present in this data feed.')}</p></section>
          <section className="twin-panel twin-agri-indicator"><header className="twin-panel-heading"><div><h2><Sprout size={17}/> {t('Agriculture & Risk')}</h2><p>{t('Existing forecast rules recalculated on scenario values')}</p></div></header><div className="twin-advisory-summary">{advisories.length ? advisories.map(item => <span className={`risk-${item.severity}`} key={item.id}>{t(item.title)} · {t(item.period)}</span>) : <span className="risk-clear">{t('No configured advisory trigger for the selected horizon.')}</span>}</div><p className="twin-agri-context"><b>{t(agriculturePlanningSignal)}</b> {t('Soil-moisture value is a user-selected assumption, not a sensor reading.')}</p><p>{t('Advisories are rule-based decision-support prompts; scenario offsets are not trained-model predictions.')}</p></section>
        </div>
        <section className="twin-impact-panel">
          <header className="twin-panel-heading"><div><h2><Activity size={18}/> {t('Scenario impact chain & interventions')}</h2><p>{t('Transparent forecast-threshold workflow · not a calibrated crop or hydrology model')}</p></div></header>
          <div className="twin-impact-chain"><article><small>1 · {t('Weather input')}</small><b>{applied.rainfallDeltaPct ? `${t('Rainfall')} ${applied.rainfallDeltaPct > 0 ? '+' : ''}${applied.rainfallDeltaPct}%` : t('Baseline rainfall')}{applied.temperatureDeltaC ? ` · ${t('Temperature')} ${applied.temperatureDeltaC > 0 ? '+' : ''}${applied.temperatureDeltaC} °C` : ''}{applied.humidityDeltaPct ? ` · ${t('Humidity')} ${applied.humidityDeltaPct > 0 ? '+' : ''}${applied.humidityDeltaPct}%` : ''}{applied.windDeltaKmh ? ` · ${t('Wind')} ${applied.windDeltaKmh > 0 ? '+' : ''}${applied.windDeltaKmh} km/h` : ''}</b></article><span aria-hidden="true">→</span><article><small>2 · {t('Recalculated signal')}</small><b>{advisories.length ? advisories.map(item => t(item.title)).join(' · ') : t(agriculturePlanningSignal)}</b></article><span aria-hidden="true">→</span><article><small>3 · {t('Planning response')}</small><b>{intervention === 'none' ? t('Review local conditions and advisory') : t(interventionSignal)}</b></article></div>
          <div className="twin-intervention-row"><label><span>{t('Compare a planning intervention')}</span><select value={intervention} onChange={event => setIntervention(event.target.value as Intervention)}><option value="none">{t('No intervention')}</option><option value="drainage">{t('Drainage preparation')}</option><option value="irrigation">{t('Delay irrigation · check rainfall')}</option><option value="water-storage">{t('Increase water storage')}</option><option value="crop-protection">{t('Protect sensitive crop area')}</option></select></label><p>{t(interventionDescriptions[intervention])} {intervention === 'none' ? '' : t(interventionSignal)} {t('Weather-triggered values are recalculated; intervention effectiveness is not available.')}</p></div>
          <div className="twin-intervention-comparison"><article><small>{t('Without intervention')}</small><b>{advisories.length ? advisories.map(item => t(item.title)).join(' · ') : t(waterPlanningStatus)}</b><span>{t(agriculturePlanningSignal)}</span></article><article><small>{t('With')} {intervention === 'none' ? t('selected intervention') : t(intervention.replace('-', ' '))}</small><b>{t(interventionSignal)}</b><span>{t('Weather triggers remain the same. Numeric risk reduction is unavailable without measured intervention capacity and effectiveness.')}</span></article></div>
          <div className="twin-why-change"><b>Why did this change?</b><span>{activeScenario ? `The selected weather offsets changed the stored Panchayat forecast values. Existing rainfall, temperature, humidity, and wind rules were re-evaluated for ${dateLabel(selectedDate)}; derived charts, map colors, rainfall totals, and advisory prompts use those adjusted values.` : `No weather adjustment is applied. The dashboard shows the stored baseline model target for ${dateLabel(selectedDate)}.`}</span></div>
        </section>
        <section className="twin-insight-strip" id="twin-insights">
          <header><b>{t('Key Insights')}</b><small>{activeScenario ? `${t('Scenario interpretation')} · ${t('selected GP')}` : `${t('Baseline interpretation')} · ${t('selected GP')}`}</small></header>
          <div className="twin-insight-items">
            <article><CloudRain/><div><b>{t('Rainfall & water response')}</b><p>{t(scenarioInsights[0] ?? 'Rainfall forecast details are unavailable.')} {t('Rainfall can influence soil-water input; no measured soil-moisture series is available here.')}</p></div></article>
            <article><Thermometer/><div><b>{t('Temperature')}</b><p>{scenarioDay?.temperature == null ? t('Temperature forecast is unavailable.') : `${numberLabel(scenarioDay.temperature)} °C · ${t('selected scenario')}`} {applied.temperatureDeltaC ? `${t('Adjusted from baseline')}: ${applied.temperatureDeltaC > 0 ? '+' : ''}${applied.temperatureDeltaC} °C. ` : ''}{t(temperatureInterpretation)}</p></div></article>
            <article><Wind/><div><b>{t('Weather risk checks')}</b><p>{advisories.length ? advisories.map(item => t(item.title)).join(' · ') : t('No configured forecast threshold is triggered for the displayed horizon.')} {t('These are rule-based prompts, not measured impact.')}</p></div></article>
            <article><Sprout/><div><b>{t('Agriculture & soil context')}</b><p>{scenarioDay?.humidity == null ? t('Humidity data unavailable.') : `${t('Humidity')} ${numberLabel(scenarioDay.humidity, 0)}%.`} {t('Soil-moisture context')}: {t(applied.soilMoisture)} ({t('user scenario assumption')}).</p></div></article>
          </div>
        </section>
      </> : null}
      <footer className="twin-footer">{t('Baseline: existing calculated GP forecast · Scenario: deterministic in-memory adjustment · Historical deltas, live data, and terrain surfaces are shown only when supplied by project outputs.')}</footer>
    </main>
  </div>
}

function SlidersIcon() {
  return <span className="twin-settings-icon"><Activity size={16}/></span>
}
