const { z } = require("zod");


const AdvisorySchema = z.object({

    title: z.string(),

    summary: z.string(),

    risk_level: z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ]),

    urgency: z.enum([
        "NORMAL",
        "WATCH",
        "ACT_SOON",
        "IMMEDIATE"
    ]),

    language: z.enum([
        "English",
        "Marathi",
        "Hindi"
    ]),

    audience: z.enum([
        "farmer",
        "government",
        "fpo",
        "agriculture_officer"
    ]),

    actions: z.array(
        z.string()
    ),

    avoid: z.array(
        z.string()
    ),

    evidence: z.array(
        z.string()
    ),

    source: z.string(),

    disclaimer: z.string()
});


function validateAdvisory(data) {

    return AdvisorySchema.parse(data);
}


module.exports = {
    validateAdvisory
};