const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const blacklist = require("../src/models/blacklist.model");
const Report = require("../src/models/report.model");
const app = require("../src/app");
const { analyseResume } = require("../src/services/analysis.service");
const { validateReport } = require("../src/services/analysis.schema");
const { createAnalysisLimiter } = require("../src/middlewares/analysis.middleware");
const { input, report, completion } = require("../test-support/analysis");

const realFetch = global.fetch;
const originalLookup = blacklist.findOne;
const originalCreate = Report.create;
let lastSaved;
const originalEnv = { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, OPENROUTER_MODEL: process.env.OPENROUTER_MODEL, JWT_SECRET: process.env.JWT_SECRET };
let server, base, userNumber = 0;
before(async () => {
    process.env.OPENROUTER_API_KEY = "fake-test-key-never-sent";
    process.env.OPENROUTER_MODEL = "google/gemini-2.5-flash-lite";
    process.env.JWT_SECRET = "test-only-analysis-secret";
    blacklist.findOne = async () => null;
    Report.create = async fields => {
        lastSaved = fields;
        return { _id: "507f1f77bcf86cd799439011", createdAt: new Date("2026-10-31T12:00:00Z") };
    };
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    global.fetch = realFetch;
    blacklist.findOne = originalLookup;
    Report.create = originalCreate;
    for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    await new Promise(resolve => server.close(resolve));
});
function cookie() { return `token=${jwt.sign({ id: `analysis-user-${++userNumber}` }, process.env.JWT_SECRET)}`; }
function request(body, token = cookie()) {
    return realFetch(`${base}/resumes/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Cookie: token } : {}) },
        body: JSON.stringify(body)
    });
}
async function withProvider(handler, task) {
    global.fetch = async (url, options) => {
        assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
        return handler(options);
    };
    try { await task(); } finally { global.fetch = realFetch; }
}

test("requires login and validates analysis input without calling OpenRouter", async () => {
    await withProvider(() => { assert.fail("Invalid requests must not reach OpenRouter"); }, async () => {
        assert.equal((await request(input, null)).status, 401);
        for (const body of [{}, { ...input, targetRole: " " }, { ...input, resumeText: "short" },
            { ...input, resumeText: "x".repeat(20001) }, { ...input, targetRole: "x".repeat(121) },
            { ...input, jobDescription: "x".repeat(5001) }, { ...input, jobDescription: {} },
            { ...input, model: "expensive-model" }, { ...input, resumeText: [input.resumeText] }]) {
            assert.equal((await request(body)).status, 400);
        }
        delete process.env.OPENROUTER_API_KEY;
        const missingKey = await request(input);
        assert.equal(missingKey.status, 503);
        assert.match((await missingKey.json()).message, /not configured/);
        process.env.OPENROUTER_API_KEY = "fake-test-key-never-sent";
    });
});

test("sends one bounded structured request and returns a locally validated report", async () => {
    let calls = 0;
    await withProvider(options => {
        calls++;
        const body = JSON.parse(options.body);
        assert.equal(options.headers.Authorization, "Bearer fake-test-key-never-sent");
        assert.equal(body.model, process.env.OPENROUTER_MODEL);
        assert.equal(body.max_tokens, 3000);
        assert.equal(body.response_format.type, "json_schema");
        assert.equal(body.response_format.json_schema.strict, true);
        assert.deepEqual(body.provider, { require_parameters: true, allow_fallbacks: false });
        assert.deepEqual(JSON.parse(body.messages[1].content), input);
        assert.match(body.messages[0].content, /untrusted data/);
        assert.match(body.messages[0].content, /Do not expand a Node.js job/);
        assert.match(body.messages[0].content, /preferred\/nice-to-have skill as mandatory/);
        return Response.json(completion());
    }, async () => {
        const token = cookie();
        const response = await request(input, token);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        const result = await response.json();
        assert.deepEqual(result.report, report);
        assert.equal(result.saved, true);
        assert.equal(result.id, "507f1f77bcf86cd799439011");
        assert.equal(lastSaved.owner, jwt.decode(token.slice(6)).id);
        assert.equal(lastSaved.resumeText, input.resumeText);
        assert.equal(lastSaved.jobDescription, input.jobDescription);
        assert.deepEqual(lastSaved.report, report);
        assert.equal(result.targetRole, input.targetRole);
        assert.equal(result.apiKey, undefined);
        const repeated = await request(input, token);
        assert.equal(repeated.status, 429);
        assert.ok(Number(repeated.headers.get("retry-after")) >= 30);
        assert.equal(calls, 1);
    });
});

test("supports an omitted job description without silently changing resume text", async () => {
    await withProvider(options => {
        const data = JSON.parse(JSON.parse(options.body).messages[1].content);
        assert.equal(data.jobDescription, "");
        assert.equal(data.resumeText, input.resumeText);
        const general = structuredClone(report);
        for (const section of ["strengths", "gaps"]) for (const finding of general[section]) {
            finding.basis = "role_expectation";
            finding.priority = "medium";
            finding.requirementEvidence = null;
        }
        return Response.json(completion(general));
    }, async () => {
        const response = await request({ resumeText: input.resumeText, targetRole: " Backend Engineer " });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).targetRole, "Backend Engineer");
    });
});

test("keeps the paid report visible when database saving fails, without another AI request", async () => {
    const create = Report.create;
    let calls = 0;
    try {
        Report.create = async () => { throw new Error("private database details"); };
        await withProvider(() => { calls++; return Response.json(completion()); }, async () => {
            const response = await request(input);
            assert.equal(response.status, 200);
            const body = await response.json();
            assert.equal(body.saved, false);
            assert.deepEqual(body.report, report);
            assert.match(body.saveError, /saving could not be confirmed/);
            assert.doesNotMatch(JSON.stringify(body), /private database details/);
            assert.equal(calls, 1);
        });
    } finally { Report.create = create; }
});

test("rejects malformed, incomplete, refused, and ungrounded model reports", async () => {
    const ungrounded = structuredClone(report);
    ungrounded.strengths[0].evidence = "Led a team of fifty engineers.";
    const extraField = { ...report, hiringProbability: 99 };
    const tooMany = { ...report, gaps: Array(4).fill(report.gaps[0]) };
    const responses = [
        { choices: [{ finish_reason: "stop", message: { content: "not JSON" } }] },
        completion(report, "length"), completion({ summary: "Missing fields" }), completion(ungrounded),
        completion(extraField), completion(tooMany), completion(null),
        { choices: [] }
    ];
    for (const payload of responses) {
        await withProvider(() => Response.json(payload), async () => {
            const response = await request(input);
            assert.equal(response.status, 502);
            assert.equal((await response.json()).report, undefined);
        });
    }
    assert.equal(validateReport(report, input.resumeText.replaceAll(" ", "\n"), input.jobDescription), true);
    assert.equal(validateReport({ ...report, strengths: [{ ...report.strengths[0], evidence: null }] }, input.resumeText, input.jobDescription), false);
});

test("quality boundaries: explicit requirements need JD quotes and general advice cannot masquerade as a requirement", () => {
    assert.equal(validateReport(report, input.resumeText, input.jobDescription), true);
    for (const change of [
        value => { value.gaps[0].requirementEvidence = "Must have Java and Python"; },
        value => { value.gaps[0].requirementEvidence = null; },
        value => { value.gaps[0].basis = "role_expectation"; value.gaps[0].priority = "medium"; value.gaps[0].requirementEvidence = null; },
        value => { value.gaps[0].priority = "critical"; },
        value => { value.gaps[0].basis = "invented_source"; }
    ]) {
        const value = structuredClone(report);
        change(value);
        assert.equal(validateReport(value, input.resumeText, input.jobDescription), false);
    }
    assert.equal(validateReport(report, input.resumeText, ""), false);
    const optional = structuredClone(report);
    optional.gaps[0].requirementEvidence = "Docker is preferred, not mandatory.";
    const withPreference = input.jobDescription + " Docker is preferred, not mandatory.";
    assert.equal(validateReport(optional, input.resumeText, withPreference), false);
    optional.gaps[0].priority = "low";
    assert.equal(validateReport(optional, input.resumeText, withPreference), true);
    const general = structuredClone(report);
    for (const section of ["strengths", "gaps"]) for (const finding of general[section]) {
        finding.basis = "role_expectation";
        finding.priority = "medium";
        finding.requirementEvidence = null;
    }
    assert.equal(validateReport(general, input.resumeText), true);
    general.gaps[0].priority = "high";
    assert.equal(validateReport(general, input.resumeText), false);
    const noFindings = { ...report, strengths: [], gaps: [] };
    assert.equal(validateReport(noFindings, "A document with no useful resume evidence."), true);
});

test("provider refusal is actionable, provider Retry-After is preserved, and failures are never stored", async () => {
    const create = Report.create;
    try {
        Report.create = () => { assert.fail("A failed analysis must not be stored"); };
        for (const payload of [
            { choices: [{ finish_reason: "stop", message: { content: "{}", refusal: "Private provider reason" } }] },
            { choices: [{ finish_reason: "content_filter", message: { content: null } }] }
        ]) {
            await withProvider(() => Response.json(payload), async () => {
                const response = await request(input);
                assert.equal(response.status, 422);
                const body = await response.json();
                assert.equal(body.code, "AI_REFUSED");
                assert.doesNotMatch(body.message, /Private provider reason/);
            });
        }
        await withProvider(() => Response.json({}, { status: 429, headers: { "Retry-After": "120" } }), async () => {
            const response = await request(input);
            assert.equal(response.status, 503);
            assert.equal(response.headers.get("retry-after"), "120");
            assert.equal((await response.json()).code, "AI_BUSY");
        });
        await withProvider(() => Response.json({}, { status: 402 }), async () => {
            const response = await request(input);
            assert.equal((await response.json()).code, "AI_CREDITS_EXHAUSTED");
            assert.equal(response.headers.get("retry-after"), null);
        });
    } finally { Report.create = create; }
});

test("maps provider errors and timeouts without leaking details or retrying", async () => {
    for (const [status, expected, text] of [[401, 503, /key/], [402, 503, /credits/], [403, 503, /permissions/],
        [429, 503, /busy/], [503, 503, /busy/], [400, 502, /configured model/], [504, 504, /timed out/]]) {
        let calls = 0;
        await withProvider(() => { calls++; return Response.json({ error: { message: "private-provider-detail" } }, { status }); }, async () => {
            const response = await request(input);
            assert.equal(response.status, expected);
            const body = await response.json();
            assert.match(body.message, text);
            assert.doesNotMatch(JSON.stringify(body), /private-provider-detail|fake-test-key/);
            assert.equal(calls, 1);
        });
    }
    await withProvider(() => Response.json({ error: { code: 402, message: "private-provider-detail" } }), async () => {
        assert.equal((await request(input)).status, 503);
    });
    for (const error of [Object.assign(new Error("private-network-detail"), { name: "TimeoutError" }), new TypeError("private-network-detail")]) {
        await withProvider(() => { throw error; }, async () => {
            await assert.rejects(analyseResume(input), err => err.status === (error.name === "TimeoutError" ? 504 : 502) && !err.message.includes("private-network-detail"));
        });
    }
});

test("cost guard enforces concurrency, spacing, hourly attempts, and expiry", () => {
    let time = 0;
    const limit = createAnalysisLimiter({ now: () => time });
    function attempt(id) {
        const result = { status: 200, next: false };
        const req = { user: { id } };
        const res = { set: () => {}, status(code) { result.status = code; return this; }, json() {} };
        limit(req, res, () => { result.next = true; });
        return { ...result, release: req.releaseAnalysis };
    }
    const first = attempt("one");
    assert.equal(first.next, true);
    assert.equal(attempt("one").status, 429);
    const second = attempt("two");
    assert.equal(attempt("three").status, 503);
    first.release(); second.release();
    assert.equal(attempt("one").status, 429);
    for (let i = 1; i < 5; i++) {
        time += 30000;
        const accepted = attempt("one");
        assert.equal(accepted.next, true);
        accepted.release();
    }
    time += 30000;
    assert.equal(attempt("one").status, 429);
    time = 3600001;
    const fresh = attempt("one");
    assert.equal(fresh.next, true);
    fresh.release();
});
