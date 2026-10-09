const Groq = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");

const config = require("./config");


// ==============================================
// CLIENTS
// ==============================================

const groq = config.ai.groq.enabled
    ? new Groq({
        apiKey: config.ai.groq.key
    })
    : null;


const gemini = config.ai.gemini.enabled
    ? new GoogleGenAI({
        apiKey: config.ai.gemini.key
    })
    : null;


// ==============================================
// OUTPUT SCHEMA
// ==============================================

const ADVISORY_SCHEMA = {

    type: "object",

    additionalProperties: false,

    properties: {

        title: {
            type: "string"
        },

        summary: {
            type: "string"
        },

        risk_level: {
            type: "string",
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ]
        },

        urgency: {
            type: "string",
            enum: [
                "NORMAL",
                "WATCH",
                "ACT_SOON",
                "IMMEDIATE"
            ]
        },

        language: {
            type: "string",
            enum: [
                "English",
                "Marathi",
                "Hindi"
            ]
        },

        audience: {
            type: "string",
            enum: [
                "farmer",
                "government",
                "fpo",
                "agriculture_officer"
            ]
        },

        actions: {
            type: "array",

            items: {
                type: "string"
            }
        },

        avoid: {
            type: "array",

            items: {
                type: "string"
            }
        },

        evidence: {
            type: "array",

            items: {
                type: "string"
            }
        },

        source: {
            type: "string"
        },

        disclaimer: {
            type: "string"
        }
    },

    required: [
        "title",
        "summary",
        "risk_level",
        "urgency",
        "language",
        "audience",
        "actions",
        "avoid",
        "evidence",
        "source",
        "disclaimer"
    ]
};


// ==============================================
// SYSTEM PROMPT
// ==============================================

function buildSystemPrompt() {

    return `

You are the controlled language-generation layer of an agricultural weather advisory system.

SYSTEM PURPOSE:
This system converts verified weather forecasts and deterministic agricultural risk assessments into clear advisories for:

1. Farmers
2. Government departments
3. Agriculture officers
4. Farmer Producer Organisations (FPOs)
5. Agricultural field staff

IMPORTANT SAFETY RULE:

You are NOT the agricultural decision engine.

The deterministic rule engine has already identified the weather risk.

You must NOT override it.

You must NOT invent a new weather risk.

You must NOT invent weather values.

You must NOT change numerical values.

You must NOT make a disease diagnosis.

You must NOT prescribe pesticides, pesticide doses, fertilizers, medicines or chemical quantities.

You must NOT invent government schemes.

You must NOT claim that an action is officially recommended unless it is explicitly present in the approved advisory.

You may improve wording, translation, clarity and structure.

LANGUAGE:

Supported languages:

English
Marathi
Hindi

Use exactly the language requested by the user.

Marathi must be natural Indian Marathi suitable for farmers.

Hindi must be natural Indian Hindi suitable for farmers.

Do NOT translate Marathi into awkward literal Hindi/English.

AUDIENCE:

For FARMERS:
- simple language
- short actionable instructions
- avoid technical jargon
- explain what to monitor
- prioritize immediate field actions

For GOVERNMENT:
- emphasize affected locations
- risk severity
- forecast evidence
- possible agricultural impact
- monitoring and field-level response
- avoid pretending that a government action has already been authorized

For AGRICULTURE OFFICERS:
- emphasize field verification
- crop monitoring
- farmer communication
- weather-risk evidence

For FPO:
- emphasize crop clusters
- harvesting/transport/storage implications
- coordination and communication

STYLE:

Never use fear-based language.

Never exaggerate.

Never say "100% safe".

Never say "disease confirmed".

Use phrases such as:
"risk is favorable"
"conditions may increase risk"
"monitor for signs"
"follow local agricultural guidance"

The advisory must remain faithful to the APPROVED ADVISORY.

OUTPUT:

Return ONLY the requested JSON object.

No markdown.

No explanation outside JSON.

`;
}


// ==============================================
// GROQ
// ==============================================

async function callGroq(payload) {

    if (!groq) {

        throw new Error("Groq is not configured");
    }


    const completion =
        await groq.chat.completions.create({

            model: config.ai.groq.model,

            temperature: 0.15,

            max_tokens: 900,

            messages: [

                {
                    role: "system",
                    content: buildSystemPrompt()
                },

                {
                    role: "user",
                    content:
                        JSON.stringify(payload)
                }
            ],

            response_format: {

                type: "json_schema",

                json_schema: {

                    name: "agricultural_advisory",

                    strict: true,

                    schema: ADVISORY_SCHEMA
                }
            }
        });


    const text =
        completion.choices[0].message.content;

    return JSON.parse(text);
}


// ==============================================
// GEMINI
// ==============================================

async function callGemini(payload) {

    if (!gemini) {

        throw new Error("Gemini is not configured");
    }


    const response =
        await gemini.models.generateContent({

            model: config.ai.gemini.model,

            contents: [

                {
                    role: "user",

                    parts: [
                        {
                            text:
                                buildSystemPrompt()
                                +
                                "\n\nINPUT:\n"
                                +
                                JSON.stringify(payload)
                        }
                    ]
                }

            ],

            config: {

                temperature: 0.15,

                responseMimeType:
                    "application/json",

                responseSchema:
                    ADVISORY_SCHEMA
            }
        });


    return JSON.parse(response.text);
}


// ==============================================
// OPENROUTER
// ==============================================

async function callOpenRouter(payload) {

    if (!config.ai.openrouter.enabled) {

        throw new Error(
            "OpenRouter is not configured"
        );
    }


    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {

            method: "POST",

            headers: {

                "Authorization":
                    `Bearer ${config.ai.openrouter.key}`,

                "Content-Type":
                    "application/json",

                "HTTP-Referer":
                    "http://localhost:5000",

                "X-Title":
                    "AgriWeather Advisory"
            },

            body: JSON.stringify({

                model:
                    config.ai.openrouter.model,

                temperature: 0.15,

                max_tokens: 900,

                messages: [

                    {
                        role: "system",
                        content:
                            buildSystemPrompt()
                    },

                    {
                        role: "user",
                        content:
                            JSON.stringify(payload)
                    }

                ],

                response_format: {
                    type: "json_object"
                }

            })
        }
    );


    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            `OpenRouter error ${response.status}: ${errorText}`
        );
    }


    const data =
        await response.json();


    return JSON.parse(
        data.choices[0].message.content
    );
}


// ==============================================
// FALLBACK CHAIN
// ==============================================

async function generateWithFallback(payload) {

    const providers = [

        {
            name: "groq",
            enabled: config.ai.groq.enabled,
            fn: callGroq
        },

        {
            name: "gemini",
            enabled: config.ai.gemini.enabled,
            fn: callGemini
        },

        {
            name: "openrouter",
            enabled: config.ai.openrouter.enabled,
            fn: callOpenRouter
        }

    ];


    const errors = [];


    for (const provider of providers) {

        if (!provider.enabled) {
            continue;
        }


        try {

            const result =
                await provider.fn(payload);

            return {

                ...result,

                provider:
                    provider.name

            };

        } catch (error) {

            console.error(
                `${provider.name} failed:`,
                error.message
            );

            errors.push({
                provider: provider.name,
                error: error.message
            });
        }
    }


    throw new Error(
        "All AI providers failed"
    );
}


module.exports = {
    generateWithFallback
};