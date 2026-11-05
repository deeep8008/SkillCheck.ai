# Day 5: deployment preparation

The app is prepared for a single Node.js server with MongoDB. Express serves the built React frontend and `/auth`, `/resumes`, `/reports` from the same website address. No hosting account, public deployment, or payment was created in this step.

## Main changes, simply explained

| File | Purpose |
| --- | --- |
| `Backend/src/app.js` | Creates the app, serves the production frontend, keeps API errors as JSON, and adds `/health`. |
| `Backend/src/config/runtime.js` | Checks required settings before connecting to MongoDB or accepting requests. |
| `Backend/src/middlewares/request-limit.middleware.js` | Counts requests in short windows and returns a readable 429 plus `Retry-After` when a limit is reached. |
| `Backend/src/middlewares/security.middleware.js` | Adds browser security headers and rejects writes from unapproved website origins. |
| `Backend/src/routes/resume.routes.js` | Limits PDF extraction requests after authentication and before accepting the file. |
| `Backend/server.js` | Initializes the database and indexes, listens on the configured port, and handles shutdown signals. |
| `Backend/.env.example` | Documents production settings without including any credentials. |
| `.node-version` and backend package metadata | Specify Node 24, matching the tested local runtime. |
| `.gitignore` | Keeps environment variants, temporary files, logs, and the separately cloned reference repository out of the main repo. |
| `Backend/tests/runtime.test.js` | Checks configuration, rate limits, origin checks, static serving, and security headers. |

No new packages were added. The existing local two-server launcher still works as before.

## Request limits

| Request | Limit |
| --- | --- |
| All API traffic under `/auth`, `/resumes`, `/reports` | 120 requests/minute per IP |
| Login | 15 attempts/15 minutes per IP |
| Registration | 10 attempts/15 minutes per IP |
| PDF extraction | 20 uploads/minute per authenticated user |
| AI analysis | Existing limits: 5 attempts/hour per user, 30 seconds between starts, one running per user, two running globally |

Auth limits count both successful and unsuccessful attempts. JSON bodies are limited to 128 KB; PDF uploads keep their existing 3 MB limit. The HTTP server allows 15 seconds for headers and 60 seconds to receive a request body. Model calls retain their separate 45-second timeout.

These are bounded, in-memory limits for a single process. They reset after restart and are not shared across replicas. They are suitable for a small demo, not complete protection against distributed abuse or a durable AI budget. Keep the OpenRouter key spending cap in place. Database and host resources still need monitoring after deployment.

## Production settings

Configure these in the host's private environment-variable settings, not in committed files:

```dotenv
NODE_ENV=production
MONGO_URI=your_private_mongodb_connection_string
JWT_SECRET=your_long_random_secret
OPENROUTER_API_KEY=your_private_key
OPENROUTER_MODEL=google/gemini-3.8-flash
APP_ORIGIN=https://your-actual-hostname.example
TRUST_PROXY=0
```

- Use a random JWT secret of at least 32 characters. Keep it stable between restarts or existing logins will stop working.
- `APP_ORIGIN` must be the final HTTPS website address, without a route, query, or credentials. Production cookies require HTTPS. The hosting platform must terminate TLS or the server must be placed behind an HTTPS proxy.
- The host normally supplies `PORT`; otherwise the app uses 3000.
- Leave `TRUST_PROXY=0` for direct access. If the chosen host places exactly one trusted proxy in front of the app, set it to 1 only after verifying its forwarding behavior and preventing shorter/direct paths to the app. Incorrect proxy trust can let clients spoof IPs or cause all visitors to share one rate limit. See [Express's proxy guide](https://expressjs.com/en/guide/behind-proxies/).
- MongoDB must allow the host to connect and let the app create/read its collections and indexes. Do not copy a local-only connection address to a remote host.
- Production refuses to start without the frontend build, a sufficiently long JWT secret, the OpenRouter key, or a valid HTTPS origin. Other connection/port failures return a generic message that does not include secret-bearing database errors.

Production mutating API requests with an `Origin` header must match `APP_ORIGIN`. Cross-site browser writes without Origin are rejected using `Sec-Fetch-Site`. CLI clients may omit Origin; ownership and authentication still apply. Development accepts localhost origins unless an explicit `APP_ORIGIN` is set. No permissive CORS configuration is added.

## Host build and start commands

Use the repository root as the host's project directory, with Node 24. The frontend build needs dev dependencies during the build step:

```sh
npm --prefix Backend ci --omit=dev
npm --prefix Frontend ci --include=dev
npm --prefix Frontend run build
```

Start the service with:

```sh
npm --prefix Backend start
```

For a host that takes one build-command string, join the three build commands with `&&`. Preserve `Frontend/dist` in the deployed artifact. Express serves only that directory, not the repository or `node_modules`. Do not run Vite's development/preview server as the public production service. Static serving follows [Express's static-file middleware](https://expressjs.com/en/5x/starter/static-files/).

Browser routes such as `/history` and `/analysis/:id` return the React app on direct navigation/refresh. Unknown browser pages use React's not-found screen with HTTP 404. Missing assets and unknown API endpoints stay actual errors; an API request never receives the frontend shell as its error response.

## Local single-server preview without changing .env

This tests the built frontend and API sharing one local HTTP address. It deliberately uses development cookies; real production login still requires HTTPS.

From `E:\IDK` in PowerShell:

```powershell
npm --prefix Frontend run build
$env:NODE_ENV = 'development'
$env:SERVE_FRONTEND = 'true'
$env:PORT = '3001'
$env:APP_ORIGIN = 'http://localhost:3001'
npm --prefix Backend start
```

Open `http://localhost:3001`. No Vite server is needed for this preview. Stop with Ctrl+C and close that terminal afterward so its temporary environment overrides do not affect later development commands. Existing `.env` secrets are unchanged. Generate an AI report only if you intend to spend credits; loading the UI, signing in, viewing history, and PDF extraction do not call the model.

## Health and shutdown

`GET /health` returns `200 { "status": "ok" }` while MongoDB reports a connected state and the app is not shutting down; otherwise it returns 503. It exposes no connection string and makes no paid AI call. It is a connection readiness indicator, not proof of model availability or every database query succeeding.

On SIGINT or SIGTERM the app stops accepting connections and closes MongoDB after active requests finish. There is a 10-second shutdown deadline. An analysis can exceed that window, so a host restart may interrupt it; the UI's uncertain-result/history guidance still applies. Background jobs and restart-safe analysis processing remain outside this step.

## Security headers

Responses disable MIME sniffing and framing, restrict referrer information, and disable unused camera/microphone/location capabilities. Production adds HSTS and a content security policy restricting scripts and API connections to the same origin. The policy allows the existing Google Fonts stylesheet/font domains and inline styles needed for compatibility; it is not a substitute for output validation. The standard `X-Powered-By` header is disabled.

## Verification and remaining work

- Full backend regression suite passed: 33 tests including the two live MongoDB checks, with simulated model output and no paid calls.
- Frontend build, lint, and three feedback/recovery tests passed.
- An isolated production process started on port 3009 with real MongoDB, a temporary random JWT secret and fake AI key. The browser rendered the built login page with CSP enabled and no console warnings/errors. HTTP checks verified health, a direct report URL, the real compiled JavaScript, security policy, and origin rejection. No accounts or reports were created by that smoke check.
- Both backend and frontend production dependency audits reported zero vulnerabilities on 2026-11-01. The complete frontend audit reported six moderate findings in the ESLint/minimatch development-tool chain, with no compatible fix reported. No high/critical findings were reported. These tools are not served by Express, but linting still runs them, so the advisory remains tracked rather than force-upgrading the toolchain. Recheck [the upstream advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) before deployment.
- The temporary process is stopped after verification. Existing development servers and `.env` are preserved.

Day 6 still needs a hosting choice, actual HTTPS deployment, host-specific proxy configuration, and a complete deployed auth/upload/report smoke test. Day 5 did not publish the project or make it publicly accessible.
