import { Link } from "react-router";
import { priorityEdits } from "./analysis.utils";

const panel = "break-words border border-neutral-800 bg-neutral-900/60 p-5 sm:p-8";

export default function AnalysisReport({ analysis }) {
  const { report, model, targetRole } = analysis;
  const edits = priorityEdits(report);
  const sourceLabels = { job_requirement: 'Job description', role_expectation: 'General role suggestion', resume_clarity: 'Resume clarity' };
  function downloadReport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skillcheck-report.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-label="Your AI resume report" className="mt-8 space-y-5">
    <div className={panel}>
      <p role="status" className="text-sm text-green-400">Analysis complete · {analysis.saved ? 'Saved to your history' : 'Save not confirmed'}</p>
      <h2 className="mt-3 break-words font-['Orbitron',sans-serif] text-2xl font-bold">Your report: {targetRole}</h2>
      <p className="mt-3 text-xs leading-6 text-neutral-500">AI feedback for your review, not a hiring prediction. Quotes were checked against your submitted text; the interpretation can still be wrong.</p>
      {analysis.saved ? <div className="mt-3 flex flex-wrap gap-4 text-xs text-red-400"><Link to="/history" className="underline">View history</Link><Link to={`/analysis/${analysis.id}`} className="underline">Open saved report</Link><span className="text-neutral-500">{new Date(analysis.createdAt).toLocaleString()}</span></div> : <p role="alert" className="mt-4 text-sm text-amber-300">{analysis.saveError || 'Saving was not confirmed. Keep this page open and check history before generating again.'} Unsaved results disappear on refresh or navigation.</p>}
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-300">{report.summary}</p>
      <p className="mt-4 break-all font-mono text-[10px] text-neutral-500">Model: {model}</p>
      {!analysis.saved && <button type="button" onClick={downloadReport} className="mt-4 text-sm text-red-400 underline">Download a copy of this report</button>}
    </div>
    {edits.length > 0 && <section className={panel}><h3 className="font-['Orbitron',sans-serif] text-lg font-semibold">Start with these edits</h3><p className="mt-2 text-xs leading-6 text-neutral-500">Suggested order, based on relevance to the supplied role. Priorities are AI judgments, not hiring predictions.</p><ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-7 text-neutral-300">{edits.map((item, index) => <li key={index}><span className="mr-2 text-xs uppercase text-red-400">{item.priority}</span>{item.suggestion}</li>)}</ol></section>}
    {[["strengths", "Strengths"], ["gaps", "Gaps in the evidence"], ["screeningConcerns", "Potential screening concerns"]].map(([key, label]) => <section key={key} className={panel}>
      <h3 className="font-['Orbitron',sans-serif] text-lg font-semibold">{label}</h3>
      {!report[key].length && <p className="mt-4 text-sm text-neutral-400">No findings returned for this section.</p>}
      <div className="mt-5 space-y-5">{report[key].map((finding, index) => <article key={index} className="border-t border-neutral-800 pt-5">
        <h4 className="text-base font-semibold text-neutral-100">{finding.title}</h4>
        {finding.basis ? <p className="mt-2 flex flex-wrap gap-3 text-xs text-red-400"><span>{sourceLabels[finding.basis]}</span><span>{finding.priority} priority</span></p> : <p className="mt-2 text-xs text-neutral-500">Older report · Source and priority were not recorded.</p>}
        {finding.requirementEvidence && <div className="mt-4 border border-neutral-800 p-4"><p className="text-[10px] uppercase tracking-widest text-neutral-500">Job description excerpt</p><blockquote className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-400">“{finding.requirementEvidence}”</blockquote></div>}
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
