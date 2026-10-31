const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const Report = require("../src/models/report.model");
const User = require("../src/models/user.model");
const Blacklist = require("../src/models/blacklist.model");
const { input, report, completion } = require("../test-support/analysis");

const realFetch = global.fetch;
const originalSecret = process.env.JWT_SECRET;
let server, base;
const owner = new mongoose.Types.ObjectId().toString();
const otherOwner = new mongoose.Types.ObjectId().toString();
function cookie(id = owner) { return `token=${jwt.sign({ id }, process.env.JWT_SECRET)}`; }
function get(path, token = cookie()) { return realFetch(`${base}${path}`, { headers: token ? { Cookie: token } : {} }); }

before(async () => {
    process.env.JWT_SECRET = "test-only-reports-secret";
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await new Promise(resolve => server.close(resolve));
});

async function withMocks(task) {
    const original = { lookup: Blacklist.findOne, find: Report.find, findOne: Report.findOne };
    Blacklist.findOne = async () => null;
    try { await task(); } finally {
        Blacklist.findOne = original.lookup;
        Report.find = original.find;
        Report.findOne = original.findOne;
    }
}

test("report routes require authentication and return no-store", async () => {
    for (const path of ["/reports", "/reports/507f1f77bcf86cd799439011"]) {
        const response = await get(path, null);
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("cache-control"), "no-store");
    }
});

test("history selects only the logged-in owner's summaries with bounded pagination", async () => {
    await withMocks(async () => {
        let skip, limit, sort, selection;
        Report.find = filter => {
            assert.deepEqual(filter, { owner });
            const query = {
                select(value) { selection = value; return query; },
                sort(value) { sort = value; return query; },
                skip(value) { skip = value; return query; },
                limit(value) { limit = value; return query; },
                async lean() {
                    return Array.from({ length: 21 }, () => ({ _id: new mongoose.Types.ObjectId(), targetRole: input.targetRole, model: "test-model", createdAt: new Date(), report: { summary: report.summary }, resumeText: "private-source", owner }));
                }
            };
            return query;
        };
        const response = await get(`/reports?page=2&owner=${otherOwner}`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        const body = await response.json();
        assert.equal(body.reports.length, 20);
        assert.equal(body.page, 2);
        assert.equal(body.hasMore, true);
        assert.equal(skip, 20); assert.equal(limit, 21);
        assert.deepEqual(sort, { createdAt: -1, _id: -1 });
        assert.equal(selection, "targetRole model createdAt report.summary");
        assert.equal(body.reports[0].resumeText, undefined);
        assert.equal(body.reports[0].owner, undefined);
    });
});

test("detail queries include ownership; invalid, absent, and another user's IDs return 404", async () => {
    await withMocks(async () => {
        const id = new mongoose.Types.ObjectId().toString();
        Report.findOne = filter => {
            assert.equal(filter._id, id);
            return { async lean() {
                return filter.owner === owner ? { _id: id, owner, report, ...input, model: "test-model", createdAt: new Date() } : null;
            } };
        };
        const response = await get(`/reports/${id}`);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(body.report, report);
        assert.equal(body.resumeText, input.resumeText);
        assert.equal(body.owner, undefined);
        assert.equal(body.saved, true);
        assert.equal((await get(`/reports/${id}`, cookie(otherOwner))).status, 404);
        Report.findOne = () => ({ lean: async () => null });
        assert.equal((await get(`/reports/${id}`)).status, 404);
        Report.findOne = () => { assert.fail("Invalid IDs must not query MongoDB"); };
        assert.equal((await get("/reports/invalid-id")).status, 404);
    });
});

test("invalid history pages and database failures return readable errors", async () => {
    await withMocks(async () => {
        Report.find = () => { throw new Error("private connection string"); };
        for (const page of ["0", "-1", "1.5", "10000", "hello", "1&page=2"]) {
            assert.equal((await get(`/reports?page=${page}`)).status, 400);
        }
        const failed = await get("/reports");
        assert.equal(failed.status, 503);
        assert.doesNotMatch(JSON.stringify(await failed.json()), /private connection string/);
        Report.findOne = () => { throw new Error("private connection string"); };
        assert.equal((await get("/reports/507f1f77bcf86cd799439011")).status, 503);
    });
});

test("report model rejects malformed output and unsupported evidence before storage", async () => {
    const valid = { owner, ...input, model: "test-model", report };
    await new Report(valid).validate();
    const invalid = structuredClone(report);
    invalid.strengths[0].evidence = "An invented claim";
    await assert.rejects(new Report({ ...valid, report: invalid }).validate());
    await assert.rejects(new Report({ ...valid, owner: undefined }).validate());
});

test("live MongoDB: save through analysis, reload from storage, paginate, isolate two accounts", {
    skip: process.env.RUN_LIVE_DB_TESTS !== "1", timeout: 45000
}, async () => {
    require("dotenv").config({ quiet: true });
    const originalKey = process.env.OPENROUTER_API_KEY;
    const originalModel = process.env.OPENROUTER_MODEL;
    const run = `day3_${Date.now()}_${process.pid}`;
    const ids = [owner, otherOwner];
    try {
        process.env.OPENROUTER_API_KEY = "fake-live-db-test-key";
        process.env.OPENROUTER_MODEL = "test-model";
        global.fetch = async url => {
            assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
            return Response.json(completion());
        };
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        await Promise.all([User.init(), Report.init(), Blacklist.init()]);
        const password = await bcrypt.hash("Synthetic-test-pass-123", 10);
        await User.create(ids.map((id, index) => ({ _id: id, username: `${run}_${index}`, email: `${run}_${index}@example.invalid`, password })));
        const generated = await realFetch(`${base}/resumes/analyze`, {
            method: "POST", headers: { Cookie: cookie(), "Content-Type": "application/json" }, body: JSON.stringify(input)
        });
        assert.equal(generated.status, 200);
        const saved = await generated.json();
        assert.equal(saved.saved, true);
        assert.match(saved.id, /^[a-f0-9]{24}$/);
        const stored = await Report.findById(saved.id).lean();
        assert.equal(String(stored.owner), owner);
        assert.deepEqual(stored.report, report);
        assert.equal(stored.resumeText, input.resumeText);
        assert.equal(stored.jobDescription, input.jobDescription);
        // Read after reconnecting so success cannot depend on a process-local object.
        await mongoose.disconnect();
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        const reopened = await get(`/reports/${saved.id}`);
        assert.equal(reopened.status, 200);
        assert.deepEqual((await reopened.json()).report, report);
        assert.equal((await get(`/reports/${saved.id}`, cookie(otherOwner))).status, 404);
        const empty = await (await get("/reports", cookie(otherOwner))).json();
        assert.deepEqual(empty.reports, []);
        await Report.create(Array.from({ length: 20 }, (_, index) => ({ owner, ...input, targetRole: `Pagination test ${index}`, report, model: "test-model" })));
        const first = await (await get("/reports")).json();
        const second = await (await get("/reports?page=2")).json();
        assert.equal(first.reports.length, 20); assert.equal(first.hasMore, true);
        assert.equal(second.reports.length, 1); assert.equal(second.hasMore, false);
        assert.equal(new Set([...first.reports, ...second.reports].map(row => row.id)).size, 21);
        assert.equal(first.reports[0].resumeText, undefined);
    } finally {
        global.fetch = realFetch;
        if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
        else process.env.OPENROUTER_API_KEY = originalKey;
        if (originalModel === undefined) delete process.env.OPENROUTER_MODEL;
        else process.env.OPENROUTER_MODEL = originalModel;
        try {
            if (mongoose.connection.readyState === 1) {
                await Report.deleteMany({ owner: { $in: ids } });
                await User.deleteMany({ _id: { $in: ids }, username: { $regex: `^${run}_` } });
            }
        } finally { await mongoose.disconnect(); }
    }
});
