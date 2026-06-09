import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { I18nProvider } from './contexts/I18nContext'
import { AuthProvider } from './contexts/AuthContext'
import Footer from './components/layout/Footer'
import Header from './components/layout/Header'
import FloatingAssistant from './components/shared/FloatingAssistant'
import PersistentSpotifyPlayer from './components/shared/PersistentSpotifyPlayer'
import SpotifyPlayerProvider from './components/shared/SpotifyPlayerProvider'
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import AdminCheckIn from './routes/AdminCheckIn'
import AdminEventAttendees from './routes/AdminEventAttendees'
import AdminPanel from './routes/AdminPanel'
import AdminEventos from './routes/AdminEventos'
import AdminLogin from './routes/AdminLogin'
import AdminResetPassword from './routes/AdminResetPassword'
import Artistas from './routes/Artistas'
import Contacto from './routes/Contacto'
import Eventos from './routes/Eventos'
import EventoDetalle from './routes/EventoDetalle'
import GuestInvitation from './routes/GuestInvitation'
import Home from './routes/Home'
import { PrivacyPolicy, TermsConditions } from './routes/LegalPages'
import Servicios from './routes/Servicios'
import Login from './routes/Login'
import Register from './routes/Register'
import Dashboard from './routes/Dashboard'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function App() {
  const { pathname } = useLocation()
  const showFloatingAssistant = !pathname.startsWith('/admin') && !pathname.startsWith('/dashboard')

  return (
    <I18nProvider>
      <AuthProvider>
        <SpotifyPlayerProvider>
          <div className="min-h-screen overflow-x-hidden bg-transparent text-zinc-950 transition-colors duration-500 dark:bg-transparent dark:text-onda-soft">
            <ScrollToTop />
            <Header />
            <main className="pt-20">
              <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<Home />} />
                <Route path="/artistas" element={<Artistas />} />
                <Route path="/servicios" element={<Servicios />} />
                <Route path="/eventos" element={<Eventos />} />
                <Route path="/eventos/:eventId" element={<EventoDetalle />} />
                <Route path="/entrada" element={<GuestInvitation />} />
                <Route path="/entrada/:invitationToken" element={<GuestInvitation />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/politicas-de-privacidad" element={<PrivacyPolicy />} />
                <Route path="/terminos-y-condiciones" element={<TermsConditions />} />
                
                {/* Rutas de autenticación */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Rutas protegidas (requieren login de usuario normal) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mis-reservas"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mi-material"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                
                {/* Rutas de administración (sistema existente) */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminPanel />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/eventos"
                  element={
                    <ProtectedAdminRoute>
                      <AdminEventos />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/eventos/:eventId/asistentes"
                  element={
                    <ProtectedAdminRoute>
                      <AdminEventAttendees />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/check-in"
                  element={
                    <ProtectedAdminRoute>
                      <AdminCheckIn />
                    </ProtectedAdminRoute>
                  }
                />
              </Routes>
            </main>
            <Footer />
            {showFloatingAssistant ? <FloatingAssistant /> : null}
            <PersistentSpotifyPlayer />
          </div>
        </SpotifyPlayerProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

export default App