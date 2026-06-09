import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface BookingModalProps {
  open: boolean
  onClose: () => void
}

const studios = [
  {
    id: 'studio-1',
    name: 'Estudio 1',
    producers: [
      'Giovan-E',
      'Productor 2',
      'Productor 3',
    ],
  },
  {
    id: 'studio-2',
    name: 'Estudio 2',
    producers: [
      'Zeta',
      'Productor 5',
      'Productor 6',
    ],
  },
]

const availableTimes = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
]

export default function BookingModal({
  open,
  onClose,
}: BookingModalProps) {
  const [step, setStep] = useState(1)

  const [studio, setStudio] = useState('')
  const [producer, setProducer] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [community, setCommunity] = useState(false)
  const [terms, setTerms] = useState(false)

  const selectedStudio = studios.find(
  (item) => item.id === studio
)
  const handleBooking = async () => {
    const { error } = await supabase
      .from('bookings')
      .insert({
        studio,
        producer,
        booking_date: date,
        booking_time: time,
        name,
        phone,
        email,
        community,
        status: 'pending',
      })

    if (error) {
      console.error(error)
      alert('Error al guardar la reserva')
      return
    }

    alert('Reserva enviada correctamente')

    onClose()
  }

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
            Reserva
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-6">

            <div>
              <label className="mb-2 block text-sm">
                Estudio
              </label>

              <select
                value={studio}
                onChange={(e) => {
                  setStudio(e.target.value)
                  setProducer('')
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
              >
                <option value="">
                  Selecciona un estudio
                </option> 

              {studios.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
              </select>
            </div>

            {selectedStudio && (
              <div>
                <label className="mb-2 block text-sm">
                  Productor
                </label>

                  <select
                    value={producer}
                    onChange={(e) => setProducer(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
                  >
                    <option value="">
                      Selecciona un productor
                    </option>

                    {selectedStudio.producers.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div>
              <label className="mb-2 block text-sm">
                Fecha
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm">
                Horario
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {availableTimes.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setTime(hour)}
                    className={`rounded-lg border p-3 transition ${
                      time === hour
                        ? 'border-onda-purple bg-onda-purple text-white'
                        : 'border-zinc-700'
                    }`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!studio || !producer || !date || !time}
              onClick={() => setStep(2)}
              className="w-full rounded-lg bg-onda-purple p-3 font-semibold disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
              <p>
                <strong>Estudio:</strong> {selectedStudio?.name}
              </p>

              <p>
                <strong>Productor:</strong> {producer}
              </p>

              <p>
                <strong>Fecha:</strong> {date}
              </p>

              <p>
                <strong>Hora:</strong> {time}
              </p>
            </div>

    <input
      type="text"
      placeholder="Nombre completo"
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
    />

            <input
              type="tel"
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
            />

            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3"
            />

            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={community}
                onChange={(e) =>
                  setCommunity(e.target.checked)
                }
              />
              Quiero formar parte de la comunidad
            </label>

            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) =>
                  setTerms(e.target.checked)
                }
              />
              Acepto los términos y condiciones
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-zinc-700 p-3"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={handleBooking}
                disabled={
                  !name ||
                  !phone ||
                  !email ||
                  !terms
                }
                className="flex-1 rounded-lg bg-onda-purple p-3 font-semibold disabled:opacity-40"
              >
                Confirmar reserva
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}