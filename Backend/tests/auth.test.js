const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/user.model");
const Blacklist = require("../src/models/blacklist.model");
const { makePdf } = require("../test-support/pdf");

let server, base;
before(async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

function post(path, body, cookie) {
    return fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify(body)
    });
}

test("rejects invalid registration and login inputs before querying the database", async () => {
    for (const body of [null, {}, { username: {}, email: "a@b.com", password: "password123" },
        { username: "   ", email: "a@b.com", password: "password123" },
        { username: "valid", email: "broken", password: "password123" },
        { username: "valid", email: "a@b.com", password: "short" },
        { username: "valid", email: "a@b.com", password: "é".repeat(37) }]) {
        const response = await post("/auth/register", body);
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).message, "string");
        assert.equal(response.headers.get("set-cookie"), null);
    }
    for (const body of [null, {}, { identifier: { $ne: null }, password: "password123" }]) {
        assert.equal((await post("/auth/login", body)).status, 400);
    }
});

test("malformed JSON returns a readable error and signed-out sessions return 401", async () => {
    const malformed = await fetch(`${base}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{"
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).message, "Invalid request body.");
    assert.equal((await fetch(`${base}/auth/me`)).status, 401);
    assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: "token=invalid" } })).status, 401);
});

test("cookie settings protect the token and support HTTPS production", () => {
    const { authCookieOptions } = require("../src/config/auth-cookie");
    const original = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = "development";
        assert.deepEqual(authCookieOptions(), { httpOnly: true, sameSite: "lax", secure: false, path: "/" });
        process.env.NODE_ENV = "production";
        assert.equal(authCookieOptions().secure, true);
    } finally {
        if (original === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = original;
    }
});

test("database auth failures return 503 instead of pretending the user is signed out", async () => {
    const originalLookup = Blacklist.findOne;
    const originalSecret = process.env.JWT_SECRET;
    try {
        process.env.JWT_SECRET = "test-only-auth-unavailable";
        Blacklist.findOne = async () => { throw new Error("simulated database outage"); };
        const token = jwt.sign({ id: "test-user" }, process.env.JWT_SECRET);
        const response = await fetch(`${base}/auth/me`, { headers: { Cookie: `token=${token}` } });
        assert.equal(response.status, 503);
        assert.match((await response.json()).message, /temporarily unavailable/);
    } finally {
        Blacklist.findOne = originalLookup;
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    }
});

// Explicit opt-in: create uniquely named test records in the configured app DB.
test("live MongoDB: register, login, extract PDF, logout, reject replayed token", {
    skip: process.env.RUN_LIVE_DB_TESTS !== "1", timeout: 45000
}, async () => {
    require("dotenv").config({ quiet: true });
    const username = `day1_${Date.now()}_${process.pid}`;
    let createdUserId, loggedOutToken;
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        await Promise.all([User.init(), Blacklist.init()]);
        const details = { username, email: `${username}@example.invalid`, password: "Test-only-pass-123" };
        const registered = await post("/auth/register", details);
        assert.equal(registered.status, 201);
        const registeredUser = (await registered.json()).user;
        createdUserId = registeredUser._id;
        assert.equal(registeredUser.password, undefined);
        const setCookie = registered.headers.get("set-cookie");
        assert.match(setCookie, /HttpOnly/i);
        assert.match(setCookie, /SameSite=Lax/i);
        assert.match(setCookie, /Max-Age=86400/i);
        const registrationCookie = setCookie.split(";")[0];
        assert.equal(registered.headers.get("cache-control"), "no-store");
        assert.equal((await post("/auth/register", details)).status, 409);
        const stored = await User.findOne({ username: details.username }).select("+password");
        assert.notEqual(stored.password, details.password);
        assert.match(stored.password, /^\$2/);
        const session = await fetch(`${base}/auth/me`, { headers: { Cookie: registrationCookie } });
        assert.equal(session.status, 200);
        assert.equal((await session.json()).user.password, undefined);
        assert.equal((await post("/auth/login", { identifier: details.username, password: "wrong" })).status, 401);
        assert.equal((await post("/auth/login", { identifier: "missing", password: details.password })).status, 401);
        for (const identifier of [details.username, details.email.toUpperCase()]) {
            assert.equal((await post("/auth/login", { identifier, password: details.password })).status, 200);
        }
        const loggedIn = await post("/auth/login", { identifier: details.email, password: details.password });
        const cookie = loggedIn.headers.get("set-cookie").split(";")[0];
        loggedOutToken = cookie.slice("token=".length);
        const form = new FormData();
        form.append("resume", new Blob([makePdf("Synthetic developer resume with Node.js")], { type: "application/pdf" }), "test-resume.pdf");
        const upload = await fetch(`${base}/resumes`, { method: "POST", headers: { Cookie: cookie }, body: form });
        assert.equal(upload.status, 200);
        const extracted = await upload.json();
        assert.match(extracted.resume.text, /Synthetic developer resume/);
        assert.equal(extracted.saved, false);
        const expired = jwt.sign({ id: String(stored._id) }, process.env.JWT_SECRET, { expiresIn: -1 });
        assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: `token=${expired}` } })).status, 401);
        const signedOut = await post("/auth/logout", {}, cookie);
        assert.equal(signedOut.status, 200);
        assert.match(signedOut.headers.get("set-cookie"), /token=;/);
        assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: cookie } })).status, 401);
        assert.equal((await fetch(`${base}/resumes`, { method: "POST", headers: { Cookie: cookie } })).status, 401);
        // Signing in again must issue a different token, even within the same second.
        const relogin = await post("/auth/login", { identifier: details.username, password: details.password });
        assert.equal(relogin.status, 200);
        const freshCookie = relogin.headers.get("set-cookie").split(";")[0];
        assert.notEqual(freshCookie, cookie);
        assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: freshCookie } })).status, 200);
        assert.equal((await post("/auth/logout", {})).status, 200);
    } finally {
        // Delete only this run's own user and logout entry; preserve all app data.
        try {
            if (mongoose.connection.readyState === 1) {
                if (createdUserId) await User.deleteOne({ _id: createdUserId, username });
                if (loggedOutToken) await Blacklist.deleteMany({ token: loggedOutToken });
            }
        } finally {
            await mongoose.disconnect();
        }
    }
});
