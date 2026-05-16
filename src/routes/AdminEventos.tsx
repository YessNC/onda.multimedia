import AdminEventTable from '../components/admin/AdminEventTable'
import EventForm from '../components/admin/EventForm'
import ImageUploader from '../components/admin/ImageUploader'
import SectionTitle from '../components/shared/SectionTitle'

export default function AdminEventos() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow="Admin"
          title="Gestion visual de eventos"
          subtitle="Estructura no funcional preparada para futuro CRUD, subida de imagenes y conexion a Supabase."
        />
        <div className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <AdminEventTable />
          <div className="grid gap-6">
            <EventForm />
            <ImageUploader />
          </div>
        </div>
      </div>
    </section>
  )
}
