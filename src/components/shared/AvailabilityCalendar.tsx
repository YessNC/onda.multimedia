import Calendar from 'react-calendar'
import type { Value } from 'react-calendar/dist/shared/types.js'
import { getStartOfToday, toDateKey } from '../../lib/dashboard'
import { cn } from '../../lib/utils'

interface AvailabilityCalendarProps {
  availableDateKeys?: Set<string>
  bookingDateKeys?: Set<string>
  className?: string
  language: string
  markUnavailable?: boolean
  minDate?: Date
  onDateChange: (date: Date) => void
  selectedDate: Date
}

export default function AvailabilityCalendar({
  availableDateKeys = new Set<string>(),
  bookingDateKeys = new Set<string>(),
  className,
  language,
  markUnavailable = true,
  minDate = getStartOfToday(),
  onDateChange,
  selectedDate,
}: AvailabilityCalendarProps) {
  function handleCalendarChange(value: Value) {
    if (value instanceof Date) {
      onDateChange(value)
      return
    }

    if (Array.isArray(value) && value[0] instanceof Date) {
      onDateChange(value[0])
    }
  }

  return (
    <Calendar
      locale={language === 'en' ? 'en-US' : 'es-CL'}
      minDate={minDate}
      onChange={handleCalendarChange}
      value={selectedDate}
      tileClassName={({ date, view }) => {
        if (view !== 'month') return null

        const dateKey = toDateKey(date)
        const classNames = []

        if (bookingDateKeys.has(dateKey)) classNames.push('onda-calendar-has-booking')
        if (availableDateKeys.has(dateKey)) classNames.push('onda-calendar-has-availability')
        if (markUnavailable && date >= minDate && !availableDateKeys.has(dateKey)) {
          classNames.push('onda-calendar-no-availability')
        }

        return classNames.join(' ') || null
      }}
      tileContent={({ date, view }) => {
        if (view !== 'month') return null

        const dateKey = toDateKey(date)

        return (
          <>
            {bookingDateKeys.has(dateKey) ? <span className="onda-calendar-dot" /> : null}
            {availableDateKeys.has(dateKey) ? <span className="onda-calendar-availability-dot" /> : null}
          </>
        )
      }}
      className={cn('onda-calendar', className)}
    />
  )
}
