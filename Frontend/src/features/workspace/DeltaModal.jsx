import { useState, useEffect } from "react";
import { computeReportDiff } from "./diff.utils";
import { getReport } from "./services/report.api";

export function DeltaModal({
  baseReport,
  targetReport,
  availableReports = [],
  onClose,
}) {
  const [v1Id, setV1Id] = useState(baseReport?.id || "");
  const [v2Id, setV2Id] = useState(targetReport?.id || "");
  const [v1Data, setV1Data] = useState(baseReport || null);
  const [v2Data, setV2Data] = useState(targetReport || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Load report data if user changes dropdown
  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!v1Id || !v2Id) return;
      if (v1Data?.id === v1Id && v2Data?.id === v2Id) return;

      setLoading(true);
      setError(null);
      try {
        const promises = [];
        if (v1Data?.id !== v1Id) {
          promises.push(getReport(v1Id).then(res => { if (active) setV1Data(res); }));
        }
        if (v2Data?.id !== v2Id) {
          promises.push(getReport(v2Id).then(res => { if (active) setV2Data(res); }));
        }
        await Promise.all(promises);
      } catch {
        if (active) setError("Could not load report details for comparison. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [v1Id, v2Id, v1Data, v2Data]);

  const diff = computeReportDiff(v1Data, v2Data);

  function handleSwap() {
    const tempId = v1Id;
    const tempData = v1Data;
    setV1Id(v2Id);
    setV1Data(v2Data);
    setV2Id(tempId);
    setV2Data(tempData);
  }

  const isSameReport = v1Id && v2Id && v1Id === v2Id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resume version comparison"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-900/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm">
              🔁
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Resume Version Delta Tracker
                <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  Zero AI Cost
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Track exact improvements and gaps closed between resume edits.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:border-red-500 hover:text-white transition-all cursor-pointer"
            title="Close (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Version Selectors Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 bg-neutral-900/30 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-neutral-400 uppercase tracking-wider">Base (v1):</span>
              {availableReports.length > 0 ? (
                <select
                  value={v1Id}
                  onChange={(e) => setV1Id(e.target.value)}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {availableReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.targetRole} · {new Date(r.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-neutral-200">{v1Data?.targetRole || "Base report"}</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSwap}
              className="rounded border border-neutral-700 bg-neutral-800/60 px-2 py-1 font-mono text-[11px] text-neutral-300 hover:border-red-500 hover:text-white transition-all cursor-pointer"
              title="Swap v1 and v2"
            >
              ⇄ Swap
            </button>

            <div className="flex items-center gap-2">
              <span className="font-mono text-neutral-400 uppercase tracking-wider">Target (v2):</span>
              {availableReports.length > 0 ? (
                <select
                  value={v2Id}
                  onChange={(e) => setV2Id(e.target.value)}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {availableReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.targetRole} · {new Date(r.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-neutral-200">{v2Data?.targetRole || "Target report"}</span>
              )}
            </div>
          </div>

          {/* Quick tab switcher */}
          <div className="flex items-center gap-1">
            {["overview", "gaps", "keywords", "strengths"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center">
              <p className="font-mono text-sm text-neutral-400 animate-pulse">Calculating version delta…</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {isSameReport && !loading && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-300">
              You have selected the same report for both v1 and v2. Pick two different reports to see what changed between versions.
            </div>
          )}

          {!loading && !error && diff && (
            <>
              {/* Scorecard Hero Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {/* ATS Coverage Delta */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    ATS Keyword Match
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">
                      {diff.ats ? `${diff.ats.v2Coverage}%` : "—"}
                    </span>
                    {diff.ats?.change !== null && (
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                          diff.ats.change > 0
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : diff.ats.change < 0
                            ? "bg-red-500/10 text-red-400 border border-red-500/30"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {diff.ats.change >= 0 ? `+${diff.ats.change}%` : `${diff.ats.change}%`}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    From {diff.ats?.v1Coverage ?? "—"}% in v1
                  </p>
                </div>

                {/* Gaps Closed */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    Gaps Closed
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-400">
                      {diff.closedRequirements.length + diff.resolvedGaps.length}
                    </span>
                    <span className="text-xs text-neutral-400">resolved</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {diff.v2TotalGaps} gaps remaining (was {diff.v1TotalGaps})
                  </p>
                </div>

                {/* Keywords Unlocked */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    Keywords Added
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">
                      +{diff.ats?.newMatched?.length || 0}
                    </span>
                    <span className="text-xs text-neutral-400">new hits</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {diff.ats?.totalMatchedV2 || 0} total matched keywords
                  </p>
                </div>

                {/* New Strengths */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    New Strengths
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-300">
                      +{diff.newStrengths.length}
                    </span>
                    <span className="text-xs text-neutral-400">detected</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Word count: {diff.v1Words} → {diff.v2Words} ({diff.wordDelta >= 0 ? `+${diff.wordDelta}` : diff.wordDelta})
                  </p>
                </div>
              </div>

              {/* Tab: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🚀</span>
                      <h4 className="font-semibold text-emerald-300 text-sm">
                        Version Progress Summary
                      </h4>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {diff.closedRequirements.length > 0 || diff.resolvedGaps.length > 0
                        ? `Great work! Your edits successfully closed ${
                            diff.closedRequirements.length + diff.resolvedGaps.length
                          } gap(s)${
                            diff.ats?.change > 0 ? ` and boosted ATS keyword coverage by +${diff.ats.change}%` : ""
                          }. Your resume is significantly tighter and more aligned with the target role.`
                        : diff.ats?.change > 0
                        ? `Your resume improved ATS keyword coverage by +${diff.ats.change}%, adding ${diff.ats.newMatched.length} newly matched technical keyword(s).`
                        : "No major gap differences detected between these two versions. Review the specific feedback suggestions in v2 to close remaining requirements."}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Gaps Closed Card */}
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="font-semibold text-sm text-emerald-400 flex items-center gap-1.5">
                          <span>🟢</span> Closed Gaps ({diff.closedRequirements.length + diff.resolvedGaps.length})
                        </span>
                      </div>
                      {diff.closedRequirements.length === 0 && diff.resolvedGaps.length === 0 ? (
                        <p className="text-xs text-neutral-500 italic">No closed gaps detected yet.</p>
                      ) : (
                        <ul className="space-y-2.5 text-xs">
                          {diff.closedRequirements.map((req, idx) => (
                            <li key={idx} className="space-y-1 rounded bg-neutral-900 p-2.5 border border-neutral-800">
                              <p className="font-semibold text-neutral-200">“{req.jobQuote}”</p>
                              <p className="text-emerald-400">
                                Now Supported: <span className="text-neutral-300 italic">“{req.resumeQuote}”</span>
                              </p>
                            </li>
                          ))}
                          {diff.resolvedGaps.map((gap, idx) => (
                            <li key={idx} className="rounded bg-neutral-900 p-2.5 border border-neutral-800">
                              <span className="font-medium text-neutral-200">✓ {gap.title}</span>
                              <p className="text-neutral-400 mt-0.5 text-[11px]">Was flagged in v1; resolved in v2.</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Unlocked Keywords */}
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="font-semibold text-sm text-emerald-400 flex items-center gap-1.5">
                          <span>🔑</span> Keywords Added ({diff.ats?.newMatched?.length || 0})
                        </span>
                      </div>
                      {!diff.ats?.newMatched?.length ? (
                        <p className="text-xs text-neutral-500 italic">No new keywords added.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {diff.ats.newMatched.map((kw) => (
                            <span
                              key={kw}
                              className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-300"
                            >
                              +{kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {diff.ats?.lostMatched?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-800">
                          <span className="font-semibold text-xs text-red-400 block mb-1">
                            ⚠️ Keywords Removed ({diff.ats.lostMatched.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {diff.ats.lostMatched.map((kw) => (
                              <span
                                key={kw}
                                className="rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-xs text-red-300"
                              >
                                -{kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Gaps */}
              {activeTab === "gaps" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Requirement Map & Gap Deltas</h3>
                    <p className="text-xs text-neutral-400">
                      Detailed comparison of job description expectations between v1 and v2.
                    </p>
                  </div>

                  {diff.closedRequirements.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                        🟢 Newly Evidenced Qualifications ({diff.closedRequirements.length})
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {diff.closedRequirements.map((req, idx) => (
                          <div key={idx} className="rounded-xl border border-emerald-500/30 bg-neutral-900/60 p-4 space-y-2 text-xs">
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                              Closed Gap
                            </span>
                            <p className="font-semibold text-neutral-100">Job asks: “{req.jobQuote}”</p>
                            <p className="text-neutral-300">
                              <span className="text-emerald-400 font-semibold">Your v2 proof: </span>
                              “{req.resumeQuote}”
                            </p>
                            <p className="text-neutral-400 text-[11px] border-t border-neutral-800 pt-1.5">
                              {req.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diff.regressedRequirements.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-semibold">
                        ⚠️ Evidence Removed in v2 ({diff.regressedRequirements.length})
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {diff.regressedRequirements.map((req, idx) => (
                          <div key={idx} className="rounded-xl border border-red-500/30 bg-neutral-900/60 p-4 space-y-2 text-xs">
                            <span className="rounded bg-red-500/20 px-2 py-0.5 font-mono text-[10px] text-red-300 font-bold uppercase tracking-wider">
                              Attention
                            </span>
                            <p className="font-semibold text-neutral-100">“{req.jobQuote}”</p>
                            <p className="text-neutral-400 text-[11px]">
                              Was supported in v1, but is now unevidenced in v2. Consider restoring the relevant bullet point.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diff.closedRequirements.length === 0 && diff.regressedRequirements.length === 0 && (
                    <p className="text-sm text-neutral-400 py-6 text-center">
                      Job requirement mapping is identical between these two versions.
                    </p>
                  )}
                </div>
              )}

              {/* Tab: Keywords */}
              {activeTab === "keywords" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-white">ATS Keyword Diff Breakdown</h3>
                    <p className="text-xs text-neutral-400">
                      Comparing recognized industry terms in your resume across both versions.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-500/30 bg-neutral-900/50 p-4 space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                        ✓ Newly Matched in v2 ({diff.ats?.newMatched?.length || 0})
                      </h4>
                      {!diff.ats?.newMatched?.length ? (
                        <p className="text-xs text-neutral-500">No new keywords added.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {diff.ats.newMatched.map((kw) => (
                            <span
                              key={kw}
                              className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-300"
                            >
                              +{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-red-500/30 bg-neutral-900/50 p-4 space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-semibold">
                        ✕ Removed from v1 ({diff.ats?.lostMatched?.length || 0})
                      </h4>
                      {!diff.ats?.lostMatched?.length ? (
                        <p className="text-xs text-neutral-500">No keywords were removed.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {diff.ats.lostMatched.map((kw) => (
                            <span
                              key={kw}
                              className="rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 font-mono text-xs text-red-300"
                            >
                              -{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Strengths */}
              {activeTab === "strengths" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Strength Progression</h3>
                    <p className="text-xs text-neutral-400">
                      New positive signals detected by the AI in version 2.
                    </p>
                  </div>

                  {diff.newStrengths.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {diff.newStrengths.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2 text-xs">
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                            New Strength
                          </span>
                          <h4 className="font-semibold text-neutral-100 text-sm">{item.title}</h4>
                          <p className="text-neutral-300 leading-relaxed">{item.explanation}</p>
                          {item.evidence && (
                            <blockquote className="border-l-2 border-emerald-500/60 pl-2.5 italic text-neutral-400 text-[11px]">
                              “{item.evidence}”
                            </blockquote>
                          )}
                          {item.exampleRewrite && (
                            <div className="mt-2 rounded border border-red-500/30 bg-neutral-950 p-2 font-mono text-[11px] text-neutral-200">
                              "{item.exampleRewrite}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 py-6 text-center">
                      Existing core strengths were maintained without new category shifts.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900/50 px-5 py-3 sm:px-6 text-xs text-neutral-400">
          <span>Tip: Press <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5 font-mono text-[10px]">ESC</kbd> to return</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 hover:border-red-500 hover:text-white transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
