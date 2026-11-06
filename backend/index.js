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

app.get('/api/auth/me', async (request, response, next) => {
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
      'SELECT user_name, user_email FROM signup WHERE id = ? LIMIT 1',
      [payload.sub],
    )
    const user = users[0]

    if (!user) {
      response.clearCookie(sessionCookie, clearCookieOptions)
      response.status(401).json({ message: 'Your account could not be found.' })
      return
    }

    response.json({ user: { name: user.user_name, email: user.user_email } })
  } catch (error) {
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
