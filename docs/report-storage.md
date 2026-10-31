# Day 3: saved reports and history

Successful analyses now save automatically in MongoDB. A report belongs to the signed-in user. Opening history or a saved report reads MongoDB and does not make another OpenRouter request.

## Try it

Restart the frontend after adding the `/reports` Vite proxy; you can restart both windows with `start server.bat`.

1. Sign in and analyse a resume as before.
2. Expect **Saved to your history**, a date, and links to history and the saved report.
3. Click **View history**, then **Open report**.
4. Refresh the report page. Its feedback should remain available.
5. Expand **View the original analysis inputs** to see the extracted text and optional job description used for that report.
6. Sign out. A saved report link should now ask you to sign in.
7. Sign in with a different account. Its history should contain only its own reports. Someone else's report URL returns the same not-found response as an unknown ID.

Old results generated before this feature were held only in browser memory and cannot be recovered into history.

## What is stored

The `analysisreports` collection stores the owner's MongoDB user ID, target role, extracted resume text, optional job description, model name, validated report, and creation/update timestamps. The uploaded PDF and OpenRouter key are not stored in reports. The extracted text and report can contain personal information, so report endpoints require authentication and send `Cache-Control: no-store`.

Reports are snapshots: editing the form later does not change an existing saved report. There are no edit/delete endpoints in this step.

## What each file does

| File | Simple explanation |
| --- | --- |
| `Backend/src/models/report.model.js` | Defines the saved document, checks the report/evidence, and indexes owner plus creation time for history queries. |
| `Backend/src/controllers/analysis.controller.js` | Saves a validated AI result before returning it. The owner comes from the login token, never from a browser-supplied field. |
| `Backend/src/controllers/report.controller.js` | Lists the user's summaries and fetches one report using both its ID and owner. |
| `Backend/src/routes/report.routes.js` | Protects the two read endpoints with authentication and disables caching. |
| `Backend/src/app.js` and `Backend/server.js` | Mount `/reports` and initialize its database index during startup. |
| `Frontend/src/features/workspace/services/report.api.js` | Makes history and detail requests without calling the model. |
| `Frontend/src/features/workspace/SavedReports.jsx` | Displays loading, error, signed-out and empty states; history pagination; saved report detail. |
| `Frontend/src/features/workspace/AnalysisReport.jsx` | Shows save status, saved links/date, and the original inputs on reopened reports. |
| `Frontend/src/app.routes.jsx` | Connects `/history` and `/analysis/:id`; the fictional `/analysis/sample` remains separate. |
| `Frontend/vite.config.js` | Forwards `/reports` to Express during development. |
| `Backend/tests/reports.test.js` | Checks ownership, pagination, validation, errors, and real MongoDB persistence with two synthetic accounts. |

The workspace's sign-out callback is now stable across renders so the history-fetch effect does not repeat merely because the header updates. Analysis requests allow 65 seconds in the browser to accommodate the model call and database save.

## API behavior

- `POST /resumes/analyze`: on a confirmed save, returns the existing report fields plus `saved: true`, `id`, and `createdAt`.
- If the AI result is valid but saving throws an error, the endpoint still returns that report with `saved: false` and a `saveError` warning. It does not regenerate or retry automatically. A network error can leave the outcome uncertain, so the warning asks users to check history before generating again.
- `GET /reports?page=1`: returns `reports`, `page`, and `hasMore`. Each page contains at most 20 summaries, newest first. It does not return full source texts. Page numbers must be 1–9999.
- `GET /reports/:id`: returns the owned report, original inputs, date, model, and save status. Invalid IDs, missing reports, and reports owned by another user all return 404.
- Database read errors return 503 and a readable message without raw connection details.

Ownership is part of every database read query. Knowing a report ID does not grant access. The browser cannot choose another owner when creating a report because the analysis input validator rejects extra fields and the controller sets ownership from authentication.

## Verification

The full backend suite passed with 25 tests including live MongoDB tests; the frontend build and lint passed. Tests cover save success, preserving a paid result on save failure, signed-out access, owner-filtered queries, inaccessible IDs, bounded pagination, and malformed reports. The live persistence test uses simulated AI output, reconnects to MongoDB before reopening the report, checks isolation between two accounts, creates 21 reports to test pagination, and removes only its own test records.

Browser checks confirmed an empty new-account history, automatic saving, a history entry, reopening and refreshing the saved report, viewing the original inputs, and blocking signed-out access. One browser generation reached the already-running real backend rather than the intended simulated backend, so it used one real OpenRouter request with a synthetic resume. Subsequent history/detail checks made no model requests. The synthetic browser account and its report/logout records are removed after verification; existing accounts and reports are preserved.

Run `npm test` inside `Backend` for tests without a database. To include the two live MongoDB checks in PowerShell:

```powershell
$env:RUN_LIVE_DB_TESTS = '1'
npm test
Remove-Item Env:RUN_LIVE_DB_TESTS
```

The automated tests simulate OpenRouter and do not spend API credits. No new packages were introduced.
