function validateAnalysisInput(req, res, next) {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)
        || Object.keys(body).some(key => !["resumeText", "targetRole", "jobDescription"].includes(key))) {
        return res.status(400).json({ message: "Send resumeText, targetRole and optional jobDescription as JSON." });
    }
    const { resumeText, targetRole, jobDescription = "" } = body;
    if (typeof resumeText !== "string" || resumeText.trim().length < 50 || resumeText.length > 20000) {
        return res.status(400).json({ message: "Resume text must contain 50–20,000 characters. Use a shorter resume if needed." });
    }
    if (typeof targetRole !== "string" || !targetRole.trim() || targetRole.length > 120) {
        return res.status(400).json({ message: "Enter a target role of up to 120 characters." });
    }
    if (typeof jobDescription !== "string" || jobDescription.length > 5000) {
        return res.status(400).json({ message: "Job description must be text of up to 5,000 characters." });
    }
    req.analysisInput = { resumeText: resumeText.trim(), targetRole: targetRole.trim(), jobDescription: jobDescription.trim() };
    next();
}

// Small single-server cost guard; attempts count even if the provider fails.
function createAnalysisLimiter({ now = Date.now } = {}) {
    const users = new Map();
    let active = 0;
    return function limitAnalysis(req, res, next) {
        const time = now();
        for (const [id, record] of users) {
            if (!record.inFlight && time >= record.expiresAt) users.delete(id);
        }
        const id = String(req.user.id);
        const record = users.get(id);
        if (record && (record.inFlight || record.count >= 5 || time < record.nextAt)) {
            const wait = record.count >= 5 ? record.expiresAt - time : Math.max(30000, record.nextAt - time);
            res.set("Retry-After", String(Math.ceil(wait / 1000)));
            return res.status(429).json({ message: record.count >= 5 ? "You have reached 5 analysis attempts this hour. Please try again later." : "An analysis is running or was just requested. Wait at least 30 seconds before trying again." });
        }
        if (active >= 2 || (!record && users.size >= 1000)) {
            res.set("Retry-After", "30");
            return res.status(503).json({ message: "Analysis is busy. Please try again shortly." });
        }
        const entry = record || { count: 0, expiresAt: time + 3600000 };
        entry.count++;
        entry.nextAt = time + 30000;
        entry.inFlight = true;
        users.set(id, entry);
        active++;
        req.releaseAnalysis = () => {
            entry.inFlight = false;
            active--;
        };
        next();
    };
}

module.exports = { validateAnalysisInput, createAnalysisLimiter };
