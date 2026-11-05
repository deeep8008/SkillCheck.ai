import { Component, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from "react-router";
import { extractResume, analyseResume } from "./services/resume.api";
import AnalysisReport from "./AnalysisReport";
import { analysisFailure } from "./analysis.utils";
import { getSession, logout } from "../auth/services/auth.api";

const panel = "border border-neutral-800 bg-neutral-900/60";
const heading = "font-display";
const field = "mt-3 w-full border border-neutral-700 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-red-500";
const primary = "inline-flex items-center justify-center gap-3 bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div role="alert" className="rounded-2xl border border-red-500/40 bg-red-950/20 p-8 text-center">
        <p className="text-sm font-semibold text-red-400">Something went wrong rendering this page.</p>
        <p className="mt-2 text-xs text-neutral-400">{this.state.error?.message || 'Unknown error'}</p>
        <button type="button" onClick={() => this.setState({ error: null })} className="mt-4 border border-neutral-700 px-4 py-2 text-xs hover:border-red-500">Try again</button>
      </div>
    );
    return this.props.children;
  }
}

export function Workspace() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const onUnauthorized = useCallback(() => setUser(null), []);

  useEffect(() => {
    const controller = new AbortController();
    getSession({ signal: controller.signal })
      .then(setUser)
      .catch(error => {
        if (!controller.signal.aborted && error.response?.status !== 401) {
          setSessionError('Could not check your session. Refresh to retry.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setCheckingSession(false); });
    return () => controller.abort();
  }, []);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSessionError('');
    try {
      await logout();
      setUser(null);
      navigate('/login');
    } catch {
      setSessionError('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }
  return <div className="min-h-screen bg-[#090909] text-neutral-100 selection:bg-red-600">
    <header className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-6 py-5 lg:px-10">
        <Link to="/" className={`${heading} text-xl font-black tracking-tight`}>SKILLCHECK<span className="text-red-500">.ai</span></Link>
        <nav aria-label="Main navigation" className="flex gap-6 text-sm">
          {[['/', 'Workspace'], ['/history', 'History']].map(([to, label]) => <NavLink key={to} to={to} end className={({isActive}) => isActive ? 'text-white underline decoration-red-500 decoration-2 underline-offset-8' : 'text-neutral-400 hover:text-white'}>{label}</NavLink>)}
        </nav>
        {checkingSession ? <span role="status" className="text-xs text-neutral-400">Checking session…</span> : user ? <div className="flex items-center gap-4 text-xs"><span>Signed in as {user.username}</span><button type="button" disabled={signingOut} onClick={signOut} className="border border-neutral-700 px-4 py-2 hover:border-red-500 disabled:opacity-60">{signingOut ? 'Signing out…' : 'Sign out'}</button></div> : <Link to="/login" className="border border-neutral-700 px-4 py-2 text-xs hover:border-red-500">SIGN IN ↗</Link>}
      </div>
    </header>
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-12">{sessionError && <p role="alert" className="mb-5 text-sm text-red-400">{sessionError}</p>}<ErrorBoundary><Outlet context={{ onUnauthorized }} /></ErrorBoundary></div>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-neutral-800 px-6 py-6 text-xs text-neutral-500 lg:px-10"><span>SKILLCHECK.ai / Built for developers.</span></footer>
  </div>;
}

function Eyebrow({children}) { return <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.2em] text-red-400"><span className="h-1.5 w-1.5 bg-red-500" />{children}</p>; }

export function Dashboard() {
  const { onUnauthorized } = useOutletContext();
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [resume, setResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [stage, setStage] = useState(null);
  const busy = stage !== null;
  const [checkHistory, setCheckHistory] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const retrySeconds = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setClock(current);
      if (current >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const resultSection = useRef(null);
  useEffect(() => {
    if (analysis) resultSection.current?.focus();
  }, [analysis]);
  function clearAnalysis() {
    setAnalysis(null);
    setAnalysisError('');
    setCheckHistory(false);
  }
  function chooseFile(candidate) {
    if (busy || !candidate) return;
    clearAnalysis();
    setResume(null);
    setFile(null);
    setNeedsLogin(false);
    if (!candidate.name.toLowerCase().endsWith('.pdf') || (candidate.type && candidate.type !== 'application/pdf')) {
      setAnalysisError('Choose a PDF resume.');
      return;
    }
    if (candidate.size > 3 * 1024 * 1024 || !candidate.size) {
      setAnalysisError('Choose a PDF larger than 0 bytes and no larger than 3 MB.');
      return;
    }
    setFile(candidate);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || retrySeconds > 0) return;
    setAnalysisError('');
    setNeedsLogin(false);
    setCheckHistory(false);
    if (!file || !role.trim()) {
      setAnalysisError('Choose a PDF resume and enter your target role.');
      return;
    }

    let extracted = resume;
    try {
      if (!extracted) {
        setStage('extracting');
        const data = await extractResume(file);
        extracted = data.resume;
        setResume(extracted);
      }
      if (extracted.text.trim().length < 50 || extracted.text.length > 20000) {
        setAnalysisError('Analysis needs 50–20,000 characters of resume text. Choose a shorter or more complete resume.');
        return;
      }
      setStage('analysing');
      const result = await analyseResume({ resumeText: extracted.text, targetRole: role, jobDescription: description });
      setAnalysis(result);
    } catch (err) {
      if (err.response?.status === 401) {
        onUnauthorized();
        setNeedsLogin(true);
        setAnalysisError('Sign in to analyse your resume.');
      } else if (!extracted) {
        setAnalysisError(err.response?.data?.message || 'Could not extract your PDF. Please try again.');
      } else {
        const failure = analysisFailure(err);
        setAnalysisError(failure.message);
        setCheckHistory(failure.checkHistory);
        const current = Date.now();
        setClock(current);
        setRetryAt(failure.retryAfter ? current + failure.retryAfter * 1000 : 0);
      }
    } finally {
      setStage(null);
    }
  }

  return <>
    <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-baseline justify-between gap-3">
      <h1 className="text-4xl font-bold sm:text-5xl">Analyse<span className="text-red-500">.</span></h1>
      <Link to="/analysis/sample" className="text-sm text-red-300 underline">Try a sample</Link>
    </div>
    <form onSubmit={submit} className={panel + " mx-auto max-w-3xl rounded-2xl p-5 sm:p-8"}>
      <fieldset aria-label="Resume analysis" disabled={busy} className="min-w-0 disabled:opacity-60">
        <label htmlFor="resume-upload" className="text-sm font-medium"><span className="mr-3 font-mono text-red-500">01</span>Your resume</label>
        <div onDragOver={event => {event.preventDefault(); setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={event => {event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]);}} className={`relative mt-3 border border-dashed p-7 text-center transition ${dragging ? 'border-red-400 bg-red-500/10' : 'border-neutral-700 bg-neutral-950/60'}`}>
          <div aria-hidden="true" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-red-500/30 bg-red-500/5 text-2xl text-red-500">↥</div>
          <p className="break-all text-sm font-medium">{file ? file.name : 'Drop your resume here'}</p><p className="mt-2 text-xs text-neutral-500">{file ? `${(file.size / 1024).toFixed(0)} KB · PDF selected` : 'PDF only · Up to 3 MB'}</p>
          <input id="resume-upload" ref={input} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={event => {chooseFile(event.target.files[0]); event.target.value = '';}} />
          <button type="button" onClick={() => input.current.click()} className="mt-4 border border-neutral-600 px-4 py-2 text-xs hover:border-white">{file ? 'Replace file' : 'Browse files'}</button>
          {file && <button type="button" onClick={() => {setFile(null); setResume(null); clearAnalysis(); setNeedsLogin(false);}} className="ml-4 text-xs text-neutral-400 hover:text-red-400">Remove</button>}
        </div>
        <div className="mt-7"><label htmlFor="target-role" className="text-sm font-medium"><span className="mr-3 font-mono text-red-500">02</span>Your target role</label><input id="target-role" value={role} onChange={event => {setRole(event.target.value); clearAnalysis();}} maxLength={120} placeholder="e.g. Backend Engineer" className={field} /><div className="mt-3 flex flex-wrap gap-2">{['Backend Engineer', 'Full Stack Developer', 'AI Engineer'].map(item => <button key={item} type="button" onClick={() => {setRole(item); clearAnalysis();}} className={`border px-3 py-1.5 text-[11px] transition ${role === item ? 'border-red-500/60 bg-red-500/10 text-red-300' : 'border-neutral-800 text-neutral-400 hover:border-neutral-500'}`}>{item}</button>)}</div></div>
        <div className="mt-7"><label htmlFor="job-description" className="flex flex-wrap items-center justify-between gap-2 text-sm"><span><span className="mr-3 font-mono text-red-500">03</span>Job description</span><span className="text-xs text-neutral-500">Optional · adds context</span></label><textarea id="job-description" value={description} onChange={event => {setDescription(event.target.value); clearAnalysis();}} maxLength={5000} rows={4} placeholder="Paste the job requirements for a more specific comparison…" className={`${field} resize-y`} /><p className="mt-1 text-right font-mono text-[10px] text-neutral-500">{description.length} / 5,000</p></div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-800 pt-5">
          <button className={primary + " rounded-lg disabled:opacity-60"} type="submit" disabled={retrySeconds > 0} aria-busy={busy}>{busy ? 'Analysing…' : analysis ? 'Analyse again' : 'Analyse'}</button>
          <p className="text-xs text-neutral-400">Uses AI credits. OpenRouter and its model providers process the extracted text and role details.</p>
        </div>
      </fieldset>
      {busy && <AnalysisProgress stage={stage} />}
      {analysisError && <p role="alert" className="mt-4 text-sm text-red-400">{analysisError}</p>}
      {needsLogin && <Link to="/login" className="mt-3 inline-block text-sm text-red-300 underline">Sign in</Link>}
      {checkHistory && <Link to="/history" className="mt-3 block text-sm text-red-300 underline">Check History before retrying</Link>}
      {retrySeconds > 0 && <p className="mt-3 text-sm text-neutral-400">Try again in {retrySeconds} seconds.</p>}
      {resume && !busy && <details className="mt-4 text-sm text-neutral-400">
        <summary className="cursor-pointer">View extracted text · {resume.pageCount} page(s)</summary>
        <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words border border-neutral-800 p-3">{resume.text}</pre>
      </details>}
    </form>
    {analysis && <div ref={resultSection} tabIndex={-1} aria-label="Analysis result" role="region">
      <AnalysisReport key={analysis.id || analysis.createdAt} analysis={analysis} />
    </div>}
  </>;
}

function AnalysisProgress({ stage }) {
  const extracting = stage === 'extracting';
  const steps = [extracting ? 'Extracting PDF text' : 'PDF text extracted', 'Requesting AI analysis', 'Waiting for the AI report'];
  const active = extracting ? 0 : 2;
  return <section className="mx-auto mt-6 max-w-3xl rounded-2xl border border-red-500/30 bg-red-950/20 p-5 sm:p-7" aria-label="Analysis progress">
    <p role="status" className="text-xl font-semibold">{steps[active]}…</p>
    <ol className="mt-4 grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => <li key={index} aria-current={index === active ? 'step' : undefined}
        className={index <= active ? 'text-sm text-neutral-200' : 'text-sm text-neutral-500'}>
        <span aria-hidden="true" className={index === active ? 'analysis-indicator mr-2 inline-block text-red-400' : 'mr-2 text-red-300'}>
          {index < active ? '✓' : index === active ? '◉' : '○'}
        </span>{index === 1 && !extracting ? 'Analysis request sent' : step}
      </li>)}
    </ol>
  </section>;
}

const sections = {
  Strengths: [
    ['API development', '“Built REST APIs using Node.js, Express, and MongoDB.”', 'The sample resume explicitly demonstrates the core stack requested for this backend role.', 'Keep the stack visible and add one concrete example of an endpoint you designed.'],
    ['Authentication foundations', '“Implemented JWT authentication and password hashing.”', 'This is relevant evidence of working with authenticated backend flows.', 'Explain how access to user-owned resources is enforced.']
  ],
  Gaps: [
    ['Production ownership', '“Deployed a personal API project.”', 'Deployment is mentioned, but monitoring, incident handling, and operating the service are not evidenced.', 'Describe how you detected failures and kept the service running.'],
    ['Testing coverage', 'No testing example in the fictional resume.', 'The sample job description asks for automated testing. Absence of evidence is not proof of missing ability.', 'Add a real example of integration tests and the failure cases they cover.']
  ],
  'Screening risks': [
    ['Impact is difficult to assess', '“Improved API performance.”', 'Without measurements or a clear before/after, a reviewer may struggle to assess the contribution.', 'If you have measurements, include the workload, baseline, and improvement. Never invent numbers.'],
    ['Role requirements are under-explained', 'No production testing or monitoring detail.', 'A reviewer looking for operational experience may need more information. This is a possible concern, not a prediction of rejection.', 'Use specific, truthful examples to make relevant work easier to evaluate.']
  ],
};

const sampleFindings = entries => entries.map(([title, evidence, explanation, suggestion]) => ({
  title,
  evidence: evidence.startsWith('“') ? evidence.slice(1, -1) : null,
  explanation,
  suggestion
}));

const sampleAnalysis = {
  targetRole: 'Backend Engineer',
  report: {
    headline: 'The APIs showed up. The tests are still typing…',
    summary: 'This sample shows solid backend fundamentals, with room to explain testing and production work.',
    strengths: sampleFindings(sections.Strengths),
    gaps: sampleFindings(sections.Gaps),
    screeningConcerns: sampleFindings(sections['Screening risks']),
    requirementMap: [{
      jobQuote: 'Build REST APIs with Node.js.',
      resumeQuote: 'Built REST APIs using Node.js, Express, and MongoDB.',
      status: 'supported',
      preferred: false,
      explanation: 'The resume describes building APIs with the requested stack.',
      nextStep: 'Keep this bullet and name one endpoint you designed.'
    }, {
      jobQuote: 'Write automated integration tests.',
      resumeQuote: null,
      status: 'no_evidence',
      preferred: false,
      explanation: 'The fictional resume gives no example of automated testing.',
      nextStep: 'If you wrote integration tests, name the tool and a failure one test catches.'
    }],
    limitations: ['This example uses a fictional resume.']
  }
};

export function Report() {
  return <>
    <Link to="/" className="text-sm text-red-300 underline">← Analyse your resume</Link>
    <AnalysisReport analysis={sampleAnalysis} sample />
  </>;
}

export function NotFound() { return <div className="py-20 text-center"><Eyebrow>404 / Off the map</Eyebrow><h1 className={`${heading} text-3xl`}>This page isn’t here.</h1><Link to="/" className={`${primary} mt-8`}>Back to workspace</Link></div>; }
