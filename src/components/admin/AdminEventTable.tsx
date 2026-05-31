import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  QrCode,
  Send,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react'
import {
  type EventRecord,
  formatEventDate,
  getEventDateRaw,
  getEventLocation,
  getEventStatus,
  getEventStatusLabel,
  getEventTitle,
  getEventVisibility,
  getEventVisibilityLabel,
  getTicketButtonLabel,
  hasActiveTicketButton,
  readBoolean,
  readString,
} from '../../lib/events'
import { cn } from '../../lib/utils'

type AdminEventTableProps = {
  busyEventId?: string | null
  errorMessage?: string
  events: EventRecord[]
  highlightedEventId?: string | null
  isLoading?: boolean
  onArchive: (event: EventRecord) => void
  onDelete: (event: EventRecord) => void
  onEdit: (event: EventRecord) => void
  onPublish: (event: EventRecord) => void
}

type ActionButtonProps = {
  children: string
  disabled?: boolean
  icon: ReactNode
  onClick: () => void
  title?: string
  variant?: 'danger' | 'ghost' | 'primary' | 'secondary'
}

const badgeVariants = {
  neutral: 'border-onda-purple/20 bg-onda-purple/10 text-onda-purple dark:text-onda-lavender',
  private: 'border-fuchsia-300/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200',
  public: 'border-emerald-300/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  warning: 'border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
}

const actionVariants = {
  danger:
    'border-red-400/35 bg-red-500/10 text-red-700 hover:border-red-400 hover:bg-red-500/15 dark:text-red-200',
  ghost:
    'border-white/10 bg-white/5 text-zinc-700 hover:border-onda-purple/40 hover:bg-onda-purple/10 dark:text-onda-soft',
  primary:
    'border-onda-purple bg-onda-purple text-white shadow-[0_0_22px_rgba(123,44,255,0.28)] hover:bg-onda-electric',
  secondary:
    'border-onda-purple/35 bg-white/65 text-onda-purple hover:border-onda-purple hover:bg-onda-purple/10 dark:bg-white/5 dark:text-onda-soft',
}

function Badge({
  children,
  variant = 'neutral',
}: {
  children: ReactNode
  variant?: keyof typeof badgeVariants
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.12em]',
        badgeVariants[variant],
      )}
    >
      {children}
    </span>
  )
}

function ActionButton({
  children,
  disabled = false,
  icon,
  onClick,
  title,
  variant = 'secondary',
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? children}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.12em] transition duration-300 disabled:cursor-not-allowed disabled:opacity-50',
        actionVariants[variant],
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function ActionLink({
  children,
  icon,
  to,
  variant = 'secondary',
}: {
  children: string
  icon: ReactNode
  to: string
  variant?: keyof typeof actionVariants
}) {
  return (
    <Link
      to={to}
      title={children}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.12em] transition duration-300',
        actionVariants[variant],
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

export default function AdminEventTable({
  busyEventId = null,
  errorMessage = '',
  events,
  highlightedEventId = null,
  isLoading = false,
  onArchive,
  onDelete,
  onEdit,
  onPublish,
}: AdminEventTableProps) {
  return (
    <div className="glass-panel w-full min-w-0 max-w-full overflow-hidden rounded-lg border-onda-lavender/30 bg-onda-black/72 shadow-[0_0_34px_rgba(123,44,255,0.18)]">
      <div className="min-w-0 border-b border-onda-purple/15 px-5 py-4">
        <h3 className="font-display text-lg font-bold uppercase tracking-[0.14em] text-zinc-950 dark:text-white">
          Eventos
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-onda-muted">
          {events.length} eventos activos en el panel
        </p>
      </div>

      <div className="w-full min-w-0 max-w-full overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-onda-purple/10 text-xs uppercase tracking-[0.14em] text-onda-purple dark:text-onda-lavender">
            <tr>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Lugar</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acceso</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3">QR</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onda-purple/10">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600 dark:text-onda-muted" colSpan={8}>
                  Cargando eventos...
                </td>
              </tr>
            ) : null}

            {!isLoading && errorMessage ? (
              <tr>
                <td className="px-4 py-6 text-red-700 dark:text-red-200" colSpan={8}>
                  {errorMessage}
                </td>
              </tr>
            ) : null}

            {!isLoading && !errorMessage && events.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600 dark:text-onda-muted" colSpan={8}>
                  No hay eventos activos. Crea un borrador para empezar.
                </td>
              </tr>
            ) : null}

            {events.map((event) => {
              const eventTitle = getEventTitle(event)
              const eventDate = formatEventDate(getEventDateRaw(event))
              const eventLocation = getEventLocation(event) || 'Sin lugar'
              const eventStatus = getEventStatus(event)
              const eventVisibility = getEventVisibility(event)
              const hasTickets = hasActiveTicketButton(event)
              const qrEnabled = readBoolean(event.qr_checkin_enabled)
              const isBusy = busyEventId === event.id
              const isHighlighted = highlightedEventId === event.id

              return (
                <tr
                  key={event.id}
                  className={cn(
                    'align-top transition hover:bg-onda-purple/5',
                    isHighlighted && 'bg-onda-purple/10 shadow-[inset_4px_0_0_rgba(192,132,252,0.95)]',
                  )}
                >
                  <td className="px-4 py-4 font-semibold text-zinc-950 dark:text-white">
                    <span className="inline-flex items-start gap-2">
                      <CalendarDays
                        className="mt-0.5 h-4 w-4 shrink-0 text-onda-purple dark:text-onda-lavender"
                        aria-hidden="true"
                      />
                      <span>
                        {eventTitle}
                        <span className="mt-1 block max-w-xs truncate text-xs font-medium text-zinc-500 dark:text-onda-muted">
                          ID {event.id}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{eventDate}</td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
                      {eventLocation}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={eventStatus === 'draft' ? 'warning' : 'neutral'}>
                      {getEventStatusLabel(event)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={eventVisibility === 'public' ? 'public' : 'private'}>
                      {eventVisibility === 'public' ? (
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {eventVisibility === 'public' ? getEventVisibilityLabel(event) : 'Solo invitacion'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">
                    {hasTickets ? (
                      <a
                        href={readString(event.ticket_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 font-semibold text-onda-purple transition hover:text-onda-electric dark:text-onda-lavender"
                      >
                        <Ticket className="h-4 w-4" aria-hidden="true" />
                        {getTicketButtonLabel(event)}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-zinc-500 dark:text-onda-muted">
                        <Ticket className="h-4 w-4" aria-hidden="true" />
                        No activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {qrEnabled ? (
                      <Badge variant="public">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Activo
                      </Badge>
                    ) : (
                      <span className="text-zinc-500 dark:text-onda-muted">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={<Edit3 className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => onEdit(event)}
                        disabled={isBusy}
                        variant="ghost"
                      >
                        Editar
                      </ActionButton>
                      <ActionLink
                        to={`/admin/eventos/${event.id}/asistentes`}
                        icon={<Users className="h-4 w-4" aria-hidden="true" />}
                      >
                        Invitaciones
                      </ActionLink>
                      {qrEnabled ? (
                        <ActionLink
                          to={`/admin/check-in?eventId=${encodeURIComponent(event.id)}`}
                          icon={<QrCode className="h-4 w-4" aria-hidden="true" />}
                          variant="primary"
                        >
                          Validar
                        </ActionLink>
                      ) : null}
                      {eventStatus === 'draft' ? (
                        <ActionButton
                          icon={<Send className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => onPublish(event)}
                          disabled={isBusy}
                          variant="primary"
                        >
                          Publicar
                        </ActionButton>
                      ) : null}
                      {eventStatus !== 'archived' ? (
                        <ActionButton
                          icon={<Archive className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => onArchive(event)}
                          disabled={isBusy}
                          variant="secondary"
                        >
                          Archivar
                        </ActionButton>
                      ) : null}
                      <ActionButton
                        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => onDelete(event)}
                        disabled={isBusy}
                        variant="danger"
                      >
                        Eliminar
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
