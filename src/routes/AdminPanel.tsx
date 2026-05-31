import AdminSignOutButton from '../components/admin/AdminSignOutButton'
import SectionTitle from '../components/shared/SectionTitle'

export default function AdminPanel() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          align="center"
          eyebrow="Admin"
          title="Panel administrador ONDA"
          subtitle="Acceso temporal preparado para la administracion del sitio."
        />
        <div className="glass-panel mx-auto mt-10 grid max-w-md gap-5 rounded-lg p-6 text-center">
          <AdminSignOutButton variant="primary" />
        </div>
      </div>
    </section>
  )
}
