const express = require("express");
const cookieParser = require("cookie-parser");
const { authRouter } = require("./routes/auth.routes");
const { resumeRouter } = require("./routes/resume.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/resumes", resumeRouter);

module.exports = app;
