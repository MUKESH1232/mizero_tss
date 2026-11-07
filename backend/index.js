import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const backendDirectory = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(backendDirectory, '.env')
dotenv.config({ path: envPath })

const requiredEnvironment = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET']
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name])

if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`)
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.')
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

const app = express()
const port = Number(process.env.PORT || 3000)
const sessionCookie = 'mizero_session'
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: sessionDurationMs,
  path: '/',
}
const clearCookieOptions = {
  httpOnly: cookieOptions.httpOnly,
  sameSite: cookieOptions.sameSite,
  secure: cookieOptions.secure,
  path: cookieOptions.path,
}

app.use(helmet())
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
})

function createSession(user, response) {
  const token = jwt.sign(
    { sub: String(user.id), email: user.user_email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  )

  response.cookie(sessionCookie, token, cookieOptions)
}

function validateCredentials({ username, email, password }, includeUsername = false) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Enter a valid email address and password.'
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (
    normalizedEmail.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return 'Enter a valid email address.'
  }

  if ([...password].length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must be at least 8 characters and no more than 72 bytes.'
  }

  if (includeUsername && (
    typeof username !== 'string'
    || username.trim().length === 0
    || username.trim().length > 100
  )) {
    return 'Enter a name between 1 and 100 characters.'
  }

  return null
}

function getAttendanceDate(value) {
  const date = value ?? new Date().toISOString().slice(0, 10)
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }

  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(Date.UTC(year, month - 1, day))
  if (
    parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) return null

  return date
}

async function requireAuth(request, response, next) {
  const token = request.cookies[sessionCookie]
  if (!token) {
    response.status(401).json({ message: 'You are not signed in.' })
    return
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      response.clearCookie(sessionCookie, clearCookieOptions)
      response.status(401).json({ message: 'Your session has expired. Please sign in again.' })
      return
    }

    next(error)
    return
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, user_name, user_email, role FROM signup WHERE id = ? LIMIT 1',
      [payload.sub],
    )
    const user = users[0]

    if (!user) {
      response.clearCookie(sessionCookie, clearCookieOptions)
      response.status(401).json({ message: 'Your account could not be found.' })
      return
    }

    request.authUser = user
    next()
  } catch (error) {
    next(error)
  }
}

function requireStaff(request, response, next) {
  if (request.authUser.role !== 'staff') {
    response.status(403).json({ message: 'Staff access is required to manage student records.' })
    return
  }

  next()
}

const allowedTrades = new Set(['BDC', 'CSA', 'FBO', 'FD', 'Software'])

app.post('/api/auth/register', authRateLimit, async (request, response, next) => {
  const { username, email, password } = request.body ?? {}
  const validationError = validateCredentials({ username, email, password }, true)

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  const normalizedEmail = email.trim().toLowerCase()
  const name = username.trim()

  try {
    const [result] = await pool.execute(
      'INSERT INTO signup (user_name, user_email, password) VALUES (?, ?, ?)',
      [name, normalizedEmail, await bcrypt.hash(password, 12)],
    )
    const user = { id: result.insertId, user_name: name, user_email: normalizedEmail }

    createSession(user, response)
    response.status(201).json({
      message: 'Your account has been created.',
      user: { name: user.user_name, email: user.user_email },
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      response.status(409).json({ message: 'An account with this email already exists.' })
      return
    }

    next(error)
  }
})

app.post('/api/auth/login', authRateLimit, async (request, response, next) => {
  const { email, password } = request.body ?? {}
  const validationError = validateCredentials({ email, password })

  if (validationError) {
    response.status(400).json({ message: validationError })
    return
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, user_name, user_email, password FROM signup WHERE user_email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    )
    const user = users[0]

    if (!user || !(await bcrypt.compare(password, user.password))) {
      response.status(401).json({ message: 'Email or password is incorrect.' })
      return
    }

    await pool.execute(
      'INSERT INTO login_history (user_id) VALUES (?)',
      [user.id],
    )

    createSession(user, response)
    response.json({
      message: 'You are signed in.',
      user: { name: user.user_name, email: user.user_email },
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({
    user: {
      name: request.authUser.user_name,
      email: request.authUser.user_email,
      isStaff: request.authUser.role === 'staff',
    },
  })
})

app.get('/api/students', requireAuth, requireStaff, async (request, response, next) => {
  const attendanceDate = getAttendanceDate(request.query.date)
  if (!attendanceDate) {
    response.status(400).json({ message: 'Enter a valid attendance date.' })
    return
  }

  try {
    const [students] = await pool.execute(
      `SELECT s.id, s.admission_number AS admissionNumber, s.full_name AS name,
        s.trade, s.class_name AS className,
        COALESCE(a.status, 'unmarked') AS attendanceStatus
      FROM students s
      LEFT JOIN student_attendance a
        ON a.student_id = s.id AND a.attendance_date = ?
      ORDER BY s.full_name, s.admission_number`,
      [attendanceDate],
    )
    response.json({ students })
  } catch (error) {
    next(error)
  }
})

app.post('/api/students', requireAuth, requireStaff, async (request, response, next) => {
  const { admissionNumber, name, trade, className } = request.body ?? {}
  const attendanceDate = getAttendanceDate(request.body?.date)
  if (
    typeof admissionNumber !== 'string'
    || admissionNumber.trim().length === 0
    || admissionNumber.trim().length > 40
    || typeof name !== 'string'
    || name.trim().length === 0
    || name.trim().length > 100
    || typeof trade !== 'string'
    || !allowedTrades.has(trade)
    || typeof className !== 'string'
    || className.trim().length === 0
    || className.trim().length > 50
    || !attendanceDate
  ) {
    response.status(400).json({
      message: 'Enter a valid admission number, student name, trade, class, and attendance date.',
    })
    return
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [result] = await connection.execute(
      `INSERT INTO students (admission_number, full_name, trade, class_name, created_by)
      VALUES (?, ?, ?, ?, ?)`,
      [
        admissionNumber.trim(),
        name.trim(),
        trade,
        className.trim(),
        request.authUser.id,
      ],
    )
    // Keep the new student's initial attendance row atomic with the roster record.
    await connection.execute(
      `INSERT INTO student_attendance (student_id, attendance_date, status, recorded_by)
      VALUES (?, ?, 'unmarked', ?)`,
      [result.insertId, attendanceDate, request.authUser.id],
    )
    await connection.commit()

    response.status(201).json({
      message: 'Student added successfully.',
      student: {
        id: result.insertId,
        admissionNumber: admissionNumber.trim(),
        name: name.trim(),
        trade,
        className: className.trim(),
        attendanceStatus: 'unmarked',
      },
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error('Could not roll back student creation:', rollbackError)
      }
    }

    if (error.code === 'ER_DUP_ENTRY') {
      response.status(409).json({ message: 'That admission number is already in use.' })
    } else {
      next(error)
    }
  } finally {
    connection?.release()
  }
})

app.get('/api/attendance/summary', requireAuth, requireStaff, async (request, response, next) => {
  const attendanceDate = getAttendanceDate(request.query.date)
  if (!attendanceDate) {
    response.status(400).json({ message: 'Enter a valid attendance date.' })
    return
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
        COUNT(s.id) AS total,
        COALESCE(SUM(a.status = 'present'), 0) AS present,
        COALESCE(SUM(a.status = 'absent'), 0) AS absent,
        COALESCE(SUM(a.status = 'late'), 0) AS late,
        COALESCE(SUM(a.status IS NULL OR a.status = 'unmarked'), 0) AS unmarked
      FROM students s
      LEFT JOIN student_attendance a
        ON a.student_id = s.id AND a.attendance_date = ?`,
      [attendanceDate],
    )
    response.json({ date: attendanceDate, summary: rows[0] })
  } catch (error) {
    next(error)
  }
})

app.post('/api/attendance', requireAuth, requireStaff, async (request, response, next) => {
  const { studentId, status } = request.body ?? {}
  const attendanceDate = getAttendanceDate(request.body?.date)
  const parsedStudentId = Number(studentId)

  if (
    !Number.isSafeInteger(parsedStudentId)
    || parsedStudentId < 1
    || !['present', 'absent', 'late'].includes(status)
    || !attendanceDate
  ) {
    response.status(400).json({ message: 'Enter a valid student, date, and attendance status.' })
    return
  }

  try {
    await pool.execute(
      `INSERT INTO student_attendance (student_id, attendance_date, status, recorded_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        recorded_by = VALUES(recorded_by),
        updated_at = CURRENT_TIMESTAMP`,
        [parsedStudentId, attendanceDate, status, request.authUser.id],
    )

    response.json({
      message: 'Attendance saved.',
      attendance: { studentId: parsedStudentId, date: attendanceDate, status },
    })
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      response.status(404).json({ message: 'Student not found.' })
      return
    }

    next(error)
  }
})

app.post('/api/auth/logout', (_request, response) => {
  response.clearCookie(sessionCookie, clearCookieOptions)
  response.json({ message: 'You are signed out.' })
})

app.use((error, _request, response, next) => {
  console.error('API request failed:', error)
  if (response.headersSent) {
    next(error)
    return
  }

  response.status(500).json({ message: 'Something went wrong. Please try again.' })
})

try {
  await pool.query('SELECT 1')
  app.listen(port, () => {
    console.log(`Mizero API listening on http://localhost:${port}`)
  })
} catch (error) {
  console.error('Could not connect to MySQL:', error)
  process.exitCode = 1
}
