const { evaluateWeather } = require("./rules");
const { TEMPLATES } = require("./templates");

const SUPPORTED_LANGUAGES = {
    en: "English",
    mr: "Marathi",
    hi: "Hindi"
};

const SUPPORTED_AUDIENCES = [
    "farmer",
    "government",
    "fpo",
    "agriculture_officer"
];


function validateLanguage(language) {

    if (!SUPPORTED_LANGUAGES[language]) {

        throw new Error(
            `Unsupported language: ${language}`
        );
    }
}


function validateAudience(audience) {

    if (!SUPPORTED_AUDIENCES.includes(audience)) {

        throw new Error(
            `Unsupported audience: ${audience}`
        );
    }
}


function getTemplate(riskCode, language) {

    const template = TEMPLATES[riskCode];

    if (!template) {

        return TEMPLATES.SAFE_WEATHER.farmer[language];
    }

    return template.farmer[language];
}


function buildBaseAdvisory({
    weather,
    language,
    audience,
    crop
}) {

    validateLanguage(language);
    validateAudience(audience);

    const evaluation = evaluateWeather(weather);

    let risks = evaluation.risks;

    if (risks.length === 0) {

        risks = [{
            code: "SAFE_WEATHER",
            severity: "LOW",
            score: 0.90,
            reason: "No major predefined weather risk threshold was triggered."
        }];
    }


    const primary = risks[0];

    const template = getTemplate(
        primary.code,
        language
    );


    const secondaryAdvisories = risks
        .slice(1, 4)
        .map(risk => {

            const t = getTemplate(
                risk.code,
                language
            );

            return {
                risk_code: risk.code,
                severity: risk.severity,
                title: t.title,
                message: t.message
            };
        });


    return {

        system: {
            system_name: "AgriWeather Advisory Engine",
            version: "1.0.0",
            generated_at: new Date().toISOString()
        },

        request: {
            language,
            language_name: SUPPORTED_LANGUAGES[language],
            audience,
            crop: crop || null
        },

        weather: {
            temperature: weather.temperature,
            humidity: weather.humidity,
            rainfall: weather.rainfall,
            forecast_rainfall: weather.forecast_rainfall,
            wind_speed: weather.wind_speed,
            wind_direction: weather.wind_direction || null,
            soil_moisture: weather.soil_moisture || null,
            forecast_hours: weather.forecast_hours || 24
        },

        risk_assessment: {
            primary_risk: primary.code,
            severity: primary.severity,
            confidence: primary.score,
            reason: primary.reason,
            risks
        },

        approved_advisory: {
            title: template.title,
            message: template.message
        },

        secondary_advisories: secondaryAdvisories,

        source: "deterministic_rule_engine"
    };
}


module.exports = {
    buildBaseAdvisory,
    SUPPORTED_LANGUAGES,
    SUPPORTED_AUDIENCES
};
