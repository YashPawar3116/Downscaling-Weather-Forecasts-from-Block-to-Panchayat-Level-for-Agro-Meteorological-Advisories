require("dotenv").config();

module.exports = {
    port: Number(process.env.PORT || 5000),

    ai: {
        groq: {
            enabled: Boolean(process.env.GROQ_API_KEY),
            key: process.env.GROQ_API_KEY,
            model: process.env.GROQ_MODEL || "openai/gpt-oss-20b"
        },

        gemini: {
            enabled: Boolean(process.env.GEMINI_API_KEY),
            key: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || "gemini-3.6-flash"
        },

        openrouter: {
            enabled: Boolean(process.env.OPENROUTER_API_KEY),
            key: process.env.OPENROUTER_API_KEY,
            model: process.env.OPENROUTER_MODEL || "openrouter/free"
        }
    }
};