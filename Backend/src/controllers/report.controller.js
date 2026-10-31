const Report = require("../models/report.model");

async function listReports(req, res) {
    const rawPage = req.query.page ?? "1";
    if (typeof rawPage !== "string" || !/^[1-9]\d{0,3}$/.test(rawPage)) {
        return res.status(400).json({ message: "Page must be a whole number between 1 and 9999." });
    }
    const page = Number(rawPage);
    try {
        const rows = await Report.find({ owner: req.user.id })
            .select("targetRole model createdAt report.summary")
            .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
        res.json({
            reports: rows.slice(0, 20).map(row => ({
                id: String(row._id), targetRole: row.targetRole, model: row.model,
                createdAt: row.createdAt, summary: row.report.summary
            })),
            page,
            hasMore: rows.length > 20
        });
    } catch {
        res.status(503).json({ message: "Could not load your history. Please try again." });
    }
}

async function getReport(req, res) {
    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
        return res.status(404).json({ message: "Report not found." });
    }
    try {
        // Ownership belongs in the query, not in a check made after fetching by ID.
        const saved = await Report.findOne({ _id: req.params.id, owner: req.user.id }).lean();
        if (!saved) return res.status(404).json({ message: "Report not found." });
        res.json({
            id: String(saved._id), targetRole: saved.targetRole, model: saved.model,
            createdAt: saved.createdAt, report: saved.report,
            resumeText: saved.resumeText, jobDescription: saved.jobDescription, saved: true
        });
    } catch {
        res.status(503).json({ message: "Could not load this report. Please try again." });
    }
}

module.exports = { listReports, getReport };
