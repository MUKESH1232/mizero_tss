import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function AuthForm({ mode }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isSignup = mode === 'signup'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch(isSignup ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'The request could not be completed.')
        return
      }

      navigate('/dashboard', { replace: true })
    } catch {
      setError('Could not connect to the server. Check that the backend is running and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-dialog">
        <span className="eyebrow">WELCOME TO MIZERO TSS</span>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-intro">
          {isSignup
            ? 'Register your interest and stay connected with our school.'
            : 'Sign in to continue to your account.'}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              Full name
              <input
                autoComplete="name"
                name="username"
                maxLength="100"
                placeholder="Your full name"
                required
              />
            </label>
          )}
          <label>
            Email address
            <input
              autoComplete="email"
              name="email"
              type="email"
              maxLength="254"
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              name="password"
              type="password"
              minLength="8"
              maxLength="72"
              placeholder="At least 8 characters"
              required
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>
        <p className="auth-note">Passwords are securely hashed before they are stored.</p>
        <p className="auth-switch">
          {isSignup ? 'Already have an account? ' : 'Need an account? '}
          <Link to={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </div>
    </section>
  )
}

export default AuthForm
