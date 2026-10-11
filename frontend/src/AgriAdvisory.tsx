import { useEffect, useState } from 'react'
import { ArrowRight, CloudRain, Leaf, Sprout } from 'lucide-react'
import type { GPWeather } from './types'

export type Language = 'en' | 'mr' | 'hi'
type Result = { advisory: { title: string; summary: string; actions: string[]; avoid: string[]; evidence: string[]; risk_level: string; source: string }; risk_assessment: { reason: string; confidence: number } }
const crops = ['Onion', 'Sugarcane', 'Maize', 'Pomegranate', 'Soybean']
const indiaDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const fallbackAdvisory = (weather: { temperature: number; humidity: number; forecast_rainfall: number; wind_speed: number }): Result => {
  const wet = weather.forecast_rainfall >= 20
  const windy = weather.wind_speed >= 25
  const hot = weather.temperature >= 35
  const humid = weather.humidity >= 80
  const condition = wet ? 'Rainfall watch' : windy ? 'Wind watch' : hot ? 'Heat watch' : humid ? 'Humidity watch' : 'Routine weather outlook'
  const guidance = wet ? 'Review field drainage and postpone irrigation where soil is already wet.' : windy ? 'Secure supports and avoid spraying during stronger winds.' : hot ? 'Check soil moisture and irrigate during cooler hours where needed.' : humid ? 'Monitor crops for moisture-related disease and improve field airflow.' : 'Continue normal field monitoring and follow the latest local weather updates.'
  return { advisory: { title: condition, summary: guidance, actions: [guidance], avoid: [], evidence: ['Generated from the available seven-day forecast.'], risk_level: wet || windy || hot ? 'MEDIUM' : 'LOW', source: 'forecast_fallback' }, risk_assessment: { reason: 'The local advisory service is unavailable, so this guidance uses the current forecast.', confidence: 0.7 } }
}

export default function AgriAdvisory({ gp, language, onLanguageChange, crop, onCropChange, dashboard = false }: { gp: GPWeather; language?: Language; onLanguageChange?: (language: Language) => void; crop?: string; onCropChange?: (crop: string) => void; dashboard?: boolean }) {
  const [localLanguage, setLocalLanguage] = useState<Language>('en')
  const activeLanguage = language ?? localLanguage
  const changeLanguage = (next: Language) => onLanguageChange ? onLanguageChange(next) : setLocalLanguage(next)
  const [localCrop, setLocalCrop] = useState(crops[0])
  const activeCrop = crop ?? localCrop
  const changeCrop = (next: string) => onCropChange ? onCropChange(next) : setLocalCrop(next)
  const [stage, setStage] = useState('Vegetative')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [todayKey, setTodayKey] = useState(indiaDateKey)
  const futureForecast = gp.forecast.filter(day => day.date >= todayKey).slice(0, 7)
  const usingLatestRun = futureForecast.length === 0 && gp.forecast.length > 0
  const forecast = usingLatestRun ? gp.forecast.slice(0, 7) : futureForecast
  const forecastDateLabel = forecast[0]?.date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${forecast[0].date}T12:00:00Z`)) : ''
  useEffect(() => { const timer = window.setInterval(() => setTodayKey(indiaDateKey()), 60_000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    const current = forecast[0] || {}
    const rainfall = forecast.reduce((total, day) => total + (day.rainfall ?? 0), 0)
    let active = true
    if (!forecast.length) { setBusy(false); setResult(null); setError('No calculated forecast is available for this location.'); return () => { active = false } }
    setBusy(true); setError('')
    const weather = { temperature: current.temperature ?? 0, humidity: current.humidity ?? 0, rainfall: current.rainfall ?? 0, forecast_rainfall: rainfall, wind_speed: (current.wind ?? 0) * 3.6, forecast_hours: 168 }
    fetch('/agri-api/api/advisory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      gp_id: gp.id, gp_name: gp.name, crop: `${activeCrop} (${stage})`, language: activeLanguage, audience: 'farmer',
      weather
    }) }).then(async response => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message || payload.error || 'Advisory service is unavailable'); if (active) setResult(payload) })
      .catch(() => { if (active) { setResult(fallbackAdvisory(weather)); setError('') } }).finally(() => active && setBusy(false))
    return () => { active = false }
  }, [gp, activeCrop, stage, activeLanguage, todayKey, usingLatestRun])
  const advisory = result?.advisory
  return <section className={`card advisory-card${dashboard ? ' farm-advisory-dashboard' : ''}`}><div className="card-heading"><div><span className="eyebrow">PLAN WITH CONFIDENCE</span><h2><Sprout size={20}/> Farm advisory</h2></div><div className="advisory-controls"><label>Crop<select aria-label="Crop" value={activeCrop} onChange={e => changeCrop(e.target.value)}>{crops.map(name => <option key={name}>{name}</option>)}</select></label><label>Stage<select aria-label="Growth stage" value={stage} onChange={e => setStage(e.target.value)}>{['Sowing', 'Vegetative', 'Flowering', 'Harvest'].map(name => <option key={name}>{name}</option>)}</select></label><div className="language-switch" aria-label="Advisory language">{(['en', 'mr', 'hi'] as Language[]).map(code => <button key={code} className={activeLanguage === code ? 'active' : ''} onClick={() => changeLanguage(code)}>{code === 'en' ? 'EN' : code === 'mr' ? 'मराठी' : 'हिंदी'}</button>)}</div></div></div>
    {busy ? <div className="empty-advisory"><span className="spinner"/>Generating location-specific guidance…</div> : error ? <div className="empty-advisory"><Sprout/><div><b>Advisory service unavailable</b><p>{error}</p></div></div> : advisory ? <div className="advisory-list"><article className="advisory-item"><span className="advisory-icon rainfall"><CloudRain/></span><div className="advisory-copy"><div className="advisory-title"><h3>{advisory.title}</h3><span className="period medium">{advisory.risk_level}</span></div><p>{advisory.summary}</p>{advisory.actions.map((action, i) => <p className="action" key={i}><b>Action:</b> {action}</p>)}{advisory.avoid.map((action, i) => <p className="action" key={`avoid-${i}`}><b>Avoid:</b> {action}</p>)}</div><span className="confidence">{Math.round((result?.risk_assessment.confidence ?? 0) * 100)}%<small>confidence</small></span></article></div> : null}
    <div className="advisory-disclaimer">{usingLatestRun ? `Latest calculated forecast: ${forecastDateLabel}. This model run is older than today; treat this guidance as historical, not live.` : `Weather-based guidance for ${activeCrop} · ${stage}. Verify field decisions with local agricultural expertise.`}</div>
  </section>
}

export function CropProfile({ onOpen }: { onOpen: () => void }) {
  return <section className="card crop-card"><div className="card-heading"><div><span className="eyebrow">FIELD NOTES</span><h2><Sprout size={19}/> Crop advisory</h2></div></div><div className="crop-note"><Leaf/><div><b>Weather matched to your crop</b><p>Choose a crop and growth stage in Farm advisory to get location and forecast specific guidance.</p></div></div><button className="primary-btn" onClick={onOpen}>Open farm advisory <ArrowRight size={15}/></button></section>
}
