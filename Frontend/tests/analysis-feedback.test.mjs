import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisFailure, priorityEdits } from "../src/features/workspace/analysis.utils.js";

test("connection loss and browser timeouts direct users to history before another paid request", () => {
  for (const error of [{ code: "ERR_NETWORK" }, { code: "ECONNABORTED" }]) {
    const failure = analysisFailure(error);
    assert.equal(failure.checkHistory, true);
    assert.equal(failure.retryAfter, 30);
    assert.match(failure.message, /may already have been saved/);
  }
});

test("retry delays respect seconds and HTTP dates without inventing a delay for terminal errors", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  const error = header => ({ response: { status: 503, headers: { "retry-after": header }, data: { message: "Provider busy" } } });
  assert.equal(analysisFailure(error("120"), now).retryAfter, 120);
  assert.equal(analysisFailure(error("Sat, 31 Oct 2026 12:02:00 GMT"), now).retryAfter, 120);
  for (const invalid of ["-10", "invalid", "", "0"]) assert.equal(analysisFailure(error(invalid), now).retryAfter, 0);
  const credits = analysisFailure({ response: { status: 503, data: { code: "AI_CREDITS_EXHAUSTED", message: "Check credits" } } });
  assert.equal(credits.checkHistory, false);
  assert.equal(credits.retryAfter, 0);
  assert.equal(credits.message, "Check credits");
});

test("prioritised edits prefer high-priority gaps, deduplicate suggestions, and leave legacy reports unranked", () => {
  const report = {
    strengths: [{ priority: "low", suggestion: "Explain an endpoint" }],
    gaps: [{ priority: "medium", suggestion: "Describe testing" }, { priority: "high", suggestion: "Add the required API evidence" }],
    screeningConcerns: [{ priority: "medium", suggestion: "Describe testing" }, { priority: "low", suggestion: "Clarify dates" }]
  };
  assert.deepEqual(priorityEdits(report).map(item => item.suggestion), ["Add the required API evidence", "Describe testing", "Clarify dates"]);
  assert.equal(report.gaps[0].priority, "medium");
  assert.deepEqual(priorityEdits({ strengths: [], gaps: [{ suggestion: "Old advice" }], screeningConcerns: [] }), []);
});
