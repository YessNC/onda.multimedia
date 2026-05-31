import { Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import { placeholderEvents } from '../../data/placeholderEvents'
import EventCard, { type EventCardData } from './EventCard'

type EventsCarouselProps = {
  events?: EventCardData[]
}

export default function EventsCarousel({ events }: EventsCarouselProps) {
  const eventsToShow = events ?? placeholderEvents.filter((event) => event.isPublished)

  if (eventsToShow.length === 0) {
    return null
  }

  return (
    <Swiper
      modules={[Pagination]}
      pagination={{ clickable: true }}
      spaceBetween={18}
      slidesPerView={1.08}
      breakpoints={{
        700: { slidesPerView: 2 },
        1060: { slidesPerView: 3 },
      }}
      className="pb-12"
    >
      {eventsToShow.map((event) => (
        <SwiperSlide key={event.id}>
          <EventCard event={event} />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
