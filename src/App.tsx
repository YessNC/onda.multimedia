import { Route, Routes } from 'react-router-dom'
import Footer from './components/layout/Footer'
import Header from './components/layout/Header'
import FloatingAssistant from './components/shared/FloatingAssistant'
import AdminEventos from './routes/AdminEventos'
import AdminLogin from './routes/AdminLogin'
import Contacto from './routes/Contacto'
import Eventos from './routes/Eventos'
import Home from './routes/Home'
import Servicios from './routes/Servicios'

function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-zinc-950 transition-colors duration-500 dark:bg-transparent dark:text-onda-soft">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/eventos" element={<AdminEventos />} />
        </Routes>
      </main>
      <Footer />
      <FloatingAssistant />
    </div>
  )
}

export default App
