const input = {
    resumeText: "Built REST APIs using Node.js, Express and MongoDB. Implemented JWT authentication for a developer project.",
    targetRole: "Backend Engineer",
    jobDescription: "Build REST APIs and write automated tests."
};
const report = {
    summary: "The resume demonstrates API development. Testing experience needs clearer evidence.",
    strengths: [{
        title: "Backend API development",
        evidence: "Built REST APIs using Node.js, Express and MongoDB.",
        explanation: "This is relevant evidence for the requested API work.",
        suggestion: "Describe one endpoint and your design decisions."
    }],
    gaps: [{
        title: "Testing is not evidenced",
        evidence: null,
        explanation: "The supplied job description asks for automated tests, but the resume does not describe them.",
        suggestion: "If you have written tests, add a truthful example and the failure it catches."
    }],
    screeningConcerns: [],
    limitations: ["A resume cannot verify implementation quality or the candidate's full abilities."]
};
function completion(value = report, finishReason = "stop") {
    return { choices: [{ finish_reason: finishReason, message: { content: JSON.stringify(value) } }] };
}
module.exports = { input, report, completion };
