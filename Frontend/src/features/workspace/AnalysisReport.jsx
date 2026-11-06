import { useState, useEffect } from "react";
import { Link } from "react-router";
import { priorityEdits } from "./analysis.utils";

const sourceLabels = {
  job_requirement: 'Job requirement',
  role_expectation: 'General role expectation',
  resume_clarity: 'Resume clarity'
};
const requirementStatus = {
  supported: 'Supported',
  unclear: 'Unclear',
  no_evidence: 'No evidence found'
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
        copied
          ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
          : "border border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-red-500 hover:text-white"
      }`}
      title="Copy Google X-Y-Z bullet to clipboard"
    >
      {copied ? "✓ Copied" : "📋 Copy"}
    </button>
  );
}

function RequirementMap({ rows }) {
  return <section aria-label="Job requirement map" className="space-y-3">
    <h4 className="text-lg font-semibold">Job requirement map</h4>
    <p className="text-sm text-neutral-400">How your resume addresses selected qualifications from the posting.</p>
    {rows.map(row => <article key={row.jobQuote} className="space-y-3 break-words rounded-xl border border-neutral-800 p-3 text-sm leading-6">
      <p className={row.status === 'supported' ? 'text-emerald-300' : 'text-amber-300'}>
        {requirementStatus[row.status]}{row.preferred && ' · Preferred'}
      </p>
      <dl className="space-y-2">
        <div><dt className="font-semibold">What the job asks for</dt><dd className="text-neutral-300">“{row.jobQuote}”</dd></div>
        <div><dt className="font-semibold">What your resume says</dt><dd className="text-neutral-300">{row.resumeQuote ? `“${row.resumeQuote}”` : 'No relevant quote in the excerpts reviewed.'}</dd></div>
        <div><dt className="font-semibold">How it matches</dt><dd className="text-neutral-300">{row.explanation}</dd></div>
        <div><dt className="font-semibold">What to improve or keep</dt><dd className="text-neutral-300">{row.nextStep}</dd></div>
      </dl>
    </article>)}
  </section>;
}

function Branch({ label, description, count, empty, onExpand, children }) {
  return <details className="report-branch group min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/80 open:border-red-500/50">
    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-red-400 sm:p-6 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <h3 className="text-2xl font-semibold">{label}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onExpand?.();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950/80 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-neutral-300 hover:border-red-500 hover:text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all cursor-pointer"
          title={`Expand ${label} to full view`}
        >
          <span className="text-xs">⛶</span> Expand
        </button>
        <span aria-hidden="true" className="rounded-full border border-neutral-700 px-2.5 py-1 text-sm text-red-300">
          {count} <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span>
        </span>
      </div>
    </summary>
    <div className="report-branch-content space-y-5 border-t border-neutral-800 px-5 py-5 sm:px-6">
      {count ? children : <p className="text-sm text-neutral-400">{empty}</p>}
    </div>
  </details>;
}

function Finding({ finding }) {
  return <article className="space-y-2 border-b border-neutral-800 pb-4 last:border-0 last:pb-0">
    <h4 className="font-semibold text-neutral-100">{finding.title}</h4>
    {finding.basis && <p className="text-sm text-red-300">{sourceLabels[finding.basis]} · {finding.priority} priority</p>}
    <p className="text-sm leading-6 text-neutral-300">{finding.explanation}</p>
    {finding.evidence && <blockquote className="break-words border-l-2 border-red-500/50 pl-3 text-sm italic text-neutral-400">“{finding.evidence}”</blockquote>}
    {finding.requirementEvidence && <p className="break-words text-xs text-neutral-400">Job description · “{finding.requirementEvidence}”</p>}
    {finding.exampleRewrite && (
      <div className="mt-3 rounded-lg border border-red-500/30 bg-neutral-950/80 p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Google X-Y-Z Rewrite
          </span>
          <CopyButton text={finding.exampleRewrite} />
        </div>
        <p className="font-mono text-xs text-neutral-200 select-all leading-relaxed">
          "{finding.exampleRewrite}"
        </p>
      </div>
    )}
  </article>;
}

function AtsCoverage({ ats, onExpand }) {
  const { matched, missing, coverage } = ats;
  const color = coverage >= 70 ? 'text-emerald-400' : coverage >= 40 ? 'text-amber-400' : 'text-red-400';
  const borderColor = coverage >= 70 ? 'border-emerald-500/40' : coverage >= 40 ? 'border-amber-500/40' : 'border-red-500/40';
  return (
    <section aria-label="ATS keyword coverage" className={`mt-4 rounded-2xl border ${borderColor} bg-neutral-900/60 p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">ATS Keyword Coverage</h3>
          <p className="mt-1 text-sm text-neutral-400">How many keywords from the job description appear in your resume.</p>
        </div>
        <div className="flex items-center gap-3">
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950/80 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-neutral-300 hover:border-red-500 hover:text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all cursor-pointer"
              title="Expand ATS coverage to full view"
            >
              <span className="text-xs">⛶</span> Expand
            </button>
          )}
          <span className={`text-3xl font-black tabular-nums ${color}`}>{coverage}<span className="text-lg font-semibold">%</span></span>
        </div>
      </div>
      {matched.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">Matched · {matched.length}</p>
          <div className="flex flex-wrap gap-2">
            {matched.map(kw => <span key={kw} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">{kw}</span>)}
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">Missing · {missing.length}</p>
          <div className="flex flex-wrap gap-2">
            {missing.map(kw => <span key={kw} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">{kw}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}

function ExpandedModal({ initialTab = "strengths", onClose, report, weaknesses, requirementMap, edits, ats }) {
  const [activeTab, setActiveTab] = useState(initialTab);

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

  const tabs = [
    { id: "strengths", label: "Strengths", count: report.strengths.length },
    { id: "weaknesses", label: "Weaknesses", count: weaknesses.length + requirementMap.length },
    { id: "improvements", label: "Improvements", count: edits.length },
    ...(ats ? [{ id: "ats", label: "ATS Coverage", count: `${ats.coverage}%` }] : [])
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expanded card view"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-neutral-800 bg-neutral-950 shadow-[0_0_60px_-15px_rgba(239,68,68,0.3)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Glowing Accent Bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_2px_12px_rgba(220,38,38,0.8)]" />

        {/* HUD Corner Accents */}
        <div className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-red-500" />
        <div className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-red-500" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-red-500" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-red-500" />

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/90 p-5 sm:p-6 bg-neutral-900/60">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-mono text-[10px] tracking-widest text-red-400 uppercase bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded">
              FOCUS VIEW
            </span>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  }`}
                >
                  {tab.label} <span className="opacity-70 ml-1">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="group flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs font-mono tracking-wider text-neutral-300 hover:border-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all cursor-pointer"
          >
            <span>✕ CLOSE</span>
            <span className="text-[10px] text-neutral-500 group-hover:text-red-300">(ESC)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-neutral-200">
          {activeTab === "strengths" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Strengths</h3>
                <p className="mt-1 text-sm text-neutral-400">What your resume backs up well with verified evidence.</p>
              </div>
              {report.strengths.length === 0 ? (
                <p className="text-sm text-neutral-400">No clear strengths were identified.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {report.strengths.map((finding, idx) => (
                    <article key={idx} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
                      <h4 className="text-base font-semibold text-neutral-100">{finding.title}</h4>
                      {finding.basis && <p className="text-xs text-red-300">{sourceLabels[finding.basis]} · {finding.priority} priority</p>}
                      <p className="text-sm leading-6 text-neutral-300">{finding.explanation}</p>
                      {finding.evidence && (
                        <blockquote className="border-l-2 border-emerald-500/60 pl-3 text-sm italic text-neutral-300 bg-emerald-950/10 py-1.5 rounded-r">
                          “{finding.evidence}”
                        </blockquote>
                      )}
                      {finding.suggestion && (
                        <div className="mt-2 text-xs text-neutral-400 border-t border-neutral-800/60 pt-2">
                          <strong className="text-neutral-300">Suggestion:</strong> {finding.suggestion}
                        </div>
                      )}
                      {finding.exampleRewrite && (
                        <div className="mt-3 rounded-lg border border-red-500/30 bg-neutral-950 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              Google X-Y-Z Rewrite
                            </span>
                            <CopyButton text={finding.exampleRewrite} />
                          </div>
                          <p className="font-mono text-xs text-neutral-200 select-all leading-relaxed">
                            "{finding.exampleRewrite}"
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "weaknesses" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white">Weaknesses & Gaps</h3>
                <p className="mt-1 text-sm text-neutral-400">Comparing your resume against the target role requirements.</p>
              </div>

              {requirementMap.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-neutral-100 border-b border-neutral-800 pb-2">Job Requirement Map</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {requirementMap.map(row => (
                      <article key={row.jobQuote} className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-sm leading-6">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            row.status === "supported" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                          }`}>
                            {requirementStatus[row.status]}{row.preferred && ' · Preferred'}
                          </span>
                        </div>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Job Requirement</dt>
                            <dd className="text-neutral-200 mt-0.5">“{row.jobQuote}”</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Your Resume</dt>
                            <dd className="text-neutral-300 mt-0.5">{row.resumeQuote ? `“${row.resumeQuote}”` : <span className="italic text-neutral-500">No relevant quote in the reviewed excerpts.</span>}</dd>
                          </div>
                          <div className="border-t border-neutral-800/80 pt-2">
                            <dt className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Match Assessment</dt>
                            <dd className="text-neutral-300 mt-0.5">{row.explanation}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Action Step</dt>
                            <dd className="text-red-300 mt-0.5">{row.nextStep}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-neutral-100 border-b border-neutral-800 pb-2">Gaps & Screening Concerns</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {weaknesses.map((finding, idx) => (
                      <article key={idx} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
                        <h4 className="text-base font-semibold text-neutral-100">{finding.title}</h4>
                        {finding.basis && <p className="text-xs text-red-300">{sourceLabels[finding.basis]} · {finding.priority} priority</p>}
                        <p className="text-sm leading-6 text-neutral-300">{finding.explanation}</p>
                        {finding.evidence && (
                          <blockquote className="border-l-2 border-red-500/60 pl-3 text-sm italic text-neutral-400 bg-red-950/10 py-1.5 rounded-r">
                            “{finding.evidence}”
                          </blockquote>
                        )}
                        {finding.requirementEvidence && (
                          <p className="text-xs text-neutral-400">Job description · “{finding.requirementEvidence}”</p>
                        )}
                        {finding.suggestion && (
                          <div className="mt-2 text-xs text-neutral-400 border-t border-neutral-800/60 pt-2">
                            <strong className="text-neutral-300">Suggestion:</strong> {finding.suggestion}
                          </div>
                        )}
                        {finding.exampleRewrite && (
                          <div className="mt-3 rounded-lg border border-red-500/30 bg-neutral-950 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Google X-Y-Z Rewrite
                              </span>
                              <CopyButton text={finding.exampleRewrite} />
                            </div>
                            <p className="font-mono text-xs text-neutral-200 select-all leading-relaxed">
                              "{finding.exampleRewrite}"
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "improvements" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Recommended Edits</h3>
                <p className="mt-1 text-sm text-neutral-400">Specific, actionable changes to elevate your resume for this role.</p>
              </div>
              {edits.length === 0 ? (
                <p className="text-sm text-neutral-400">No specific edits were suggested.</p>
              ) : (
                <ol className="space-y-4">
                  {edits.map((item, idx) => (
                    <li key={item.suggestion} className="flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5 text-sm leading-6 text-neutral-200">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 font-mono text-xs font-bold text-red-400">
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm text-neutral-100">{item.suggestion}</p>
                        {item.title && <p className="text-xs text-neutral-500">Related to: {item.title}</p>}
                        {item.exampleRewrite && (
                          <div className="rounded-lg border border-red-500/30 bg-neutral-950 p-3 not-italic">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Google X-Y-Z Rewrite
                              </span>
                              <CopyButton text={item.exampleRewrite} />
                            </div>
                            <p className="font-mono text-xs text-neutral-200 select-all">
                              "{item.exampleRewrite}"
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {activeTab === "ats" && ats && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white">ATS Keyword Coverage · {ats.coverage}%</h3>
                <p className="mt-1 text-sm text-neutral-400">Full breakdown of technology keywords detected in the posting versus your resume.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/30 bg-neutral-900/50 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Matched Keywords</span>
                    <span className="font-mono text-xs text-emerald-300">{ats.matched.length} found</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {ats.matched.map(kw => (
                      <span key={kw} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 font-mono">
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-neutral-900/50 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-sm font-semibold uppercase tracking-wider text-red-400">Missing Keywords</span>
                    <span className="font-mono text-xs text-red-300">{ats.missing.length} missing</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {ats.missing.map(kw => (
                      <span key={kw} className="rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 font-mono">
                        ✕ {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalysisReport({ analysis, sample = false }) {
  const { report, model, targetRole } = analysis;
  const weaknesses = [...report.gaps, ...report.screeningConcerns];
  const requirementMap = report.requirementMap ?? [];
  const edits = [...new Map([...priorityEdits(report), ...weaknesses, ...report.strengths]
    .map(item => [item.suggestion.trim().toLowerCase(), item])).values()];

  const [expandedSection, setExpandedSection] = useState(null);

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skillcheck-report.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section aria-label="Resume analysis" className="mt-8">
    <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/25 bg-gradient-to-b from-red-950/40 to-neutral-950 px-6 py-8 text-center sm:py-12">
      <p className="break-words text-xs tracking-widest text-red-300 uppercase">{sample ? 'Fictional sample' : 'Resume analysis'} · {targetRole}</p>
      <h2 className="mt-3 break-words text-3xl font-bold sm:text-5xl">{report.headline || 'Your resume breakdown'}</h2>
      <p className="mx-auto mt-4 max-w-xl break-words text-sm leading-6 text-neutral-300">{report.summary}</p>
    </div>
    <svg aria-hidden="true" viewBox="0 0 300 48" preserveAspectRatio="none" className="hidden h-12 w-full text-red-500/50 md:block">
      <path d="M150 0V48 M150 8 C150 32 50 12 50 48 M150 8 C150 32 250 12 250 48" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
    <div aria-hidden="true" className="mx-auto h-6 w-px bg-red-500/50 md:hidden" />
    <div className="grid items-start gap-4 md:grid-cols-3">
      <Branch
        label="Strengths"
        description="What your resume backs up well."
        count={report.strengths.length}
        empty="No clear strengths were identified."
        onExpand={() => setExpandedSection("strengths")}
      >
        {report.strengths.map((finding, index) => <Finding key={index} finding={finding} />)}
      </Branch>
      <Branch
        label="Weaknesses"
        description={requirementMap.length ? 'Compare your resume with the job posting.' : 'Where your evidence could be clearer.'}
        count={weaknesses.length + requirementMap.length}
        empty="No specific gaps were identified."
        onExpand={() => setExpandedSection("weaknesses")}
      >
        {requirementMap.length > 0 && <RequirementMap rows={requirementMap} />}
        {requirementMap.length > 0 && weaknesses.length > 0 && <h4 className="border-t border-neutral-800 pt-4 text-lg font-semibold">Gaps and concerns</h4>}
        {weaknesses.map((finding, index) => <Finding key={index} finding={finding} />)}
      </Branch>
      <Branch
        label="Improvements"
        description="Specific edits you can make next."
        count={edits.length}
        empty="No specific edits were suggested."
        onExpand={() => setExpandedSection("improvements")}
      >
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-6 text-neutral-300">
          {edits.map(item => (
            <li key={item.suggestion} className="break-words space-y-2">
              <p>{item.suggestion}</p>
              {item.exampleRewrite && (
                <div className="rounded-lg border border-red-500/30 bg-neutral-950/80 p-3 not-italic">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Google X-Y-Z Rewrite
                    </span>
                    <CopyButton text={item.exampleRewrite} />
                  </div>
                  <p className="font-mono text-xs text-neutral-200 select-all leading-relaxed">
                    "{item.exampleRewrite}"
                  </p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </Branch>
    </div>

    {analysis.ats && (
      <AtsCoverage
        ats={analysis.ats}
        onExpand={() => setExpandedSection("ats")}
      />
    )}

    {expandedSection && (
      <ExpandedModal
        initialTab={expandedSection}
        onClose={() => setExpandedSection(null)}
        report={report}
        weaknesses={weaknesses}
        requirementMap={requirementMap}
        edits={edits}
        ats={analysis.ats}
      />
    )}

    {!sample && <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-400 border-t border-neutral-800/80 pt-4">
      {analysis.saved ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/history" className="text-red-300 underline">Saved to History</Link>
          <span className="text-neutral-600">·</span>
          <Link to="/history" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-mono text-neutral-300 hover:border-red-500 hover:text-white transition-all">
            <span>🔁</span> Compare with previous version in History →
          </Link>
        </div>
      ) : <>
        <p role="alert" className="text-amber-300">{analysis.saveError || 'Saving was not confirmed. Keep this page open and check history before generating again.'}</p>
        <button type="button" onClick={downloadReport} className="text-red-300 underline">Download report</button>
      </>}
    </div>}
    <details className="mt-5 border-t border-neutral-800 pt-4 text-sm text-neutral-400">
      <summary className="cursor-pointer">About this analysis</summary>
      <p className="mt-3">AI feedback can be wrong. Review suggestions before using them.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
      {model && <p className="mt-2 break-words">Model · {model}</p>}
      {analysis.resumeText && <>
        <h3 className="mt-4 font-semibold">Original resume text</h3>
        <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words">{analysis.resumeText}</pre>
        <h3 className="mt-4 font-semibold">Job description</h3>
        <p className="mt-2 whitespace-pre-wrap break-words">{analysis.jobDescription || 'None supplied.'}</p>
      </>}
    </details>
  </section>;
}
