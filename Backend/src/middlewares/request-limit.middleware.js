// Fixed-window limits for a single Node process. Never trust client headers as keys.
function createRequestLimit({ limit, windowMs, code, message, key = req => req.ip, now = Date.now, maxKeys = 5000 }) {
    const entries = new Map();
    return (req, res, next) => {
        const time = now();
        for (const [id, entry] of entries) if (entry.expiresAt <= time) entries.delete(id);
        const id = String(key(req));
        let entry = entries.get(id);
        if (!entry) {
            if (entries.size >= maxKeys) {
                res.set("Retry-After", "60");
                return res.status(503).json({ code: "REQUEST_LIMIT_BUSY", message: "Server is busy. Please try again shortly." });
            }
            entry = { count: 0, expiresAt: time + windowMs };
            entries.set(id, entry);
        }
        if (entry.count >= limit) {
            res.set("Retry-After", String(Math.max(1, Math.ceil((entry.expiresAt - time) / 1000))));
            return res.status(429).json({ code, message });
        }
        entry.count++;
        next();
    };
}

module.exports = { createRequestLimit };
