const { Router } = require("express");
const { authUser } = require("../middlewares/auth.middlewares");
const { uploadResume } = require("../middlewares/resume.middleware");
const { extractResume } = require("../controllers/resume.controller");

const resumeRouter = Router();
// Authenticate before accepting the upload into memory.
resumeRouter.post("/", authUser, uploadResume, extractResume);

module.exports = { resumeRouter };
