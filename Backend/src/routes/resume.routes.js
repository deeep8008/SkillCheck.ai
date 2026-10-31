const { Router } = require("express");
const { authUser } = require("../middlewares/auth.middlewares");
const { uploadResume } = require("../middlewares/resume.middleware");
const { extractResume } = require("../controllers/resume.controller");
const { analyse, requireAnalysisConfig } = require("../controllers/analysis.controller");
const { validateAnalysisInput, createAnalysisLimiter } = require("../middlewares/analysis.middleware");

const resumeRouter = Router();
// Authenticate before accepting the upload into memory.
resumeRouter.post("/", authUser, uploadResume, extractResume);
resumeRouter.post("/analyze", authUser, (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
}, validateAnalysisInput, requireAnalysisConfig, createAnalysisLimiter(), analyse);

module.exports = { resumeRouter };
