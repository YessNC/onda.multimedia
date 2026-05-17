import { Camera, Mail, MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { whatsappQuoteUrl } from '../../lib/utils'
import BrandLogo from '../shared/BrandLogo'

const footerGroups = [
  {
    title: 'Navegacion',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Artistas', to: '/artistas' },
      { label: 'Servicios', to: '/servicios' },
      { label: 'Eventos', to: '/eventos' },
      { label: 'Contacto', to: '/contacto' },
    ],
  },
  {
    title: 'Servicios',
    links: [
      { label: 'Produccion de eventos', to: '/servicios' },
      { label: 'Produccion audiovisual', to: '/servicios' },
      { label: 'Produccion musical', to: '/servicios' },
      { label: 'Representacion de artistas', to: '/servicios' },
    ],
  },
  {
    title: 'Artistas',
    links: [
      { label: 'Vektorben', to: '/artistas' },
      { label: 'Giovan-e', to: '/artistas' },
      { label: 'Astes', to: '/artistas' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-onda-purple/15 bg-white/80 py-14 backdrop-blur-xl dark:bg-onda-black/80">
      <div className="onda-container">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr_1fr]">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-600 dark:text-onda-muted">
              Productora multimedia enfocada en eventos, artistas urbanos, contenido audiovisual y desarrollo musical desde Freirina para Chile.
            </p>
            <Link
              to="/admin/login"
              className="mt-6 inline-flex rounded-md border border-onda-purple/20 px-4 py-2 font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:text-onda-lavender"
            >
              Entrar como administrador
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-zinc-950 dark:text-white">
                  {group.title}
                </h3>
                <ul className="mt-4 grid gap-3 text-sm text-zinc-600 dark:text-onda-muted">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}`}>
                      <Link to={link.to} className="transition hover:text-onda-purple dark:hover:text-onda-lavender">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-zinc-950 dark:text-white">
              Contacto
            </h3>
            <ul className="mt-4 grid gap-3 text-sm text-zinc-600 dark:text-onda-muted">
              <li>
                <a href={whatsappQuoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-onda-purple dark:hover:text-onda-lavender">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-onda-purple dark:hover:text-onda-lavender">
                  <Camera className="h-4 w-4" /> Instagram
                </a>
              </li>
              <li>
                <a href="mailto:hola@ondamultimedia.cl" className="inline-flex items-center gap-2 transition hover:text-onda-purple dark:hover:text-onda-lavender">
                  <Mail className="h-4 w-4" /> Email
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Freirina, Chile
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-onda-purple/10 pt-6 text-xs text-zinc-500 dark:text-zinc-500">
          © 2026 ONDA MULTIMEDIA. Base web preparada para crecer por etapas.
        </div>
      </div>
    </footer>
  )
}
