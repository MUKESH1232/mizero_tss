# Mizero TSS

React/Vite frontend and Express/MySQL API for the Mizero Technical Secondary School website.

## Local setup

1. Start MySQL and create the database, for example: `CREATE DATABASE mizero_tss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
2. Run `backend/migrations/001_create_signup.sql` and `backend/migrations/002_create_login_history.sql` against the `mizero_tss` database to create the account and login-history tables.
3. Copy `backend/.env.example` to `backend/.env` and set the MySQL connection values. Use a dedicated MySQL account rather than the MySQL root account. It needs `SELECT` and `INSERT` access to the application's tables; staff student editing and attendance updates also require `UPDATE` on `students` and `student_attendance`. Keep `backend/.env` private and do not commit it.
4. Set `JWT_SECRET` to a private random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
5. Run `npm run dev`. This starts the Vite frontend and Express API. The API reads configuration from `backend/.env` and checks its MySQL connection at startup.

Registration stores the name and normalized email in the `signup` table and stores only a bcrypt password hash. Each successful login adds the user's ID and login timestamp to `login_history`; passwords are never recorded there. Successful registration and login create an HTTP-only session cookie and redirect to the dashboard (`/dashboard`).

To enable student management, apply migrations `003_add_staff_role.sql` and `004_create_students_and_attendance.sql` after migrations 001 and 002. New accounts default to the `student` role. Promote a trusted staff account manually:

```sql
UPDATE signup SET role = 'staff' WHERE user_email = 'staff@example.com';
```

Only staff accounts can manage student records. The dashboard uses `GET /api/students?date=YYYY-MM-DD` to list students, `POST /api/students` to add a student and an initial unmarked attendance row, and `PUT /api/students/:studentId` to edit the student's admission number, name, trade, or class. `GET /api/attendance/summary?date=YYYY-MM-DD` shows the daily totals. `POST /api/attendance` creates an attendance row when one does not exist; `PUT /api/attendance/:studentId` updates an existing row using a JSON body such as `{ "date": "2026-11-11", "status": "present" }`. Non-staff dashboard accounts can browse short descriptions of all five school trades.

The API database user needs `SELECT` and `INSERT` access for account, student, and attendance operations, plus `UPDATE` on both `students` (for `PUT /api/students/:studentId`) and `student_attendance` (for `PUT /api/attendance/:studentId`).

The Vite development server proxies `/api` to the local backend. In production, configure the hosting platform or reverse proxy to route `/api` to Express over HTTPS and set `NODE_ENV=production`.

## Run locally with Docker Desktop

1. Install and start Docker Desktop for Windows. In Settings, enable the WSL 2 engine if Docker Desktop asks.
2. Open this project folder in VS Code, then open **Terminal → New Terminal** at the project root.
3. Start the frontend, API, and MySQL database:

   ```powershell
   docker compose up --build
   ```

   On first startup with a new MySQL volume, MySQL creates the database and loads migrations `001` through `004`. The API runs in its own container, while the frontend container runs Vite only. Wait until both containers stay running and Vite reports its local URL.
4. Open <http://localhost:5173> in your browser. The frontend sends `/api` requests through its Vite proxy to the API container; the API stays on the private Compose network. In Docker Desktop, open **Containers** and select the `mizero_tss` Compose project to see service status and logs.
5. To stop the services, press **Ctrl+C** in the terminal, then run:

   ```powershell
   docker compose down
   ```

   The MySQL data is kept in the `mysql_data` volume, so it remains when containers stop. The database credentials and JWT secret in `compose.yaml` are for local development only; change them before using a deployed environment. MySQL is exposed on host port `3307` to avoid conflicting with a local MySQL server on port `3306`.

MySQL initialization scripts run only when its data volume is empty. If you already started the Docker database before adding migration files 003 and 004, keep your data and apply those two migrations once from the project terminal:

```powershell
docker compose exec -T mysql sh -c "mysql -uroot -plocal-root-password mizero_tss < /docker-entrypoint-initdb.d/003_add_staff_role.sql"
docker compose exec -T mysql sh -c "mysql -uroot -plocal-root-password mizero_tss < /docker-entrypoint-initdb.d/004_create_students_and_attendance.sql"
```

Then rebuild/restart the API and frontend with `docker compose up --build`. To enable staff features, promote your account using the SQL above through a MySQL client (in Docker, connect to `localhost:3307` as `root` with the local development password from `compose.yaml`). Do not run `docker compose down -v` unless you intend to delete the database volume.
