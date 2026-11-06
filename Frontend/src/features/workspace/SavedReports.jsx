import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router";
import AnalysisReport from "./AnalysisReport";
import { DeltaModal } from "./DeltaModal";
import { getReport, listReports } from "./services/report.api";

const panel = "mt-6 border border-neutral-800 bg-neutral-900/60 p-6";
const linkStyle = "text-sm text-red-400 underline underline-offset-4";

function useSavedData(load, key) {
  const { onUnauthorized } = useOutletContext();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    load(key, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error.response?.status === 401) onUnauthorized();
      setResult({ key, error: error.response?.data?.message || "Could not connect. Please try again.", status: error.response?.status });
    });
    return () => controller.abort();
  }, [load, key, attempt, onUnauthorized]);
  return {
    ...(result?.key === key ? result : {}),
    retry() { setResult(null); setAttempt(value => value + 1); }
  };
}

function RequestState({ state }) {
  if (state.error) return <div className={panel}>
    <p role="alert" className="text-sm text-red-400">{state.status === 401 ? 'Sign in to view your saved reports.' : state.error}</p>
    {state.status === 401 ? <Link to="/login" className={`${linkStyle} mt-4 inline-block`}>Sign in →</Link> : state.status === 404 ? <Link to="/history" className={`${linkStyle} mt-4 inline-block`}>Back to history →</Link> : <button type="button" onClick={state.retry} className={`${linkStyle} mt-4`}>Try again</button>}
  </div>;
  return <p role="status" className="mt-6 text-sm text-neutral-400">Loading your saved reports…</p>;
}

export function History() {
  const [params, setParams] = useSearchParams();
  const page = params.get("page") || "1";
  const state = useSavedData(listReports, page);
  const [compareModal, setCompareModal] = useState(null);

  const reports = state.data?.reports || [];

  function openCompare(selectedReport) {
    if (reports.length < 2) return;
    const idx = reports.findIndex(r => r.id === selectedReport.id);
    // Find best match: same role, or adjacent chronologically
    const other = reports.find(r => r.id !== selectedReport.id && r.targetRole.toLowerCase() === selectedReport.targetRole.toLowerCase())
      || (idx < reports.length - 1 ? reports[idx + 1] : reports[0]);
    
    // Default: older is base, newer is target
    const isSelectedOlder = new Date(selectedReport.createdAt) < new Date(other.createdAt);
    setCompareModal({
      baseReport: isSelectedOlder ? selectedReport : other,
      targetReport: isSelectedOlder ? other : selectedReport
    });
  }

  return <>
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-red-400">Your progress / archive</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Your saved analyses<span className="text-red-500">.</span></h1>
      </div>
      {reports.length >= 2 && (
        <button
          type="button"
          onClick={() => {
            setCompareModal({
              baseReport: reports[1],
              targetReport: reports[0]
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-neutral-200 hover:border-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] transition-all cursor-pointer"
        >
          <span>🔁</span> Compare Versions (v1 vs v2)
        </button>
      )}
    </div>

    <p className="mt-4 text-sm leading-7 text-neutral-400">
      Reports are saved to your account after analysis. Open one to revisit the feedback or compare versions to track your score improvement without another AI request.
    </p>

    {!state.data ? <RequestState state={state} /> : <>
      {!reports.length ? (
        <div className={`${panel} py-12 text-center`}>
          <h2 className="text-xl font-medium">{state.data.page === 1 ? 'No saved reports yet.' : 'No reports on this page.'}</h2>
          <p className="mt-3 text-sm text-neutral-400">{state.data.page === 1 ? 'Analyse a resume in the workspace to create your first saved report.' : 'Use Previous to return to earlier pages.'}</p>
          <Link to="/" className={`${linkStyle} mt-5 inline-block`}>Go to workspace →</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {reports.map(item => (
            <article key={item.id} className={panel}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h2 className="break-words text-lg font-semibold">
                  <Link to={`/analysis/${item.id}`} className="hover:text-red-400">{item.targetRole}</Link>
                </h2>
                <time dateTime={item.createdAt} className="text-xs text-neutral-500">
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-400">{item.summary}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <span className="break-all font-mono text-[10px] text-neutral-500">{item.model}</span>
                <div className="flex items-center gap-3">
                  {reports.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => openCompare(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-neutral-300 hover:border-red-500 hover:text-white transition-all cursor-pointer"
                      title="Compare this report with another version"
                    >
                      <span>🔁</span> Compare
                    </button>
                  )}
                  <Link to={`/analysis/${item.id}`} className={linkStyle}>Open report →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {(state.data.page > 1 || state.data.hasMore) && (
        <nav aria-label="History pages" className="mt-6 flex items-center gap-6">
          <button type="button" disabled={state.data.page <= 1} onClick={() => setParams({ page: String(state.data.page - 1) })} className="text-sm text-red-400 disabled:text-neutral-600">← Previous</button>
          <span className="text-xs text-neutral-500">Page {state.data.page}</span>
          <button type="button" disabled={!state.data.hasMore} onClick={() => setParams({ page: String(state.data.page + 1) })} className="text-sm text-red-400 disabled:text-neutral-600">Next →</button>
        </nav>
      )}
    </>}

    {compareModal && (
      <DeltaModal
        baseReport={compareModal.baseReport}
        targetReport={compareModal.targetReport}
        availableReports={reports}
        onClose={() => setCompareModal(null)}
      />
    )}
  </>;
}

export function SavedReport() {
  const { id } = useParams();
  const state = useSavedData(getReport, id);
  const [recentReports, setRecentReports] = useState([]);
  const [compareModal, setCompareModal] = useState(null);

  // Pre-fetch recent reports for comparison dropdown
  useEffect(() => {
    let active = true;
    listReports(1)
      .then(res => {
        if (active && res?.reports) {
          setRecentReports(res.reports);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const otherReports = recentReports.filter(r => r.id !== id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <Link to="/history" className={linkStyle}>← Back to history</Link>
        {otherReports.length > 0 && state.data && (
          <button
            type="button"
            onClick={() => {
              const match = otherReports.find(r => r.targetRole.toLowerCase() === state.data.targetRole.toLowerCase()) || otherReports[0];
              const isCurrentOlder = new Date(state.data.createdAt) < new Date(match.createdAt);
              setCompareModal({
                baseReport: isCurrentOlder ? state.data : match,
                targetReport: isCurrentOlder ? match : state.data
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 px-3 py-1 text-xs font-mono uppercase tracking-wider text-neutral-300 hover:border-red-500 hover:text-white transition-all cursor-pointer"
          >
            <span>🔁</span> Compare with previous version
          </button>
        )}
      </div>

      {state.data ? <AnalysisReport analysis={state.data} /> : <RequestState state={state} />}

      {compareModal && (
        <DeltaModal
          baseReport={compareModal.baseReport}
          targetReport={compareModal.targetReport}
          availableReports={recentReports}
          onClose={() => setCompareModal(null)}
        />
      )}
    </>
  );
}
