const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config = require("./src/config");
const { answerFarmQuestion } = require("./src/assistant");

const {
    buildBaseAdvisory,
    SUPPORTED_LANGUAGES,
    SUPPORTED_AUDIENCES
} = require("./src/advisory_engine");

const {
    generateWithFallback
} = require("./src/ai_provider");

const {
    validateAdvisory
} = require("./src/validator");

const {
    cache,
    createKey
} = require("./src/cache");


const app = express();


/* ==========================================
   SECURITY
========================================== */

app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);


app.use(
    cors({
        origin: true
    })
);


app.use(
    express.json({
        limit: "100kb"
    })
);

// Accept both direct API paths and the frontend's /agri-api proxy prefix.
// This keeps Vercel, the Python reverse proxy, and local Vite requests aligned.
app.use((req, res, next) => {
    if (req.url === "/agri-api" || req.url.startsWith("/agri-api/")) {
        req.url = req.url.slice("/agri-api".length) || "/";
    }
    next();
});


/* ==========================================
   RATE LIMITING
========================================== */

const advisoryLimiter =
    rateLimit({

        windowMs: 60 * 1000,

        max: 60,

        standardHeaders: true,

        legacyHeaders: false,

        message: {
            success: false,
            error:
                "Too many advisory requests. Please try again shortly."
        }
    });


/* ==========================================
   STATIC FRONTEND
========================================== */

app.use(express.static(require("node:path").join(__dirname, "public")));


/* ==========================================
   HEALTH
========================================== */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            service:
                "AgriWeather Advisory API",

            time:
                new Date().toISOString(),

            providers: {

                groq:
                    Boolean(
                        process.env.GROQ_API_KEY
                    ),

                gemini:
                    Boolean(
                        process.env.GEMINI_API_KEY
                    ),

                openrouter:
                    Boolean(
                        process.env.OPENROUTER_API_KEY
                    )
            }

        });
    }
);


/* ==========================================
   CONFIG
========================================== */

app.get(
    "/api/config",
    (req, res) => {

        res.json({

            success: true,

            languages:
                SUPPORTED_LANGUAGES,

            audiences:
                SUPPORTED_AUDIENCES

        });
    }
);

app.post("/api/assistant", advisoryLimiter, (req, res) => {
    try {
        const { question, crop, language = "en", weather, location } = req.body || {};
        if (!weather || typeof weather !== "object") {
            return res.status(400).json({ success: false, error: "Weather data is required." });
        }
        const result = answerFarmQuestion({ question, crop, language, weather, location });
        return res.json({ success: true, ...result, generated_at: new Date().toISOString() });
    } catch (error) {
        const status = ["Unsupported language", "Enter a question first"].includes(error.message) || error.message.includes("500 characters") ? 400 : 500;
        return res.status(status).json({ success: false, error: error.message || "Unable to answer this question." });
    }
});


/* ==========================================
   ADVISORY
========================================== */

app.post(
    "/api/advisory",
    advisoryLimiter,

    async (req, res) => {

        try {

            const {

                gp_id,

                gp_name,

                crop,

                language,

                audience = "farmer",

                weather

            } = req.body;


            /* ------------------------------
               VALIDATE BASIC INPUT
            ------------------------------ */

            if (!language) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Language selection is required."
                });
            }


            if (!weather) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Weather data is required."
                });
            }


            const numericFields = [

                "temperature",
                "humidity",
                "rainfall",
                "forecast_rainfall",
                "wind_speed"

            ];


            for (
                const field of numericFields
            ) {

                if (
                    weather[field] !== undefined &&
                    !Number.isFinite(
                        Number(weather[field])
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        error:
                            `${field} must be numeric.`
                    });
                }
            }

            const missingWeatherFields = numericFields.filter(field =>
                weather[field] === null || weather[field] === undefined || weather[field] === ""
            );
            if (missingWeatherFields.length) {
                return res.status(422).json({
                    success: false,
                    error: `Forecast data is unavailable for: ${missingWeatherFields.join(", ")}. No advisory was generated.`
                });
            }


            /* ------------------------------
               CREATE RULE ENGINE ADVISORY
            ------------------------------ */

            const baseAdvisory =
                buildBaseAdvisory({

                    weather: {

                        temperature:
                            Number(
                                weather.temperature
                            ),

                        humidity:
                            Number(
                                weather.humidity
                            ),

                        rainfall:
                            Number(
                                weather.rainfall || 0
                            ),

                        forecast_rainfall:
                            Number(
                                weather.forecast_rainfall ??
                                weather.rainfall ??
                                0
                            ),

                        wind_speed:
                            Number(
                                weather.wind_speed || 0
                            ),

                        wind_direction:
                            weather.wind_direction,

                        soil_moisture:
                            weather.soil_moisture === null ||
                            weather.soil_moisture === undefined
                                ? null
                                : Number(
                                    weather.soil_moisture
                                ),

                        forecast_hours:
                            Number(
                                weather.forecast_hours || 24
                            )
                    },

                    language,

                    audience,

                    crop
                });


            /* ------------------------------
               CACHE
            ------------------------------ */

            const cacheInput = {

                gp_id,

                language,

                audience,

                crop,

                weather:
                    baseAdvisory.weather
            };


            const cacheKey =
                createKey(cacheInput);


            const cached =
                cache.get(cacheKey);


            if (cached) {

                return res.json({

                    success: true,

                    cached: true,

                    ...cached

                });
            }


            /* ------------------------------
               AI PAYLOAD
            ------------------------------ */

            const aiPayload = {

                location: {

                    gp_id:
                        gp_id || null,

                    gp_name:
                        gp_name || null
                },

                crop:
                    crop || null,

                audience,

                requested_language:
                    language,

                verified_weather:
                    baseAdvisory.weather,

                deterministic_risk_assessment:
                    baseAdvisory.risk_assessment,

                approved_advisory:
                    baseAdvisory.approved_advisory,

                secondary_advisories:
                    baseAdvisory.secondary_advisories
            };


            /* ------------------------------
               AI
            ------------------------------ */

            let finalAdvisory;


            const approved = baseAdvisory.approved_advisory;
            finalAdvisory = {
                title: approved.title,
                summary: approved.message,
                risk_level: baseAdvisory.risk_assessment.severity,
                urgency: baseAdvisory.risk_assessment.severity === "CRITICAL" ? "IMMEDIATE" : "ACT_SOON",
                language: SUPPORTED_LANGUAGES[language],
                audience,
                actions: [approved.message],
                avoid: [],
                evidence: [baseAdvisory.risk_assessment.reason],
                source: "rule_engine_approved_template",
                disclaimer: "This advisory is generated from weather thresholds and approved agricultural templates. Follow local agricultural guidance where applicable."
            };


            /* ------------------------------
               FINAL SAFETY OVERRIDES
            ------------------------------ */

            finalAdvisory.language =
                SUPPORTED_LANGUAGES[
                    language
                ];

            finalAdvisory.audience =
                audience;


            finalAdvisory.source =
                finalAdvisory.source ||
                "AgriWeather Advisory Engine";


            /* ------------------------------
               FINAL RESPONSE
            ------------------------------ */

            const result = {

                location: {

                    gp_id:
                        gp_id || null,

                    gp_name:
                        gp_name || null
                },

                weather:
                    baseAdvisory.weather,

                risk_assessment:
                    baseAdvisory.risk_assessment,

                advisory:
                    finalAdvisory,

                generated_at:
                    new Date().toISOString()

            };


            cache.set(
                cacheKey,
                result
            );


            return res.json({

                success: true,

                cached: false,

                ...result

            });


        } catch (error) {

            console.error(error);


            return res.status(500).json({

                success: false,

                error:
                    "Unable to generate advisory.",

                message:
                    process.env.NODE_ENV ===
                    "development"
                        ? error.message
                        : undefined

            });
        }
    }
);


/* ==========================================
   START
========================================== */

app.listen(
    config.port,

    () => {

        console.log(
            `AgriWeather Advisory API running on port ${config.port}`
        );

    }
);
