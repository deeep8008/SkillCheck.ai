import { Link } from "react-router";

const panel = "break-words border border-neutral-800 bg-neutral-900/60 p-5 sm:p-8";

export default function AnalysisReport({ analysis }) {
  const { report, model, targetRole } = analysis;
  return <section aria-label="Your AI resume report" className="mt-8 space-y-5">
    <div className={panel}>
      <p role="status" className="text-sm text-green-400">Analysis complete · {analysis.saved ? 'Saved to your history' : 'Save not confirmed'}</p>
      <h2 className="mt-3 break-words font-['Orbitron',sans-serif] text-2xl font-bold">Your report: {targetRole}</h2>
      <p className="mt-3 text-xs leading-6 text-neutral-500">AI feedback for your review, not a hiring prediction. Quotes were checked against your submitted text; the interpretation can still be wrong.</p>
      {analysis.saved ? <div className="mt-3 flex flex-wrap gap-4 text-xs text-red-400"><Link to="/history" className="underline">View history</Link><Link to={`/analysis/${analysis.id}`} className="underline">Open saved report</Link><span className="text-neutral-500">{new Date(analysis.createdAt).toLocaleString()}</span></div> : <p role="alert" className="mt-4 text-sm text-amber-300">{analysis.saveError || 'Saving was not confirmed. Keep this page open and check history before generating again.'} Unsaved results disappear on refresh or navigation.</p>}
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-300">{report.summary}</p>
      <p className="mt-4 break-all font-mono text-[10px] text-neutral-500">Model: {model}</p>
    </div>
    {[["strengths", "Strengths"], ["gaps", "Gaps in the evidence"], ["screeningConcerns", "Potential screening concerns"]].map(([key, label]) => <section key={key} className={panel}>
      <h3 className="font-['Orbitron',sans-serif] text-lg font-semibold">{label}</h3>
      {!report[key].length && <p className="mt-4 text-sm text-neutral-400">No findings returned for this section.</p>}
      <div className="mt-5 space-y-5">{report[key].map((finding, index) => <article key={index} className="border-t border-neutral-800 pt-5">
        <h4 className="text-base font-semibold text-neutral-100">{finding.title}</h4>
        {finding.evidence !== null ? <blockquote className="my-4 whitespace-pre-wrap border-l-2 border-red-500 bg-neutral-950 p-4 text-sm leading-6 text-neutral-400">“{finding.evidence}”</blockquote> : <p className="mt-3 text-xs text-neutral-500">No direct resume quote supplied for this finding.</p>}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-300">{finding.explanation}</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-red-400">Suggested improvement</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-400">{finding.suggestion}</p>
      </article>)}</div>
    </section>)}
    <section className={panel}>
      <h3 className="text-sm font-semibold">Limits of this analysis</h3>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-400">{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>
    {analysis.resumeText && <details className={panel}><summary className="cursor-pointer text-sm font-semibold">View the original analysis inputs</summary><h3 className="mt-5 text-sm font-medium">Resume text</h3><pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-6 text-neutral-400">{analysis.resumeText}</pre><h3 className="mt-5 text-sm font-medium">Job description</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-400">{analysis.jobDescription || 'No job description supplied. Role expectations were general assumptions.'}</p></details>}
  </section>;
}
