import { Camera, Mail, MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../hooks/useI18n'
import { whatsappQuoteUrl } from '../../lib/utils'
import BrandLogo from '../shared/BrandLogo'

export default function Footer() {
  const { t } = useI18n()

  const footerGroups = [
    {
      title: t('footer.navigation'),
      links: [
        { label: t('nav.home'), to: '/' },
        { label: t('nav.artists'), to: '/artistas' },
        { label: t('nav.services'), to: '/servicios' },
        { label: t('nav.events'), to: '/eventos' },
        { label: t('nav.contact'), to: '/contacto' },
      ],
    },
    {
      title: t('footer.services'),
      links: [
        { label: t('footer.event-production'), to: '/servicios' },
        { label: t('footer.audiovisual-production'), to: '/servicios' },
        { label: t('footer.musical-production'), to: '/servicios' },
        { label: t('footer.artist-representation'), to: '/servicios' },
      ],
    },
    {
      title: t('footer.artists'),
      links: [
        { label: 'Vektorben', to: '/artistas' },
        { label: 'Giovan-e', to: '/artistas' },
        { label: 'Astes', to: '/artistas' },
      ],
    },
  ]
  return (
    <footer className="border-t border-onda-purple/15 bg-white/80 py-14 backdrop-blur-xl dark:bg-onda-black/80">
      <div className="onda-container">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr_1fr]">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-600 dark:text-onda-muted">
              {t('footer.description')}
            </p>
            <Link
              to="/admin/login"
              className="mt-6 inline-flex rounded-md border border-onda-purple/20 px-4 py-2 font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] text-onda-purple transition hover:border-onda-purple hover:bg-onda-purple/10 dark:text-onda-lavender"
            >
              {t('footer.admin')}
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
              {t('footer.contact')}
            </h3>
            <ul className="mt-4 grid gap-3 text-sm text-zinc-600 dark:text-onda-muted">
              <li>
                <a href={whatsappQuoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-onda-purple dark:hover:text-onda-lavender">
                  <MessageCircle className="h-4 w-4" /> {t('footer.whatsapp')}
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/onda.multimedia/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-onda-purple dark:hover:text-onda-lavender">
                  <Camera className="h-4 w-4" /> {t('footer.instagram')}
                </a>
              </li>
              <li>
                <a href="mailto:hola@ondamultimedia.cl" className="inline-flex items-center gap-2 transition hover:text-onda-purple dark:hover:text-onda-lavender">
                  <Mail className="h-4 w-4" /> {t('footer.email')}
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {t('footer.location')}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-onda-purple/10 pt-6 text-xs text-zinc-500 dark:text-zinc-500">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  )
}
