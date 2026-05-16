import AdminLoginForm from '../components/admin/AdminLoginForm'
import SectionTitle from '../components/shared/SectionTitle'

export default function AdminLogin() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          align="center"
          eyebrow="Admin"
          title="Acceso administrador"
          subtitle="Vista preparada para autenticar administradores cuando se integre el backend."
        />
        <div className="mt-10">
          <AdminLoginForm />
        </div>
      </div>
    </section>
  )
}
