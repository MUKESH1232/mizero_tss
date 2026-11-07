import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bdcImage from '../assets/trade-bdc.jpg'
import csaImage from '../assets/trade-csa.jpg'
import fboImage from '../assets/trade-fbo.jpg'
import fashionImage from '../assets/trade-fashion.jpg'
import softwareImage from '../assets/trade-software.jpg'

const programs = [
  { title: 'Building and Construction', shortTitle: 'BDC', path: '/bdc', image: bdcImage, color: 'mint' },
  { title: 'Computer Systems and Architecture', shortTitle: 'CSA', path: '/csa', image: csaImage, color: 'blue' },
  { title: 'Food and Beverage Operations', shortTitle: 'FBO', path: '/fbo', image: fboImage, color: 'orange' },
  { title: 'Fashion Design', shortTitle: 'FD', path: '/fd', image: fashionImage, color: 'pink' },
  { title: 'Software Development', shortTitle: 'Software', path: '/software', image: softwareImage, color: 'purple' },
]

const studentTrades = ['BDC', 'CSA', 'FBO', 'FD', 'Software']

function getLocalDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

async function loadManagementData(date) {
  const query = `?date=${encodeURIComponent(date)}`
  const [studentsResponse, summaryResponse] = await Promise.all([
    fetch(`/api/students${query}`, { credentials: 'same-origin' }),
    fetch(`/api/attendance/summary${query}`, { credentials: 'same-origin' }),
  ])
  const [studentsResult, summaryResult] = await Promise.all([
    studentsResponse.json(),
    summaryResponse.json(),
  ])

  if (!studentsResponse.ok) {
    const error = new Error(studentsResult.message || 'Student records could not be loaded.')
    error.status = studentsResponse.status
    throw error
  }
  if (!summaryResponse.ok) {
    const error = new Error(summaryResult.message || 'Attendance summary could not be loaded.')
    error.status = summaryResponse.status
    throw error
  }

  return { students: studentsResult.students, summary: summaryResult.summary }
}

function Dashboard() {
  const navigate = useNavigate()
  const managementRequestId = useRef(0)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [students, setStudents] = useState([])
  const [attendanceSummary, setAttendanceSummary] = useState(null)
  const [attendanceDate, setAttendanceDate] = useState(getLocalDate)
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [studentSaving, setStudentSaving] = useState(false)
  const [savingAttendanceId, setSavingAttendanceId] = useState(null)

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
        const result = await response.json()

        if (!active) return
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!response.ok) {
          setError(result.message || 'Your dashboard could not be loaded.')
          return
        }

        setUser(result.user)
      } catch {
        if (active) setError('Could not connect to the server. Check your connection and try again.')
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
    // Ignore older responses so an in-flight initial load cannot overwrite a new student or attendance update.
    const requestId = ++managementRequestId.current

    loadManagementData(attendanceDate)
      .then(({ students: loadedStudents, summary }) => {
        if (!active || requestId !== managementRequestId.current) return
        setStudents(loadedStudents)
        setAttendanceSummary(summary)
        setError('')
      })
      .catch((loadError) => {
        if (!active || requestId !== managementRequestId.current) return
        if (loadError.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(loadError.message || 'Student records could not be loaded.')
      })
      .finally(() => {
        if (active && requestId === managementRequestId.current) setRecordsLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.isStaff, attendanceDate, navigate])

  async function handleAddStudent(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setStudentSaving(true)

    // Keep the form reference before awaiting; React's event currentTarget is temporary.
    const form = event.currentTarget
    const studentDate = attendanceDate
    const formData = new FormData(event.currentTarget)
    const student = {
      ...Object.fromEntries(formData.entries()),
      date: studentDate,
    }

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(student),
      })
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(result.message || 'The student could not be added.')
        return
      }

      form.reset()
      setRecordsLoading(false)
      const requestId = ++managementRequestId.current
      setStudents((current) => (
        studentDate === attendanceDate
          ? [...current.filter((item) => item.id !== result.student.id), result.student]
            .sort((a, b) => a.name.localeCompare(b.name))
          : current
      ))
      if (studentDate === attendanceDate) {
        setAttendanceSummary((current) => current && ({
          ...current,
          total: Number(current.total) + 1,
          unmarked: Number(current.unmarked) + 1,
        }))
      }
      setNotice(`${result.student.name} was added to the student list.`)

      try {
        const { students: latestStudents, summary } = await loadManagementData(studentDate)
        if (requestId === managementRequestId.current && studentDate === attendanceDate) {
          setStudents(latestStudents)
          setAttendanceSummary(summary)
        }
      } catch {
        if (requestId === managementRequestId.current && studentDate === attendanceDate) {
          setError('Student was saved, but the latest roster could not be refreshed.')
        }
      }
    } catch {
      setError('Could not connect to the server. The student was not added.')
    } finally {
      setStudentSaving(false)
    }
  }

  async function handleAttendanceChange(studentId, status) {
    setError('')
    setNotice('')
    setSavingAttendanceId(studentId)
    const selectedDate = attendanceDate

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ studentId, status, date: selectedDate }),
      })
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(result.message || 'Attendance could not be saved.')
        return
      }

      if (selectedDate !== attendanceDate) return

      const previousStatus = students.find((student) => student.id === studentId)?.attendanceStatus || 'unmarked'
      setStudents((current) => current.map((student) => (
        student.id === studentId ? { ...student, attendanceStatus: status } : student
      )))
      setAttendanceSummary((current) => {
        if (!current) return current
        const nextSummary = { ...current }
        if (['present', 'absent', 'late', 'unmarked'].includes(previousStatus)) {
          nextSummary[previousStatus] = Math.max(0, Number(nextSummary[previousStatus]) - 1)
        }
        nextSummary[status] = Number(nextSummary[status]) + 1
        return nextSummary
      })
      setNotice('Attendance saved.')
      const requestId = ++managementRequestId.current
      try {
        const { students: updatedStudents, summary } = await loadManagementData(selectedDate)
        if (requestId === managementRequestId.current && selectedDate === attendanceDate) {
          setStudents(updatedStudents)
          setAttendanceSummary(summary)
        }
      } catch {
        if (requestId === managementRequestId.current && selectedDate === attendanceDate) {
          setError('Attendance was saved, but the latest records could not be refreshed.')
        }
      }
    } catch {
      setError('Could not save attendance. Check your connection and try again.')
    } finally {
      setSavingAttendanceId(null)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    setError('')

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'You could not be signed out. Please try again.')
        return
      }

      navigate('/login', { replace: true })
    } catch {
      setError('Could not connect to the server. You are still signed in.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return <section className="dashboard-state" role="status">Loading your dashboard…</section>
  }

  if (!user) {
    return (
      <section className="dashboard-state">
        <p className="dashboard-state-error" role="alert">{error || 'Your dashboard could not be loaded.'}</p>
        <button className="button button-primary" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    )
  }

  const firstName = user.name.trim().split(/\s+/)[0]
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" to="/" aria-label="Mizero TSS home">
          <span className="brand-mark">M</span>
          <span className="brand-copy">
            <strong>MIZERO TSS</strong>
            <small>Student portal</small>
          </span>
        </Link>

        <span className="dashboard-nav-label">{user.isStaff ? 'SCHOOL MANAGEMENT' : 'YOUR SPACE'}</span>
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          <a className="dashboard-nav-link is-current" href="#overview" aria-current="page">
            <span aria-hidden="true">⌂</span> Overview
          </a>
          <a className="dashboard-nav-link" href="#programs">
            <span aria-hidden="true">▦</span> Explore programs
          </a>
          <a className="dashboard-nav-link" href="#next-steps">
            <span aria-hidden="true">✦</span> Getting started
          </a>
          {user.isStaff && (
            <a className="dashboard-nav-link" href="#student-management">
              <span aria-hidden="true">＋</span> Students & attendance
            </a>
          )}
        </nav>

        <div className="dashboard-sidebar-note">
          <span className="dashboard-note-icon" aria-hidden="true">✳</span>
          <strong>Your future starts with a first step.</strong>
          <p>Discover the skills and trade that feel right for you.</p>
          <a href="#programs">Explore pathways <span aria-hidden="true">→</span></a>
        </div>

        <Link className="dashboard-back-link" to="/">← Back to school site</Link>
      </aside>

      <div className="dashboard-content" id="overview">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">STUDENT PORTAL <span>/</span> OVERVIEW</span>
            <p>Welcome to your learning space</p>
          </div>
          <div className="dashboard-account">
            <span className="dashboard-avatar" aria-hidden="true">{initials}</span>
            <span className="dashboard-account-name">{user.name}</span>
            <button type="button" className="dashboard-signout" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        {error && <p className="dashboard-feedback" role="alert">{error}</p>}
        {notice && <p className="dashboard-notice" role="status">{notice}</p>}

        <section className="dashboard-welcome">
          <div className="dashboard-welcome-copy">
            <span className="dashboard-welcome-label"><span /> YOUR MIZERO JOURNEY</span>
            <h1>Welcome, {firstName}.</h1>
            <p>Explore practical pathways, discover what inspires you, and start shaping what comes next.</p>
            <a className="dashboard-welcome-button" href="#programs">Explore our programs <span aria-hidden="true">↗</span></a>
          </div>
          <div className="dashboard-welcome-art" aria-hidden="true">
            <span className="welcome-orbit orbit-one" />
            <span className="welcome-orbit orbit-two" />
            <span className="welcome-spark">✳</span>
            <span className="welcome-monogram">M</span>
          </div>
          <span className="dashboard-welcome-caption">LEARN BY DOING · GROW WITH PURPOSE</span>
        </section>

        <section className="dashboard-facts" aria-label="School information">
          <article className="dashboard-fact">
            <span className="dashboard-fact-icon fact-green" aria-hidden="true">▦</span>
            <div><strong>05</strong><span>Technical pathways</span></div>
          </article>
          <article className="dashboard-fact">
            <span className="dashboard-fact-icon fact-yellow" aria-hidden="true">⌖</span>
            <div><strong>Rusizi</strong><span>Western Province, Rwanda</span></div>
          </article>
          <article className="dashboard-fact">
            <span className="dashboard-fact-icon fact-blue" aria-hidden="true">✦</span>
            <div><strong>Your next step</strong><span>Find a program that inspires you</span></div>
          </article>
        </section>

        {user.isStaff && (
          <section className="staff-management" id="student-management">
            <div className="dashboard-section-heading staff-section-heading">
              <div>
                <span className="dashboard-section-eyebrow">STAFF WORKSPACE</span>
                <h2>Students & attendance</h2>
              </div>
              <label className="attendance-date-label">
                Attendance date
                <input
                  type="date"
                  value={attendanceDate}
                  disabled={studentSaving || savingAttendanceId !== null}
                  onChange={(event) => {
                    setRecordsLoading(true)
                    setAttendanceDate(event.target.value)
                  }}
                />
              </label>
            </div>

            <div className="attendance-summary" aria-label="Attendance summary">
              <article><span>Total students</span><strong>{attendanceSummary ? attendanceSummary.total : '—'}</strong></article>
              <article><span>Present</span><strong>{attendanceSummary ? attendanceSummary.present : '—'}</strong></article>
              <article><span>Absent</span><strong>{attendanceSummary ? attendanceSummary.absent : '—'}</strong></article>
              <article><span>Late</span><strong>{attendanceSummary ? attendanceSummary.late : '—'}</strong></article>
              <article><span>Not marked</span><strong>{attendanceSummary ? attendanceSummary.unmarked : '—'}</strong></article>
            </div>

            <div className="staff-management-grid">
              <section className="staff-panel">
                <div className="staff-panel-heading">
                  <span className="dashboard-section-eyebrow">STUDENT RECORDS</span>
                  <h3>Add a student</h3>
                  <p>Save a student to the school database.</p>
                </div>
                <form className="student-form" onSubmit={handleAddStudent}>
                  <label>
                    Admission number
                    <input name="admissionNumber" maxLength="40" placeholder="e.g. MTS-2026-001" required />
                  </label>
                  <label>
                    Student full name
                    <input name="name" maxLength="100" autoComplete="name" placeholder="Enter full name" required />
                  </label>
                  <label>
                    Trade
                    <select name="trade" required defaultValue="">
                      <option value="" disabled>Select a trade</option>
                      {studentTrades.map((trade) => <option value={trade} key={trade}>{trade}</option>)}
                    </select>
                  </label>
                  <label>
                    Class
                    <input name="className" maxLength="50" placeholder="e.g. Level 3" required />
                  </label>
                  <button className="button button-primary student-submit" type="submit" disabled={studentSaving}>
                    {studentSaving ? 'Saving student…' : 'Add student'} {!studentSaving && <span aria-hidden="true">＋</span>}
                  </button>
                </form>
              </section>

              <section className="staff-panel staff-records-panel">
                <div className="staff-panel-heading staff-records-heading">
                  <div>
                    <span className="dashboard-section-eyebrow">SCHOOL ROSTER</span>
                    <h3>Student list</h3>
                  </div>
                  <span className="student-count">{students.length} {students.length === 1 ? 'student' : 'students'}</span>
                </div>
                {recordsLoading ? (
                  <p className="student-list-state" role="status">Loading student records…</p>
                ) : students.length === 0 ? (
                  <p className="student-list-state">No students have been added yet. Add the first student using the form.</p>
                ) : (
                  <div className="student-table-wrap">
                    <table className="student-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Admission no.</th>
                          <th>Trade / class</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id}>
                            <td data-label="Student"><strong>{student.name}</strong></td>
                            <td data-label="Admission no.">{student.admissionNumber}</td>
                            <td data-label="Trade / class">{student.trade} · {student.className}</td>
                            <td data-label="Attendance">
                              <select
                                aria-label={`Attendance for ${student.name}`}
                                className={`attendance-select${student.attendanceStatus ? ` status-${student.attendanceStatus}` : ''}`}
                                value={student.attendanceStatus || ''}
                                onChange={(event) => handleAttendanceChange(student.id, event.target.value)}
                                disabled={savingAttendanceId !== null}
                              >
                                <option value="unmarked" disabled>
                                  {savingAttendanceId === student.id ? 'Saving…' : 'Not marked'}
                                </option>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="late">Late</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </section>
        )}

        <div className="dashboard-section-heading" id="programs">
          <div>
            <span className="dashboard-section-eyebrow">FIND YOUR DIRECTION</span>
            <h2>Explore our programs</h2>
          </div>
          <Link to="/">Learn about Mizero <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="dashboard-body-grid">
          <section className="dashboard-programs" aria-label="Technical programs">
            {programs.map((program, index) => (
              <Link className="dashboard-program-card" to={program.path} key={program.path}>
                <img className={`dashboard-program-image program-${program.color}`} src={program.image} alt="" />
                <span className="dashboard-program-number">0{index + 1}</span>
                <span className="dashboard-program-copy">
                  <strong>{program.title}</strong>
                  <small>{program.shortTitle}</small>
                </span>
                <span className="dashboard-program-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </section>

          <aside className="dashboard-side-column">
            <section className="dashboard-next-card" id="next-steps">
              <span className="dashboard-section-eyebrow">A GOOD PLACE TO START</span>
              <h2>Your next steps</h2>
              <ol className="dashboard-steps">
                <li><span>01</span><div><strong>Explore the trades</strong><p>See what each program is all about.</p></div></li>
                <li><span>02</span><div><strong>Find what interests you</strong><p>Think about the skills you want to build.</p></div></li>
                <li><span>03</span><div><strong>Talk with our school</strong><p>We’re here to help you choose your path.</p></div></li>
              </ol>
              <a className="dashboard-contact-link" href="mailto:info@mizerotss.rw">Get in touch <span aria-hidden="true">↗</span></a>
            </section>

            <section className="dashboard-help-card">
              <span className="dashboard-help-icon" aria-hidden="true">?</span>
              <div><strong>Need a hand?</strong><p>Reach out and we’ll be happy to help.</p></div>
              <a href="mailto:info@mizerotss.rw" aria-label="Email Mizero TSS">→</a>
            </section>
          </aside>
        </div>

        <footer className="dashboard-footer">
          <span>© {new Date().getFullYear()} Mizero Technical Secondary School</span>
          <span>Learning today. Leading tomorrow.</span>
        </footer>
      </div>
    </div>
  )
}

export default Dashboard
