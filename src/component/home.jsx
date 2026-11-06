import { Link } from 'react-router-dom'
import bdcImage from '../assets/trade-bdc.jpg'
import csaImage from '../assets/trade-csa.jpg'
import fboImage from '../assets/trade-fbo.jpg'
import fashionImage from '../assets/trade-fashion.jpg'
import softwareImage from '../assets/trade-software.jpg'

const programs = [
  { title: 'BDC', path: '/bdc', color: 'mint', image: bdcImage, imageAlt: 'Architect drawing a building plan' },
  { title: 'CSA', path: '/csa', color: 'blue', image: csaImage, imageAlt: 'Close-up of a computer motherboard' },
  { title: 'FBO', path: '/fbo', color: 'orange', image: fboImage, imageAlt: 'Kitchen prepared for food service' },
  { title: 'FD', path: '/fd', color: 'pink', image: fashionImage, imageAlt: 'Fashion model wearing a contemporary outfit' },
  { title: 'Software', path: '/software', color: 'purple', image: softwareImage, imageAlt: 'Students learning together at a laptop' },
]

function Home() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-content">
          <span className="eyebrow"><span className="eyebrow-dot" /> RUSIZI · WESTERN PROVINCE, RWANDA</span>
          <h1>Skills for today.<br /><span>Hope for tomorrow.</span></h1>
          <p className="hero-lead">Welcome to Mizero Technical Secondary School — where ambition meets hands-on learning, and every student can build a future with purpose.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#trades">Discover our trades <span aria-hidden="true">↗</span></a>
            <a className="button button-quiet" href="#about"><span className="play-icon">▶</span> Get to know us</a>
          </div>
          <div className="hero-proof">
            <span className="proof-avatars" aria-hidden="true"><i>M</i><i>T</i><i>S</i></span>
            <span><strong>Learn by doing</strong><small>Technical education. Real possibility.</small></span>
          </div>
        </div>
        <div className="hero-art" aria-label="Illustration of technical education and learning">
          <div className="art-sun" />
          <div className="art-circle art-circle-one" />
          <div className="art-circle art-circle-two" />
          <div className="art-building">
            <div className="building-roof" />
            <div className="building-face">
              <div className="building-sign">MIZERO <span>TECHNICAL SCHOOL</span></div>
              <div className="building-windows"><i /><i /><i /><i /><i /><i /></div>
              <div className="building-door" />
            </div>
          </div>
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />
          <div className="floating-note note-one"><span>✦</span> Learn with purpose</div>
          <div className="floating-note note-two"><span>5</span> Career pathways</div>
          <div className="art-spark spark-one">✳</div>
          <div className="art-spark spark-two">✦</div>
        </div>
        <div className="hero-bottom">
          <span>EDUCATION THAT OPENS DOORS</span>
          <span className="scroll-cue">SCROLL TO EXPLORE <b>↓</b></span>
        </div>
      </section>

      <section className="intro-section" id="about">
        <div className="intro-heading">
          <span className="eyebrow">A PLACE TO GROW</span>
          <h2>More than a school.<br />A starting point.</h2>
        </div>
        <div className="intro-copy">
          <p>Mizero TSS is a technical secondary school located in Rusizi, in Rwanda’s Western Province. We help students turn curiosity into practical skills and prepare for the opportunities ahead.</p>
          <a className="text-link" href="#trades">Find your path <span aria-hidden="true">↗</span></a>
        </div>
        <div className="intro-stats">
          <div><strong>05</strong><span>Technical trades</span></div>
          <div><strong>01</strong><span>Community of learners</span></div>
          <div><strong>∞</strong><span>Possibilities ahead</span></div>
        </div>
      </section>

      <section className="programs-section" id="trades">
        <div className="section-heading">
          <div><span className="eyebrow">FIND YOUR DIRECTION</span><h2>Five trades. One bright future.</h2></div>
          <p>Explore the technical pathways offered at Mizero TSS and find the one that sparks your ambition.</p>
        </div>
        <div className="program-grid">
          {programs.map((program, index) => (
            <Link className={`program-card program-${program.color}`} to={program.path} key={program.path}>
              <img className="program-image" src={program.image} alt={program.imageAlt} loading="lazy" />
              <span className="program-index">0{index + 1} / 05</span>
              <span className="program-title">{program.title}</span>
              <span className="program-bottom"><span>Explore trade</span><span className="program-arrow" aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="future-section">
        <div className="future-decoration" aria-hidden="true"><span>✳</span></div>
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>Ready to build<br />your future?</h2>
          <p>Take the first step. Get in touch to learn more about Mizero TSS and the trades we offer.</p>
          <a className="button button-light" href="mailto:info@mizerotss.rw">Contact our school <span aria-hidden="true">↗</span></a>
        </div>
        <div className="future-side">
          <p>Curious about becoming part of our school community?</p>
          <div className="future-auth-actions">
            <Link className="future-link" to="/login">Sign in <span aria-hidden="true">→</span></Link>
            <Link className="future-link" to="/signup">Create an account <span aria-hidden="true">→</span></Link>
          </div>
          <small>Register or sign in to your school account.</small>
        </div>
      </section>
    </>
  )
}

export default Home
