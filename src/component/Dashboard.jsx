import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bdcImage from '../assets/trade-bdc.jpg'
import csaImage from '../assets/trade-csa.jpg'
import fboImage from '../assets/trade-fbo.jpg'
import fashionImage from '../assets/trade-fashion.jpg'
import softwareImage from '../assets/trade-software.jpg'

const trades = [
  {
    code: 'BDC',
    name: 'Building and Construction',
    path: '/bdc',
    image: bdcImage,
    description: 'Learn how buildings take shape, from planning and measuring to practical construction skills.',
  },
  {
    code: 'CSA',
    name: 'Computer Systems and Architecture',
    path: '/csa',
    image: csaImage,
    description: 'Explore computer hardware, system components, and the technology behind digital devices.',
  },
  {
    code: 'FBO',
    name: 'Food and Beverage Operations',
    path: '/fbo',
    image: fboImage,
    description: 'Build practical skills in food preparation, service, and hospitality operations.',
  },
  {
    code: 'FD',
    name: 'Fashion Design',
    path: '/fd',
    image: fashionImage,
    description: 'Turn creative ideas into garments by exploring design, materials, and making techniques.',
  },
  {
    code: 'SW',
    value: 'Software',
    name: 'Software Development',
    path: '/software',
    image: softwareImage,
    description: 'Discover how to plan, build, and improve software for real-world needs.',
  },
]
const attendanceStatuses = ['present', 'absent', 'late']

function formatSystemDate(value) {
  if (!value) return 'Loading…'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

async function readJson(response) {
  const result = await response.json()
  if (!response.ok) {
    const error = new Error(result.message || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return result
}

async function loadStudentRecords() {
  const result = await readJson(await fetch('/api/students', { credentials: 'same-origin' }))
  return {
    attendanceDate: result.attendanceDate,
    students: result.students,
    summary: result.summary,
  }
}

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState(null)
  const [attendanceDate, setAttendanceDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [savingStudent, setSavingStudent] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [savingAttendance, setSavingAttendance] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const result = await readJson(await fetch('/api/auth/me', { credentials: 'same-origin' }))
        if (active) setUser(result.user)
      } catch (requestError) {
        if (!active) return
        if (requestError.status === 401) {
          navigate('/login', { replace: true })
        } else {
          setError(requestError.message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUser()
    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    if (!user?.isStaff) return undefined

    let active = true
    loadStudentRecords()
      .then(({ attendanceDate: nextDate, students: nextStudents, summary: nextSummary }) => {
        if (!active) return
        setAttendanceDate(nextDate)
        setStudents(nextStudents)
        setSummary(nextSummary)
        setError('')
      })
      .catch((requestError) => {
        if (!active) return
        if (requestError.status === 401) {
          navigate('/login', { replace: true })
        } else {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (active) setRecordsLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate, user?.isStaff])

  async function refreshRecords() {
    const result = await loadStudentRecords()
    setAttendanceDate(result.attendanceDate)
    setStudents(result.students)
    setSummary(result.summary)
  }

  async function saveStudent(event) {
    event.preventDefault()
    const form = event.currentTarget
    const studentData = Object.fromEntries(new FormData(form).entries())
    const isEditing = Boolean(editingStudent)
    setSavingStudent(true)
    setError('')
    setNotice('')

    try {
      const result = await readJson(await fetch(
        isEditing ? `/api/students/${editingStudent.id}` : '/api/students',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(studentData),
        },
      ))
      form.reset()
      setEditingStudent(null)
      setNotice(result.message)
      try {
        await refreshRecords()
      } catch {
        setError('Student was saved, but the roster could not be refreshed.')
      }
    } catch (requestError) {
      if (requestError.status === 401) navigate('/login', { replace: true })
      else setError(requestError.message || `Student could not be ${isEditing ? 'updated' : 'added'}.`)
    } finally {
      setSavingStudent(false)
    }
  }

  async function saveAttendance(student, status) {
    setSavingAttendance(student.id)
    setError('')
    setNotice('')

    const hasRecord = Boolean(student.attendanceId)
    const url = hasRecord ? `/api/attendance/${student.id}` : '/api/attendance'
    const method = hasRecord ? 'PUT' : 'POST'
    const body = hasRecord
      ? { status }
      : { studentId: student.id, status }

    try {
      const result = await readJson(await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      }))
      await refreshRecords()
      setNotice(result.message)
    } catch (requestError) {
      if (requestError.status === 401) navigate('/login', { replace: true })
      else setError(requestError.message || 'Attendance could not be saved.')
    } finally {
      setSavingAttendance(null)
    }
  }

  async function signOut() {
    setSigningOut(true)
    setError('')
    try {
      await readJson(await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      }))
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Could not sign out.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return <section className="portal-state" role="status">Loading your dashboard…</section>
  }

  if (!user) {
    return (
      <section className="portal-state">
        <p role="alert">{error || 'Your account could not be loaded.'}</p>
        <Link className="button button-primary" to="/login">Return to sign in</Link>
      </section>
    )
  }

  const firstName = user.name.trim().split(/\s+/)[0]
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return (
    <div className="portal">
      <aside className="portal-sidebar">
        <Link className="brand portal-brand" to="/">
          <span className="brand-mark">M</span>
          <span className="brand-copy"><strong>MIZERO TSS</strong><small>Student portal</small></span>
        </Link>
        <nav className="portal-nav" aria-label="Dashboard">
          <a className="portal-nav-active" href="#overview">Overview</a>
          {!user.isStaff && <a href="#programs">Explore trades</a>}
          {user.isStaff && <a href="#student-management">Students & attendance</a>}
          <a href="/#trades">Explore programs</a>
        </nav>
        <div className="portal-sidebar-note">
          <span>✳</span>
          <strong>Skills for today.<br />Hope for tomorrow.</strong>
          <p>Learning today. Leading tomorrow.</p>
        </div>
        <Link className="portal-back" to="/">← Back to school site</Link>
      </aside>

      <main className="portal-main" id="overview">
        <header className="portal-topbar">
          <div>
            <span className="portal-overline">MIZERO TSS · {user.isStaff ? 'STAFF PORTAL' : 'STUDENT PORTAL'}</span>
            <p>Your learning space</p>
          </div>
          <div className="portal-profile">
            <span className="portal-avatar" aria-hidden="true">{initials}</span>
            <span>{user.name}</span>
            <button type="button" onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        {error && <p className="portal-message portal-error" role="alert">{error}</p>}
        {notice && <p className="portal-message portal-success" role="status">{notice}</p>}

        <section className="portal-hero">
          <span className="portal-overline">YOUR MIZERO JOURNEY</span>
          <h1>Welcome, {firstName}.</h1>
          <p>Explore practical pathways and start shaping what comes next.</p>
          <a className="portal-hero-link" href={user.isStaff ? '#student-management' : '#programs'}>
            {user.isStaff ? 'Manage students' : 'Explore programs'} <span aria-hidden="true">↗</span>
          </a>
          <span className="portal-hero-mark" aria-hidden="true">M</span>
        </section>

        {user.isStaff ? (
          <section className="portal-management" id="student-management">
            <div className="portal-heading">
              <div><span className="portal-overline">STAFF WORKSPACE</span><h2>Students & attendance</h2></div>
              <div className="portal-date">
                <span>Attendance date · system set</span>
                <output>{formatSystemDate(attendanceDate)}</output>
              </div>
            </div>

            <div className="portal-summary" aria-label="Attendance summary">
              <article><span>Total students</span><strong>{summary?.total ?? '—'}</strong></article>
              <article><span>Present</span><strong>{summary?.present ?? '—'}</strong></article>
              <article><span>Absent</span><strong>{summary?.absent ?? '—'}</strong></article>
              <article><span>Late</span><strong>{summary?.late ?? '—'}</strong></article>
              <article><span>Not marked</span><strong>{summary?.unmarked ?? '—'}</strong></article>
            </div>

            <div className="portal-columns">
              <section className="portal-card">
                <span className="portal-overline">STUDENT RECORDS</span>
                <h3>{editingStudent ? 'Edit student' : 'Add a student'}</h3>
                <form className="portal-form" key={editingStudent?.id ?? 'new-student'} onSubmit={saveStudent}>
                  <label>Admission number<input name="admissionNumber" maxLength="40" defaultValue={editingStudent?.admissionNumber || ''} required /></label>
                  <label>Student full name<input name="name" maxLength="100" defaultValue={editingStudent?.name || ''} required /></label>
                  <label>Trade<select name="trade" defaultValue={editingStudent?.trade || ''} required>
                    <option value="" disabled>Select a trade</option>
                    {trades.map((trade) => <option key={trade.code} value={trade.value || trade.code}>{trade.code}</option>)}
                  </select></label>
                  <label>Class<input name="className" maxLength="50" placeholder="e.g. Level 3" defaultValue={editingStudent?.className || ''} required /></label>
                  <button className="button button-primary" type="submit" disabled={savingStudent}>
                    {savingStudent ? 'Saving…' : editingStudent ? 'Save changes' : 'Add student'}
                  </button>
                  {editingStudent && (
                    <button className="portal-cancel-edit" type="button" onClick={() => setEditingStudent(null)}>
                      Cancel editing
                    </button>
                  )}
                </form>
              </section>

              <section className="portal-card portal-roster">
                <div className="portal-roster-heading">
                  <div><span className="portal-overline">SCHOOL ROSTER</span><h3>Student list</h3></div>
                  <span>{students.length} {students.length === 1 ? 'student' : 'students'}</span>
                </div>
                {recordsLoading ? <p className="portal-empty" role="status">Loading records…</p>
                  : students.length === 0 ? <p className="portal-empty">No students added yet.</p>
                    : (
                      <div className="portal-table-scroll">
                        <table className="portal-table">
                          <thead><tr><th>Student</th><th>Admission no.</th><th>Trade / class</th><th>Attendance</th><th>Marked at (system)</th><th>Actions</th></tr></thead>
                          <tbody>{students.map((student) => (
                            <tr key={student.id}>
                              <td data-label="Student"><strong>{student.name}</strong></td>
                              <td data-label="Admission no.">{student.admissionNumber}</td>
                              <td data-label="Trade / class">{student.trade} · {student.className}</td>
                              <td data-label="Attendance">
                                <select
                                  aria-label={`Attendance for ${student.name}`}
                                  value={student.attendanceStatus || 'unmarked'}
                                  disabled={savingAttendance !== null}
                                  onChange={(event) => saveAttendance(student, event.target.value)}
                                >
                                  <option value="unmarked" disabled>
                                    {savingAttendance === student.id ? 'Saving…' : 'Not marked'}
                                  </option>
                                  {attendanceStatuses.map((status) => (
                                    <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
                                  ))}
                                </select>
                              </td>
                              <td data-label="Marked at (system)">
                                {student.attendanceMarkedAt
                                  ? <time dateTime={student.attendanceMarkedAt.replace(' ', 'T')}>{student.attendanceMarkedAt}</time>
                                  : '—'}
                              </td>
                              <td data-label="Actions">
                                <button
                                  className="portal-edit-button"
                                  type="button"
                                  onClick={() => setEditingStudent(student)}
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
              </section>
            </div>
          </section>
        ) : (
          <section className="portal-trades" id="programs">
            <div className="portal-heading">
              <div>
                <span className="portal-overline">FIND WHAT INSPIRES YOU</span>
                <h2>Explore our five trades</h2>
              </div>
              <a className="portal-all-trades" href="/#trades">View on school site ↗</a>
            </div>
            <p className="portal-trades-intro">
              Each trade combines practical learning with skills for your next step. Browse the introductions,
              then open a program to learn more.
            </p>
            <div className="portal-trade-grid">
              {trades.map((trade) => (
                <article className="portal-trade-card" key={trade.code}>
                  <img src={trade.image} alt="" loading="lazy" />
                  <div className="portal-trade-copy">
                    <span>{trade.code}</span>
                    <h3>{trade.name}</h3>
                    <p>{trade.description}</p>
                    <Link to={trade.path}>Explore this trade <span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              ))}
            </div>
            <div className="portal-help">
              <div><strong>Not sure where to start?</strong><p>Talk to the school and we’ll help you explore your options.</p></div>
              <a href="mailto:info@mizerotss.rw">Contact Mizero TSS ↗</a>
            </div>
          </section>
        )}

        <footer className="portal-footer">
          <span>© {new Date().getFullYear()} Mizero Technical Secondary School</span>
          <span>Rusizi · Western Province · Rwanda</span>
        </footer>
      </main>
    </div>
  )
}

export default Dashboard
