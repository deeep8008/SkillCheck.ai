function securityHeaders(production) {
    return (_req, res, next) => {
        res.set({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
        });
        if (production) {
            res.set("Strict-Transport-Security", "max-age=31536000");
            res.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
        }
        next();
    };
}

function sameOrigin({ production, appOrigin }) {
    return (req, res, next) => {
        if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
        const origin = req.get("Origin");
        if (!origin) {
            // CLI clients need not send Origin; cross-site browser writes are rejected.
            if (req.get("Sec-Fetch-Site") !== "cross-site") return next();
        } else {
            try {
                const url = new URL(origin);
                if (url.origin === origin && url.origin === appOrigin) return next();
                if (!production && !appOrigin && ["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.origin === origin) return next();
            } catch { /* Reject malformed/null origins without echoing them. */ }
        }
        return res.status(403).json({ code: "ORIGIN_NOT_ALLOWED", message: "This request did not come from the app's website. Refresh the app and try again." });
    };
}

module.exports = { securityHeaders, sameOrigin };
