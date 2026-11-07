# Mizero TSS

React/Vite frontend and Express/MySQL API for the Mizero Technical Secondary School website.

## Local setup

1. Start MySQL and create the database, for example: `CREATE DATABASE mizero_tss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
2. Run `backend/migrations/001_create_signup.sql` and `backend/migrations/002_create_login_history.sql` against the `mizero_tss` database to create the account and login-history tables.
3. Copy `backend/.env.example` to `backend/.env` and set the MySQL connection values. Use a dedicated MySQL account with only the permissions needed by the application rather than the MySQL root account. Keep `backend/.env` private and do not commit it.
4. Set `JWT_SECRET` to a private random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
5. Run `npm run dev`. This starts the Vite frontend and Express API. The API reads configuration from `backend/.env` and checks its MySQL connection at startup.

Registration stores the name and normalized email in the `signup` table and stores only a bcrypt password hash. Each successful login adds the user's ID and login timestamp to `login_history`; passwords are never recorded there. Successful registration and login create an HTTP-only session cookie and redirect to the personalized dashboard (`/dashboard`). Newly registered accounts have the `student` role and cannot access student records.

To enable student management, apply migrations `003_add_staff_role.sql`, `004_create_students_and_attendance.sql`, and `005_add_unmarked_attendance.sql` after migrations 001 and 002. Promote trusted staff accounts manually using their verified email address, for example:

```sql
UPDATE signup SET role = 'staff' WHERE user_email = 'staff@example.com';
```

Only staff accounts can use the dashboard's student and attendance management interface. `GET /api/students?date=YYYY-MM-DD` lists students with attendance for that date; `POST /api/students` creates a student and an initial `unmarked` attendance record for the selected date in one transaction. `GET /api/attendance/summary?date=YYYY-MM-DD` returns the daily totals; `POST /api/attendance` records or updates a student's status (`present`, `absent`, or `late`) for a date. `GET /api/auth/me` returns the current user and staff flag, and `POST /api/auth/logout` signs out.

The API's attendance upsert requires both `INSERT` and `UPDATE` privileges on `student_attendance`. If attendance saving reports `UPDATE command denied`, connect to MySQL as an administrator and grant the missing table-level privilege to the same database account configured in `backend/.env`:

```sql
GRANT UPDATE ON mizero_tss.student_attendance TO 'mizero_app'@'localhost';
```

Replace the database, account, or host with the values used in your setup. Restart the API after changing grants so it reconnects with the updated permissions.

The Vite development server proxies `/api` to the local backend. In production, configure the hosting platform or reverse proxy to route `/api` to Express over HTTPS and set `NODE_ENV=production`.
