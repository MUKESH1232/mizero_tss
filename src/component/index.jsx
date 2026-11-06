import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const trades = [
  { name: 'BDC', path: '/bdc' },
  { name: 'CSA', path: '/csa' },
  { name: 'FBO', path: '/fbo' },
  { name: 'FD', path: '/fd' },
  { name: 'Software Development', shortName: 'Software', path: '/software' },
]

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Mizero TSS home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">M</span>
          <span className="brand-copy">
            <strong>MIZERO TSS</strong>
            <small>Technical Secondary School</small>
          </span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
          <a href="/#trades" onClick={() => setMenuOpen(false)}>Our trades</a>
          <a href="/#about" onClick={() => setMenuOpen(false)}>About us</a>
          <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <Link className="header-cta" to="/#trades">Explore programs <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand brand-light" to="/">
            <span className="brand-mark">M</span>
            <span className="brand-copy">
              <strong>MIZERO TSS</strong>
              <small>Learn a skill. Shape your future.</small>
            </span>
          </Link>
          <p>Technical education for a brighter future in Rusizi, Western Province, Rwanda.</p>
        </div>
        <div className="footer-links">
          <h2>Explore</h2>
          <Link to="/">Home</Link>
          <a href="/#about">About the school</a>
          <a href="/#trades">Our trades</a>
        </div>
        <div className="footer-links">
          <h2>Our trades</h2>
          {trades.map((trade) => (
            <Link key={trade.path} to={trade.path}>{trade.name}</Link>
          ))}
        </div>
        <div className="footer-contact">
          <h2>Get in touch</h2>
          <p>Visit us in Rusizi District<br />Western Province, Rwanda</p>
          <a href="mailto:info@mizerotss.rw">info@mizerotss.rw</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Mizero Technical Secondary School</span>
        <span>Learning today. Leading tomorrow.</span>
      </div>
    </footer>
  )
}

function TradePage({ acronym, title, description, image, imageAlt }) {
  return (
    <section className="trade-page">
      <div className="trade-page-inner">
        <Link className="back-link" to="/">← Back to home</Link>
        <span className="eyebrow">MIZERO TSS · CAREER & TECHNICAL EDUCATION</span>
        <span className="trade-page-mark">{acronym}</span>
        <h1>{title}</h1>
        <p className="trade-page-description">{description}</p>
        <img className="trade-page-image" src={image} alt={imageAlt} />
        <div className="trade-highlights">
          <article><span>01</span><h2>Strong foundations</h2><p>Build knowledge and confidence step by step.</p></article>
          <article><span>02</span><h2>Learning by doing</h2><p>Connect classroom learning with practical skills.</p></article>
          <article><span>03</span><h2>Ready for what’s next</h2><p>Prepare for further study and opportunities in the world of work.</p></article>
        </div>
        <a className="button button-primary" href="/#contact">Ask us about this trade <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  )
}

export { Footer, Header, TradePage }
