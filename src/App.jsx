import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import Bdc from './component/bdc.jsx'
import Csa from './component/csa.jsx'
import Dashboard from './component/Dashboard.jsx'
import Fbo from './component/fbo.jsx'
import Fd from './component/fd.jsx'
import Home from './component/home.jsx'
import { Footer, Header } from './component/index.jsx'
import Login from './component/login.jsx'
import Signup from './component/signup.jsx'
import Software from './component/software.jsx'

function AppContent() {
  const { pathname } = useLocation()
  const isDashboard = pathname === '/dashboard'

  return (
    <div className="site-shell">
      {!isDashboard && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bdc" element={<Bdc />} />
          <Route path="/csa" element={<Csa />} />
          <Route path="/fbo" element={<Fbo />} />
          <Route path="/fd" element={<Fd />} />
          <Route path="/software" element={<Software />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isDashboard && <Footer />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
