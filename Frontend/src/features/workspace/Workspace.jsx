import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";

const panel = "border border-neutral-800 bg-neutral-900/60";
const heading = "font-['Orbitron',sans-serif]";
const field = "mt-3 w-full border border-neutral-700 bg-neutral-950 p-3 text-sm text-white outline-none focus:border-red-500";
const primary = "inline-flex items-center justify-center gap-3 bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400";

export function Workspace() {
  return <div className="min-h-screen bg-[#090909] font-['Space_Grotesk',sans-serif] text-neutral-100 selection:bg-red-600">
    <header className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-6 py-5 lg:px-10">
        <Link to="/" className={`${heading} text-xl font-black tracking-tight`}>SKILLCHECK<span className="text-red-500">.ai</span></Link>
        <nav aria-label="Main navigation" className="flex gap-6 text-sm">
          {[['/', 'Workspace'], ['/history', 'My analyses']].map(([to, label]) => <NavLink key={to} to={to} end className={({isActive}) => isActive ? 'text-white underline decoration-red-500 decoration-2 underline-offset-8' : 'text-neutral-400 hover:text-white'}>{label}</NavLink>)}
        </nav>
        <Link to="/login" className="border border-neutral-700 px-4 py-2 text-xs hover:border-red-500">SIGN IN ↗</Link>
      </div>
    </header>
    <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-12"><Outlet /></div>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-neutral-800 px-6 py-6 text-xs text-neutral-500 lg:px-10"><span>SKILLCHECK.ai / Built for developers.</span><span>Evidence over assumptions. Progress over perfection.</span></footer>
  </div>;
}

function Eyebrow({children}) { return <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.2em] text-red-400"><span className="h-1.5 w-1.5 bg-red-500" />{children}</p>; }

export function Dashboard() {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const navigate = useNavigate();
  function chooseFile(candidate) {
    setNotice('');
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.pdf') || (candidate.type && candidate.type !== 'application/pdf')) { setError('Choose a PDF resume. Other file formats are not supported.'); return; }
    if (candidate.size > 3 * 1024 * 1024) { setError('Your PDF must be 3 MB or smaller.'); return; }
    if (!candidate.size) { setError('This file is empty. Choose another PDF.'); return; }
    setFile(candidate); setError('');
  }
  function submit(event) {
    event.preventDefault();
    if (!file) { setError('Add a PDF resume before continuing.'); return; }
    if (!role.trim()) { setError('Enter a target role.'); return; }
    setError('');
    setNotice('Your inputs are ready. Live analysis is not connected yet, so your resume has not been uploaded or analysed. Explore the sample report below to preview the experience.');
  }
  return <>
    <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
      <div><Eyebrow>Your next role starts here / 01</Eyebrow><h1 className={`${heading} max-w-3xl text-3xl font-bold leading-tight sm:text-5xl`}>Good code deserves<br />a <span className="text-red-500">stronger resume.</span></h1><p className="mt-5 max-w-xl text-sm leading-7 text-neutral-400">Find what stands out, what’s missing, and what could hold you back. Get a clearer picture of your fit for the role.</p></div>
      <div className="border-l-2 border-red-600 pl-5"><p className="font-mono text-xs tracking-widest text-neutral-500">WORKSPACE PREVIEW</p><p className="mt-2 text-sm leading-6 text-neutral-300">Explore the experience.<br />Live analysis is coming next.</p><Link to="/analysis/sample" className="mt-3 inline-block text-sm text-red-400 hover:text-white">Open sample report ↗</Link></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <form onSubmit={submit} className={`${panel} relative p-5 sm:p-8`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-600 to-transparent" />
        <div className="mb-7 flex items-center justify-between gap-4"><h2 className={`${heading} text-lg font-bold`}>New analysis</h2><span className="font-mono text-[10px] tracking-widest text-neutral-500">RESUME → ROLE → INSIGHT</span></div>
        <label htmlFor="resume-upload" className="text-sm font-medium"><span className="mr-3 font-mono text-red-500">01</span>Your resume</label>
        <div onDragOver={event => {event.preventDefault(); setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={event => {event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]);}} className={`relative mt-3 border border-dashed p-7 text-center transition ${dragging ? 'border-red-400 bg-red-500/10' : 'border-neutral-700 bg-neutral-950/60'}`}>
          <div aria-hidden="true" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-red-500/30 bg-red-500/5 text-2xl text-red-500">↥</div>
          <p className="break-all text-sm font-medium">{file ? file.name : 'Drop your resume here'}</p><p className="mt-2 text-xs text-neutral-500">{file ? `${(file.size / 1024).toFixed(0)} KB · PDF selected` : 'PDF only · Up to 3 MB'}</p>
          <input id="resume-upload" ref={input} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={event => {chooseFile(event.target.files[0]); event.target.value = '';}} />
          <button type="button" onClick={() => input.current.click()} className="mt-4 border border-neutral-600 px-4 py-2 text-xs hover:border-white">{file ? 'Replace file' : 'Browse files'}</button>
          {file && <button type="button" onClick={() => {setFile(null); setNotice('');}} className="ml-4 text-xs text-neutral-400 hover:text-red-400">Remove</button>}
        </div>
        <div className="mt-7"><label htmlFor="target-role" className="text-sm font-medium"><span className="mr-3 font-mono text-red-500">02</span>Your target role</label><input id="target-role" value={role} onChange={event => {setRole(event.target.value); setNotice('');}} maxLength={120} required placeholder="e.g. Backend Engineer" className={field} /><div className="mt-3 flex flex-wrap gap-2">{['Backend Engineer', 'Full Stack Developer', 'AI Engineer'].map(item => <button key={item} type="button" onClick={() => {setRole(item); setNotice('');}} className={`border px-3 py-1.5 text-[11px] transition ${role === item ? 'border-red-500/60 bg-red-500/10 text-red-300' : 'border-neutral-800 text-neutral-400 hover:border-neutral-500'}`}>{item}</button>)}</div></div>
        <div className="mt-7"><label htmlFor="job-description" className="flex flex-wrap items-center justify-between gap-2 text-sm"><span><span className="mr-3 font-mono text-red-500">03</span>Job description</span><span className="text-xs text-neutral-500">Optional · adds context</span></label><textarea id="job-description" value={description} onChange={event => {setDescription(event.target.value); setNotice('');}} maxLength={5000} rows={4} placeholder="Paste the job requirements for a more specific comparison…" className={`${field} resize-y`} /><p className="mt-1 text-right font-mono text-[10px] text-neutral-500">{description.length} / 5,000</p></div>
        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
        {notice && <div role="status" className="mt-5 border border-red-500/30 bg-red-500/5 p-4 text-sm leading-6 text-neutral-300">{notice}<button type="button" onClick={() => navigate('/analysis/sample')} className="mt-3 block text-red-400 underline underline-offset-4">View sample report →</button></div>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-6"><p className="max-w-xs text-xs leading-5 text-neutral-500">Preview mode. Your file stays in this browser tab and is cleared when you leave.</p><button className={primary} type="submit">Prepare analysis <span aria-hidden="true">↗</span></button></div>
      </form>
      <aside className="space-y-6"><div className={`${panel} p-6`}><Eyebrow>Beyond a match score</Eyebrow><h2 className={`${heading} text-lg font-semibold`}>Know where<br />you stand.</h2><div className="mt-7 space-y-6">{[['01','Your strengths','See the experience and skills that support your target role.'],['02','The missing evidence','Find vague claims, unclear impact, and requirements your resume doesn’t demonstrate.'],['03','Your next move','Turn feedback into specific edits and a focused preparation plan.']].map(([n,title,body]) => <div key={n} className="flex gap-4"><span className="pt-1 font-mono text-xs text-red-500">{n}</span><div><h3 className="text-sm font-medium">{title}</h3><p className="mt-2 text-xs leading-6 text-neutral-500">{body}</p></div></div>)}</div></div><div className="relative overflow-hidden border border-red-500/20 bg-gradient-to-br from-red-950/40 to-neutral-950 p-6"><p className="font-mono text-[10px] tracking-[.2em] text-red-400">THE SKILLCHECK PRINCIPLE</p><p className="mt-4 text-xl leading-8">Your resume tells a story.<br /><span className="text-neutral-500">Make the evidence count.</span></p><p className="mt-4 text-xs leading-6 text-neutral-500">Missing from a resume doesn’t mean missing from your abilities.</p></div></aside>
    </div>
    <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className={`${heading} text-sm font-semibold`}>Explore the output</h2><span className="font-mono text-[10px] text-neutral-500">01 SAMPLE AVAILABLE</span></div><Link to="/analysis/sample" className={`${panel} group flex flex-wrap items-center justify-between gap-5 p-6 transition hover:border-red-500/50`}><div className="flex items-center gap-5"><span aria-hidden="true" className="flex h-12 w-12 items-center justify-center border border-neutral-700 font-mono text-red-400">&lt;/&gt;</span><div><p className="text-sm font-medium">Backend Engineer</p><p className="mt-1 text-xs text-neutral-500">Sample report · Fictional candidate · Not your resume</p></div></div><span className="text-sm text-red-400 group-hover:text-white">View breakdown ↗</span></Link></section>
  </>;
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

export function Report() {
  const [tab, setTab] = useState('Strengths');
  const [done, setDone] = useState([]);
  const tasks = ['Add a measured API performance example', 'Describe one automated test and the bug it catches', 'Explain deployment and monitoring responsibilities'];
  return <>
    <Link to="/" className="text-xs text-neutral-400 hover:text-white">← Back to workspace</Link>
    <div className="mt-6 border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-200/80">SAMPLE REPORT — All findings below are illustrative and refer to a fictional resume. No uploaded file has been analysed.</div>
    <div className="my-9 flex flex-wrap items-end justify-between gap-5"><div><Eyebrow>Resume intelligence / sample 001</Eyebrow><h1 className={`${heading} text-3xl font-bold sm:text-4xl`}>Backend Engineer<span className="text-red-500">.</span></h1><p className="mt-3 text-sm text-neutral-400">A closer look at the evidence behind the experience.</p></div><Link to="/" className={primary}>Start a new analysis ↗</Link></div>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="space-y-5"><div className={`${panel} p-6`}><p className="font-mono text-[10px] tracking-widest text-neutral-500">ILLUSTRATIVE ALIGNMENT</p><div className="my-7 flex items-baseline gap-2"><span className={`${heading} text-6xl font-bold`}>68</span><span className="text-neutral-600">/ 100</span></div><div className="h-1 bg-neutral-800"><div className="h-full w-[68%] bg-red-500" /></div><p className="mt-5 text-sm">Promising foundations.<br /><span className="text-neutral-500">More evidence needed.</span></p><p className="mt-4 text-xs leading-6 text-neutral-500">Example score only. Not a hiring probability or a verified ATS score.</p></div><div className={`${panel} p-6`}><h2 className="text-sm font-semibold">Sample role criteria</h2><ul className="mt-4 space-y-3 text-xs text-neutral-400">{['Node.js & REST APIs','Database design','Automated testing','Production deployment'].map(item => <li key={item} className="border-b border-neutral-800 pb-3">{item}</li>)}</ul></div></aside>
    <div><div role="tablist" aria-label="Report sections" className="mb-6 flex flex-wrap border-b border-neutral-800">{Object.keys(sections).map(item => <button key={item} role="tab" id={`tab-${item.replaceAll(' ','-')}`} aria-selected={tab === item} aria-controls="report-panel" onClick={() => setTab(item)} className={`border-b-2 px-4 py-4 text-sm ${tab === item ? 'border-red-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-200'}`}>{item} <span className="ml-2 font-mono text-[10px] text-neutral-500">02</span></button>)}</div><div id="report-panel" role="tabpanel" aria-labelledby={`tab-${tab.replaceAll(' ','-')}`} className="space-y-4">{sections[tab].map(([title,evidence,explanation,action], index) => <article key={title} className={`${panel} p-6`}><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-medium">{title}</h2><span className="font-mono text-xs text-red-400">0{index+1}</span></div><blockquote className="my-5 border-l-2 border-neutral-600 bg-neutral-950/70 p-4 text-sm italic leading-6 text-neutral-400">{evidence}</blockquote><p className="text-sm leading-7 text-neutral-300">{explanation}</p><div className="mt-5 border-t border-neutral-800 pt-4"><p className="mb-2 font-mono text-[10px] tracking-widest text-red-400">YOUR NEXT MOVE</p><p className="text-sm leading-6 text-neutral-400">{action}</p></div></article>)}</div>
    <section className={`${panel} mt-6 p-6`}><div className="flex items-center justify-between"><h2 className={`${heading} text-sm font-semibold`}>Make it stronger</h2><span className="font-mono text-xs text-neutral-500">{done.length} / 3</span></div><p className="mt-2 text-xs text-neutral-500">Try the checklist. Progress is only kept while this page is open.</p><div className="mt-5 space-y-4">{tasks.map(task => <label key={task} className="flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={done.includes(task)} onChange={event => setDone(event.target.checked ? [...done, task] : done.filter(value => value !== task))} className="mt-1 h-4 w-4 accent-red-500" /><span className={done.includes(task) ? 'text-neutral-600 line-through' : 'text-neutral-300'}>{task}</span></label>)}</div></section></div></div>
  </>;
}

export function History() {
  return <><Eyebrow>Your progress / archive</Eyebrow><h1 className={`${heading} text-3xl font-bold sm:text-4xl`}>Every iteration counts<span className="text-red-500">.</span></h1><p className="mt-4 text-sm text-neutral-400">Your saved analyses will appear here once live analysis is connected.</p><div className={`${panel} my-10 px-6 py-16 text-center`}><span aria-hidden="true" className="font-mono text-4xl text-neutral-600">[ 00 ]</span><h2 className="mt-6 text-xl font-medium">A clean slate. A stronger next step.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-500">No saved analyses yet. Explore the sample report or prepare your resume in the workspace.</p><div className="mt-7 flex flex-wrap justify-center gap-4"><Link to="/" className={primary}>Go to workspace ↗</Link><Link to="/analysis/sample" className="border border-neutral-700 px-5 py-3 text-sm hover:border-neutral-400">Explore sample</Link></div></div></>;
}

export function NotFound() { return <div className="py-20 text-center"><Eyebrow>404 / Off the map</Eyebrow><h1 className={`${heading} text-3xl`}>This page isn’t here.</h1><Link to="/" className={`${primary} mt-8`}>Back to workspace</Link></div>; }
