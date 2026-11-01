# Day 4: clearer feedback and failure recovery

## What changed

New findings now include three extra fields:

| Field | Meaning |
| --- | --- |
| `basis` | An item from the job description, a general role suggestion, or a resume clarity issue. |
| `priority` | High, medium, or low. This is suggested edit order, not a hiring prediction. |
| `requirementEvidence` | A verbatim job-description excerpt, or `null` when the finding is not based on the job description. |

The model prompt now tells it to assess gaps against the supplied job description, avoid unrelated technology requirements, distinguish preferred skills from mandatory ones, and avoid assuming seniority. Without a job description, general suggestions must be labelled as such. It also asks for specific truthful edits instead of boilerplate metric demands or unsupported claims.

The backend independently checks job-description excerpts as well as resume quotes. With a job description, gaps must have a supporting excerpt. General advice and clarity issues cannot get high priority, and excerpts explicitly marked preferred/optional cannot get high priority. Invalid metadata, unsupported excerpts, or malformed output are rejected before storage.

These checks verify where quoted text came from and enforce format boundaries. They cannot prove the model interpreted it correctly or guarantee that all feedback is relevant. Existing report documents are not rewritten. Older reports remain readable, with an explicit note that their source/priority metadata was not recorded.

## What users see

- Source and priority labels next to each new finding, with a separate job-description excerpt where applicable.
- **Start with these edits**: up to three suggestions, sorted by priority with exact duplicate suggestions removed.
- **Analyse again** makes it clear that generating another report is a new paid request. A failed repeat request keeps the previous result visible.
- If saving fails, the report remains visible and **Download a copy of this report** saves its returned result as JSON. It is a local backup, not an import/export-to-history feature.
- If the connection drops or the browser times out, the UI explains that saving may already have completed and links to history before another paid attempt.
- Busy/rate-limit responses use the server's `Retry-After` value to disable analysis temporarily and show a countdown. Changing the role does not bypass this timer. Nothing retries automatically.
- Missing/invalid keys, insufficient credits, refused content, malformed reports, and timeouts have distinct backend error codes. Provider credential failures remain service errors; they do not log the user out. An actual expired app session still offers sign-in.

## Main files

| File | Purpose |
| --- | --- |
| `Backend/src/services/analysis.service.js` | Improved prompt, structured output, stable error codes, provider wait times, and priority sorting. |
| `Backend/src/services/analysis.schema.js` | New metadata and local checks against both source documents. |
| `Backend/src/models/report.model.js` | Passes the saved job description into validation. New records use the stricter format. |
| `Backend/src/controllers/analysis.controller.js` | Sends safe error codes and retry headers without raw provider details. |
| `Backend/src/middlewares/analysis.middleware.js` | Distinguishes running/cooldown/hourly-limit errors and computes remaining wait time. |
| `Frontend/src/features/workspace/analysis.utils.js` | Builds recovery messages and picks prioritized edits without another model call. |
| `Frontend/src/features/workspace/Workspace.jsx` | Retry countdown, uncertain-result/history guidance, and preserving the last report on retry failure. |
| `Frontend/src/features/workspace/AnalysisReport.jsx` | Source labels, priority edits, legacy display, and an unsaved-report download. |
| `Backend/tests/analysis.test.js` and `Frontend/tests/analysis-feedback.test.mjs` | Quality-boundary and recovery regressions using simulated responses. |

No new packages, framework, database migration, or automatic paid retries were added.

## Verification and budget

Backend tests cover matching resume/JD quotes, missing job descriptions, invented requirements, unsupported quotes, invalid source/priority labels, optional skills marked high priority, empty findings for documents with insufficient evidence, refusal, provider errors/timeouts, cooldowns, save failure, auth, and live MongoDB ownership/persistence. These simulated tests validate application rules; they are not an empirical evaluation of model quality across many resumes.

One paid service check used a fictional junior Node.js resume and a job description requiring API integration tests while marking Docker as preferred and Java/Python as unnecessary. It passed validation, identified automated testing as a high-priority gap, treated Docker as optional/low priority, and did not add Java/Python gaps. Reported usage: 680 prompt tokens, 868 completion tokens, **$0.0004152**. This sample prompted a further wording refinement to discourage generic metric demands and willingness-to-learn statements; that final wording was not tested in another paid call to keep the budget limited.

Browser checks used a separate frontend on port 5178 whose temporary configuration pointed only to a simulated backend on port 3008. They confirmed source labels, prioritized edits, preserving feedback after a simulated save failure, downloading the JSON backup, retry countdown with no automatic retry, and opening an old-format report. They used no real credentials, MongoDB connection, or paid API calls. Temporary test processes and files are removed afterward; the normal app configuration is unchanged.

## Try it

1. Restart the backend if it is not running in watch mode, then refresh the frontend.
2. Analyse a fictional resume with a short job description. Check the source labels, quoted requirements, and edit priorities.
3. Open an older report from history; its original feedback should still display.
4. Avoid repeated paid generations just to test failures: automated tests simulate those conditions.

Run backend checks with `npm test` in `Backend`; enable `RUN_LIVE_DB_TESTS=1` for the two database checks. Run frontend checks in `Frontend` with `npm run build`, `npm run lint`, and `node --test tests/analysis-feedback.test.mjs`.
