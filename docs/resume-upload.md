# Resume upload: browser to extracted text

This document describes the Day 1 PDF extraction step. Extraction does not call an AI model or save a resume/report. Day 2 adds a separate analysis action; see [resume-analysis.md](resume-analysis.md) for the current AI flow and setup.

## Follow one request

1. `Frontend/src/features/workspace/Workspace.jsx` holds the selected file in React state. **Extract text** checks that a file is selected, disables the form while waiting, and calls the API helper. Target role and job description are optional local inputs for a future step; they are not sent.
2. `Frontend/src/features/workspace/services/resume.api.js` puts the file in `FormData` under the exact field name `resume`, then sends `POST /resumes` using Axios. The browser supplies the multipart content-type boundary. The request has a 60-second timeout.
3. `Frontend/vite.config.js` forwards `/resumes` to `http://localhost:3000`, just as it already forwards `/auth`. The browser talks to the Vite origin, so its existing login cookie accompanies the same-origin request without adding `withCredentials`.
4. `Backend/src/routes/resume.routes.js` runs three functions in order: `authUser` checks the cookie, `uploadResume` validates and holds the PDF in memory, then `extractResume` parses its text.
5. The backend returns `resume: { filename, pageCount, text }`. The dashboard displays it as plain text. It clears the preview when selecting/removing a file, leaving the page, or refreshing. Nothing is written to browser storage.

If authentication returns 401, the dashboard offers a sign-in link. Login and registration return to `/` after success. Select the PDF again after returning; navigating away clears the form. The workspace checks `/auth/me` when it opens, shows the signed-in username, and offers sign out. Sample pages stay publicly accessible; the backend enforces authentication for uploads.

## Try it locally

Start the configured backend with `npm start` inside `Backend`, and Vite with `npm run dev` inside `Frontend`. MongoDB must be available for authentication. Restart Vite after changing its proxy configuration.

- Sign in using an existing account, then select a small text-based PDF and click **Extract text**. Expect its text, filename and page count, marked **Not saved**.
- A target role is not required for extraction. Entering a role or job description should not change the extracted text.
- With no file, expect a local validation message. Try an empty PDF, a file over 3 MB, and a damaged PDF for error handling.
- While extraction is running, the form is disabled. Replace/remove the file afterward and check that the old preview disappears.
- In a signed-out browser session, upload a valid PDF. Expect a sign-in message and link. Login should return to the workspace.
- With the backend stopped, expect an error and an enabled retry button afterward.

The Vite proxy is for local development. A deployed frontend will need its host to route `/auth` and `/resumes` to the backend too.

## Verification for this change

Frontend production build and ESLint passed. The backend has 12 tests: 11 run without MongoDB; one additional live test is enabled explicitly. The PDF tests use real parsing and mock the blacklist lookup. The live test exercises registration, duplicate-account handling, password hashing, username/email login, cookie flags, session lookup, PDF extraction, expired tokens, logout, rejected token reuse, and immediate login after logout.

Run the default tests with `npm test` inside `Backend`. To include the live test in PowerShell:

```powershell
$env:RUN_LIVE_DB_TESTS = '1'
npm test
Remove-Item Env:RUN_LIVE_DB_TESTS
```

The live test uses the configured MongoDB database, creates a uniquely named synthetic user, and removes only its own user and blacklist records. It requires read/write permissions and does not drop databases or collections.

Browser checks passed for registration redirect, signed-in display, PDF extraction, damaged-PDF error and cleared preview, session persistence after reload, sign out, incorrect-password error and retry, and blocking uploads when signed out. Only synthetic account details and a generated PDF were used.

## Day 1 fixes, in plain language

- `Backend/server.js` and `src/config/database.js`: wait for the database and indexes before listening. Stop with a safe message if configuration or database access fails.
- `Backend/src/config/auth-cookie.js`: one shared cookie configuration. JavaScript cannot read the token; cross-site cookie sending is restricted; production cookies require HTTPS; login lasts one day.
- `Backend/src/controllers/auth.controller.js`: validate new accounts before querying MongoDB, normalize email addresses, issue a unique token for each login, and clear cookies consistently on logout. Unknown accounts and wrong passwords return the same login error. Missing user records return 401.
- `Backend/src/middlewares/auth.middlewares.js`: check the token before querying the blacklist; report database failures as temporary service errors rather than invalid logins.
- `Backend/src/models/user.model.js`: enforce unique usernames only for records with a string username. Three existing records without usernames are preserved; new accounts still require a username.
- `Backend/src/app.js`: prevent caching auth responses and return JSON for malformed request bodies.
- `Backend/package.json`: use Node's built-in watch mode for `npm run dev`, removing reliance on undeclared nodemon.
- Frontend auth pages/services and workspace: return after registration/login, check the current session, display the username, support logout, and bound how long auth requests wait.
- `Backend/tests/auth.test.js`, `server.test.js`, and `test-support/pdf.js`: add auth/startup checks and share the generated PDF fixture with the existing upload tests.

Day 2 adds AI integration and basic analysis request limits, documented separately. Saved reports and deployment remain later steps. Extraction alone uses no OpenRouter credits.
