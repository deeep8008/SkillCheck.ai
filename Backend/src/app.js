const express = require("express");
const cookieParser = require("cookie-parser");
const { authRouter } = require("./routes/auth.routes");
const { resumeRouter } = require("./routes/resume.routes");
const { reportRouter } = require("./routes/report.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/auth", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

app.use("/auth", authRouter);
app.use("/resumes", resumeRouter);
app.use("/reports", reportRouter);

// Keep malformed JSON and unexpected errors readable by the frontend.
app.use((error, _req, res, _next) => {
    const status = error.status === 400 || error.status === 413 ? error.status : 500;
    res.status(status).json({ message: status === 400 ? "Invalid request body." : status === 413 ? "Request is too large." : "Internal server error" });
});

module.exports = app;
