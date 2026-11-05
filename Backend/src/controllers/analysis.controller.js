const { analyseResume, getAnalysisConfig } = require("../services/analysis.service");
const { checkAtsCoverage } = require("../services/ats.service");
const Report = require("../models/report.model");

function requireAnalysisConfig(_req, res, next) {
    try {
        getAnalysisConfig();
        next();
    } catch (error) {
        res.status(error.status).json({ message: error.message, code: error.code });
    }
}

async function analyse(req, res) {
    try {
        const result = await analyseResume(req.analysisInput);
        const ats = checkAtsCoverage(req.analysisInput.resumeText, req.analysisInput.jobDescription);
        const response = { message: "Resume analysed.", ...result, targetRole: req.analysisInput.targetRole, ...(ats && { ats }) };
        try {
            const saved = await Report.create({
                owner: req.user.id,
                ...req.analysisInput,
                ...result
            });
            res.status(200).json({ ...response, id: String(saved._id), createdAt: saved.createdAt, saved: true });
        } catch {
            // Preserve the paid result if storage is unavailable; never regenerate automatically.
            res.status(200).json({ ...response, saved: false, saveError: "Your report was generated, but saving could not be confirmed. Keep this page open and check history before generating again." });
        }
    } catch (error) {
        // Never forward raw provider errors, request bodies, or credentials.
        const wait = error.retryable === false ? 0 : Math.max(error.retryAfter || 0, req.analysisRetryAfter?.() || 0);
        if (wait > 0) res.set("Retry-After", String(wait));
        res.status(error.status || 500).json({ message: error.status ? error.message : "Could not analyse your resume. Please try again later.", code: error.code || "ANALYSIS_FAILED" });
    } finally {
        req.releaseAnalysis();
    }
}

module.exports = { analyse, requireAnalysisConfig };
