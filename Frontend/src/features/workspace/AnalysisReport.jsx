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

function Branch({ label, description, count, empty, children }) {
  return <details className="report-branch group min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/80 open:border-red-500/50">
    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-red-400 sm:p-6 [&::-webkit-details-marker]:hidden">
      <div>
        <h3 className="text-2xl font-semibold">{label}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
      </div>
      <span aria-hidden="true" className="shrink-0 rounded-full border border-neutral-700 px-2.5 py-1 text-sm text-red-300">{count} <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></span>
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
  </article>;
}

function AtsCoverage({ ats }) {
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
        <span className={`text-3xl font-black tabular-nums ${color}`}>{coverage}<span className="text-lg font-semibold">%</span></span>
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

export default function AnalysisReport({ analysis, sample = false }) {
  const { report, model, targetRole } = analysis;
  const weaknesses = [...report.gaps, ...report.screeningConcerns];
  const requirementMap = report.requirementMap ?? [];
  const edits = [...new Map([...priorityEdits(report), ...weaknesses, ...report.strengths]
    .map(item => [item.suggestion.trim().toLowerCase(), item])).values()];

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
      <Branch label="Strengths" description="What your resume backs up well." count={report.strengths.length} empty="No clear strengths were identified.">
        {report.strengths.map((finding, index) => <Finding key={index} finding={finding} />)}
      </Branch>
      <Branch label="Weaknesses" description={requirementMap.length ? 'Compare your resume with the job posting.' : 'Where your evidence could be clearer.'} count={weaknesses.length + requirementMap.length} empty="No specific gaps were identified.">
        {requirementMap.length > 0 && <RequirementMap rows={requirementMap} />}
        {requirementMap.length > 0 && weaknesses.length > 0 && <h4 className="border-t border-neutral-800 pt-4 text-lg font-semibold">Gaps and concerns</h4>}
        {weaknesses.map((finding, index) => <Finding key={index} finding={finding} />)}
      </Branch>
      <Branch label="Improvements" description="Specific edits you can make next." count={edits.length} empty="No specific edits were suggested.">
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-6 text-neutral-300">
          {edits.map(item => <li key={item.suggestion} className="break-words">{item.suggestion}</li>)}
        </ol>
      </Branch>
    </div>
    {analysis.ats && <AtsCoverage ats={analysis.ats} />}
    {!sample && <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm text-neutral-400">
      {analysis.saved ? <Link to="/history" className="text-red-300 underline">Saved to History</Link> : <>
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
