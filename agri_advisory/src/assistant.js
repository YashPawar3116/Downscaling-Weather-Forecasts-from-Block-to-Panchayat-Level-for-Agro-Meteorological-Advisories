const { buildBaseAdvisory, SUPPORTED_LANGUAGES } = require('./advisory_engine');

const TEXT = {
  en: {
    location: (gp, block, crop) => `For ${gp}${block ? `, ${block} block` : ''}${crop ? `, ${crop}` : ''}: `,
    missing: 'The selected Panchayat forecast does not include this information, so I cannot give a reliable answer.',
    tomorrow: (date, rain) => rain === null ? `Rainfall is not available for ${date} in the selected forecast.` : `The forecast for ${date} shows ${rain.toFixed(1)} mm of rain${rain >= 2 ? ', so rain is possible' : ', with no meaningful rain signal'}. This is a model forecast, not a guarantee.`,
    rain: (total, peak) => total === null ? 'Rainfall values are missing from the selected Panchayat forecast.' : `The available 7-day forecast totals ${total.toFixed(1)} mm of rain${peak ? `, with the highest daily amount on ${peak.date} (${peak.rainfall.toFixed(1)} mm)` : ''}. Forecasts can change.`,
    irrigation: (rain) => rain === null ? 'Rainfall data is unavailable. Check field soil moisture before deciding whether to irrigate.' : rain >= 20 ? `The 7-day forecast totals ${rain.toFixed(1)} mm of rain. Check soil moisture and drainage; avoid scheduling irrigation solely from this forecast.` : `The 7-day forecast totals ${rain.toFixed(1)} mm of rain. This service does not measure field soil moisture; check it and the crop stage before irrigating.`,
    spray: (wind, rain) => wind === null && rain === null ? 'The forecast lacks rainfall and wind data needed to assess spray weather. Check the product label and local conditions.' : (rain ?? 0) >= 5 || (wind ?? 0) >= 25 ? `The forecast indicates ${rain == null ? 'unknown rainfall' : `${rain.toFixed(1)} mm total rain`} and ${wind == null ? 'unknown wind speed' : `winds up to ${wind.toFixed(0)} km/h`}. Rain or wind may reduce spray effectiveness or cause drift. Follow the product label.` : `No strong rain or wind trigger appears in the available forecast${wind == null ? '' : ` (peak wind ${wind.toFixed(0)} km/h`}${wind == null ? '' : ')'}; confirm hourly field conditions and follow the product label.`,
    field: rain => rain == null ? 'Rain data is unavailable. Check field conditions and the local forecast before scheduling work.' : `The 7-day forecast totals ${rain.toFixed(1)} mm of rain. Check daily conditions, soil trafficability, and the crop stage before field work.`,
    general: (title, message) => `${title}. ${message}`
  },
  mr: {
    location: (gp, block, crop) => `${gp}${block ? `, ${block} तालुका` : ''}${crop ? `, ${crop} पीक` : ''} साठी: `,
    missing: 'निवडलेल्या ग्रामपंचायतीच्या अंदाजात ही माहिती उपलब्ध नाही. त्यामुळे विश्वासार्ह उत्तर देता येत नाही.',
    tomorrow: (date, rain) => rain === null ? `${date} साठी पावसाचा अंदाज उपलब्ध नाही.` : `${date} साठी अंदाजित पाऊस ${rain.toFixed(1)} मिमी आहे${rain >= 2 ? '; पाऊस पडण्याची शक्यता आहे' : '; लक्षणीय पावसाचा संकेत नाही'}. हा अंदाज आहे, हमी नाही.`,
    rain: (total, peak) => total === null ? 'निवडलेल्या ग्रामपंचायतीच्या अंदाजात पावसाची माहिती उपलब्ध नाही.' : `उपलब्ध ७ दिवसांचा एकूण पावसाचा अंदाज ${total.toFixed(1)} मिमी आहे${peak ? `; सर्वाधिक पाऊस ${peak.date} रोजी (${peak.rainfall.toFixed(1)} मिमी)` : ''}. अंदाज बदलू शकतो.`,
    irrigation: rain => rain === null ? 'पावसाची माहिती उपलब्ध नाही. सिंचनाचा निर्णय घेण्यापूर्वी शेतातील मातीचा ओलावा तपासा.' : `७ दिवसांचा एकूण पावसाचा अंदाज ${rain.toFixed(1)} मिमी आहे. मातीतील ओलावा आणि निचरा तपासा; फक्त या अंदाजावरून सिंचन ठरवू नका.`,
    spray: (wind, rain) => wind === null && rain === null ? 'फवारणीच्या हवामानाचा अंदाज घेण्यासाठी पाऊस आणि वाऱ्याची माहिती उपलब्ध नाही. औषधाच्या लेबलवरील सूचना आणि स्थानिक परिस्थिती तपासा.' : (rain ?? 0) >= 5 || (wind ?? 0) >= 25 ? `अंदाजात ${rain == null ? 'पावसाची माहिती उपलब्ध नाही' : `${rain.toFixed(1)} मिमी पाऊस`} आणि ${wind == null ? 'वाऱ्याची माहिती उपलब्ध नाही' : `${wind.toFixed(0)} किमी/तास वारा`} आहे. पाऊस किंवा वाऱ्यामुळे फवारणीची परिणामकारकता कमी होऊ शकते. औषधाच्या लेबलवरील सूचना पाळा.` : 'उपलब्ध अंदाजात पाऊस किंवा वाऱ्याचा मोठा अडथळा दिसत नाही. फवारणीपूर्वी तासागणिक परिस्थिती तपासा आणि औषधाच्या लेबलवरील सूचना पाळा.',
    field: rain => rain == null ? 'पावसाची माहिती उपलब्ध नाही. कामाचे नियोजन करण्यापूर्वी शेताची स्थिती आणि स्थानिक अंदाज तपासा.' : `७ दिवसांचा एकूण पावसाचा अंदाज ${rain.toFixed(1)} मिमी आहे. शेतातील परिस्थिती, मातीची स्थिती आणि पिकाची अवस्था तपासून काम ठरवा.`,
    general: (title, message) => `${title}. ${message}`
  },
  hi: {
    location: (gp, block, crop) => `${gp}${block ? `, ${block} ब्लॉक` : ''}${crop ? `, ${crop} फसल` : ''} के लिए: `,
    missing: 'चुनी हुई ग्राम पंचायत के पूर्वानुमान में यह जानकारी उपलब्ध नहीं है, इसलिए भरोसेमंद उत्तर नहीं दिया जा सकता।',
    tomorrow: (date, rain) => rain === null ? `${date} के लिए वर्षा का पूर्वानुमान उपलब्ध नहीं है।` : `${date} के लिए अनुमानित वर्षा ${rain.toFixed(1)} मिमी है${rain >= 2 ? '; बारिश संभव है' : '; बारिश का कोई महत्वपूर्ण संकेत नहीं है'}। यह मॉडल पूर्वानुमान है, गारंटी नहीं।`,
    rain: (total, peak) => total === null ? 'चुनी हुई ग्राम पंचायत के पूर्वानुमान में वर्षा का डेटा उपलब्ध नहीं है।' : `उपलब्ध 7-दिन के पूर्वानुमान में कुल ${total.toFixed(1)} मिमी वर्षा है${peak ? `; सबसे अधिक वर्षा ${peak.date} को (${peak.rainfall.toFixed(1)} मिमी)` : ''}। पूर्वानुमान बदल सकता है।`,
    irrigation: rain => rain === null ? 'वर्षा का डेटा उपलब्ध नहीं है। सिंचाई का निर्णय लेने से पहले खेत की मिट्टी की नमी जाँचें।' : `7-दिन के पूर्वानुमान में कुल ${rain.toFixed(1)} मिमी वर्षा है। मिट्टी की नमी और जल निकासी जाँचें; केवल इस पूर्वानुमान के आधार पर सिंचाई तय न करें।`,
    spray: (wind, rain) => wind === null && rain === null ? 'छिड़काव के मौसम का आकलन करने के लिए वर्षा और हवा का डेटा उपलब्ध नहीं है। उत्पाद के लेबल और स्थानीय परिस्थितियाँ जाँचें।' : (rain ?? 0) >= 5 || (wind ?? 0) >= 25 ? `पूर्वानुमान में ${rain == null ? 'वर्षा का डेटा उपलब्ध नहीं' : `${rain.toFixed(1)} मिमी वर्षा`} और ${wind == null ? 'हवा का डेटा उपलब्ध नहीं' : `${wind.toFixed(0)} किमी/घंटा तक हवा`} है। बारिश या हवा छिड़काव का असर घटा सकती है। उत्पाद के लेबल का पालन करें।` : 'उपलब्ध पूर्वानुमान में बारिश या हवा का बड़ा संकेत नहीं है। छिड़काव से पहले प्रति घंटे की स्थिति जाँचें और उत्पाद के लेबल का पालन करें।',
    field: rain => rain == null ? 'वर्षा का डेटा उपलब्ध नहीं है। खेत का काम तय करने से पहले खेत की स्थिति और स्थानीय पूर्वानुमान जाँचें।' : `7-दिन के पूर्वानुमान में कुल ${rain.toFixed(1)} मिमी वर्षा है। काम तय करने से पहले दैनिक मौसम, मिट्टी की स्थिति और फसल की अवस्था जाँचें।`,
    general: (title, message) => `${title}. ${message}`
  }
};

const numeric = value => Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : null;

function answerFarmQuestion({ question, weather = {}, language = 'en', crop = null, location = {} }) {
  if (!SUPPORTED_LANGUAGES[language]) throw new Error('Unsupported language');
  const q = String(question || '').trim().toLocaleLowerCase();
  if (!q) throw new Error('Enter a question first');
  if (q.length > 500) throw new Error('Question must be 500 characters or fewer');

  const text = TEXT[language];
  const forecast = Array.isArray(weather.forecast) ? weather.forecast : [];
  const rainValues = forecast.map(day => numeric(day.rainfall)).filter(value => value !== null);
  const totalRain = rainValues.length
    ? rainValues.reduce((sum, value) => sum + value, 0)
    : numeric(weather.forecast_rainfall);
  const peakDay = forecast.filter(day => numeric(day.rainfall) !== null).sort((a, b) => numeric(b.rainfall) - numeric(a.rainfall))[0] ?? null;
  const windValues = forecast.map(day => numeric(day.wind_speed)).filter(value => value !== null);
  const wind = windValues.length ? Math.max(...windValues) : numeric(weather.wind_speed);
  const tomorrow = forecast.find(day => day.date > new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
  const isTomorrow = /tomorrow|next day|उद्या|कल/.test(q);
  const isRain = /rain|raining|rainfall|weather|पाऊस|पावस|बारिश|वर्षा/.test(q);
  const isIrrigation = /irrigat|water|सिंचन|पाणी|सिंचाई|पानी/.test(q);
  const isSpray = /spray|फवार|छिड़क|छिड़काव/.test(q);
  const isFieldWork = /harvest|field|machinery|कापणी|शेतकाम|खेत|कटाई|मशीन/.test(q);
  let answer;
  let topic;

  if (isTomorrow && isRain) {
    topic = 'tomorrow_rain';
    answer = tomorrow ? text.tomorrow(tomorrow.date, numeric(tomorrow.rainfall)) : text.missing;
  } else if (isRain) {
    topic = 'rainfall_forecast';
    answer = text.rain(totalRain, peakDay);
  } else if (isIrrigation) {
    topic = 'irrigation';
    answer = text.irrigation(totalRain);
  } else if (isSpray) {
    topic = 'spraying';
    answer = text.spray(wind, totalRain);
  } else if (isFieldWork) {
    topic = 'field_work';
    answer = text.field(totalRain);
  } else {
    topic = 'weather_advisory';
    const current = {
      temperature: numeric(weather.temperature), humidity: numeric(weather.humidity), rainfall: numeric(weather.rainfall),
      forecast_rainfall: totalRain, wind_speed: wind, forecast_hours: forecast.length * 24
    };
    const required = ['temperature', 'humidity', 'forecast_rainfall', 'wind_speed'];
    if (required.some(key => current[key] === null)) answer = text.missing;
    else {
      const advisory = buildBaseAdvisory({ weather: current, language, audience: 'farmer', crop });
      answer = text.general(advisory.approved_advisory.title, advisory.approved_advisory.message);
    }
  }

  const gpName = location.gp_name || '';
  const blockName = location.block || '';
  return {
    answer: `${text.location(gpName, blockName, crop)}${answer}`,
    topic,
    language: SUPPORTED_LANGUAGES[language],
    source: 'selected_panchayat_forecast',
    location: { gp_id: location.gp_id || null, gp_name: gpName || null, block: blockName || null, district: location.district || null },
    evidence: { forecast_days: forecast.length, dates: forecast.map(day => day.date), crop: crop || null }
  };
}

module.exports = { answerFarmQuestion };
