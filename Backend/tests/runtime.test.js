const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runtimeConfig } = require("../src/config/runtime");
const { createApp } = require("../src/app");
const { createRequestLimit } = require("../src/middlewares/request-limit.middleware");

async function withServer(app, task) {
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    try { await task(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise(resolve => server.close(resolve)); }
}

test("production config requires secrets, HTTPS origin, explicit proxy hops, and a frontend build", t => {
    const exists = t.mock.method(fs, "existsSync", () => true);
    const env = { NODE_ENV: "production", MONGO_URI: "mongodb://test-only", JWT_SECRET: "x".repeat(32), OPENROUTER_API_KEY: "fake-test-key", APP_ORIGIN: "https://skillcheck.example.com", TRUST_PROXY: "1", PORT: "8080" };
    const config = runtimeConfig(env);
    assert.equal(config.port, 8080);
    assert.equal(config.appOrigin, env.APP_ORIGIN);
    assert.equal(config.trustProxy, 1);
    assert.equal(config.serveFrontend, true);
    for (const changed of [{ JWT_SECRET: "short" }, { OPENROUTER_API_KEY: "" }, { APP_ORIGIN: "" },
        { APP_ORIGIN: "http://skillcheck.example.com" }, { APP_ORIGIN: "https://skillcheck.example.com/path" },
        { APP_ORIGIN: "https://user:pass@skillcheck.example.com" }, { TRUST_PROXY: "true" }, { TRUST_PROXY: "-1" },
        { PORT: "not-a-port" }, { PORT: "65536" }, { SERVE_FRONTEND: "yes" }]) {
        assert.throws(() => runtimeConfig({ ...env, ...changed }), error => error.code === "CONFIGURATION_ERROR");
    }
    exists.mock.mockImplementation(() => false);
    assert.throws(() => runtimeConfig(env), /Frontend build is missing/);
    const development = runtimeConfig({ MONGO_URI: "test-only", JWT_SECRET: "test-only" });
    assert.equal(development.trustProxy, 0);
    assert.equal(development.serveFrontend, false);
});

test("built React routes, static assets, API errors, and security headers stay separate", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skillcheck-runtime-"));
    fs.writeFileSync(path.join(directory, "index.html"), '<!doctype html><div id="root">test app</div>');
    fs.writeFileSync(path.join(directory, "app.js"), 'console.log("synthetic asset")');
    fs.writeFileSync(path.join(directory, ".env"), "TEST_ONLY_PRIVATE_VALUE=must-not-be-served");
    try {
        const app = createApp({ production: true, serveFrontend: true, frontendDir: directory, appOrigin: "https://skillcheck.example.com", trustProxy: 0 });
        await withServer(app, async base => {
            for (const route of ["/", "/login", "/register", "/history", "/analysis/sample", "/analysis/507f1f77bcf86cd799439011"]) {
                const response = await fetch(base + route);
                assert.equal(response.status, 200);
                assert.match(response.headers.get("content-type"), /text\/html/);
                assert.equal(response.headers.get("cache-control"), "no-store");
                assert.match(await response.text(), /test app/);
            }
            const asset = await fetch(base + "/app.js");
            assert.equal(asset.status, 200);
            assert.equal(asset.headers.get("x-powered-by"), null);
            assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
            assert.equal(asset.headers.get("x-frame-options"), "DENY");
            assert.match(asset.headers.get("content-security-policy"), /script-src 'self'/);
            assert.match(asset.headers.get("strict-transport-security"), /max-age=/);
            for (const route of ["/.env", "/%2eenv", "/.git/config", "/assets/missing", "/missing.js", "/auth/missing", "/health/missing"]) {
                const response = await fetch(base + route);
                assert.equal(response.status, 404);
                assert.doesNotMatch(await response.text(), /test app|must-not-be-served/);
            }
            const privateReport = await fetch(base + "/reports/507f1f77bcf86cd799439011");
            assert.equal(privateReport.status, 401);
            assert.match(privateReport.headers.get("content-type"), /application\/json/);
            const unknownPage = await fetch(base + "/unknown-page", { headers: { Accept: "text/html" } });
            assert.equal(unknownPage.status, 404);
            assert.match(await unknownPage.text(), /test app/);
            const health = await fetch(base + "/health");
            assert.equal(health.status, 503);
            assert.deepEqual(await health.json(), { status: "unavailable" });
        });
    } finally {
        // Remove only the three known files in the exact temporary directory created above.
        for (const filename of ["index.html", "app.js", ".env"]) fs.unlinkSync(path.join(directory, filename));
        fs.rmdirSync(directory);
    }
});

test("production browser writes require the configured origin; CLI and local dev remain usable", async () => {
    await withServer(createApp({ production: true, serveFrontend: false, appOrigin: "https://skillcheck.example.com", trustProxy: 0 }), async base => {
        async function attempt(headers) {
            return fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: "{}" });
        }
        for (const origin of ["https://evil.example.com", "null", "https://skillcheck.example.com.evil.test"]) {
            assert.equal((await attempt({ Origin: origin })).status, 403);
        }
        assert.equal((await attempt({ "Sec-Fetch-Site": "cross-site" })).status, 403);
        assert.equal((await attempt({ Origin: "https://skillcheck.example.com" })).status, 400);
        assert.equal((await attempt({})).status, 400);
    });
    await withServer(createApp({ production: false, serveFrontend: false, appOrigin: "", trustProxy: 0 }), async base => {
        const response = await fetch(base + "/auth/login", { method: "POST", headers: { Origin: "http://localhost:5173", "Content-Type": "application/json" }, body: "{}" });
        assert.equal(response.status, 400);
    });
});

test("login limits cannot be bypassed with spoofed forwarded IP headers by default", async () => {
    await withServer(createApp({ production: false, serveFrontend: false, appOrigin: "", trustProxy: 0 }), async base => {
        for (let index = 0; index < 15; index++) {
            const response = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `198.51.100.${index}` }, body: "{}" });
            assert.equal(response.status, 400);
        }
        const limited = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.1" }, body: "{}" });
        assert.equal(limited.status, 429);
        assert.equal((await limited.json()).code, "LOGIN_LIMIT");
        assert.ok(Number(limited.headers.get("retry-after")) > 0);
    });
});

test("request limiter expires windows, bounds memory, and isolates keys", () => {
    let time = 0;
    const limit = createRequestLimit({ limit: 2, windowMs: 10000, code: "TEST_LIMIT", message: "Wait", now: () => time, maxKeys: 2 });
    function attempt(ip) {
        const result = { status: 200 };
        const res = { set(_name, value) { result.wait = value; }, status(code) { result.status = code; return this; }, json() {} };
        limit({ ip }, res, () => {});
        return result;
    }
    assert.equal(attempt("one").status, 200);
    assert.equal(attempt("one").status, 200);
    assert.deepEqual(attempt("one"), { status: 429, wait: "10" });
    assert.equal(attempt("two").status, 200);
    assert.equal(attempt("three").status, 503);
    time = 10001;
    assert.equal(attempt("three").status, 200);
});

test("oversized JSON returns a bounded JSON error before authentication queries", async () => {
    await withServer(createApp({ production: false, serveFrontend: false, appOrigin: "", trustProxy: 0 }), async base => {
        const response = await fetch(base + "/resumes/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: "x".repeat(140000) }) });
        assert.equal(response.status, 413);
        assert.equal((await response.json()).message, "Request is too large.");
    });
});
