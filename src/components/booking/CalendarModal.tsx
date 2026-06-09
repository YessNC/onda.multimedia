import { X } from 'lucide-react'

interface CalendarModalProps {
  open: boolean
  onClose: () => void
}

const availability = [
  {
    studio: 'Estudio 1',
    slots: [
      '15 Junio - 10:00',
      '15 Junio - 11:00',
      '16 Junio - 14:00',
    ],
  },
  {
    studio: 'Estudio 2',
    slots: [
      '17 Junio - 12:00',
      '17 Junio - 15:00',
      '18 Junio - 16:00',
    ],
  },
]

export default function CalendarModal({
  open,
  onClose,
}: CalendarModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Fechas disponibles
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-6">
          {availability.map((studio) => (
            <div
              key={studio.studio}
              className="rounded-xl border border-zinc-800 p-4"
            >
              <h3 className="mb-3 text-lg font-semibold text-onda-purple">
                {studio.studio}
              </h3>

              <div className="grid gap-2">
                {studio.slots.map((slot) => (
                  <div
                    key={slot}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}