const { buildBaseAdvisory, SUPPORTED_LANGUAGES } = require("./advisory_engine");

const ANSWERS = {
    en: {
        irrigate_wet: (rain) => `Rain is forecast during the next 7 days (peak day ${rain.toFixed(1)} mm). Avoid adding irrigation just before expected rain. Check soil moisture and field drainage before deciding.`,
        irrigate_dry: "The forecast does not show a strong rain trigger. Check soil moisture and the crop's stage and water requirement before irrigating; this service does not measure field soil moisture.",
        spray_avoid: "Rain or stronger winds are forecast. Postpone spraying during rain and avoid spraying when wind could cause drift. Follow the product label and local agricultural guidance.",
        spray_ok: "The available forecast does not show a strong rain or wind trigger for the selected day. Check field conditions and the product label before spraying; this is not a pesticide recommendation.",
        field_risk: "Rain or wind may disrupt field work. Check the daily forecast and field conditions before harvesting or operating machinery.",
        field_ok: "No strong rain or wind trigger appears in this forecast. Check field conditions and local guidance before scheduling field work.",
        general: (title, message) => `${title}. ${message}`
    },
    mr: {
        irrigate_wet: (rain) => `पुढील ७ दिवसांत पावसाचा अंदाज आहे (कमाल एका दिवसात ${rain.toFixed(1)} मिमी). अपेक्षित पावसापूर्वी अतिरिक्त सिंचन टाळा. निर्णयापूर्वी जमिनीतील ओलावा आणि शेतातील निचरा तपासा.`,
        irrigate_dry: "अंदाजात मोठ्या पावसाचा संकेत नाही. सिंचनापूर्वी जमिनीतील ओलावा, पिकाची अवस्था आणि पाण्याची गरज तपासा; ही सेवा शेतातील ओलावा मोजत नाही.",
        spray_avoid: "पाऊस किंवा जोरदार वाऱ्याचा अंदाज आहे. पावसात फवारणी पुढे ढकला आणि औषध वाहून जाण्याची शक्यता असल्यास फवारणी टाळा. उत्पादनाच्या लेबलवरील आणि स्थानिक कृषी मार्गदर्शनाचे पालन करा.",
        spray_ok: "निवडलेल्या दिवसाच्या अंदाजात पाऊस किंवा वाऱ्याचा मोठा अडथळा दिसत नाही. फवारणीपूर्वी शेतातील परिस्थिती आणि उत्पादनाचे लेबल तपासा; हा कीटकनाशक वापराचा सल्ला नाही.",
        field_risk: "पाऊस किंवा वाऱ्यामुळे शेतातील कामात अडथळा येऊ शकतो. कापणी किंवा यंत्रसामग्री वापरण्यापूर्वी दैनिक अंदाज आणि शेताची स्थिती तपासा.",
        field_ok: "या अंदाजात पाऊस किंवा वाऱ्याचा मोठा संकेत नाही. शेतातील कामाचे नियोजन करण्यापूर्वी स्थानिक परिस्थिती तपासा.",
        general: (title, message) => `${title}. ${message}`
    },
    hi: {
        irrigate_wet: (rain) => `अगले 7 दिनों में बारिश का पूर्वानुमान है (एक दिन में अधिकतम ${rain.toFixed(1)} मिमी)। अनुमानित बारिश से ठीक पहले अतिरिक्त सिंचाई न करें। निर्णय से पहले मिट्टी की नमी और खेत की जल निकासी जाँचें।`,
        irrigate_dry: "पूर्वानुमान में तेज बारिश का संकेत नहीं है। सिंचाई से पहले मिट्टी की नमी, फसल की अवस्था और पानी की जरूरत जाँचें; यह सेवा खेत की नमी नहीं मापती।",
        spray_avoid: "बारिश या तेज हवा का पूर्वानुमान है। बारिश में छिड़काव टालें और हवा से दवा बहने का जोखिम हो तो छिड़काव न करें। उत्पाद के लेबल और स्थानीय कृषि सलाह का पालन करें।",
        spray_ok: "चुने हुए दिन के पूर्वानुमान में बारिश या हवा की बड़ी बाधा नहीं दिखती। छिड़काव से पहले खेत की स्थिति और उत्पाद का लेबल जाँचें; यह कीटनाशक उपयोग की सलाह नहीं है।",
        field_risk: "बारिश या हवा से खेत का काम प्रभावित हो सकता है। कटाई या मशीन चलाने से पहले दैनिक पूर्वानुमान और खेत की स्थिति जाँचें।",
        field_ok: "इस पूर्वानुमान में बारिश या हवा का बड़ा संकेत नहीं है। खेत का काम तय करने से पहले स्थानीय स्थिति जाँचें।",
        general: (title, message) => `${title}. ${message}`
    }
};

function answerFarmQuestion({ question, weather, language = "en", crop = null }) {
    if (!SUPPORTED_LANGUAGES[language]) throw new Error("Unsupported language");
    const q = String(question || "").trim().toLocaleLowerCase();
    if (!q) throw new Error("Enter a question first");
    if (q.length > 500) throw new Error("Question must be 500 characters or fewer");

    const lexicon = ANSWERS[language];
    const forecastRain = Number(weather.forecast_rainfall ?? weather.rainfall ?? 0);
    const wind = Number(weather.wind_speed ?? 0);
    const isIrrigation = /irrigat|water|पाणी|सिंचन|पानी|सिंचाई|पाणी द्य|पानी दे/.test(q);
    const isSpray = /spray|फवार|छिड़क|छिड़काव|औषध/.test(q);
    const isFieldWork = /harvest|field|machinery|कापणी|शेतकाम|कटाई|खेत|मशीन/.test(q);
    let answer;
    let topic;

    if (isIrrigation) {
        topic = "irrigation";
        answer = forecastRain >= 20 ? lexicon.irrigate_wet(forecastRain) : lexicon.irrigate_dry;
    } else if (isSpray) {
        topic = "spraying";
        answer = forecastRain >= 5 || wind >= 25 ? lexicon.spray_avoid : lexicon.spray_ok;
    } else if (isFieldWork) {
        topic = "field_work";
        answer = forecastRain >= 20 || wind >= 25 ? lexicon.field_risk : lexicon.field_ok;
    } else {
        topic = "weather_advisory";
        const advisory = buildBaseAdvisory({ weather, language, audience: "farmer", crop });
        answer = lexicon.general(advisory.approved_advisory.title, advisory.approved_advisory.message);
    }

    return { answer, topic, language: SUPPORTED_LANGUAGES[language], source: "forecast_rule_engine" };
}

module.exports = { answerFarmQuestion };
