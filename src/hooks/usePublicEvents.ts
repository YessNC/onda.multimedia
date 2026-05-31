import { useEffect, useState } from 'react'
import {
  type EventRecord,
  compareEventsByDate,
  isEventPublished,
} from '../lib/events'
import { supabase } from '../lib/supabaseClient'

export function usePublicEvents(limit?: number) {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadPublicEvents() {
      setIsLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase.from('events').select('*')

      if (!isMounted) return

      if (error) {
        setErrorMessage(error.message)
        setEvents([])
        setIsLoading(false)
        return
      }

      const publishedEvents = ((data ?? []) as EventRecord[])
        .filter(isEventPublished)
        .sort(compareEventsByDate)
        .slice(0, limit)

      setEvents(publishedEvents)
      setIsLoading(false)
    }

    void loadPublicEvents()

    return () => {
      isMounted = false
    }
  }, [limit])

  return { errorMessage, events, isLoading }
}
