# Day 2: OpenRouter resume analysis

Day 3 adds automatic MongoDB saving and history; see [report-storage.md](report-storage.md) for the current behavior. The setup and AI-validation details below still apply; references to reports being unsaved describe the earlier Day 2 step.

## Enable it locally

Add these lines to `Backend/.env`, preserving your existing database and JWT settings:

```dotenv
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
```

Put the real key only in `.env`, never in frontend code or chat. `.env` is already ignored by Git. `Backend/.env.example` lists the variable names without any secrets. The model is optional; the default is Gemini 2.5 Flash Lite. Other models must support JSON-schema structured output and the requested parameters.

Restart the backend after changing environment variables. You can close the existing server windows and double-click `start server.bat` again.

1. Sign in, choose a PDF up to 3 MB, and click **Extract text**.
2. Check the extracted text. Enter a target role; a job description is optional.
3. Click **Analyse resume** under the extracted-text preview.
4. The report appears below with a summary, strengths, gaps, potential screening concerns, suggested improvements, and limitations.

Extraction alone makes no AI request. Analysis sends the extracted text, role, and job description to OpenRouter and its selected model provider. The key stays on the backend. The app does not save or log resume text or reports; the report disappears on navigation, refresh, or changing the inputs. Provider data handling is separate from app storage.

## Follow one request

```text
Browser: extracted text + target role + optional job description
  -> POST /resumes/analyze (JSON, existing login cookie)
  -> authenticate user
  -> validate input and check backend configuration
  -> apply analysis request limits
  -> one OpenRouter chat completion request
  -> parse and validate the report; check quotes against resume text
  -> return the report to React (saved: false)
```

The existing `POST /resumes` PDF extraction contract is unchanged. Analysis uses a separate JSON endpoint so the user can review extraction before sending text to the AI. The analysis endpoint treats text as user input; it does not prove that the text came from a PDF or that claims in it are true.

## What each file does

| File | Purpose |
| --- | --- |
| `Backend/src/routes/resume.routes.js` | Adds the protected `/analyze` route under `/resumes`. |
| `Backend/src/middlewares/analysis.middleware.js` | Checks text lengths and field types; limits repeated/concurrent requests. |
| `Backend/src/controllers/analysis.controller.js` | Coordinates the service and returns safe JSON errors. |
| `Backend/src/services/analysis.service.js` | Reads backend environment variables, builds the prompt, and calls OpenRouter with Node's built-in `fetch`. |
| `Backend/src/services/analysis.schema.js` | Defines the required report structure and checks returned data locally. |
| `Frontend/src/features/workspace/services/resume.api.js` | Sends analysis inputs to the backend with a timeout. |
| `Frontend/src/features/workspace/Workspace.jsx` | Adds the analysis button, loading/errors, required-role check, and clears stale reports when inputs change. |
| `Frontend/src/features/workspace/AnalysisReport.jsx` | Displays the returned report as plain text, never as generated HTML. |
| `Backend/tests/analysis.test.js` | Tests requests, output validation, cost limits, and provider failures using simulated responses. |
| `Backend/test-support/analysis.js` | Supplies synthetic input and report fixtures for tests. |

No SDK, new package, queue, RAG framework, or database model was added.

## Output and evidence checks

The report contains `summary`, `strengths`, `gaps`, `screeningConcerns`, and `limitations`. Each finding contains `title`, `evidence`, `explanation`, and `suggestion`. Empty finding arrays are allowed. Evidence may be `null` for gaps and concerns; each strength must have a resume quote.

The request uses OpenRouter's JSON-schema response format with `strict: true` and `require_parameters: true`. Local code still checks required fields, exact keys, types, array sizes, text lengths, and whether every supplied quote exists in the resume after normalizing whitespace. Invalid, refused, or truncated output is rejected instead of displayed. A matching quote confirms its presence, not whether the model's interpretation is correct.

The prompt asks for truthful edits, distinguishes missing evidence from missing ability, treats document instructions as untrusted input, and excludes hiring probabilities and sensitive personal-trait judgments. This reduces some risks but does not guarantee factual accuracy or eliminate prompt injection.

## Cost and failure handling

- Resume text: 50–20,000 characters; role: 1–120 characters; job description: up to 5,000 characters. Overlong inputs are rejected, not silently cut off.
- Output: at most 3 findings per section, with a 3,000-token completion cap.
- One model call per accepted request; no automatic retry or provider fallback.
- Provider timeout: 45 seconds. The browser allows 55 seconds for the analysis request.
- Per signed-in user: one analysis at a time, at least 30 seconds between starts, and at most 5 attempts in a one-hour window. Provider failures count as attempts too. Missing keys and invalid inputs do not consume an attempt.
- At most 2 model calls run concurrently in this backend process.
- Limits are held in server memory and reset on restart. They are local development guards, not a durable spending cap or protection across multiple servers/accounts. Use an OpenRouter key spending limit for a hard account-side budget.
- Missing/invalid keys, exhausted credits, a busy provider, invalid output, and timeouts return readable messages. Raw provider errors and credentials are not forwarded or logged.

## Verification

`npm test` in `Backend`: 17 tests passed, 1 optional live-MongoDB test skipped. The six new analysis tests make no requests to OpenRouter. They cover authentication, input limits, optional job descriptions, the structured request contract, unsupported quotes, malformed/incomplete/refused output, provider errors, timeouts, and cost guards. Frontend production build and lint passed.

Browser verification used a temporary local-only test backend with a synthetic login and simulated OpenRouter output. PDF extraction, missing-role validation, loading/disabled controls, report sections, and clearing the report on role changes were verified. The temporary backend is not part of the app and is removed after verification.

After the key was configured in the ignored `Backend/.env`, one real OpenRouter smoke test using the synthetic resume succeeded with `google/gemini-2.5-flash-lite` in approximately 3 seconds. The response passed local schema and quote validation and contained 2 strengths, 1 gap, and no screening concerns. This verifies the live service connection and structured response for that sample; it is not a broad evaluation of report quality. This single request used the account's API credits; its exact cost was not measured. Earlier automated and browser checks used simulated responses.

## References checked

- [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [Gemini 2.5 Flash Lite model details](https://openrouter.ai/google/gemini-2.5-flash-lite)
- [OpenRouter error handling](https://openrouter.ai/docs/api/reference/errors-and-debugging)
