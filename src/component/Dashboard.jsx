import { useEffect, useState } from 'react'
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

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

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

        <span className="dashboard-nav-label">YOUR SPACE</span>
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
