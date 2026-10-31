const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("missing configuration stops startup before opening a port", () => {
    const result = spawnSync(process.execPath, ["server.js"], {
        cwd: path.join(__dirname, ".."),
        env: { ...process.env, MONGO_URI: "", JWT_SECRET: "" },
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Server could not start/);
    assert.doesNotMatch(result.stdout, /Server is running/);
});
