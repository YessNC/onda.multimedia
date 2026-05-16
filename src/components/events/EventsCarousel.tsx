import { Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'
import { placeholderEvents } from '../../data/placeholderEvents'
import EventCard from './EventCard'

export default function EventsCarousel() {
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
      {placeholderEvents.map((event) => (
        <SwiperSlide key={event.id}>
          <EventCard event={event} />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
