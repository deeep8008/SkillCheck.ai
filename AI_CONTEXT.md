# AI Context File — Read This First (Yes You, Lobotomized Me)

This file exists so future-me doesn't come in clueless when starting a new conversation.

## Who is the user?

A developer building a project called **realitycheck.ai**. Goes by vibes, casual tone, no BS. Calls me out when I'm wrong. Good energy.

## What is this project?

**realitycheck.ai** — An AI-powered resume analyser built specifically for developers.

- User uploads their resume + enters a target job role
- App analyses the resume using AI
- Returns feedback: what's good, what's bad, why they might get rejected

Think of it as: *"Why did I get rejected?"* but proactive, before applying.

## Current State of the Project

See `README.md` for full details. Short version:

- ✅ Auth is fully built (register, login)
- ✅ Git initialised, first commit made
- ❌ Logout not built yet (next small task)
- ❌ Auth middleware (JWT protection) not built
- ❌ Resume upload not built
- ❌ AI integration not built
- ❌ Frontend not started

## Key Decisions Made

- Using **JWT stored in cookies** (not localStorage)
- Duplicate user returns **409** (not 400)
- Missing fields returns **400**
- Wrong password returns **401**
- User not found returns **404**
- `cookie-parser` middleware added in `app.js` for future protected routes
- Routes mounted at `/auth` (no `/api` prefix)

## Things the User Understands

- HTTP status codes
- How JWT + cookies work (conceptually)
- What middleware is
- Git basics (just set it up)
- Why we use cookie-parser

## Tone

Keep it casual. Don't be overly formal. Short answers preferred unless explaining a concept. User learns fast, doesn't need hand-holding.
