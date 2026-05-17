import { useI18n } from '../hooks/useI18n'
import AdminEventTable from '../components/admin/AdminEventTable'
import EventForm from '../components/admin/EventForm'
import ImageUploader from '../components/admin/ImageUploader'
import SectionTitle from '../components/shared/SectionTitle'

export default function AdminEventos() {
  const { t } = useI18n()

  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          eyebrow={t('admin.eyebrow')}
          title={t('admin.events-title')}
          subtitle={t('admin.events-description')}
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
