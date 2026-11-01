# SkillCheck.ai

An AI resume analyser for developers, built with JavaScript, Express, MongoDB, React and Vite.

Sign in, upload a text-based PDF, enter a target role and optional job description, then request feedback. Reports include strengths, gaps in the evidence, possible screening concerns, suggested edits, source excerpts and edit priorities. Successful reports are saved privately to the signed-in account.

AI feedback is for review and can be wrong. The app does not predict hiring outcomes or verify the truth of resume claims.

## Run locally

Use Node 24 and a reachable MongoDB database. Install dependencies from the repository root:

```powershell
npm --prefix Backend ci
npm --prefix Frontend ci
```

Create `Backend/.env` from [the example](Backend/.env.example) if it does not already exist. Preserve any existing secrets. Set `MONGO_URI`, `JWT_SECRET`, and `OPENROUTER_API_KEY`; the default model is `google/gemini-2.5-flash-lite`. Never put the key in frontend code or commit your `.env`.

Double-click **start server.bat** to open both development servers and the browser. Alternatively run `npm run dev` inside `Backend` and `Frontend` in separate terminals. Close existing server windows before launching another pair.

PDF extraction works without an AI key in development. Clicking **Analyse resume** sends the extracted text, role and job description to OpenRouter and its selected model provider and uses API credits. The PDF itself is not saved; successful analyses store the text and feedback in MongoDB. Viewing saved history makes no model request.

## Checks

Inside `Backend`, run `npm test`. The two live MongoDB checks are opt-in:

```powershell
$env:RUN_LIVE_DB_TESTS = '1'
npm test
Remove-Item Env:RUN_LIVE_DB_TESTS
```

These tests use synthetic data and simulated OpenRouter responses, not paid model calls. The live checks create and clean up only their own test records.

Inside `Frontend`:

```powershell
npm run build
npm run lint
node --test tests/analysis-feedback.test.mjs
```

## Main API routes

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Cookie-based authentication |
| GET | `/auth/me` | Current signed-in account |
| POST | `/resumes` | Authenticated PDF extraction, up to 3 MB |
| POST | `/resumes/analyze` | Authenticated AI analysis and automatic report saving |
| GET | `/reports?page=1` | Current user's report summaries, 20 per page |
| GET | `/reports/:id` | One report owned by the current user |
| GET | `/health` | Database connection readiness |

## Deployment

The production Express server serves `Frontend/dist` and the API from one HTTPS website. See [deployment settings, request limits and preview commands](docs/deployment.md). Hosting and public deployment are not configured yet. In-memory request limits target a small single-process demo; they are not distributed limits or a hard account spending cap.

## Walkthroughs

- [PDF upload and extraction](docs/resume-upload.md)
- [OpenRouter analysis](docs/resume-analysis.md)
- [Saved reports and ownership](docs/report-storage.md)
- [Report quality and error recovery](docs/report-quality.md)

GitHub code review, RAG, queues, resume comparisons and report editing/deletion are not implemented. `reference-interview-ai/` is a separately cloned reference repository and is excluded from this repository.
