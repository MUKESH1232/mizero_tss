# Mizero TSS

React/Vite frontend and Express/MySQL API for the Mizero Technical Secondary School website.

## Local setup

1. Start MySQL and create the database, for example: `CREATE DATABASE mizero_tss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
2. Run `backend/migrations/001_create_signup.sql` and `backend/migrations/002_create_login_history.sql` against the `mizero_tss` database to create the account and login-history tables.
3. Copy `backend/.env.example` to `backend/.env` and set the MySQL connection values. Use a dedicated MySQL account with `SELECT` and `INSERT` access to the application's tables rather than the MySQL root account. Keep `backend/.env` private and do not commit it.
4. Set `JWT_SECRET` to a private random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
5. Run `npm run dev`. This starts the Vite frontend and Express API. The API reads configuration from `backend/.env` and checks its MySQL connection at startup.

Registration stores the name and normalized email in the `signup` table and stores only a bcrypt password hash. Each successful login adds the user's ID and login timestamp to `login_history`; passwords are never recorded there. Successful registration and login create an HTTP-only session cookie and redirect to the personalized student dashboard (`/dashboard`). The dashboard checks the current session with `GET /api/auth/me` and provides a sign-out action. API endpoints are `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.

The Vite development server proxies `/api` to the local backend. In production, configure the hosting platform or reverse proxy to route `/api` to Express over HTTPS and set `NODE_ENV=production`.
