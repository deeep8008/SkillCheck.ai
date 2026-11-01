const path = require("node:path");
const fs = require("node:fs");

function configError(message) {
    return Object.assign(new Error(message), { code: "CONFIGURATION_ERROR" });
}

function runtimeConfig(env = process.env) {
    const production = env.NODE_ENV === "production";
    const port = String(env.PORT || "3000");
    const proxy = String(env.TRUST_PROXY || "0");
    if (!/^\d+$/.test(port) || Number(port) > 65535) throw configError("PORT must be a number between 0 and 65535.");
    if (!/^[0-5]$/.test(proxy)) throw configError("TRUST_PROXY must be a hop count between 0 and 5.");
    if (!env.MONGO_URI || !env.JWT_SECRET) throw configError("Set MONGO_URI and JWT_SECRET before starting the server.");
    if (production && env.JWT_SECRET.length < 32) throw configError("Production JWT_SECRET must have at least 32 characters.");
    if (production && !env.OPENROUTER_API_KEY?.trim()) throw configError("Set OPENROUTER_API_KEY before starting production.");
    let appOrigin = "";
    if (env.APP_ORIGIN) {
        try {
            const url = new URL(env.APP_ORIGIN);
            if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
            appOrigin = url.origin;
        } catch { throw configError("APP_ORIGIN must be a website origin without a path, credentials, or query."); }
    }
    if (production && !appOrigin.startsWith("https://")) throw configError("Production APP_ORIGIN must be your HTTPS website address.");
    if (env.SERVE_FRONTEND && !["true", "false"].includes(env.SERVE_FRONTEND)) throw configError("SERVE_FRONTEND must be true or false.");
    const serveFrontend = production || env.SERVE_FRONTEND === "true";
    const frontendDir = path.resolve(__dirname, "../../../Frontend/dist");
    if (serveFrontend && !fs.existsSync(path.join(frontendDir, "index.html"))) throw configError("Frontend build is missing. Run npm run build inside Frontend first.");
    return { production, port: Number(port), trustProxy: Number(proxy), appOrigin, serveFrontend, frontendDir };
}

module.exports = { runtimeConfig };
