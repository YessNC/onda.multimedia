import { placeholderEvents } from '../../data/placeholderEvents'
import { useI18n } from '../../hooks/useI18n'

export default function AdminEventTable() {
  const { t } = useI18n()

  return (
    <div className="glass-panel overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-onda-purple/10 text-xs uppercase tracking-[0.14em] text-onda-purple dark:text-onda-lavender">
            <tr>
              <th className="px-4 py-3">{t('event-table.event')}</th>
              <th className="px-4 py-3">{t('event-table.date')}</th>
              <th className="px-4 py-3">{t('event-table.location')}</th>
              <th className="px-4 py-3">{t('event-table.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onda-purple/10">
            {placeholderEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-4 font-semibold text-zinc-950 dark:text-white">{t(event.titleKey)}</td>
                <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{t(event.dateKey)}</td>
                <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{t(event.placeKey)}</td>
                <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{t(event.status === 'proximo' ? 'events.upcoming' : 'events.archive')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
