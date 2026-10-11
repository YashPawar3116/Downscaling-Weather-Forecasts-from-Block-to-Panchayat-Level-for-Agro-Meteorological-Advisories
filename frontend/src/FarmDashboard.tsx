import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Bell, Check, ChevronDown, Cloud, CloudRain, Droplets, Headphones, Leaf, MapPin, Mic, Search, Send, Settings, Sun, Thermometer, Wind, X } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { GPWeather, LocationOption } from './types'
import { getBlock } from './services'
import MapWeather from './MapWeather'
import AgriAdvisory, { type Language } from './AgriAdvisory'
import logo from '../HyperWeather.png'
import './farm-dashboard.css'

type Layer = 'Temperature' | 'Rainfall' | 'Humidity' | 'Wind'
type Metric = 'temperature' | 'humidity' | 'rainfall' | 'wind'
const languages: Language[] = ['en', 'mr', 'hi']
const crops = ['Onion', 'Sugarcane', 'Maize', 'Pomegranate', 'Soybean']
const value = (n: number | null | undefined, digits = 0) => n == null || !Number.isFinite(n) ? '—' : n.toFixed(digits)
const dayDate = (iso: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
const indiaDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const labels = {
  en: { title: 'Farm advisory dashboard', subtitle: 'Hyperlocal weather and farm guidance', current: 'Current weather', alerts: 'Important alerts for your location', forecast: '7-day forecast', chart: 'Weather parameters · next 7 days', advice: 'Crop advisories for your area', place: 'Select village, block or Gram Panchayat', map: 'Map view', satellite: 'Satellite view', help: 'Help & support', settings: 'Settings', search: 'Search village, crop, or ask anything…', humidity: 'Humidity', rainfall: 'Rainfall', wind: 'Wind speed', temp: 'Temperature' },
  mr: { title: 'शेती सल्ला डॅशबोर्ड', subtitle: 'स्थानिक हवामान आणि शेती मार्गदर्शन', current: 'सध्याचे हवामान', alerts: 'तुमच्या ठिकाणासाठी महत्त्वाचे इशारे', forecast: '७ दिवसांचा अंदाज', chart: 'हवामान घटक · पुढील ७ दिवस', advice: 'तुमच्या भागासाठी पीक सल्ला', place: 'गाव, ब्लॉक किंवा ग्रामपंचायत निवडा', map: 'नकाशा', satellite: 'उपग्रह दृश्य', help: 'मदत आणि समर्थन', settings: 'सेटिंग्ज', search: 'गाव, पीक किंवा प्रश्न शोधा…', humidity: 'आर्द्रता', rainfall: 'पाऊस', wind: 'वाऱ्याचा वेग', temp: 'तापमान' },
  hi: { title: 'कृषि सलाह डैशबोर्ड', subtitle: 'स्थानीय मौसम और खेती मार्गदर्शन', current: 'मौजूदा मौसम', alerts: 'आपके स्थान के लिए महत्वपूर्ण चेतावनी', forecast: '7-दिन का पूर्वानुमान', chart: 'मौसम पैरामीटर · अगले 7 दिन', advice: 'आपके क्षेत्र के लिए फसल सलाह', place: 'गाँव, ब्लॉक या ग्राम पंचायत चुनें', map: 'मानचित्र दृश्य', satellite: 'उपग्रह दृश्य', help: 'सहायता और समर्थन', settings: 'सेटिंग्स', search: 'गाँव, फसल या सवाल खोजें…', humidity: 'नमी', rainfall: 'वर्षा', wind: 'हवा की गति', temp: 'तापमान' }
}

export default function FarmDashboard({ locations }: { locations: LocationOption[] }) {
  const navigate = useNavigate()
  const [location, setLocation] = useState(locations.find(x => x.state === 'Maharashtra' && x.district === 'Pune') ?? locations.find(x => x.state === 'Maharashtra') ?? locations[0])
  const [data, setData] = useState<Awaited<ReturnType<typeof getBlock>> | null>(null)
  const [gpId, setGpId] = useState('')
  const [layer, setLayer] = useState<Layer>('Temperature')
  const [baseMap, setBaseMap] = useState<'satellite' | 'liberty'>('satellite')
  const [metric, setMetric] = useState<Metric>('temperature')
  const [crop, setCrop] = useState(crops[0])
  const [language, setLanguage] = useState<Language>('en')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<'help' | 'settings' | 'notifications' | null>(null)
  const [error, setError] = useState('')
  const [processingMessage, setProcessingMessage] = useState('')
  const [question, setQuestion] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantError, setAssistantError] = useState('')
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [todayKey, setTodayKey] = useState(indiaDateKey)
  const t = labels[language]
  useEffect(() => { const timer = window.setInterval(() => setTodayKey(indiaDateKey()), 60_000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    let active = true
    setData(null); setError(''); setProcessingMessage('')
    getBlock(location.state, location.district, location.block, status => active && setProcessingMessage(status.message)).then(next => {
      if (active) { setData(next); setGpId(id => next.gps.some(g => g.id === id) ? id : next.gps[0]?.id ?? '') }
    }).catch(e => active && setError(e.message))
    return () => { active = false }
  }, [location])
  const gp = data?.gps.find(g => g.id === gpId) ?? null
  const values = useMemo(() => {
    const available = gp?.forecast ?? []
    const upcoming = available.filter(day => day.date >= todayKey)
    return (upcoming.length ? upcoming : available).slice(0, 7)
  }, [gp, todayKey])
  const current = values[0]
  const forecastIsLatestAvailable = Boolean(current && current.date < todayKey)
  const maxRain = Math.max(0, ...values.map(d => d.rainfall ?? 0))
  const maxHumidity = Math.max(0, ...values.map(d => d.humidity ?? 0))
  const maxWind = Math.max(0, ...values.map(d => d.wind ?? 0))
  const selectLocation = (item: LocationOption) => { setLocation(item); setSearch('') }
  const chooseBaseMap = (next: 'satellite' | 'liberty') => {
    const selector = document.querySelector<HTMLSelectElement>('.farm-map-widget .map-controls select')
    if (selector) { selector.value = next; selector.dispatchEvent(new Event('change', { bubbles: true })) }
    setBaseMap(next)
  }
  const searchSubmit = () => {
    const q = search.trim().toLocaleLowerCase()
    if (!q || !data) return
    const gpMatch = data.gps.find(g => g.name.toLocaleLowerCase().includes(q))
    if (gpMatch) { setGpId(gpMatch.id); setSearch(''); return }
    const match = locations.find(x => `${x.block} ${x.district} ${x.state}`.toLocaleLowerCase().includes(q))
    if (match) selectLocation(match)
  }
  const series = values.map(day => ({ ...day, wind: day.wind == null ? null : day.wind * 3.6 }))
  const cfg: Record<Metric, { label: string; color: string; unit: string }> = {
    temperature: { label: t.temp, color: '#ef4351', unit: '°C' }, humidity: { label: t.humidity, color: '#08a85b', unit: '%' }, rainfall: { label: t.rainfall, color: '#3989f5', unit: 'mm' }, wind: { label: t.wind, color: '#8b62d4', unit: 'km/h' }
  }
  const askAssistant = async (prompt = question) => {
    if (!gp || !current || !prompt.trim() || assistantBusy) return
    setQuestion(prompt); setAssistantError(''); setAssistantBusy(true)
    try {
      const response = await fetch('/agri-api/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: prompt, crop, language, weather: { temperature: current.temperature ?? 0, humidity: current.humidity ?? 0, rainfall: current.rainfall ?? 0, forecast_rainfall: values.reduce((sum, day) => sum + (day.rainfall ?? 0), 0), wind_speed: (current.wind ?? 0) * 3.6 } }) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not get farm guidance.')
      setAssistantAnswer(payload.answer)
    } catch (e) { setAssistantError(e instanceof Error ? e.message : 'Could not get farm guidance.') }
    finally { setAssistantBusy(false) }
  }
  const startVoiceQuestion = () => {
    const speechWindow = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) { setAssistantError('Voice input is not supported in this browser. Type your question instead.'); return }
    const recognition = new Recognition()
    recognition.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.interimResults = false
    recognition.onstart = () => { setListening(true); setAssistantError('') }
    recognition.onresult = (event: any) => { const transcript = event.results?.[0]?.[0]?.transcript || ''; if (transcript) { setQuestion(transcript); void askAssistant(transcript) } }
    recognition.onerror = () => { setAssistantError('Could not hear that clearly. Please try again or type your question.') }
    recognition.onend = () => setListening(false)
    recognition.start()
  }

  return <div className="farm-app">
    <header className="farm-topbar">
      <button className="farm-brand" onClick={() => navigate('/dashboard')}><img src={logo} alt="HyperWeather"/><span><b>Hyper<span>Weather</span></b><small>Hyperlocal Weather &amp; Farm Advisory</small></span></button>
      <label className="farm-place"><MapPin size={18}/><select aria-label={t.place} value={`${location.state}|${location.district}|${location.block}`} onChange={e => { const [state, district, block] = e.target.value.split('|'); const next = locations.find(x => x.state === state && x.district === district && x.block === block); if (next) selectLocation(next) }}>{locations.map(x => <option key={`${x.state}-${x.district}-${x.block}`} value={`${x.state}|${x.district}|${x.block}`}>{x.block}, {x.district}, {x.state}</option>)}</select><ChevronDown size={14}/></label>
      <div className="farm-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchSubmit()} placeholder={t.search}/><button onClick={searchSubmit} aria-label="Search"><Search size={16}/></button></div>
      <div className="farm-language" aria-label="Dashboard language">{languages.map(code => <button key={code} className={language === code ? 'active' : ''} onClick={() => setLanguage(code)}>{code === 'en' ? 'EN' : code === 'mr' ? 'मराठी' : 'हिंदी'}</button>)}</div>
      <div className="farm-head-actions"><button className="farm-bell" onClick={() => setDialog(dialog === 'notifications' ? null : 'notifications')} aria-label="Notifications"><Bell/><i>3</i></button><div className="farm-user"><b>A</b><span><small>Welcome</small><strong>Anil Patil</strong><small>Farmer</small></span></div><button className="farm-action-button" onClick={() => setDialog('help')}><Headphones size={17}/>{t.help}</button><button className="farm-action-button" onClick={() => setDialog('settings')}><Settings size={17}/>{t.settings}</button></div>
    </header>
    {error ? <div className="farm-error card"><b>Forecast unavailable</b><p>{error}</p><button onClick={() => setLocation({ ...location })}>Try again</button></div> : !data || !gp ? <div className="farm-loading card">{processingMessage || 'Loading your local forecast...'}</div> : <>
      <div className="farm-dashboard-grid">
        <div className="farm-left-column">
          <section className="farm-current-widget"><div className="farm-widget-head"><div><span className="eyebrow">{forecastIsLatestAvailable ? 'LATEST CALCULATED WEATHER' : t.current}</span><b>{gp.name}, {location.block}</b></div><span className="farm-forecast-badge"><i/>{forecastIsLatestAvailable ? `Latest available · ${current ? dayDate(current.date) : ''}` : 'Model forecast'}</span></div><div className="farm-weather-hero"><Sun/><div><strong>{value(current?.temperature, 1)}°C</strong><b>{current?.temperature != null && current.temperature >= 35 ? 'Warm conditions' : forecastIsLatestAvailable ? 'Latest model output' : 'Local forecast'}</b><small>{forecastIsLatestAvailable ? 'Latest available · ' : 'Day 1 · '}{current ? dayDate(current.date) : 'Date unavailable'}</small></div></div><div className="farm-current-metrics"><div><Droplets/><b>{value(current?.humidity)}%</b><small>{t.humidity}</small></div><div><CloudRain/><b>{value(current?.rainfall, 1)} mm</b><small>{t.rainfall}</small></div><div><Wind/><b>{current?.wind == null ? '—' : `${value(current.wind * 3.6)} km/h`}</b><small>{t.wind}</small></div><div><Wind/><b>—</b><small>Direction</small></div></div><label className="farm-gp-select">Gram Panchayat<select value={gp.id} onChange={e => setGpId(e.target.value)}>{data.gps.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label></section>
          <section className="farm-alert-widget"><div className="farm-widget-title"><div><span className="eyebrow">WEATHER WATCH</span><h2>{t.alerts}</h2></div><button onClick={() => setDialog('notifications')}>View all <span>→</span></button></div>
            <article className="farm-alert-item rain"><CloudRain/><div><b>{maxRain >= 20 ? 'Rainfall watch' : 'Rainfall outlook'}</b><p>Peak forecast rainfall {value(maxRain, 1)} mm. Review irrigation and drainage plans.</p></div><ChevronDown/></article>
            <article className="farm-alert-item humidity"><Droplets/><div><b>Humidity watch</b><p>Forecast humidity reaches {value(maxHumidity)}%. Monitor crops for moisture-related stress.</p></div><ChevronDown/></article>
            <article className="farm-alert-item wind"><Wind/><div><b>{maxWind * 3.6 >= 25 ? 'Strong winds expected' : 'Wind outlook'}</b><p>Forecast wind reaches {value(maxWind * 3.6)} km/h. Check conditions before spraying.</p></div><ChevronDown/></article>
          </section>
        </div>
        <section className="farm-map-widget"><div className="farm-map-overlay-tabs"><button className={baseMap === 'liberty' ? 'active' : ''} onClick={() => chooseBaseMap('liberty')}><MapPin size={14}/>{t.map}</button><button className={baseMap === 'satellite' ? 'active' : ''} onClick={() => chooseBaseMap('satellite')}><Activity size={14}/>{t.satellite}</button></div><div className="farm-map-layers">{(['Rainfall', 'Temperature', 'Wind', 'Humidity'] as Layer[]).map(item => <button key={item} className={layer === item ? 'active' : ''} onClick={() => setLayer(item)}>{item === 'Rainfall' ? <CloudRain/> : item === 'Temperature' ? <Sun/> : item === 'Wind' ? <Wind/> : <Droplets/>}{item}</button>)}</div><div className="farm-map-inner"><MapWeather data={data} gp={gp} onSelect={selected => setGpId(selected.id)} layer={layer} setLayer={setLayer}/><div className="farm-map-place-label"><MapPin/><b>{location.block}<small>Block · {location.district}</small></b></div></div></section>
        <div className="farm-right-column">
          <section className="farm-forecast-widget"><div className="farm-widget-title"><div><span className="eyebrow">LOOK AHEAD</span><h2>{t.forecast}</h2></div><button onClick={() => setMetric(metric === 'temperature' ? 'rainfall' : 'temperature')}>View details <span>→</span></button></div><div className="farm-day-cards">{values.slice(0, 7).map((day, i) => <button key={day.date} className={i === 0 ? 'today' : ''} onClick={() => setMetric(i % 2 === 0 ? 'temperature' : 'rainfall')}><b>{dayDate(day.date).split(',')[0]}</b><small>{dayDate(day.date).split(',').slice(1).join(',')}</small>{day.rainfall != null && day.rainfall > 2 ? <CloudRain/> : day.temperature != null && day.temperature > 29 ? <Sun/> : <Cloud/>}<strong>{value(day.rainfall, 0)}<small>mm</small></strong><em>{value(day.temperature)}°</em><small>{value(day.temperature == null ? null : day.temperature - 4)}°</small></button>)}</div></section>
          <section className="farm-chart-widget"><div className="farm-widget-title"><div><span className="eyebrow">7-DAY TREND</span><h2>{t.chart}</h2></div><label className="farm-chart-select"><select value={metric} onChange={e => setMetric(e.target.value as Metric)}>{(Object.keys(cfg) as Metric[]).map(key => <option key={key} value={key}>{cfg[key].label}</option>)}</select><ChevronDown size={13}/></label></div><div className="farm-chart-legend">{(Object.keys(cfg) as Metric[]).map(key => <button key={key} className={metric === key ? 'selected' : ''} onClick={() => setMetric(key)}><i style={{ background: cfg[key].color }}/>{cfg[key].label}</button>)}</div><div className="farm-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series}><defs><linearGradient id="farmChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cfg[metric].color} stopOpacity={.2}/><stop offset="100%" stopColor={cfg[metric].color} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e9eff3" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis width={30} tick={{ fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip formatter={(v) => [`${v ?? 'Not available'} ${cfg[metric].unit}`, cfg[metric].label]} labelFormatter={d => dayDate(String(d))}/><Area dataKey={metric} type="monotone" stroke={cfg[metric].color} fill="url(#farmChartFill)" strokeWidth={2.3} connectNulls={false}/></AreaChart></ResponsiveContainer></div></section>
        </div>
        <section className="farm-crop-widget"><div className="farm-widget-title"><div><span className="eyebrow">CROP PLANNING</span><h2><Leaf size={18}/>{t.advice}</h2></div><button onClick={() => document.getElementById('farm-advisory-engine')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>All crops <span>→</span></button></div><div className="farm-crop-tabs">{crops.map((item, i) => <button key={item} onClick={() => setCrop(item)} className={crop === item ? 'active' : ''}><span>{['🧅', '🌾', '🌽', '🍎', '🫘'][i]}</span>{item}</button>)}</div><div id="farm-advisory-engine"><AgriAdvisory gp={gp} language={language} onLanguageChange={setLanguage} crop={crop} onCropChange={setCrop} dashboard/></div></section>
        <section className="farm-environment-widget"><div className="farm-widget-title"><div><span className="eyebrow">FIELD CONTEXT</span><h2>Local conditions</h2></div></div><div className="farm-env-tiles"><span>Elevation<b>{value(gp.elevation)}{gp.elevation == null ? '' : ' m'}</b></span><span>Land cover<b>{gp.landCover || 'Not available'}</b></span><span>Soil clay<b>{value(gp.soilClay, 1)}{gp.soilClay == null ? '' : '%'}</b></span></div><div className="farm-rain-chart"><b>7-day rainfall outlook</b><ResponsiveContainer width="100%" height={76}><BarChart data={series} margin={{ top: 5, right: 4, bottom: 0, left: -22 }}><CartesianGrid stroke="#e9eff3" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false}/><Tooltip formatter={v => [`${v ?? 0} mm`, 'Rainfall']}/><Bar dataKey="rainfall" fill="#1587d4" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>
        <section className="farm-assistant-widget"><div className="farm-assistant-head"><span><Leaf/></span><div><b>Farm Advisor</b><small>Forecast-powered crop guidance</small></div></div><h3>{language === 'en' ? 'Ask your farm advisor' : language === 'mr' ? 'शेतीविषयक प्रश्न विचारा' : 'अपने कृषि सलाहकार से पूछें'}</h3><p>{gp.name} · {crop} · {language.toUpperCase()}</p><div className="farm-assistant-reply" aria-live="polite">{assistantBusy ? 'Preparing guidance from the local forecast…' : assistantError || assistantAnswer || 'Ask about irrigation, spraying, weather, or field work.'}</div><form className="farm-assistant-compose" onSubmit={e => { e.preventDefault(); void askAssistant() }}><input value={question} onChange={e => setQuestion(e.target.value)} placeholder={language === 'mr' ? 'तुमचा प्रश्न लिहा…' : language === 'hi' ? 'अपना सवाल लिखें…' : 'Ask a question…'} aria-label="Ask the farm advisor"/><button type="button" className={listening ? 'listening' : ''} onClick={startVoiceQuestion} aria-label="Ask by voice"><Mic size={17}/></button><button type="submit" disabled={assistantBusy || !question.trim()} aria-label="Send question"><Send size={17}/></button></form><div className="farm-quick-questions"><button onClick={() => void askAssistant(language === 'mr' ? 'पाणी द्यावे का?' : language === 'hi' ? 'क्या सिंचाई करनी चाहिए?' : 'Should I irrigate?')}>Irrigation</button><button onClick={() => void askAssistant(language === 'mr' ? 'फवारणी योग्य आहे का?' : language === 'hi' ? 'क्या छिड़काव करना चाहिए?' : 'Is spraying suitable?')}>Spraying</button><button onClick={() => void askAssistant(language === 'mr' ? 'शेतातील काम कधी करावे?' : language === 'hi' ? 'खेत का काम कब करें?' : 'When should I work in the field?')}>Field work</button></div><button className="farm-assistant-action" onClick={() => document.getElementById('farm-advisory-engine')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Open crop advisory <span>→</span></button></section>
      </div>
    </>}
    {dialog && <div className="farm-modal-backdrop" onClick={() => setDialog(null)}><section className="farm-modal" onClick={e => e.stopPropagation()}><button className="farm-modal-close" onClick={() => setDialog(null)}><X size={18}/></button><span className="eyebrow">HYPERWEATHER</span><h2>{dialog === 'help' ? t.help : dialog === 'settings' ? t.settings : 'Weather alerts'}</h2>{dialog === 'help' ? <p>Choose your Gram Panchayat, select a weather layer, and use the crop advisory to get guidance in English, Marathi, or Hindi.</p> : dialog === 'settings' ? <><label>Dashboard language<select value={language} onChange={e => setLanguage(e.target.value as Language)}><option value="en">English</option><option value="mr">मराठी</option><option value="hi">हिंदी</option></select></label><label>Default weather layer<select value={layer} onChange={e => setLayer(e.target.value as Layer)}>{['Temperature', 'Rainfall', 'Wind', 'Humidity'].map(x => <option key={x}>{x}</option>)}</select></label></> : <div className="farm-modal-alerts"><p><Check/> {maxRain >= 20 ? `Rainfall watch · up to ${value(maxRain, 1)} mm forecast` : `Rainfall outlook · up to ${value(maxRain, 1)} mm forecast`}</p><p><Check/> Humidity up to {value(maxHumidity)}%</p><p><Check/> Wind up to {value(maxWind * 3.6)} km/h</p></div>}<button className="farm-modal-done" onClick={() => setDialog(null)}>Done</button></section></div>}
  </div>
}
