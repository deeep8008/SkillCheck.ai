# realitycheck.ai

A resume analyser built specifically for developers. Users upload their resume and enter a target job role — the app uses AI to analyse the resume and returns detailed feedback on what's good, what's bad, and why they might not land the job.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express v5
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (stored as cookies)
- **Password Hashing**: bcryptjs
- **Environment**: dotenv

## Project Structure

```
├── server.js                        # Entry point
├── .env                             # Secrets (not committed)
├── src/
│   ├── app.js                       # Express app, middleware, routes
│   ├── config/
│   │   └── database.js              # MongoDB connection
│   ├── models/
│   │   └── user.model.js            # User schema
│   ├── controllers/
│   │   └── auth.controller.js       # Register & login logic
│   └── routes/
│       └── auth.routes.js           # Auth routes
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login with email & password |

## Running the Project

```bash
npm run dev    # with nodemon (auto-restart)
npm start      # plain node
```

Server runs on `http://localhost:3000`

## What's Built

- [x] Project setup (Express, Mongoose, dotenv)
- [x] User model (username, email, password)
- [x] Register endpoint with bcrypt password hashing
- [x] Login endpoint with JWT cookie
- [x] Proper HTTP status codes (400, 401, 404, 409, 500)
- [x] Git initialised with .gitignore

## What's Left to Build

- [ ] Logout endpoint
- [ ] Auth middleware (protect routes with JWT)
- [ ] Resume upload (PDF parsing)
- [ ] AI integration (Gemini API) for resume analysis
- [ ] Store analysis results in MongoDB
- [ ] Frontend
- [ ] Deployment
