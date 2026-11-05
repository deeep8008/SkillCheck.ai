const findingSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "evidence", "explanation", "suggestion", "basis", "priority", "requirementEvidence"],
    properties: {
        title: { type: "string", minLength: 1, maxLength: 100 },
        evidence: { type: ["string", "null"], minLength: 1, maxLength: 500 },
        basis: { type: "string", minLength: 1, maxLength: 30, enum: ["job_requirement", "role_expectation", "resume_clarity"] },
        priority: { type: "string", minLength: 1, maxLength: 10, enum: ["high", "medium", "low"] },
        requirementEvidence: { type: ["string", "null"], minLength: 1, maxLength: 500 },
        explanation: { type: "string", minLength: 1, maxLength: 700 },
        suggestion: { type: "string", minLength: 1, maxLength: 600 }
    }
};

const requirementSchema = {
    type: "object",
    additionalProperties: false,
    required: ["jobQuote", "resumeQuote", "status", "preferred", "explanation", "nextStep"],
    properties: {
        jobQuote: { type: "string", minLength: 1, maxLength: 300 },
        resumeQuote: { type: ["string", "null"], minLength: 1, maxLength: 300 },
        status: { type: "string", minLength: 1, maxLength: 20, enum: ["supported", "unclear", "no_evidence"] },
        preferred: { type: "boolean" },
        explanation: { type: "string", minLength: 1, maxLength: 220 },
        nextStep: { type: "string", minLength: 1, maxLength: 220 }
    }
};

const optionalWording = /\b(preferred|optional|nice[- ]to[- ]have|not (?:mandatory|required)|does not require)\b/i;

const reportSchema = {
    type: "object",
    additionalProperties: false,
    required: ["headline", "summary", "strengths", "gaps", "screeningConcerns", "limitations", "requirementMap"],
    properties: {
        headline: { type: "string", minLength: 1, maxLength: 120 },
        summary: { type: "string", minLength: 1, maxLength: 1200 },
        strengths: { type: "array", maxItems: 3, items: findingSchema },
        gaps: { type: "array", maxItems: 3, items: findingSchema },
        screeningConcerns: { type: "array", maxItems: 3, items: findingSchema },
        requirementMap: { type: "array", maxItems: 5, items: requirementSchema },
        limitations: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 500 } }
    }
};

// Validate the small schema above locally too; JSON parsing alone isn't validation.
function matchesSchema(value, schema) {
    if (schema.enum && !schema.enum.includes(value)) return false;
    if (value === null) return Array.isArray(schema.type) && schema.type.includes("null");
    if (schema.type === "boolean") return typeof value === "boolean";
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

function validateReport(report, resumeText, jobDescription = "") {
    if (!matchesSchema(report, reportSchema)) return false;
    if (/[\r\n\u2028\u2029]/.test(report.headline)) return false;
    const normalize = text => text.replace(/\s+/g, " ").trim();
    const source = normalize(resumeText);
    const requirements = normalize(jobDescription);
    const seen = new Set();
    for (const row of report.requirementMap) {
        const quote = normalize(row.jobQuote);
        if (!requirements.includes(quote) || seen.has(quote)) return false;
        if (optionalWording.test(quote) && !row.preferred) return false;
        if (row.status === "no_evidence" ? row.resumeQuote !== null
            : row.resumeQuote === null || !source.includes(normalize(row.resumeQuote))) return false;
        seen.add(quote);
    }
    for (const section of ["strengths", "gaps", "screeningConcerns"]) {
        for (const finding of report[section]) {
            if (section === "strengths" && finding.evidence === null) return false;
            if (finding.evidence !== null && !source.includes(normalize(finding.evidence))) return false;
            if (finding.basis === "job_requirement") {
                if (!requirements || finding.requirementEvidence === null || !requirements.includes(normalize(finding.requirementEvidence))) return false;
                if (finding.priority === "high" && optionalWording.test(finding.requirementEvidence)) return false;
            } else if (finding.requirementEvidence !== null || finding.priority === "high") return false;
            // When a JD is supplied, gaps must refer to its actual requirements.
            if (section === "gaps" && requirements && finding.basis !== "job_requirement") return false;
            if (section === "gaps" && finding.basis === "resume_clarity") return false;
        }
    }
    return true;
}

module.exports = { reportSchema, validateReport };
