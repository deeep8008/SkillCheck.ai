const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("node:path");
const mongoose = require("mongoose");
const { authRouter } = require("./routes/auth.routes");
const { resumeRouter } = require("./routes/resume.routes");
const { reportRouter } = require("./routes/report.routes");
const { createRequestLimit } = require("./middlewares/request-limit.middleware");
const { securityHeaders, sameOrigin } = require("./middlewares/security.middleware");

function createApp({
    production = process.env.NODE_ENV === "production",
    appOrigin = process.env.APP_ORIGIN || "",
    trustProxy = Number(process.env.TRUST_PROXY || 0),
    serveFrontend = production || process.env.SERVE_FRONTEND === "true",
    frontendDir = path.resolve(__dirname, "../../Frontend/dist")
} = {}) {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", trustProxy);
    app.use(securityHeaders(production));
    app.get("/health", (_req, res) => {
        res.set("Cache-Control", "no-store");
        const ready = mongoose.connection.readyState === 1 && !app.locals.shuttingDown;
        res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
    });

    app.use(["/auth", "/resumes", "/reports"], (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
    app.use(["/auth", "/resumes", "/reports"], sameOrigin({ production, appOrigin }));
    app.use(["/auth", "/resumes", "/reports"], createRequestLimit({ limit: 120, windowMs: 60000, code: "API_LIMIT", message: "Too many requests. Please wait a minute and try again." }));
    app.post("/auth/login", createRequestLimit({ limit: 15, windowMs: 900000, code: "LOGIN_LIMIT", message: "Too many login attempts. Wait up to 15 minutes before trying again." }));
    app.post("/auth/register", createRequestLimit({ limit: 10, windowMs: 900000, code: "REGISTER_LIMIT", message: "Too many registration attempts. Wait up to 15 minutes before trying again." }));
    app.use(express.json({ limit: "128kb" }));
    app.use(cookieParser());
    app.use("/auth", authRouter);
    app.use("/resumes", resumeRouter);
    app.use("/reports", reportRouter);
    app.use(["/auth", "/resumes", "/reports", "/health"], (_req, res) => res.status(404).json({ message: "Endpoint not found." }));

    if (serveFrontend) {
        app.use(express.static(frontendDir, { index: false, dotfiles: "deny" }));
        // React owns these browser routes. Missing assets still get a real 404.
        app.get(["/", "/login", "/register", "/history", "/analysis/:id"], (_req, res) => {
            res.set("Cache-Control", "no-store");
            res.sendFile(path.join(frontendDir, "index.html"));
        });
        app.get("/{*page}", (req, res, next) => {
            const segments = req.params.page || [];
            if (segments.some(part => part.startsWith(".")) || segments[0] === "assets" || path.extname(segments.at(-1) || "") || !req.accepts("html")) return next();
            res.status(404).set("Cache-Control", "no-store").sendFile(path.join(frontendDir, "index.html"));
        });
    }
    app.use((_req, res) => res.status(404).json({ message: "Not found." }));
    app.use((error, _req, res, next) => {
        if (res.headersSent) return next(error);
        const status = [400, 403, 404, 413].includes(error.status) ? error.status : 500;
        res.status(status).json({ message: status === 400 ? "Invalid request body." : status === 413 ? "Request is too large." : status === 404 ? "Not found." : status === 403 ? "Request not allowed." : "Internal server error" });
    });
    return app;
}

module.exports = createApp();
module.exports.createApp = createApp;
