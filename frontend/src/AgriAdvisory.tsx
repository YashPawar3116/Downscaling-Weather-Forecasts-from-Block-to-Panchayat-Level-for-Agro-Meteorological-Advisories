import { useEffect, useState } from 'react'
import { ArrowRight, CloudRain, Leaf, Sprout } from 'lucide-react'
import type { GPWeather } from './types'

export type Language = 'en' | 'mr' | 'hi'
type Result = { advisory: { title: string; summary: string; actions: string[]; avoid: string[]; evidence: string[]; risk_level: string; source: string }; risk_assessment: { reason: string; confidence: number } }
const crops = ['Onion', 'Sugarcane', 'Maize', 'Pomegranate', 'Soybean']
const severityLabels: Record<Language, Record<string, string>> = {
  en: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' },
  mr: { LOW: 'कमी', MEDIUM: 'मध्यम', HIGH: 'जास्त', CRITICAL: 'अत्यंत जास्त' },
  hi: { LOW: 'कम', MEDIUM: 'मध्यम', HIGH: 'अधिक', CRITICAL: 'अत्यधिक' },
}
const copy = {
  en: { eyebrow: 'PLAN WITH CONFIDENCE', title: 'Farm advisory', crop: 'Crop', stage: 'Growth stage', stages: ['Sowing', 'Vegetative', 'Flowering', 'Harvest'], loading: 'Preparing guidance from the selected Panchayat forecast…', unavailable: 'Advisory service unavailable', action: 'Action:', avoid: 'Avoid:', confidence: 'forecast rule score', historical: 'Latest calculated forecast', old: 'This model run is older than today; treat this guidance as historical, not live.', verify: 'Weather-based guidance for', verifyEnd: 'Verify field decisions with local agricultural expertise.', missing: 'No calculated forecast is available for this location.' },
  mr: { eyebrow: 'विश्वासाने नियोजन करा', title: 'शेती सल्ला', crop: 'पीक', stage: 'वाढीची अवस्था', stages: ['पेरणी', 'वाढ', 'फुलोरा', 'कापणी'], loading: 'निवडलेल्या ग्रामपंचायतीच्या अंदाजावरून सल्ला तयार होत आहे…', unavailable: 'सल्ला सेवा उपलब्ध नाही', action: 'कृती:', avoid: 'टाळा:', confidence: 'अंदाज नियम गुण', historical: 'अलीकडील गणिती अंदाज', old: 'हा मॉडेल अंदाज आजच्या तारखेपेक्षा जुना आहे; हा सल्ला ऐतिहासिक समजा, सध्याचा नाही.', verify: 'हवामानावर आधारित सल्ला:', verifyEnd: 'शेतातील निर्णय स्थानिक कृषी तज्ज्ञांच्या सल्ल्याने घ्या.', missing: 'या ठिकाणासाठी गणिती हवामान अंदाज उपलब्ध नाही.' },
  hi: { eyebrow: 'विश्वास के साथ योजना बनाएँ', title: 'खेती सलाह', crop: 'फसल', stage: 'विकास अवस्था', stages: ['बुवाई', 'विकास', 'फूल आना', 'कटाई'], loading: 'चुनी हुई ग्राम पंचायत के पूर्वानुमान से सलाह तैयार हो रही है…', unavailable: 'सलाह सेवा उपलब्ध नहीं है', action: 'कार्य:', avoid: 'बचें:', confidence: 'पूर्वानुमान नियम स्कोर', historical: 'नवीनतम गणना पूर्वानुमान', old: 'यह मॉडल पूर्वानुमान आज से पुराना है; इस सलाह को ऐतिहासिक मानें, वर्तमान नहीं।', verify: 'मौसम आधारित सलाह:', verifyEnd: 'खेत के निर्णय स्थानीय कृषि विशेषज्ञ की सलाह से लें।', missing: 'इस स्थान के लिए गणना किया हुआ मौसम पूर्वानुमान उपलब्ध नहीं है।' },
} as const
const indiaDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
function forecastAdvisory(forecast: GPWeather['forecast'], crop: string, stage: string): Result {
  const rain = forecast.reduce((sum, day) => sum + (day.rainfall ?? 0), 0)
  const peakRain = Math.max(0, ...forecast.map(day => day.rainfall ?? 0))
  const peakWind = Math.max(0, ...forecast.map(day => (day.wind ?? 0) * 3.6))
  const peakHumidity = Math.max(0, ...forecast.map(day => day.humidity ?? 0))
  const actions: string[] = []
  const avoid: string[] = []
  if (peakRain >= 10 || rain >= 25) { actions.push(`Inspect drainage and postpone irrigation where field soil is already wet.`); avoid.push('Avoid field operations on saturated soil.') }
  else { actions.push(`Check soil moisture before irrigation; the selected Panchayat forecast totals ${rain.toFixed(1)} mm of rain.`) }
  if (peakWind >= 25 || peakRain >= 5) avoid.push('Avoid spraying during forecast rain or stronger winds; use a calm, dry window and follow the product label.')
  else actions.push('Use a dry, low-wind period for any essential spraying and follow the product label.')
  if (peakHumidity >= 80) actions.push('Scout for leaf wetness and crop disease symptoms, especially in dense canopy areas.')
  const risk = peakRain >= 10 || peakWind >= 25 ? 'HIGH' : peakHumidity >= 80 ? 'MEDIUM' : 'LOW'
  return { advisory: { title: `${crop} ${stage} field plan`, summary: `For the selected Panchayat, the available ${forecast.length}-day forecast indicates ${rain.toFixed(1)} mm total rainfall, with a daily peak of ${peakRain.toFixed(1)} mm.`, actions, avoid, evidence: forecast.map(day => day.date), risk_level: risk, source: 'selected_panchayat_forecast' }, risk_assessment: { reason: 'Calculated from the selected Panchayat forecast.', confidence: 0.8 } }
}
export default function AgriAdvisory({ gp, location, language, onLanguageChange, crop, onCropChange, dashboard = false }: { gp: GPWeather; location?: { state: string; district: string; block: string }; language?: Language; onLanguageChange?: (language: Language) => void; crop?: string; onCropChange?: (crop: string) => void; dashboard?: boolean }) {
  const [localLanguage, setLocalLanguage] = useState<Language>('en')
  const activeLanguage = language ?? localLanguage
  const words = copy[activeLanguage]
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
    const rainfallValues = forecast.map(day => day.rainfall).filter((value): value is number => value != null && Number.isFinite(value))
    const rainfall = rainfallValues.length ? rainfallValues.reduce((total, value) => total + value, 0) : null
    let active = true
    if (!forecast.length) { setBusy(false); setResult(null); setError('No calculated forecast is available for this location.'); return () => { active = false } }
    setBusy(true); setError('')
    const weather = { temperature: current.temperature, humidity: current.humidity, rainfall: current.rainfall, forecast_rainfall: rainfall, wind_speed: current.wind == null ? null : current.wind * 3.6, forecast_hours: forecast.length * 24 }
    fetch('/agri-api/api/advisory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      gp_id: gp.id, gp_name: gp.name, location: { ...location, gp_id: gp.id, gp_name: gp.name }, crop: `${activeCrop} (${stage})`, language: activeLanguage, audience: 'farmer',
      weather: { ...weather, forecast: forecast.map(day => ({ date: day.date, rainfall: day.rainfall, temperature: day.temperature, humidity: day.humidity, wind_speed: day.wind == null ? null : day.wind * 3.6 })) }
    }) }).then(async response => { const raw = await response.text(); let payload: Result & { success?: boolean; error?: string; message?: string }; try { payload = JSON.parse(raw) } catch { throw new Error(`Advisory service returned an invalid response (${response.status}).`) } if (!response.ok || !payload.success) throw new Error(payload.message || payload.error || words.unavailable); if (active) setResult(payload) })
      .catch(() => { if (active) { setResult(forecastAdvisory(forecast, activeCrop, stage)); setError('') } }).finally(() => active && setBusy(false))
    return () => { active = false }
  }, [gp, location?.state, location?.district, location?.block, activeCrop, stage, activeLanguage, todayKey, usingLatestRun])
  const advisory = result?.advisory
  return <section className={`card advisory-card${dashboard ? ' farm-advisory-dashboard' : ''}`}><div className="card-heading"><div><span className="eyebrow">{words.eyebrow}</span><h2><Sprout size={20}/> {words.title}</h2></div><div className="advisory-controls"><label>{words.crop}<select aria-label={words.crop} value={activeCrop} onChange={e => changeCrop(e.target.value)}>{crops.map(name => <option key={name}>{name}</option>)}</select></label><label>{words.stage}<select aria-label={words.stage} value={stage} onChange={e => setStage(e.target.value)}>{words.stages.map((name, index) => <option key={name} value={['Sowing', 'Vegetative', 'Flowering', 'Harvest'][index]}>{name}</option>)}</select></label><div className="language-switch" aria-label="Advisory language">{(['en', 'mr', 'hi'] as Language[]).map(code => <button key={code} className={activeLanguage === code ? 'active' : ''} onClick={() => changeLanguage(code)}>{code === 'en' ? 'EN' : code === 'mr' ? 'मराठी' : 'हिंदी'}</button>)}</div></div></div>
    {busy ? <div className="empty-advisory"><span className="spinner"/>{words.loading}</div> : error ? <div className="empty-advisory"><Sprout/><div><b>{words.unavailable}</b><p>{error}</p></div></div> : advisory ? <div className="advisory-list"><article className="advisory-item"><span className="advisory-icon rainfall"><CloudRain/></span><div className="advisory-copy"><div className="advisory-title"><h3>{advisory.title}</h3><span className="period medium">{severityLabels[activeLanguage][advisory.risk_level] ?? advisory.risk_level}</span></div><p>{advisory.summary}</p>{advisory.actions.map((action, i) => <p className="action" key={i}><b>{words.action}</b> {action}</p>)}{advisory.avoid.map((action, i) => <p className="action" key={`avoid-${i}`}><b>{words.avoid}</b> {action}</p>)}</div><span className="confidence">{Math.round((result?.risk_assessment.confidence ?? 0) * 100)}%<small>{words.confidence}</small></span></article></div> : <div className="empty-advisory">{words.missing}</div>}
    <div className="advisory-disclaimer">{usingLatestRun ? `${words.historical}: ${forecastDateLabel}. ${words.old}` : `${words.verify} ${activeCrop} · ${stage}. ${words.verifyEnd}`}</div>
  </section>
}

export function CropProfile({ onOpen }: { onOpen: () => void }) {
  return <section className="card crop-card"><div className="card-heading"><div><span className="eyebrow">FIELD NOTES</span><h2><Sprout size={19}/> Crop advisory</h2></div></div><div className="crop-note"><Leaf/><div><b>Weather matched to your crop</b><p>Choose a crop and growth stage in Farm advisory to get location and forecast specific guidance.</p></div></div><button className="primary-btn" onClick={onOpen}>Open farm advisory <ArrowRight size={15}/></button></section>
}
