import { placeholderEvents } from '../../data/placeholderEvents'

export default function AdminEventTable() {
  return (
    <div className="glass-panel overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-onda-purple/10 text-xs uppercase tracking-[0.14em] text-onda-purple dark:text-onda-lavender">
            <tr>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Lugar</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onda-purple/10">
            {placeholderEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-4 font-semibold text-zinc-950 dark:text-white">{event.title}</td>
                <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{event.date}</td>
                <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{event.place}</td>
                <td className="px-4 py-4 text-zinc-600 dark:text-onda-muted">{event.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
