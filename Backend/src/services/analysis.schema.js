const findingSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "evidence", "explanation", "suggestion"],
    properties: {
        title: { type: "string", minLength: 1, maxLength: 100 },
        evidence: { type: ["string", "null"], minLength: 1, maxLength: 500 },
        explanation: { type: "string", minLength: 1, maxLength: 700 },
        suggestion: { type: "string", minLength: 1, maxLength: 600 }
    }
};

const reportSchema = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "strengths", "gaps", "screeningConcerns", "limitations"],
    properties: {
        summary: { type: "string", minLength: 1, maxLength: 1200 },
        strengths: { type: "array", maxItems: 3, items: findingSchema },
        gaps: { type: "array", maxItems: 3, items: findingSchema },
        screeningConcerns: { type: "array", maxItems: 3, items: findingSchema },
        limitations: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 500 } }
    }
};

// Validate the small schema above locally too; JSON parsing alone isn't validation.
function matchesSchema(value, schema) {
    if (value === null) return Array.isArray(schema.type) && schema.type.includes("null");
    if (schema.type === "string" || Array.isArray(schema.type)) {
        return typeof value === "string" && value.trim().length >= schema.minLength && value.length <= schema.maxLength;
    }
    if (schema.type === "array") {
        return Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= schema.maxItems
            && value.every(item => matchesSchema(item, schema.items));
    }
    if (schema.type === "object") {
        return typeof value === "object" && !Array.isArray(value)
            && schema.required.every(key => Object.hasOwn(value, key))
            && Object.keys(value).every(key => Object.hasOwn(schema.properties, key))
            && Object.entries(schema.properties).every(([key, child]) => matchesSchema(value[key], child));
    }
    return false;
}

function validateReport(report, resumeText) {
    if (!matchesSchema(report, reportSchema)) return false;
    const normalize = text => text.replace(/\s+/g, " ").trim();
    const source = normalize(resumeText);
    for (const section of ["strengths", "gaps", "screeningConcerns"]) {
        for (const finding of report[section]) {
            if (section === "strengths" && finding.evidence === null) return false;
            if (finding.evidence !== null && !source.includes(normalize(finding.evidence))) return false;
        }
    }
    return true;
}

module.exports = { reportSchema, validateReport };
