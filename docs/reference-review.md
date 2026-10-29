# Reference review: interview-ai-yt

Reviewed 2026-10-29. Source: https://github.com/ankurdotio/interview-ai-yt
Snapshot: b72791b345a22b9f59563e0c61cbbe50256094e7.
Method: static inspection of all backend source, frontend JS/JSX, manifests and Vite configuration. No dependency installation, application execution, database calls, or paid AI requests. Runtime SDK compatibility and actual output quality are unverified.

## What the application does

An authenticated user submits a job description, resume PDF and optional self-description. The server extracts text, asks Gemini for an interview preparation report, saves inputs and report together in MongoDB, and returns it. The UI displays a match score, technical/behavioral questions with intentions and suggested answers, skill gaps, and a daily preparation plan. History allows revisiting reports. A separate action asks Gemini to write a tailored resume as HTML and converts that HTML to PDF using Puppeteer.

This is not a live interviewing system. There is no recorded answer evaluation, retrieval system, vector database, tool-using agent, or LangGraph workflow in the inspected source. Report generation is one model call; resume generation is another independent model call.

## Request path

Frontend Home -> useInterview -> interview.api -> multipart HTTP request -> auth middleware -> Multer memory upload -> interview controller -> pdf-parse -> AI service -> Gemini JSON response -> JSON.parse -> Mongoose create -> response -> shared React state -> report page.

All generation happens within the original HTTP request. No persisted pending job exists before the AI operation completes. Original PDF bytes are held in memory; extracted resume text is stored in MongoDB. The backend sends resume text, job description and self-description to the model provider.

## Endpoints

- POST /api/auth/register: create account, issue 1-day JWT cookie.
- POST /api/auth/login: email/password authentication, issue cookie.
- GET /api/auth/logout: blacklist token and clear cookie.
- GET /api/auth/get-me: authenticated profile.
- POST /api/interview/: authenticated multipart report generation, resume field.
- GET /api/interview/: list current user's report summaries, newest first.
- GET /api/interview/report/:interviewId: fetch report with owner filter.
- POST /api/interview/resume/pdf/:interviewReportId: regenerate a tailored PDF from stored inputs. Authentication exists but owner filter is missing.

Frontend Axios instances use localhost:3000 and withCredentials. Backend CORS allows localhost:5173 with credentials. No Vite proxy is configured in this reference.

## Models

User: unique username/email, password hash. Controllers explicitly return public profile fields.
Blacklist: token and timestamps; no TTL cleanup or token index declared.
InterviewReport: user reference, title, original job description, extracted resume, self-description, matchScore (Mongo schema bounds 0..100), technicalQuestions, behavioralQuestions, skillGaps, preparationPlan and timestamps. User is not required. No owner/date compound index or pagination is configured.

Question subdocuments contain question/intention/answer. Skill gaps contain skill/severity. Preparation entries contain day/focus/tasks. This structure supports an interview-prep product, not evidence-linked resume criticism without modification.

## AI behavior and limitations

ai.service.js uses @google/genai and the literal model identifier gemini-3-flash-preview. Zod schemas are converted to a JSON schema passed to the provider. Returned text is JSON.parse'd; the Zod schema is not used to validate the received object locally. Some fields are subsequently validated by Mongoose, but this is not equivalent to validating the complete provider output at the boundary.

The match score is model-generated, without an explicit weighted rubric, supporting evidence, calibration dataset or evaluation suite. Treat it as an estimate, not a probability of hiring or measured ATS score. Prompt text directly interpolates uploaded content and job descriptions. It does not establish an explicit untrusted-content boundary or require evidence citations. The resume rewrite prompt encourages a tailored resume but does not explicitly prohibit invented accomplishments.

No application-level retry policy, timeout policy, model fallback, token accounting, prompt version, model version metadata, or quality evaluation is implemented in the source. SDK defaults were not assessed.

## Prioritized findings

1. HIGH: PDF ownership gap. Backend/src/controllers/interview.controller.js:78 fetches by ID only. A signed-in user who obtains someone else's report ID can request a PDF generated from that person's private inputs. Use the same owner filter already present on the report-read endpoint at line 44. Test cross-user denial.
2. HIGH: Untrusted model HTML is rendered by a server-side browser. ai.service.js:61-74 launches Puppeteer and passes generated HTML to setContent. There is no explicit script disablement or request interception. Model output could trigger unwanted network requests or scripts. This is an architectural risk, not an exploit verified during this review. Prefer server-owned templates filled with escaped structured data, with restricted renderer network access. Close browser resources in finally.
3. Upload contract is inconsistent. Home.jsx promises PDF/DOCX, 5 MB, and resume OR self-description. Multer allows 3 MB; the controller always dereferences req.file.buffer and only invokes PDF parsing. Missing files and DOCX cannot follow the advertised path. No backend content-type/signature filter is present.
4. Cookie flags are absent: res.cookie('token', token) does not explicitly set HttpOnly, Secure or SameSite. Logout mutates state through GET. No rate limit or explicit CSRF protection is configured. Duplicate registration races are not mapped to a friendly conflict response.
5. Database readiness is not awaited before app.listen; connection failures are logged and swallowed.
6. Expensive operations run in requests without admission limits or persisted job status. A model success followed by a database failure loses the result; a retry can incur another model charge.
7. No consistent JSON error middleware or request validation layer. Express 5 can propagate async failures, but its default handling does not provide a deliberate application error contract.
8. Auth API helpers catch errors and return undefined; hooks swallow follow-on errors, and pages navigate after awaiting them regardless of success. There is no useful login failure UI.
9. useInterview functions read response.interviewReport after caught failures when response may still be null. The resulting second error obscures the original failure.
10. Report fetching exists in both useInterview and Interview.jsx effects, causing duplicate requests. useAuth runs a session fetch on each hook consumer mount instead of one provider-owned initialization.
11. UI contains placeholder behavior: hardcoded zero character count, unconditional 'Strong match' text, and drag/drop wording without a drop handler. PDF download does not revoke its object URL/remove its temporary link.
12. No project tests were found; backend test script is a placeholder. No deletion/retention workflow for stored resume text or reports is provided.

## What to reuse conceptually

Keep the separation of routes, middleware, controllers, models and AI services; multipart upload; structured report output; owner-filtered retrieval; history; and a simple results UI. Frontend context and hooks are useful once shared session/report state is needed, but their error and initialization behavior needs redesign.

## SkillCheck adaptation

SkillCheck's intended output is strengths, weaknesses and potential rejection reasons for a developer resume and target role. The reference expects a full job description and produces interview preparation material. Decide explicitly whether SkillCheck accepts a role title, a full description, or both. A role title alone gives less specific evidence for job fit.

A useful result format would include strengths, gaps, resume evidence excerpts, requirement references, explanation, actionable improvement, and uncertainty. Distinguish 'not evidenced in the resume' from 'candidate lacks the skill'. Describe rejection concerns as possible screening risks, not proven employer decisions. Preserve factual claims rather than inventing credentials.

Suggested progression, one reviewable step at a time:

1. Finish session restoration/protected navigation and auth correctness; add targeted auth tests.
2. Implement one validated PDF upload and extraction endpoint. Test missing, malformed, oversized, encrypted/scanned and empty-text files. Do not add AI until text extraction is observable and reliable.
3. Define the SkillCheck report contract; implement one model call with local schema validation and evidence-linked findings. Save/report ownership and provider errors must be explicit.
4. Add authenticated history, detail, deletion and pagination. Establish retention rules for original documents and extracted text.
5. Introduce background processing when needed: queued/running/succeeded/failed states, bounded workers, timeouts, selective retries, duplicate-submission protection and persistent status. Avoid rerunning successful stages unnecessarily.
6. Track request/job IDs, duration, model/prompt version, cost and errors. Build representative evaluation cases, including unsupported claims, weak text extraction and adversarial document text.
7. Add retrieval only when there is a real external corpus (for example curated role requirements) and evaluate whether retrieval helps. Add LangGraph when there are useful branching stages, checkpoint/resume needs or human review; do not add agent frameworks merely to appear advanced.

Prefer a modular application plus a worker over premature microservices. Advanced backend quality here means ownership enforcement, reliable processing, traceable results, controlled cost and measured AI quality.

## Workspace notes

The reference was cloned to E:/IDK/reference-interview-ai for inspection. It is a nested repository and must not be accidentally added as a submodule to SkillCheck. No SkillCheck application source was changed during this review. This document is a new review artifact; no commit or push was made.
